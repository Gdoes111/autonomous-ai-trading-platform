# AI Trading Platform Launcher (Windows PowerShell)
# Starts both backend and frontend services

Write-Host "🚀 Starting AI Trading Platform..." -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Blue

# Function to handle Ctrl+C gracefully
$global:processes = @()

function Stop-Services {
    Write-Host "🛑 Stopping all services..." -ForegroundColor Yellow
    foreach ($proc in $global:processes) {
        if ($proc -and !$proc.HasExited) {
            Write-Host "Terminating process $($proc.ProcessName)..." -ForegroundColor Yellow
            $proc.Kill()
        }
    }
    exit
}

# Register event handler for Ctrl+C
Register-EngineEvent PowerShell.Exiting -Action { Stop-Services }

try {
    # Start Backend
    Write-Host "🔧 Starting Backend Server..." -ForegroundColor Cyan
    Set-Location "$PSScriptRoot\backend"
    $backendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -NoNewWindow
    $global:processes += $backendProcess
    
    Write-Host "✅ Backend started (PID: $($backendProcess.Id))" -ForegroundColor Green
    
    # Wait for backend to initialize
    Start-Sleep -Seconds 5
    
    # Start Frontend
    Write-Host "🎨 Starting Frontend Server..." -ForegroundColor Cyan
    Set-Location "$PSScriptRoot\frontend"
    $frontendProcess = Start-Process -FilePath "npm" -ArgumentList "start" -PassThru -NoNewWindow
    $global:processes += $frontendProcess
    
    Write-Host "✅ Frontend started (PID: $($frontendProcess.Id))" -ForegroundColor Green
    
    # Success message
    Write-Host ""
    Write-Host "🎉 AI Trading Platform is now running!" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Blue
    Write-Host "🌐 Frontend:     http://localhost:3000" -ForegroundColor Cyan
    Write-Host "🔌 Backend API:  http://localhost:5000" -ForegroundColor Cyan
    Write-Host "📊 API Health:   http://localhost:5000/health" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Blue
    Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
    Write-Host ""
    
    # Keep script running and monitor processes
    while ($true) {
        Start-Sleep -Seconds 1
        
        # Check if processes are still running
        $runningProcesses = $global:processes | Where-Object { $_ -and !$_.HasExited }
        
        if ($runningProcesses.Count -eq 0) {
            Write-Host "❌ All processes have stopped. Exiting..." -ForegroundColor Red
            break
        }
    }
    
} catch {
    Write-Host "❌ Error starting services: $($_.Exception.Message)" -ForegroundColor Red
    Stop-Services
} finally {
    Stop-Services
}
