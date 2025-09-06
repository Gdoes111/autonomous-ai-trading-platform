import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config/environment.js';
import GPT5ReasoningEngine from './gpt5-reasoning.js';

/**
 * Unified AI Model Manager for Trading Platform
 * Supports GPT-3.5, GPT-4, GPT-5, Claude Sonnet 4, Claude Opus 4.1
 */
class AIModelManager {
    constructor() {
        this.openaiClient = new OpenAI({
            apiKey: config.OPENAI_API_KEY
        });
        
        this.anthropicClient = new Anthropic({
            apiKey: config.ANTHROPIC_API_KEY
        });
        
        this.gpt5Reasoning = new GPT5ReasoningEngine();
        
        this.models = {
            'gpt-3.5-turbo': {
                provider: 'openai',
                maxTokens: 4096,
                costPerToken: 0.001,
                description: 'Fast and efficient for general trading analysis'
            },
            'gpt-4': {
                provider: 'openai',
                maxTokens: 8192,
                costPerToken: 0.03,
                description: 'Advanced reasoning for complex trading strategies'
            },
            'gpt-5': {
                provider: 'openai',
                maxTokens: 8192,
                costPerToken: 0.05,
                description: 'State-of-the-art reasoning and analysis'
            },
            'claude-3-sonnet-20240229': {
                provider: 'anthropic',
                maxTokens: 4096,
                costPerToken: 0.015,
                description: 'Balanced performance for trading insights'
            },
            'claude-3-opus-20240229': {
                provider: 'anthropic',
                maxTokens: 4096,
                costPerToken: 0.075,
                description: 'Most capable model for sophisticated analysis'
            }
        };
        
        this.usageTracking = new Map();
    }

    /**
     * Generate trading analysis using specified AI model
     */
    async generateAnalysis(modelName, prompt, context = {}, userId = null) {
        try {
            if (!this.models[modelName]) {
                throw new Error(`Model ${modelName} not supported`);
            }

            const model = this.models[modelName];
            let response;
            
            // Use GPT-5 reasoning engine for complex reasoning tasks
            if (modelName === 'gpt-5' && context.useReasoning) {
                response = await this.gpt5Reasoning.reason(prompt, context);
            } else {
                response = await this._callModel(modelName, prompt, context);
            }

            // Track usage for billing
            if (userId && response.usage) {
                this._trackUsage(userId, modelName, response.usage);
            }

            return {
                success: true,
                model: modelName,
                response: response.choices ? response.choices[0].message.content : response.reasoning,
                usage: response.usage,
                cost: this._calculateCost(modelName, response.usage),
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error(`AI Model Error (${modelName}):`, error);
            return {
                success: false,
                error: error.message,
                model: modelName,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Call specific AI model based on provider
     */
    async _callModel(modelName, prompt, context) {
        const model = this.models[modelName];
        
        if (model.provider === 'openai') {
            return await this._callOpenAI(modelName, prompt, context);
        } else if (model.provider === 'anthropic') {
            return await this._callAnthropic(modelName, prompt, context);
        }
        
        throw new Error(`Unknown provider for model ${modelName}`);
    }

    /**
     * Call OpenAI models
     */
    async _callOpenAI(modelName, prompt, context) {
        const systemPrompt = this._buildTradingSystemPrompt(context);
        
        return await this.openaiClient.chat.completions.create({
            model: modelName,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ],
            max_tokens: this.models[modelName].maxTokens,
            temperature: context.temperature || 0.1,
            top_p: 0.9
        });
    }

    /**
     * Call Anthropic models (Claude)
     */
    async _callAnthropic(modelName, prompt, context) {
        const systemPrompt = this._buildTradingSystemPrompt(context);
        
        const response = await this.anthropicClient.messages.create({
            model: modelName,
            max_tokens: this.models[modelName].maxTokens,
            temperature: context.temperature || 0.1,
            system: systemPrompt,
            messages: [
                { role: "user", content: prompt }
            ]
        });

        // Convert Anthropic response format to match OpenAI format
        return {
            choices: [{
                message: {
                    content: response.content[0].text
                }
            }],
            usage: {
                prompt_tokens: response.usage.input_tokens,
                completion_tokens: response.usage.output_tokens,
                total_tokens: response.usage.input_tokens + response.usage.output_tokens
            }
        };
    }

    /**
     * Build trading-specific system prompt
     */
    _buildTradingSystemPrompt(context) {
        let basePrompt = `You are an expert trading AI assistant with deep knowledge of financial markets, technical analysis, and risk management. 

Core Responsibilities:
- Provide accurate market analysis and trading insights
- Prioritize risk management in all recommendations
- Use quantitative analysis combined with market psychology
- Consider multiple timeframes and market conditions
- Provide actionable trading advice with clear reasoning

Guidelines:
- Always include risk warnings and position sizing advice
- Consider market volatility and liquidity
- Account for transaction costs and slippage
- Provide specific entry/exit criteria
- Mention relevant economic factors and news events`;

        if (context.analysisType) {
            switch (context.analysisType) {
                case 'technical':
                    basePrompt += `\n\nFocus on technical analysis including chart patterns, indicators, support/resistance levels, and price action.`;
                    break;
                case 'fundamental':
                    basePrompt += `\n\nFocus on fundamental analysis including economic indicators, company financials, and market sentiment.`;
                    break;
                case 'risk':
                    basePrompt += `\n\nFocus on risk assessment including portfolio correlation, volatility analysis, and position sizing.`;
                    break;
                case 'strategy':
                    basePrompt += `\n\nFocus on trading strategy development and optimization based on market conditions.`;
                    break;
            }
        }

        if (context.timeframe) {
            basePrompt += `\n\nTimeframe: ${context.timeframe}`;
        }

        if (context.riskTolerance) {
            basePrompt += `\n\nRisk Tolerance: ${context.riskTolerance}`;
        }

        return basePrompt;
    }

    /**
     * Multi-model ensemble analysis
     */
    async ensembleAnalysis(prompt, context = {}, models = ['gpt-4', 'claude-3-opus-20240229'], userId = null) {
        const results = [];
        
        for (const modelName of models) {
            const result = await this.generateAnalysis(modelName, prompt, context, userId);
            results.push({
                model: modelName,
                ...result
            });
        }

        // Combine insights from multiple models
        const combinedInsights = await this._combineEnsembleResults(results, prompt);
        
        return {
            success: true,
            ensemble: true,
            models: models,
            individualResults: results,
            combinedInsights,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Combine results from multiple models
     */
    async _combineEnsembleResults(results, originalPrompt) {
        const successfulResults = results.filter(r => r.success);
        
        if (successfulResults.length === 0) {
            return { error: 'No models provided successful results' };
        }

        if (successfulResults.length === 1) {
            return successfulResults[0];
        }

        // Use GPT-4 to synthesize the results
        const synthesisPrompt = `Analyze and synthesize the following AI model responses to provide a comprehensive trading insight:

Original Question: ${originalPrompt}

Model Responses:
${successfulResults.map((result, index) => 
    `Model ${index + 1} (${result.model}): ${result.response}`
).join('\n\n')}

Please provide a synthesized analysis that:
1. Identifies common themes and agreements
2. Highlights any conflicting viewpoints and explains why they might differ
3. Provides a balanced recommendation considering all perspectives
4. Includes confidence levels for different aspects of the analysis`;

        try {
            const synthesis = await this._callOpenAI('gpt-4', synthesisPrompt, {
                analysisType: 'synthesis',
                temperature: 0.1
            });

            return {
                synthesis: synthesis.choices[0].message.content,
                modelCount: successfulResults.length,
                confidence: this._calculateEnsembleConfidence(successfulResults)
            };
        } catch (error) {
            return {
                error: 'Failed to synthesize ensemble results',
                individualResults: successfulResults
            };
        }
    }

    /**
     * Calculate confidence based on model agreement
     */
    _calculateEnsembleConfidence(results) {
        // Simple confidence calculation based on response similarity
        // In a real implementation, you'd use more sophisticated NLP techniques
        return results.length > 1 ? 'medium' : 'high';
    }

    /**
     * Track usage for billing purposes
     */
    _trackUsage(userId, modelName, usage) {
        const key = `${userId}-${modelName}`;
        const current = this.usageTracking.get(key) || { tokens: 0, requests: 0, cost: 0 };
        
        current.tokens += usage.total_tokens || 0;
        current.requests += 1;
        current.cost += this._calculateCost(modelName, usage);
        
        this.usageTracking.set(key, current);
    }

    /**
     * Calculate cost based on token usage
     */
    _calculateCost(modelName, usage) {
        if (!usage || !this.models[modelName]) return 0;
        
        const model = this.models[modelName];
        return (usage.total_tokens || 0) * model.costPerToken;
    }

    /**
     * Get user usage statistics
     */
    getUserUsage(userId) {
        const userUsage = {};
        
        for (const [key, usage] of this.usageTracking) {
            if (key.startsWith(userId + '-')) {
                const model = key.replace(userId + '-', '');
                userUsage[model] = usage;
            }
        }
        
        return userUsage;
    }

    /**
     * Get available models information
     */
    getAvailableModels() {
        return Object.entries(this.models).map(([name, info]) => ({
            name,
            provider: info.provider,
            maxTokens: info.maxTokens,
            costPerToken: info.costPerToken,
            description: info.description
        }));
    }

    /**
     * Specialized trading analysis methods
     */
    
    async technicalAnalysis(symbol, timeframe, data, userId = null, modelName = 'gpt-4') {
        const prompt = `Perform technical analysis for ${symbol} on ${timeframe} timeframe. 
        
        Market Data: ${JSON.stringify(data)}
        
        Please provide:
        1. Current trend analysis
        2. Key support and resistance levels
        3. Technical indicators interpretation
        4. Entry/exit signals
        5. Risk management recommendations`;

        return await this.generateAnalysis(modelName, prompt, {
            analysisType: 'technical',
            timeframe,
            symbol
        }, userId);
    }

    async riskAssessment(portfolio, proposedTrade, userId = null, modelName = 'gpt-5') {
        const prompt = `Assess the risk of the following proposed trade:
        
        Current Portfolio: ${JSON.stringify(portfolio)}
        Proposed Trade: ${JSON.stringify(proposedTrade)}
        
        Please analyze:
        1. Position sizing recommendations
        2. Portfolio correlation impact
        3. Risk-reward ratio
        4. Maximum drawdown scenarios
        5. Stop-loss and take-profit levels`;

        return await this.generateAnalysis(modelName, prompt, {
            analysisType: 'risk',
            useReasoning: true
        }, userId);
    }

    async marketSentiment(newsData, socialData, userId = null, modelName = 'claude-3-opus-20240229') {
        const prompt = `Analyze market sentiment based on the following data:
        
        News Data: ${JSON.stringify(newsData)}
        Social Media Data: ${JSON.stringify(socialData)}
        
        Please provide:
        1. Overall sentiment score
        2. Key sentiment drivers
        3. Potential market impact
        4. Trading implications
        5. Sentiment shift indicators`;

        return await this.generateAnalysis(modelName, prompt, {
            analysisType: 'fundamental'
        }, userId);
    }
}

export default AIModelManager;
