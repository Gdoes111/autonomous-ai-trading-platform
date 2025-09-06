# Trading AI Platform Backend

A comprehensive subscription-based trading AI platform that provides AI-powered trading analysis, risk management, and broker integration.

## 🚀 Features

- **Multi-AI Analysis**: Supports GPT-3.5, GPT-4, Claude Sonnet 3.5, and Claude Opus 3
- **Subscription Management**: Flexible credit-based billing system
- **Risk Management**: Automated risk assessment and position sizing
- **Darwinex Integration**: Direct broker connectivity for trade execution
- **Real-time Data**: Market data integration and analysis
- **Dashboard Analytics**: Comprehensive trading performance tracking

## 📋 Prerequisites

- Node.js 18+ and npm
- MongoDB 4.4+
- OpenAI API key
- Anthropic API key (for Claude models)
- Darwinex API credentials (optional)

## 🛠️ Installation

1. **Clone and Install**
```bash
cd backend
npm install
```

2. **Environment Setup**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Required Environment Variables**
```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/trading-ai-platform

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRE=24h

# AI Services
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key

# Payment Processing (Optional)
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret

# Broker Integration (Optional)
DARWINEX_BASE_URL=https://api.darwinex.com
DARWINEX_API_KEY=your-darwinex-api-key
DARWINEX_SECRET=your-darwinex-secret

# CORS Settings
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Admin Settings
ADMIN_EMAILS=admin@example.com,admin2@example.com
```

4. **Start the Server**
```bash
npm run dev        # Development mode with auto-reload
npm start          # Production mode
```

## 🏗️ Architecture

### Core Components

- **AI Model Manager**: Unified interface for all AI services
- **Authentication Service**: JWT-based auth with security features
- **Trading Service**: AI analysis and trade execution
- **Subscription Service**: Plan management and billing
- **Risk Management**: Automated position sizing and risk controls

### Database Models

- **User**: Complete user profiles with subscriptions and preferences
- **TradingAnalysis**: AI-generated trading analysis with results
- **CreditUsage**: Detailed credit consumption tracking

### API Endpoints

#### Authentication (`/api/auth`)
```
POST   /register           - Register new user
POST   /login              - User login
POST   /refresh            - Refresh JWT token
POST   /logout             - User logout
GET    /me                 - Get current user
PUT    /profile            - Update user profile
PUT    /change-password    - Change password
POST   /forgot-password    - Request password reset
POST   /reset-password     - Reset password with token
POST   /verify-email       - Verify email address
PUT    /2fa                - Toggle 2FA
GET    /dashboard          - Get dashboard data
```

#### Trading (`/api/trading`)
```
POST   /analyze            - Generate AI trading analysis
POST   /execute            - Execute trade via broker
GET    /history            - Get trading history
GET    /performance        - Get performance statistics
GET    /analysis/:id       - Get specific analysis
PUT    /analysis/:id/feedback - Update analysis feedback
GET    /insights           - Get trading insights
GET    /symbols            - Get available symbols
GET    /market-data/:symbol - Get real-time market data
```

#### Subscription (`/api/subscription`)
```
GET    /plans              - Get available plans
GET    /plans/:id          - Get specific plan
POST   /subscribe          - Subscribe to plan
PUT    /change-plan        - Change subscription plan
POST   /cancel             - Cancel subscription
POST   /reactivate         - Reactivate subscription
POST   /credits/purchase   - Purchase additional credits
GET    /analytics          - Get subscription analytics
GET    /billing-history    - Get billing history
GET    /limits/:action     - Check plan limits
GET    /credit-packages    - Get credit packages
GET    /status             - Get subscription status
POST   /webhook            - Payment provider webhook
```

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: API endpoint rate limiting
- **Input Validation**: Request validation and sanitization
- **CORS Protection**: Configurable cross-origin policies
- **Security Headers**: Helmet.js security headers
- **Error Handling**: Centralized error management

## 📊 Subscription Plans

### Starter Plan ($29.99/month)
- 100 monthly credits
- Basic AI analysis
- Market data access
- Email support
- Risk management

### Professional Plan ($79.99/month)
- 300 monthly credits
- All AI models
- Auto-trading features
- Priority support
- Portfolio analytics

### Enterprise Plan ($199.99/month)
- 1000 monthly credits
- Unlimited analysis
- API access
- Dedicated support
- Custom strategies

## 🤖 AI Models Supported

- **GPT-3.5 Turbo**: Fast analysis (1 credit)
- **GPT-4**: Advanced analysis (2 credits)
- **Claude Sonnet 3.5**: Balanced analysis (2 credits)
- **Claude Opus 3**: Premium analysis (3 credits)

## 🔧 Development

### Project Structure
```
backend/
├── src/
│   ├── ai/                 # AI model integrations
│   ├── config/             # Configuration files
│   ├── controllers/        # Route controllers
│   ├── middleware/         # Express middleware
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   └── app.js             # Main application
├── .env.example           # Environment template
├── package.json           # Dependencies
└── server.js              # Entry point
```

### Available Scripts
```bash
npm run dev        # Start development server with nodemon
npm start          # Start production server
npm test           # Run tests (when implemented)
npm run lint       # Check code style (when configured)
```

### Development Guidelines

1. **Code Style**: Use ES6+ features and modern JavaScript
2. **Error Handling**: Always use try-catch with proper error responses
3. **Validation**: Validate all inputs before processing
4. **Security**: Follow OWASP security guidelines
5. **Documentation**: Document all API endpoints and functions

## 🚀 Deployment

### Production Checklist

1. **Environment Variables**: Set all production environment variables
2. **Database**: Configure production MongoDB instance
3. **Security**: Enable HTTPS and security headers
4. **Monitoring**: Set up logging and monitoring
5. **Scaling**: Configure load balancing if needed

### Docker Deployment (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src ./src
COPY server.js ./
EXPOSE 5000
CMD ["node", "server.js"]
```

## 🧪 Testing

### Testing the API

1. **Health Check**
```bash
curl http://localhost:5000/health
```

2. **Register User**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","firstName":"Test","lastName":"User"}'
```

3. **Generate Analysis**
```bash
curl -X POST http://localhost:5000/api/trading/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"symbol":"EURUSD","timeframe":"1h","analysisType":"full"}'
```

## 📝 API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support and questions:
- Email: support@tradingai.com
- Documentation: https://docs.tradingai.com
- Issues: GitHub Issues page

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Trading AI Platform** - Empowering traders with AI-driven insights and automated risk management.
