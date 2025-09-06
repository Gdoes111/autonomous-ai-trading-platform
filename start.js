#!/usr/bin/env node

/**
 * Production Application Launcher
 * Starts both backend and frontend services for the AI Trading Platform
 */

const { spawn } = require('child_process');
const path = require('path');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

const log = (color, prefix, message) => {
    console.log(`${color}[${prefix}]${colors.reset} ${message}`);
};

// Configuration
const config = {
    backend: {
        port: process.env.PORT || 5000,
        dir: path.join(__dirname, 'backend'),
        cmd: 'npm',
        args: ['run', 'dev']
    },
    frontend: {
        port: 3000,
        dir: path.join(__dirname, 'frontend'),
        cmd: 'npm',
        args: ['start']
    }
};

// Process tracking
const processes = new Map();

// Graceful shutdown handler
const shutdown = (signal) => {
    log(colors.yellow, 'LAUNCHER', `Received ${signal}, shutting down gracefully...`);
    
    processes.forEach((proc, name) => {
        if (proc && !proc.killed) {
            log(colors.yellow, name.toUpperCase(), 'Terminating...');
            proc.kill('SIGTERM');
        }
    });
    
    setTimeout(() => {
        processes.forEach((proc, name) => {
            if (proc && !proc.killed) {
                log(colors.red, name.toUpperCase(), 'Force killing...');
                proc.kill('SIGKILL');
            }
        });
        process.exit(0);
    }, 5000);
};

// Setup signal handlers
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Function to start a service
const startService = (name, config) => {
    return new Promise((resolve, reject) => {
        log(colors.blue, 'LAUNCHER', `Starting ${name}...`);
        
        const proc = spawn(config.cmd, config.args, {
            cwd: config.dir,
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true,
            env: { ...process.env, FORCE_COLOR: '1' }
        });
        
        processes.set(name, proc);
        
        // Handle stdout
        proc.stdout.on('data', (data) => {
            const lines = data.toString().split('\n').filter(line => line.trim());
            lines.forEach(line => {
                if (line.includes('error') || line.includes('Error')) {
                    log(colors.red, name.toUpperCase(), line);
                } else if (line.includes('warning') || line.includes('Warning')) {
                    log(colors.yellow, name.toUpperCase(), line);
                } else if (line.includes('listening') || line.includes('started') || line.includes('Local:')) {
                    log(colors.green, name.toUpperCase(), line);
                } else {
                    log(colors.cyan, name.toUpperCase(), line);
                }
            });
        });
        
        // Handle stderr
        proc.stderr.on('data', (data) => {
            const lines = data.toString().split('\n').filter(line => line.trim());
            lines.forEach(line => {
                log(colors.red, name.toUpperCase(), line);
            });
        });
        
        // Handle process events
        proc.on('error', (error) => {
            log(colors.red, name.toUpperCase(), `Failed to start: ${error.message}`);
            reject(error);
        });
        
        proc.on('exit', (code, signal) => {
            if (code === 0) {
                log(colors.green, name.toUpperCase(), 'Exited successfully');
            } else {
                log(colors.red, name.toUpperCase(), `Exited with code ${code} (signal: ${signal})`);
            }
            processes.delete(name);
        });
        
        // Consider the service started after a short delay
        setTimeout(() => {
            if (!proc.killed) {
                resolve(proc);
            }
        }, 2000);
    });
};

// Main execution
async function main() {
    try {
        log(colors.bright + colors.green, 'LAUNCHER', '🚀 Starting AI Trading Platform...');
        log(colors.blue, 'LAUNCHER', '='.repeat(60));
        
        // Start backend first
        await startService('backend', config.backend);
        log(colors.green, 'BACKEND', `✅ Backend service started on port ${config.backend.port}`);
        
        // Wait a bit for backend to fully initialize
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Start frontend
        await startService('frontend', config.frontend);
        log(colors.green, 'FRONTEND', `✅ Frontend service started on port ${config.frontend.port}`);
        
        // Success message
        log(colors.bright + colors.green, 'LAUNCHER', '🎉 All services started successfully!');
        log(colors.blue, 'LAUNCHER', '='.repeat(60));
        log(colors.cyan, 'ACCESS', `🌐 Frontend: http://localhost:${config.frontend.port}`);
        log(colors.cyan, 'ACCESS', `🔌 Backend API: http://localhost:${config.backend.port}`);
        log(colors.cyan, 'ACCESS', `📊 API Health: http://localhost:${config.backend.port}/health`);
        log(colors.blue, 'LAUNCHER', '='.repeat(60));
        log(colors.yellow, 'LAUNCHER', 'Press Ctrl+C to stop all services');
        
    } catch (error) {
        log(colors.red, 'LAUNCHER', `❌ Failed to start services: ${error.message}`);
        shutdown('ERROR');
    }
}

// Run the launcher
main().catch(error => {
    log(colors.red, 'LAUNCHER', `Fatal error: ${error.message}`);
    process.exit(1);
});
