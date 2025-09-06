/**
 * Simple Enhanced AI Test
 */

import { TradingEngine } from '../src/engine/TradingEngine.js';

async function simpleTest() {
    console.log('🧪 Testing Enhanced AI Trading System...\n');

    try {
        // Create trading engine
        console.log('1. Creating Trading Engine...');
        const tradingEngine = new TradingEngine({
            initialBalance: 100000,
            maxPositions: 5
        });
        console.log('✅ Trading Engine created successfully\n');

        // Test basic functionality
        console.log('2. Testing basic AI analysis...');
        try {
            const analysis = await tradingEngine.requestAIAnalysis('AAPL', {
                model: 'gpt-4',
                timeframe: '1h',
                includeML: false,  // Disable ML for now
                includeSentiment: false,  // Disable sentiment for now
                interval: '1min'
            });
            console.log('✅ Basic AI analysis working');
            console.log('   Model:', analysis.model);
            console.log('   Cost:', analysis.cost);
        } catch (error) {
            console.log('⚠️  AI analysis test failed:', error.message);
        }

        console.log('\n3. Testing ML predictions...');
        try {
            const mlPredictions = await tradingEngine.getMLPredictions('AAPL');
            console.log('✅ ML predictions working');
            console.log('   Direction:', mlPredictions.predictedDirection);
            console.log('   Confidence:', mlPredictions.confidence);
        } catch (error) {
            console.log('⚠️  ML predictions test failed:', error.message);
        }

        console.log('\n4. Testing sentiment analysis...');
        try {
            const sentiment = await tradingEngine.getSentimentAnalysis('AAPL');
            console.log('✅ Sentiment analysis working');
            console.log('   Score:', sentiment.overall_score);
            console.log('   Posts:', sentiment.total_posts);
        } catch (error) {
            console.log('⚠️  Sentiment analysis test failed:', error.message);
        }

        console.log('\n🎉 Simple test complete!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

simpleTest().catch(console.error);
