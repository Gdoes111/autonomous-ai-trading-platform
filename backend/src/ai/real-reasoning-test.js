import GPT5ReasoningPartner from './gpt5-reasoning-partner.js';
import developmentAssistant from './development-assistant.js';

/**
 * Real GPT-4.1 Reasoning Demo - Uses actual OpenAI API
 * This demonstrates genuine AI reasoning for your trading platform
 */

async function testRealReasoning() {
    console.log('🧠 Real GPT-4.1 Reasoning Partner Test');
    console.log('═'.repeat(60));
    console.log('🔑 Using your OpenAI API key for actual reasoning\n');

    try {
        // Start a real development session
        console.log('🚀 Starting Real Development Session...');
        const session = await developmentAssistant.startDevelopmentSession(
            'Trading AI Platform - User Dashboard Design',
            {
                userRequirements: [
                    'Private dashboard for each subscriber',
                    'Real-time AI analysis display',
                    'Credit usage tracking',
                    'Trading performance metrics',
                    'Risk management controls'
                ],
                constraints: [
                    'Must work on mobile and desktop',
                    'Real-time updates required',
                    'Financial data security',
                    'Regulatory compliance'
                ],
                targetUsers: ['retail traders', 'professional traders', 'institutions']
            }
        );

        if (session.initialAnalysis.success) {
            console.log('✅ GPT-4.1 Initial Analysis:');
            console.log(session.initialAnalysis.reasoning);
        } else {
            console.log('❌ Initial analysis failed:', session.initialAnalysis.error);
        }

        console.log('\n' + '─'.repeat(60));

        // Real architecture consultation
        console.log('🏗️  Real Architecture Consultation...');
        const architectureAnalysis = await developmentAssistant.consultOnArchitecture(
            'Real-time Dashboard Architecture',
            {
                features: [
                    'Live AI analysis results',
                    'Real-time portfolio updates',
                    'Credit usage meters',
                    'Trading signal notifications',
                    'Performance charts'
                ],
                performance: {
                    updateFrequency: '< 1 second',
                    concurrentUsers: '1000+',
                    dataVolume: 'high'
                }
            },
            {
                technology: 'web_based',
                budget: 'startup_level',
                team_size: 'small',
                timeline: '3_months'
            }
        );

        if (architectureAnalysis.success) {
            console.log('✅ GPT-4.1 Architecture Insights:');
            console.log(architectureAnalysis.reasoning);
        } else {
            console.log('❌ Architecture analysis failed:', architectureAnalysis.error);
        }

        console.log('\n' + '─'.repeat(60));

        // Real business logic consultation
        console.log('💳 Real Credit System Design Consultation...');
        const creditSystemAnalysis = await developmentAssistant.consultOnBusinessLogic(
            'Credit System with Fair Usage Policy',
            {
                userTypes: [
                    'Free tier users (limited credits)',
                    'Basic subscribers ($29/month)',
                    'Pro subscribers ($99/month)',
                    'Enterprise clients (custom)'
                ],
                usagePatterens: [
                    'Casual analysis (few requests/day)',
                    'Active trading (dozens/day)',
                    'Algorithmic trading (hundreds/day)'
                ]
            },
            {
                fairness: 'prevent_abuse_while_allowing_legitimate_usage',
                billing: 'transparent_and_predictable',
                scalability: 'handle_usage_spikes',
                compliance: 'clear_terms_of_service'
            }
        );

        if (creditSystemAnalysis.success) {
            console.log('✅ GPT-4.1 Credit System Design:');
            console.log(creditSystemAnalysis.reasoning);
        } else {
            console.log('❌ Credit system analysis failed:', creditSystemAnalysis.error);
        }

        console.log('\n' + '─'.repeat(60));

        // Real follow-up question
        console.log('❓ Real Follow-up Question...');
        const followUp = await developmentAssistant.askFollowUp(
            'Based on the dashboard and credit system analysis, what specific database schema would you recommend for storing user sessions, credit transactions, and AI request history?'
        );

        if (followUp.success) {
            console.log('✅ GPT-4.1 Database Schema Recommendations:');
            console.log(followUp.reasoning);
        } else {
            console.log('❌ Follow-up failed:', followUp.error);
        }

        // End session and get summary
        console.log('\n' + '─'.repeat(60));
        console.log('📝 Ending Real Reasoning Session...');
        
        const sessionEnd = await developmentAssistant.endSession();
        
        if (sessionEnd.summary.success) {
            console.log('✅ GPT-4.1 Session Summary:');
            console.log(sessionEnd.summary.reasoning);
        }

        console.log('\n' + '═'.repeat(60));
        console.log('🎉 Real GPT-4.1 Reasoning Test Complete!');
        console.log('💰 This used actual API credits for genuine AI reasoning');
        console.log('🧠 GPT-4.1 provided real insights for your trading platform');
        console.log('═'.repeat(60));

    } catch (error) {
        console.error('❌ Real reasoning test failed:', error.message);
        
        if (error.message.includes('API key')) {
            console.log('\n💡 Troubleshooting:');
            console.log('• Check that your OpenAI API key is correct');
            console.log('• Ensure you have sufficient credits');
            console.log('• Verify the key has GPT-4 access');
        }
    }
}

// Quick API connectivity test
async function testAPIConnection() {
    console.log('🔌 Testing OpenAI API Connection...');
    
    try {
        const reasoningPartner = new GPT5ReasoningPartner();
        const simpleTest = await reasoningPartner.consultForDeepThinking(
            'Hello, can you confirm you are working correctly?',
            { type: 'connectivity_test' },
            'test'
        );
        
        if (simpleTest.success) {
            console.log('✅ API Connection Successful!');
            console.log('🤖 GPT-4.1 Response:', simpleTest.reasoning.substring(0, 200) + '...');
            console.log('💰 Tokens used:', simpleTest.usage?.total_tokens || 'Unknown');
            return true;
        } else {
            console.log('❌ API Connection Failed:', simpleTest.error);
            return false;
        }
    } catch (error) {
        console.log('❌ Connection Error:', error.message);
        return false;
    }
}

// Main execution
async function main() {
    console.log('🚀 Starting Real GPT-4.1 Reasoning Tests\n');
    
    // Test API connection first
    const connected = await testAPIConnection();
    
    if (connected) {
        console.log('\n' + '═'.repeat(60));
        console.log('🧠 Proceeding with full reasoning demonstration...\n');
        await testRealReasoning();
    } else {
        console.log('\n❌ Cannot proceed - API connection failed');
        console.log('Please check your OpenAI API key and try again');
    }
}

// Export for use in other modules
export { testRealReasoning, testAPIConnection };

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}
