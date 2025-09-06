import express from 'express';
import BacktestEngine from '../engine/BacktestEngine.js';
import AIModelManager from '../ai/AIModelManager.js';

const router = express.Router();

// Initialize engines
const backtestEngine = new BacktestEngine();
const aiManager = new AIModelManager();

// Store user backtest counts (in production, use database)
const userBacktestCounts = new Map();

// POST /api/backtest/run - Run real AI backtest
router.post('/run', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const {
      symbol,
      aiModel,
      startDate,
      endDate,
      timeframe = '1d',
      userTier = 'free'
    } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!symbol || !aiModel || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: symbol, aiModel, startDate, endDate'
      });
    }

    // Check free tier limits
    if (userTier === 'free') {
      const userCount = userBacktestCounts.get(userId) || 0;
      if (userCount >= 4) {
        return res.status(403).json({
          success: false,
          message: 'Free tier limit reached. Upgrade to premium for unlimited backtests.',
          remainingBacktests: 0
        });
      }
    }

    // Validate AI model access
    const availableModels = aiManager.getAvailableModels(userTier);
    const modelExists = availableModels.find(m => m.id === aiModel);
    
    if (!modelExists) {
      return res.status(400).json({
        success: false,
        message: `AI model ${aiModel} not available for ${userTier} tier. Available models: ${availableModels.map(m => m.id).join(', ')}`
      });
    }

    console.log(`🔍 Starting real backtest: ${symbol} with ${aiModel} (${userTier} tier)`);

    // Run the actual backtest with AI
    const results = await backtestEngine.runBacktest({
      symbol,
      startDate,
      endDate,
      aiModel,
      timeframe,
      userTier
    });

    // Update user backtest count
    if (userTier === 'free') {
      const currentCount = userBacktestCounts.get(userId) || 0;
      userBacktestCounts.set(userId, currentCount + 1);
    }

    const result = {
      id: `bt_${Date.now()}`,
      ...results,
      status: 'completed',
      createdAt: new Date().toISOString(),
      cost: modelExists.cost,
      remainingBacktests: userTier === 'free' ? Math.max(0, 4 - (userBacktestCounts.get(userId) || 0)) : 'unlimited'
    };

    console.log(`✅ Backtest completed: ${results.trades.length} trades, ${results.metrics.totalReturn}% return`);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Backtest error:', error);
    res.status(500).json({
      success: false,
      message: `Backtest failed: ${error.message}`
    });
  }
});

// GET /api/backtest/models - Get available AI models
router.get('/models', async (req, res) => {
  try {
    const { userTier = 'free' } = req.query;
    
    const models = aiManager.getAvailableModels(userTier);
    
    res.json({
      success: true,
      data: models.map(model => ({
        ...model,
        description: getModelDescription(model.id),
        capabilities: getModelCapabilities(model.id)
      }))
    });

  } catch (error) {
    console.error('Error fetching AI models:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available AI models'
    });
  }
});

// GET /api/backtest/status - Check API status
router.get('/status', async (req, res) => {
  try {
    const connectionStatus = await aiManager.validateConnections();
    
    res.json({
      success: true,
      data: {
        backtestEngine: 'ready',
        aiConnections: connectionStatus,
        supportedSymbols: [
          'AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA',
          'SPY', 'QQQ', 'IWM',
          'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD'
        ],
        timeframes: ['1m', '5m', '15m', '1h', '4h', '1d', '1w'],
        features: {
          realAI: true,
          yahooFinanceData: true,
          comprehensiveMetrics: true,
          riskManagement: true
        }
      }
    });

  } catch (error) {
    console.error('Error checking status:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking system status'
    });
  }
});

// GET /api/backtest/limits - Check user limits
router.get('/limits', (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const userId = req.user.id;
    const { userTier = 'free' } = req.query;
    
    const backtestsUsed = userBacktestCounts.get(userId) || 0;
    
    res.json({
      success: true,
      data: {
        tier: userTier,
        backtestsUsed,
        backtestsRemaining: userTier === 'free' ? Math.max(0, 4 - backtestsUsed) : 'unlimited',
        dailyLimit: userTier === 'free' ? 4 : 'unlimited',
        aiModelsAccess: userTier === 'free' ? ['gpt-4'] : ['gpt-4', 'gpt-4-turbo', 'claude-3-sonnet', 'claude-3-opus'],
        resetTime: userTier === 'free' ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null
      }
    });

  } catch (error) {
    console.error('Error fetching limits:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user limits'
    });
  }
});

/**
 * Helper functions
 */
function getModelDescription(modelId) {
  const descriptions = {
    'gpt-4': 'Advanced trading analysis with technical and fundamental insights. Excellent for trend following and momentum strategies.',
    'gpt-4-turbo': 'Enhanced GPT-4 with faster processing and deeper market analysis. Optimized for complex trading scenarios.',
    'claude-3-sonnet': 'Specialized in statistical analysis and mean reversion strategies. Excellent risk assessment capabilities.',
    'claude-3-opus': 'Most advanced AI model with sophisticated multi-factor analysis and ensemble trading strategies.'
  };
  
  return descriptions[modelId] || 'Advanced AI trading analysis';
}

function getModelCapabilities(modelId) {
  const capabilities = {
    'gpt-4': ['Technical Analysis', 'Trend Following', 'Risk Assessment', 'Market Sentiment'],
    'gpt-4-turbo': ['Advanced Technical Analysis', 'Multi-timeframe Analysis', 'Pattern Recognition', 'Risk Management'],
    'claude-3-sonnet': ['Statistical Analysis', 'Mean Reversion', 'Volatility Modeling', 'Risk Optimization'],
    'claude-3-opus': ['Ensemble Strategies', 'Multi-factor Analysis', 'Advanced Risk Models', 'Market Microstructure']
  };
  
  return capabilities[modelId] || ['General Trading Analysis'];
}

export default router;
