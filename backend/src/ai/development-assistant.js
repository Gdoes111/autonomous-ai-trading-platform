import GPT5ReasoningPartner from './gpt5-reasoning-partner.js';

/**
 * Development Assistant - Uses GPT-5 reasoning partner to enhance development decisions
 * This is a utility for the main AI to get deeper insights during development
 */
class DevelopmentAssistant {
    constructor() {
        this.reasoningPartner = new GPT5ReasoningPartner();
        this.currentSession = null;
    }

    /**
     * Start a focused development session on a specific topic
     */
    async startDevelopmentSession(topic, context = {}) {
        this.reasoningPartner.startNewSession();
        this.currentSession = {
            topic,
            context,
            startTime: new Date(),
            decisions: []
        };

        const sessionAnalysis = await this.reasoningPartner.consultForDeepThinking(
            `Starting development session on: ${topic}. Help me understand the key considerations and approach.`,
            context,
            'planning'
        );

        return {
            session: this.currentSession,
            initialAnalysis: sessionAnalysis
        };
    }

    /**
     * Get reasoning on a specific development decision
     */
    async analyzeDecision(decision, options, criteria) {
        const analysis = await this.reasoningPartner.consultForDeepThinking(
            `Help me analyze this development decision: ${decision}`,
            {
                options,
                criteria,
                session: this.currentSession?.topic
            },
            'decision_analysis'
        );

        if (this.currentSession) {
            this.currentSession.decisions.push({
                decision,
                options,
                analysis,
                timestamp: new Date()
            });
        }

        return analysis;
    }

    /**
     * Code architecture consultation
     */
    async consultOnArchitecture(component, requirements, constraints) {
        return await this.reasoningPartner.analyzeArchitecture(
            `Design architecture for ${component}`,
            requirements,
            constraints
        );
    }

    /**
     * Algorithm design consultation
     */
    async consultOnAlgorithm(purpose, inputs, outputs, constraints) {
        return await this.reasoningPartner.designAlgorithm(
            { purpose, inputs, outputs },
            constraints,
            {}
        );
    }

    /**
     * Business logic consultation
     */
    async consultOnBusinessLogic(feature, stakeholders, requirements) {
        return await this.reasoningPartner.analyzeBusinessLogic(
            `Design business logic for ${feature}`,
            stakeholders,
            requirements
        );
    }

    /**
     * Security review consultation
     */
    async consultOnSecurity(feature, dataTypes, threats) {
        return await this.reasoningPartner.analyzeSecurityImplications(
            feature,
            dataTypes,
            threats
        );
    }

    /**
     * UX design consultation
     */
    async consultOnUserExperience(userFlow, painPoints, goals) {
        return await this.reasoningPartner.analyzeUserExperience(
            userFlow,
            userFlow,
            painPoints
        );
    }

    /**
     * Get comprehensive analysis from multiple angles
     */
    async getComprehensiveAnalysis(problem, context = {}) {
        return await this.reasoningPartner.getMultiplePerspectives(problem, context);
    }

    /**
     * Quick follow-up question
     */
    async askFollowUp(question) {
        return await this.reasoningPartner.followUp(question);
    }

    /**
     * End development session and get summary
     */
    async endSession() {
        if (!this.currentSession) {
            return { error: 'No active session' };
        }

        const sessionSummary = await this.reasoningPartner.consultForDeepThinking(
            `Summarize this development session and provide key insights and recommendations.`,
            {
                session: this.currentSession,
                decisions: this.currentSession.decisions.length,
                duration: new Date() - this.currentSession.startTime
            },
            'session_summary'
        );

        const completedSession = this.currentSession;
        this.currentSession = null;

        return {
            session: completedSession,
            summary: sessionSummary,
            conversationHistory: this.reasoningPartner.getConversationHistory()
        };
    }

    /**
     * Specialized consultations for trading platform development
     */

    async consultOnTradingFeature(featureName, tradingRequirements, riskConsiderations) {
        const context = {
            domain: 'financial_trading',
            regulations: ['MiFID_II', 'ESMA', 'SEC'],
            riskFactors: riskConsiderations,
            requirements: tradingRequirements
        };

        return await this.reasoningPartner.consultForDeepThinking(
            `Design and analyze the ${featureName} feature for a trading platform`,
            context,
            'trading_feature'
        );
    }

    async consultOnAIIntegration(aiModels, useCases, performanceRequirements) {
        const context = {
            models: aiModels,
            useCases,
            performance: performanceRequirements,
            billing: 'credit_based',
            compliance: 'financial_regulations'
        };

        return await this.reasoningPartner.consultForDeepThinking(
            'Design AI model integration architecture for trading platform',
            context,
            'ai_integration'
        );
    }

    async consultOnRiskManagement(riskTypes, mitigationStrategies, regulations) {
        const context = {
            riskTypes,
            strategies: mitigationStrategies,
            regulations,
            domain: 'automated_trading'
        };

        return await this.reasoningPartner.consultForDeepThinking(
            'Design comprehensive risk management system',
            context,
            'risk_management'
        );
    }

    async consultOnScalability(currentLoad, targetLoad, constraints) {
        const context = {
            current: currentLoad,
            target: targetLoad,
            constraints,
            type: 'real_time_trading_platform'
        };

        return await this.reasoningPartner.consultForDeepThinking(
            'Analyze scalability requirements and design scaling strategy',
            context,
            'scalability'
        );
    }

    /**
     * Debugging assistance
     */
    async helpWithDebugging(issue, symptoms, context, attemptedSolutions = []) {
        return await this.reasoningPartner.debugComplexIssue(
            issue,
            symptoms,
            attemptedSolutions,
            context
        );
    }

    /**
     * Code review assistance
     */
    async reviewCode(codeDescription, concerns, requirements) {
        return await this.reasoningPartner.consultForDeepThinking(
            `Review this code design: ${codeDescription}`,
            {
                concerns,
                requirements,
                type: 'code_review'
            },
            'code_review'
        );
    }

    /**
     * Performance optimization consultation
     */
    async optimizePerformance(component, currentPerformance, targetPerformance, constraints) {
        return await this.reasoningPartner.consultForDeepThinking(
            `Optimize performance for ${component}`,
            {
                current: currentPerformance,
                target: targetPerformance,
                constraints,
                type: 'performance_optimization'
            },
            'performance'
        );
    }

    /**
     * Get current session status
     */
    getSessionStatus() {
        return this.currentSession ? {
            active: true,
            topic: this.currentSession.topic,
            duration: new Date() - this.currentSession.startTime,
            decisions: this.currentSession.decisions.length
        } : {
            active: false
        };
    }
}

// Singleton instance for use throughout development
const developmentAssistant = new DevelopmentAssistant();

export default developmentAssistant;
export { DevelopmentAssistant };
