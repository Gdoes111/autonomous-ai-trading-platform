import OpenAI from 'openai';
import { config } from '../config/environment.js';

/**
 * GPT-5 Reasoning Partner for Enhanced Development Thinking
 * This allows the main AI to consult with GPT-5 for deeper analysis and reasoning
 */
class GPT5ReasoningPartner {
    constructor() {
        this.client = new OpenAI({
            apiKey: config.OPENAI_API_KEY
        });
        this.model = 'gpt-4-1106-preview'; // Using GPT-4 Turbo (GPT-4.1) for enhanced reasoning
        this.conversationHistory = [];
    }

    /**
     * Consult GPT-5 for deeper thinking on a problem
     * @param {string} problem - The problem or question to analyze
     * @param {Object} context - Additional context about the problem
     * @param {string} thinkingType - Type of thinking needed (analysis, design, debugging, etc.)
     */
    async consultForDeepThinking(problem, context = {}, thinkingType = 'analysis') {
        try {
            const systemPrompt = this.buildReasoningSystemPrompt(thinkingType);
            const consultationPrompt = this.buildConsultationPrompt(problem, context);

            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    { role: "system", content: systemPrompt },
                    ...this.conversationHistory,
                    { role: "user", content: consultationPrompt }
                ],
                max_tokens: 4096,
                temperature: 0.2,
                top_p: 0.9
            });

            const reasoning = response.choices[0].message.content;
            
            // Add to conversation history for follow-up questions
            this.conversationHistory.push(
                { role: "user", content: consultationPrompt },
                { role: "assistant", content: reasoning }
            );

            // Keep conversation history manageable
            if (this.conversationHistory.length > 10) {
                this.conversationHistory = this.conversationHistory.slice(-8);
            }

            return {
                success: true,
                reasoning,
                thinkingType,
                usage: response.usage,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('GPT-5 Reasoning Partner Error:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Ask GPT-5 to analyze architectural decisions
     */
    async analyzeArchitecture(architecturalProblem, currentDesign, constraints = {}) {
        const context = {
            type: 'architecture',
            currentDesign,
            constraints,
            project: 'Trading AI Subscription Platform'
        };

        return await this.consultForDeepThinking(
            architecturalProblem,
            context,
            'architecture'
        );
    }

    /**
     * Get GPT-5's perspective on algorithm design
     */
    async designAlgorithm(algorithmRequirements, performanceConstraints, tradeoffs) {
        const context = {
            type: 'algorithm',
            requirements: algorithmRequirements,
            constraints: performanceConstraints,
            tradeoffs
        };

        return await this.consultForDeepThinking(
            'Design an optimal algorithm for these requirements',
            context,
            'algorithm'
        );
    }

    /**
     * Consult on complex business logic
     */
    async analyzeBusinessLogic(businessProblem, stakeholderNeeds, technicalConstraints) {
        const context = {
            type: 'business_logic',
            stakeholders: stakeholderNeeds,
            technical: technicalConstraints,
            domain: 'financial_trading'
        };

        return await this.consultForDeepThinking(
            businessProblem,
            context,
            'business_analysis'
        );
    }

    /**
     * Get help with debugging complex issues
     */
    async debugComplexIssue(issue, symptoms, attemptedSolutions, codeContext) {
        const context = {
            type: 'debugging',
            symptoms,
            attempted: attemptedSolutions,
            code: codeContext
        };

        return await this.consultForDeepThinking(
            `Help debug this complex issue: ${issue}`,
            context,
            'debugging'
        );
    }

    /**
     * Consult on security considerations
     */
    async analyzeSecurityImplications(feature, data, threatModel) {
        const context = {
            type: 'security',
            feature,
            dataTypes: data,
            threats: threatModel,
            domain: 'fintech_trading'
        };

        return await this.consultForDeepThinking(
            'Analyze security implications and provide recommendations',
            context,
            'security'
        );
    }

    /**
     * Get perspective on user experience decisions
     */
    async analyzeUserExperience(userScenario, currentFlow, painPoints) {
        const context = {
            type: 'ux',
            scenario: userScenario,
            currentFlow,
            painPoints,
            users: 'traders_and_investors'
        };

        return await this.consultForDeepThinking(
            'How can we improve this user experience?',
            context,
            'ux_design'
        );
    }

    /**
     * Multi-perspective analysis on complex problems
     */
    async getMultiplePerspectives(problem, context = {}) {
        const perspectives = [
            'technical_feasibility',
            'business_impact',
            'user_experience',
            'security_implications',
            'scalability_concerns'
        ];

        const results = [];

        for (const perspective of perspectives) {
            const result = await this.consultForDeepThinking(
                `Analyze from ${perspective.replace('_', ' ')} perspective: ${problem}`,
                { ...context, perspective },
                perspective
            );
            
            results.push({
                perspective,
                analysis: result
            });
        }

        // Synthesize all perspectives
        const synthesis = await this.synthesizePerspectives(problem, results);

        return {
            success: true,
            problem,
            perspectives: results,
            synthesis,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Synthesize multiple perspectives into coherent recommendations
     */
    async synthesizePerspectives(originalProblem, perspectiveResults) {
        const synthesisPrompt = `I've analyzed a problem from multiple perspectives. Help me synthesize these into coherent, actionable recommendations.

Original Problem: ${originalProblem}

Perspective Analyses:
${perspectiveResults.map((result, index) => 
    `${index + 1}. ${result.perspective}: ${result.analysis.success ? result.analysis.reasoning : 'Analysis failed'}`
).join('\n\n')}

Please provide:
1. Key insights that emerge across perspectives
2. Potential conflicts between perspectives and how to resolve them
3. Prioritized recommendations
4. Implementation strategy
5. Risk mitigation approaches`;

        return await this.consultForDeepThinking(
            synthesisPrompt,
            { type: 'synthesis' },
            'synthesis'
        );
    }

    /**
     * Build system prompt based on thinking type
     */
    buildReasoningSystemPrompt(thinkingType) {
        let basePrompt = `You are an expert reasoning partner helping with the development of a Trading AI Subscription Platform. Your role is to provide deep, thoughtful analysis to enhance decision-making.

Core Capabilities:
- Deep analytical thinking and problem decomposition
- Multiple perspective analysis
- Risk-benefit evaluation
- Creative problem-solving
- Technical and business expertise in fintech/trading

Project Context: Building a subscription platform for trading AI with multiple AI models (GPT, Claude), risk management, and Darwinex integration.`;

        const prompts = {
            architecture: `
Focus: Software Architecture & System Design
- Analyze scalability, maintainability, and performance
- Consider microservices vs monolith trade-offs
- Database design and data flow optimization
- API design and integration patterns
- Security architecture for financial data`,

            algorithm: `
Focus: Algorithm Design & Optimization
- Computational complexity analysis
- Data structure selection
- Performance optimization strategies
- Memory usage considerations
- Real-time processing requirements`,

            business_analysis: `
Focus: Business Logic & Requirements
- Stakeholder need analysis
- Business rule implementation
- Revenue model implications
- User journey optimization
- Competitive analysis`,

            debugging: `
Focus: Complex Problem Debugging
- Root cause analysis
- System interaction mapping
- Edge case identification
- Testing strategy recommendations
- Performance bottleneck detection`,

            security: `
Focus: Security & Compliance
- Threat modeling for fintech applications
- Data protection and privacy compliance
- Authentication and authorization strategies
- Financial regulation compliance (MiFID II, etc.)
- API security best practices`,

            ux_design: `
Focus: User Experience & Interface Design
- User psychology in trading applications
- Information hierarchy and cognitive load
- Mobile-first design considerations
- Accessibility in financial applications
- User onboarding and retention`,

            synthesis: `
Focus: Multi-Perspective Synthesis
- Identify common themes and conflicts
- Prioritize recommendations by impact/effort
- Create implementation roadmaps
- Risk assessment and mitigation
- Stakeholder communication strategies`
        };

        return basePrompt + (prompts[thinkingType] || prompts.analysis);
    }

    /**
     * Build consultation prompt with context
     */
    buildConsultationPrompt(problem, context) {
        let prompt = `I need your deep thinking and analysis on this problem:

${problem}`;

        if (context.type) {
            prompt += `\n\nContext Type: ${context.type}`;
        }

        if (context.currentDesign) {
            prompt += `\n\nCurrent Design:\n${JSON.stringify(context.currentDesign, null, 2)}`;
        }

        if (context.constraints) {
            prompt += `\n\nConstraints:\n${JSON.stringify(context.constraints, null, 2)}`;
        }

        if (context.requirements) {
            prompt += `\n\nRequirements:\n${JSON.stringify(context.requirements, null, 2)}`;
        }

        if (context.stakeholders) {
            prompt += `\n\nStakeholder Needs:\n${JSON.stringify(context.stakeholders, null, 2)}`;
        }

        prompt += `\n\nPlease provide deep, thoughtful analysis with:
1. Problem decomposition and key insights
2. Multiple solution approaches with trade-offs
3. Specific, actionable recommendations
4. Potential risks and mitigation strategies
5. Implementation considerations

Think step by step and provide reasoning for your analysis.`;

        return prompt;
    }

    /**
     * Start a new reasoning session (clear history)
     */
    startNewSession() {
        this.conversationHistory = [];
        return { message: 'New reasoning session started' };
    }

    /**
     * Get conversation history for review
     */
    getConversationHistory() {
        return this.conversationHistory;
    }

    /**
     * Follow-up question in the same context
     */
    async followUp(question) {
        return await this.consultForDeepThinking(question, { type: 'follow_up' }, 'follow_up');
    }
}

export default GPT5ReasoningPartner;
