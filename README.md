# Trading AI Subscription Platform

A comprehensive trading AI platform that provides subscription-based access to multiple AI models for trading analysis, risk management, and automated trading strategies.

## 🤖 AI Models Supported

### Language Models
- **GPT-3.5 Turbo** - Fast and efficient for general trading analysis
- **GPT-4** - Advanced reasoning for complex trading strategies  
- **GPT-5** - State-of-the-art reasoning with specialized trading engine
- **Claude 3 Sonnet** - Balanced performance for trading insights
- **Claude 3 Opus** - Most capable model for sophisticated analysis

### Machine Learning Models
- Technical indicator prediction models
- Sentiment analysis models
- Price movement prediction
- Risk assessment algorithms

## 🚀 Key Features

### For Subscribers
- **Private Dashboard** - Personalized trading interface
- **Multi-Model Access** - Choose from various AI models
- **Credit-Based Billing** - Pay for what you use
- **Real-time Analysis** - Live market data and AI insights
- **Risk Management** - Automated position sizing and risk controls
- **Darwinex Integration** - Direct broker connectivity

### AI Capabilities
- **GPT-5 Reasoning Engine** - Advanced multi-step reasoning for complex trading decisions
- **Market Analysis** - Technical and fundamental analysis
- **Risk Assessment** - Portfolio risk and position sizing
- **Strategy Optimization** - Performance analysis and improvements
- **Sentiment Analysis** - News and social media sentiment
- **Ensemble Analysis** - Multiple model consensus

## 🛠️ Technology Stack

### Backend
- **Node.js** with Express.js
- **PostgreSQL** for data storage
- **Redis** for caching and sessions
- **WebSocket** for real-time data
- **TensorFlow.js** for ML models

### AI Integration
- **OpenAI API** (GPT models)
- **Anthropic API** (Claude models)
- **Custom ML models** for specialized trading tasks

### Payment & Billing
- **Stripe** for subscription management
- **Credit tracking** for usage-based billing

## 📋 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- OpenAI API key
- Anthropic API key

### Installation

1. **Clone and navigate to the project**
   ```bash
   cd "c:\Users\jaisi\New Trader 2.0 finale\backend"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your actual API keys and configuration
   ```

4. **Set up database**
   ```bash
   npm run migrate
   npm run seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

### Testing GPT-5 Reasoning Engine

Run the GPT-5 reasoning engine demo:

```bash
npm run test:gpt5
```

This will demonstrate:
- Market analysis reasoning
- Risk assessment calculations
- Multi-step trading decision processes
- AI model manager integration

## 🧠 GPT-5 Reasoning Engine Usage

### Basic Reasoning
```javascript
import GPT5ReasoningEngine from './src/ai/gpt5-reasoning.js';

const gpt5 = new GPT5ReasoningEngine();

// Market analysis
const analysis = await gpt5.analyzeMarket(marketData, indicators, newsEvents);

// Risk assessment
const risk = await gpt5.assessRisk(portfolio, marketConditions, proposedTrade);

// Strategy optimization
const optimization = await gpt5.optimizeStrategy(historicalData, strategy, metrics);
```

### Multi-Step Reasoning
```javascript
const steps = [
    { name: 'scan', prompt: 'Scan for opportunities' },
    { name: 'analyze', prompt: 'Analyze best opportunity' },
    { name: 'risk', prompt: 'Calculate risk parameters' },
    { name: 'execute', prompt: 'Create execution plan' }
];

const result = await gpt5.multiStepReasoning(steps, initialContext);
```

### AI Model Manager
```javascript
import AIModelManager from './src/ai/model-manager.js';

const aiManager = new AIModelManager();

// Use any supported model
const analysis = await aiManager.generateAnalysis(
    'gpt-5', 
    'Analyze EURUSD trend', 
    { analysisType: 'technical' },
    'user-123'
);

// Ensemble analysis with multiple models
const ensemble = await aiManager.ensembleAnalysis(
    'Should I buy EURUSD now?',
    { timeframe: '1H' },
    ['gpt-4', 'claude-3-opus-20240229']
);
```

## 📊 API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh JWT token

### AI Analysis
- `POST /ai/analyze` - General AI analysis
- `POST /ai/technical` - Technical analysis
- `POST /ai/risk` - Risk assessment
- `POST /ai/sentiment` - Sentiment analysis
- `POST /ai/ensemble` - Multi-model analysis

### Trading
- `GET /trading/account` - Account information
- `POST /trading/order` - Place order
- `GET /trading/positions` - Current positions
- `GET /trading/history` - Trading history

### Subscription
- `GET /subscription/plans` - Available plans
- `POST /subscription/subscribe` - Subscribe to plan
- `GET /subscription/usage` - Usage statistics
- `POST /subscription/credits` - Purchase credits

## 🔧 Configuration

### AI Model Configuration
```javascript
// In src/config/environment.js
export const config = {
    CREDIT_COSTS: {
        'gpt-3.5-turbo': 0.1,
        'gpt-4': 0.5,
        'gpt-5': 1.0,
        'claude-3-sonnet': 0.4,
        'claude-3-opus': 0.8
    },
    
    MAX_POSITION_SIZE: 0.1, // 10% of portfolio
    MAX_DAILY_LOSS: 0.02,   // 2% daily loss limit
    DEFAULT_STOP_LOSS: 0.02 // 2% stop loss
};
```

### Risk Management
The platform includes built-in risk management:
- Maximum position sizing
- Daily loss limits
- Automatic stop-loss calculation
- Portfolio correlation analysis
- Volatility-based adjustments

## 📈 Subscription Plans

### Basic Plan ($29/month)
- 1,000 AI credits included
- Access to GPT-3.5 and Claude Sonnet
- Basic risk management
- Paper trading

### Pro Plan ($99/month)
- 5,000 AI credits included
- Access to all AI models including GPT-5
- Advanced risk management
- Live trading with Darwinex
- Priority support

### Enterprise Plan ($299/month)
- 20,000 AI credits included
- Custom ML model training
- White-label dashboard
- API access
- Dedicated support

## 🔐 Security

- JWT-based authentication
- Rate limiting
- Input validation
- SQL injection protection
- XSS protection
- CORS configuration
- Encrypted API keys

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

- Documentation: [docs.tradingai.platform](https://docs.tradingai.platform)
- Email: support@tradingai.platform
- Discord: [Trading AI Community](https://discord.gg/tradingai)

---

**Note**: This platform is for educational and research purposes. Trading involves significant risk and you should carefully consider your financial situation before using automated trading systems.
