import GPT5ReasoningPartner from './gpt5-reasoning-partner.js';

console.log('🧠 Real GPT-4.1 Reasoning Demo for Trading Platform');
console.log('═'.repeat(60));

async function demonstrateRealReasoning() {
    const reasoningPartner = new GPT5ReasoningPartner();
    
    try {
        console.log('🤔 Asking GPT-4.1 for architecture advice...');
        
        const architectureQuestion = `
        I'm building a trading AI subscription platform with these requirements:
        - Multiple AI models (GPT-3.5, GPT-4, Claude)
        - Real-time trading data integration
        - Credit-based billing system
        - User dashboards with live updates
        - Darwinex broker integration
        
        Should I use a microservices or monolithic architecture? What are the specific pros and cons for a trading platform?
        `;

        const analysis = await reasoningPartner.consultForDeepThinking(
            architectureQuestion,
            {
                userCount: '1000_target',
                budget: 'startup',
                team: 'small_team',
                timeline: '6_months'
            },
            'architecture'
        );

        if (analysis.success) {
            console.log('✅ GPT-4.1 Architecture Analysis:');
            console.log('─'.repeat(50));
            console.log(analysis.reasoning);
            console.log('\n📊 Tokens used:', analysis.usage?.total_tokens);
        } else {
            console.log('❌ Analysis failed:', analysis.error);
        }

        console.log('\n' + '═'.repeat(60));
        console.log('🎯 Follow-up Question...');

        const followUp = await reasoningPartner.followUp(
            'Given that recommendation, what specific database design would you suggest for handling user credits, AI request logs, and trading data?'
        );

        if (followUp.success) {
            console.log('✅ GPT-4.1 Database Design Advice:');
            console.log('─'.repeat(50));
            console.log(followUp.reasoning);
            console.log('\n📊 Additional tokens:', followUp.usage?.total_tokens);
        }

        console.log('\n' + '═'.repeat(60));
        console.log('🎉 Real GPT-4.1 reasoning complete!');
        console.log('💰 This used actual OpenAI credits for genuine AI consultation');

    } catch (error) {
        console.error('❌ Reasoning failed:', error.message);
    }
}

demonstrateRealReasoning();
