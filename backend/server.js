const tradingAI = require('./src/app.js');

// Start the Trading AI Platform
tradingAI.start().catch((error) => {
    console.error('❌ Failed to start Trading AI Platform:', error);
    process.exit(1);
});
