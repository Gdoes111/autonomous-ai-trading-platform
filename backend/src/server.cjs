const tradingAI = require('./app.cjs');

// Start the Trading AI Platform
tradingAI.start().catch((error) => {
    console.error('❌ Failed to start Trading AI Platform:', error);
    process.exit(1);
});
// restarting server
