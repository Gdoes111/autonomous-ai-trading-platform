import OpenAI from 'openai';
import { config } from '../config/environment.js';

/**
 * GPT-5 Reasoning Engine for Trading AI Platform
 * Handles advanced reasoning tasks for trading decisions, risk management, and market analysis
 */
class GPT5ReasoningEngine {
    constructor() {
        this.client = new OpenAI({
            apiKey: config.OPENAI_API_KEY
        });
        this.model = 'gpt-5'; // Update when GPT-5 is available
        this.maxTokens = 4096;
        this.temperature = 0.1; // Low temperature for consistent reasoning
    }

    /**
     * General reasoning method for any trading-related task
     * @param {string} prompt - The reasoning prompt
     * @param {Object} context - Additional context for reasoning
     * @param {Object} options - Configuration options
     */
    async reason(prompt, context = {}, options = {}) {
        try {
            const systemPrompt = this.buildSystemPrompt(context);
            const userPrompt = this.buildUserPrompt(prompt, context);

            const response = await this.client.chat.completions.create({
                model: options.model || this.model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                max_tokens: options.maxTokens || this.maxTokens,
                temperature: options.temperature || this.temperature,
                top_p: 0.9,
                frequency_penalty: 0.1,
                presence_penalty: 0.1
            });

            return {
                success: true,
                reasoning: response.choices[0].message.content,
                usage: response.usage,
                model: response.model,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('GPT-5 Reasoning Error:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Advanced market analysis reasoning
     */
    async analyzeMarket(marketData, indicators, newsEvents = []) {
        const context = {
            type: 'market_analysis',
            marketData,
            indicators,
            newsEvents
        };

        const prompt = `Analyze the current market conditions and provide comprehensive reasoning for trading decisions. 
        Consider technical indicators, market sentiment, news events, and risk factors.
        Provide specific entry/exit points, position sizing recommendations, and risk management strategies.`;

        return await this.reason(prompt, context);
    }

    /**
     * Risk management reasoning
     */
    async assessRisk(portfolio, marketConditions, proposedTrade) {
        const context = {
            type: 'risk_assessment',
            portfolio,
            marketConditions,
            proposedTrade
        };

        const prompt = `Assess the risk of the proposed trade given the current portfolio and market conditions.
        Calculate position sizing, stop-loss levels, and potential risk-reward ratios.
        Consider portfolio correlation, volatility, and maximum drawdown scenarios.`;

        return await this.reason(prompt, context);
    }

    /**
     * Trade strategy optimization
     */
    async optimizeStrategy(historicalData, currentStrategy, performanceMetrics) {
        const context = {
            type: 'strategy_optimization',
            historicalData,
            currentStrategy,
            performanceMetrics
        };

        const prompt = `Analyze the trading strategy performance and suggest optimizations.
        Consider win rate, profit factor, maximum drawdown, and Sharpe ratio.
        Recommend parameter adjustments and risk management improvements.`;

        return await this.reason(prompt, context);
    }

    /**
     * Portfolio rebalancing reasoning
     */
    async rebalancePortfolio(currentPortfolio, targetAllocation, marketOutlook) {
        const context = {
            type: 'portfolio_rebalancing',
            currentPortfolio,
            targetAllocation,
            marketOutlook
        };

        const prompt = `Determine the optimal portfolio rebalancing strategy.
        Consider transaction costs, tax implications, and market timing.
        Provide step-by-step rebalancing actions with reasoning.`;

        return await this.reason(prompt, context);
    }

    /**
     * Build system prompt based on context
     */
    buildSystemPrompt(context) {
        let basePrompt = `You are an advanced AI reasoning engine for a professional trading platform. 
        You provide sophisticated analysis and reasoning for trading decisions, risk management, and portfolio optimization.
        
        Core Principles:
        - Always prioritize risk management over profit maximization
        - Use quantitative analysis combined with qualitative reasoning
        - Consider multiple timeframes and market scenarios
        - Provide actionable insights with clear reasoning
        - Account for market psychology and behavioral factors
        - Maintain consistency with established trading principles`;

        switch (context.type) {
            case 'market_analysis':
                basePrompt += `\n\nSpecialization: Market Analysis
                - Focus on technical and fundamental analysis
                - Consider market structure, trend analysis, and support/resistance levels
                - Analyze volume, momentum, and volatility patterns
                - Integrate news sentiment and market events`;
                break;
            
            case 'risk_assessment':
                basePrompt += `\n\nSpecialization: Risk Assessment
                - Calculate position sizing using Kelly Criterion and fixed fractional methods
                - Assess portfolio correlation and concentration risk
                - Consider market volatility and liquidity risks
                - Evaluate tail risk and black swan scenarios`;
                break;
            
            case 'strategy_optimization':
                basePrompt += `\n\nSpecialization: Strategy Optimization
                - Analyze performance metrics and identify improvement areas
                - Consider market regime changes and strategy adaptability
                - Optimize parameters using statistical significance testing
                - Balance complexity with robustness`;
                break;
            
            case 'portfolio_rebalancing':
                basePrompt += `\n\nSpecialization: Portfolio Management
                - Consider asset correlation and diversification benefits
                - Optimize for risk-adjusted returns
                - Account for transaction costs and market impact
                - Integrate tactical and strategic allocation decisions`;
                break;
        }

        return basePrompt;
    }

    /**
     * Build user prompt with context
     */
    buildUserPrompt(prompt, context) {
        let fullPrompt = prompt;

        if (context.marketData) {
            fullPrompt += `\n\nMarket Data: ${JSON.stringify(context.marketData, null, 2)}`;
        }

        if (context.indicators) {
            fullPrompt += `\n\nTechnical Indicators: ${JSON.stringify(context.indicators, null, 2)}`;
        }

        if (context.portfolio) {
            fullPrompt += `\n\nCurrent Portfolio: ${JSON.stringify(context.portfolio, null, 2)}`;
        }

        if (context.newsEvents && context.newsEvents.length > 0) {
            fullPrompt += `\n\nRecent News Events: ${JSON.stringify(context.newsEvents, null, 2)}`;
        }

        fullPrompt += `\n\nPlease provide detailed reasoning with specific recommendations and quantitative analysis where applicable.`;

        return fullPrompt;
    }

    /**
     * Reasoning for custom trading scenarios
     */
    async customReasoning(scenario, data, question) {
        const context = {
            type: 'custom_reasoning',
            scenario,
            data
        };

        return await this.reason(question, context);
    }

    /**
     * Multi-step reasoning for complex trading decisions
     */
    async multiStepReasoning(steps, initialContext) {
        const results = [];
        let context = { ...initialContext };

        for (const step of steps) {
            const result = await this.reason(step.prompt, context, step.options);
            results.push({
                step: step.name,
                result,
                timestamp: new Date().toISOString()
            });

            // Add previous reasoning to context for next step
            if (result.success) {
                context.previousReasoning = context.previousReasoning || [];
                context.previousReasoning.push({
                    step: step.name,
                    reasoning: result.reasoning
                });
            }
        }

        return {
            success: true,
            steps: results,
            finalContext: context
        };
    }
}

export default GPT5ReasoningEngine;
