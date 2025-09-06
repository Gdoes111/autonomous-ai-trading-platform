import GPT5ReasoningEngine from './gpt5-reasoning.js';
import AIModelManager from './model-manager.js';

/**
 * Demo and test file for GPT-5 Reasoning Engine
 * Shows how to use the reasoning capabilities for trading tasks
 */

async function testGPT5Reasoning() {
    console.log('🧠 Testing GPT-5 Reasoning Engine for Trading AI...\n');
    
    const gpt5 = new GPT5ReasoningEngine();
    const aiManager = new AIModelManager();
    
    // Test 1: Market Analysis Reasoning
    console.log('📊 Test 1: Market Analysis Reasoning');
    console.log('═'.repeat(50));
    
    const marketData = {
        symbol: 'EURUSD',
        price: 1.0856,
        volume: 125000,
        volatility: 0.045,
        trend: 'bullish',
        timeframe: '1H'
    };
    
    const indicators = {
        rsi: 68.5,
        macd: 0.0012,
        ma_20: 1.0840,
        ma_50: 1.0820,
        bollinger_upper: 1.0890,
        bollinger_lower: 1.0810
    };
    
    const newsEvents = [
        { time: '2025-09-05T08:30:00Z', event: 'ECB Interest Rate Decision', impact: 'high' },
        { time: '2025-09-05T13:30:00Z', event: 'US NFP Report', impact: 'high' }
    ];
    
    try {
        const marketAnalysis = await gpt5.analyzeMarket(marketData, indicators, newsEvents);
        
        if (marketAnalysis.success) {
            console.log('✅ Market Analysis Result:');
            console.log(marketAnalysis.reasoning);
            console.log(`\n💰 Tokens used: ${marketAnalysis.usage?.total_tokens || 'N/A'}`);
        } else {
            console.log('❌ Market Analysis Failed:', marketAnalysis.error);
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
    
    console.log('\n' + '═'.repeat(50));
    
    // Test 2: Risk Assessment Reasoning
    console.log('🛡️  Test 2: Risk Assessment Reasoning');
    console.log('═'.repeat(50));
    
    const portfolio = {
        balance: 10000,
        positions: [
            { symbol: 'EURUSD', size: 0.1, entry: 1.0840, unrealizedPnL: 16 },
            { symbol: 'GBPUSD', size: 0.05, entry: 1.2750, unrealizedPnL: -25 }
        ],
        equity: 9991,
        margin: 500,
        freeMargin: 9491
    };
    
    const proposedTrade = {
        symbol: 'USDJPY',
        direction: 'buy',
        size: 0.1,
        entry: 147.85,
        stopLoss: 147.35,
        takeProfit: 148.85
    };
    
    const marketConditions = {
        volatility: 'medium',
        liquidity: 'high',
        trend: 'ranging',
        newsRisk: 'high'
    };
    
    try {
        const riskAssessment = await gpt5.assessRisk(portfolio, marketConditions, proposedTrade);
        
        if (riskAssessment.success) {
            console.log('✅ Risk Assessment Result:');
            console.log(riskAssessment.reasoning);
            console.log(`\n💰 Tokens used: ${riskAssessment.usage?.total_tokens || 'N/A'}`);
        } else {
            console.log('❌ Risk Assessment Failed:', riskAssessment.error);
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
    
    console.log('\n' + '═'.repeat(50));
    
    // Test 3: Multi-Step Reasoning
    console.log('🔄 Test 3: Multi-Step Trading Decision Process');
    console.log('═'.repeat(50));
    
    const multiStepProcess = [
        {
            name: 'market_scan',
            prompt: 'Scan the current market for trading opportunities in major currency pairs',
            options: { temperature: 0.1 }
        },
        {
            name: 'opportunity_analysis',
            prompt: 'Analyze the most promising opportunity from the market scan',
            options: { temperature: 0.1 }
        },
        {
            name: 'risk_calculation',
            prompt: 'Calculate optimal position size and risk parameters for the selected opportunity',
            options: { temperature: 0.1 }
        },
        {
            name: 'execution_plan',
            prompt: 'Create a detailed execution plan with entry timing and monitoring strategy',
            options: { temperature: 0.1 }
        }
    ];
    
    const initialContext = {
        account: portfolio,
        market: marketConditions,
        preferences: {
            riskTolerance: 'moderate',
            timeframe: 'intraday',
            maxRisk: 2 // 2% per trade
        }
    };
    
    try {
        const multiStepResult = await gpt5.multiStepReasoning(multiStepProcess, initialContext);
        
        if (multiStepResult.success) {
            console.log('✅ Multi-Step Reasoning Results:');
            multiStepResult.steps.forEach((step, index) => {
                console.log(`\n📋 Step ${index + 1}: ${step.step}`);
                console.log('─'.repeat(30));
                if (step.result.success) {
                    console.log(step.result.reasoning);
                } else {
                    console.log('❌ Failed:', step.result.error);
                }
            });
        } else {
            console.log('❌ Multi-Step Reasoning Failed');
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
    
    console.log('\n' + '═'.repeat(50));
    
    // Test 4: AI Model Manager Integration
    console.log('🤖 Test 4: AI Model Manager with GPT-5');
    console.log('═'.repeat(50));
    
    try {
        console.log('Available AI Models:');
        const models = aiManager.getAvailableModels();
        models.forEach(model => {
            console.log(`• ${model.name} (${model.provider}) - ${model.description}`);
        });
        
        console.log('\n📈 Testing Technical Analysis with GPT-5...');
        
        const technicalAnalysisData = {
            ohlc: [
                { open: 1.0840, high: 1.0865, low: 1.0835, close: 1.0856, volume: 125000 },
                { open: 1.0856, high: 1.0870, low: 1.0845, close: 1.0862, volume: 110000 }
            ],
            indicators: indicators
        };
        
        const techAnalysis = await aiManager.technicalAnalysis(
            'EURUSD', 
            '1H', 
            technicalAnalysisData, 
            'test-user-123', 
            'gpt-5'
        );
        
        if (techAnalysis.success) {
            console.log('✅ Technical Analysis Result:');
            console.log(techAnalysis.response);
            console.log(`\n💰 Cost: $${techAnalysis.cost?.toFixed(4) || 'N/A'}`);
        } else {
            console.log('❌ Technical Analysis Failed:', techAnalysis.error);
        }
        
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
    
    console.log('\n' + '═'.repeat(50));
    console.log('🎉 GPT-5 Reasoning Engine Demo Complete!');
    console.log('═'.repeat(50));
}

// Custom reasoning examples
async function customReasoningExamples() {
    console.log('\n🎯 Custom Reasoning Examples');
    console.log('═'.repeat(50));
    
    const gpt5 = new GPT5ReasoningEngine();
    
    // Example 1: Strategy Development
    const strategyScenario = {
        type: 'strategy_development',
        requirements: {
            style: 'scalping',
            timeframe: '5m',
            riskTolerance: 'low',
            winRate: 'target_70_percent'
        }
    };
    
    const strategyQuestion = 'Develop a scalping strategy for EUR/USD with high win rate and low risk';
    
    try {
        const strategyResult = await gpt5.customReasoning(
            strategyScenario, 
            strategyScenario.requirements, 
            strategyQuestion
        );
        
        if (strategyResult.success) {
            console.log('📊 Strategy Development Result:');
            console.log(strategyResult.reasoning);
        }
    } catch (error) {
        console.log('❌ Strategy Development Error:', error.message);
    }
    
    // Example 2: Portfolio Optimization
    console.log('\n💼 Portfolio Optimization Example:');
    console.log('─'.repeat(30));
    
    const portfolioScenario = {
        type: 'portfolio_optimization',
        currentPortfolio: {
            cash: 50000,
            stocks: { AAPL: 100, MSFT: 50, GOOGL: 25 },
            forex: { EURUSD: 0.5, GBPUSD: 0.3 },
            totalValue: 75000
        }
    };
    
    const optimizationQuestion = 'How should I rebalance this portfolio for better risk-adjusted returns?';
    
    try {
        const optimizationResult = await gpt5.customReasoning(
            portfolioScenario,
            portfolioScenario.currentPortfolio,
            optimizationQuestion
        );
        
        if (optimizationResult.success) {
            console.log('✅ Portfolio Optimization Result:');
            console.log(optimizationResult.reasoning);
        }
    } catch (error) {
        console.log('❌ Portfolio Optimization Error:', error.message);
    }
}

// Main execution
async function main() {
    try {
        await testGPT5Reasoning();
        await customReasoningExamples();
    } catch (error) {
        console.error('❌ Main execution error:', error);
    }
}

// Export for use in other modules
export { testGPT5Reasoning, customReasoningExamples };

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
