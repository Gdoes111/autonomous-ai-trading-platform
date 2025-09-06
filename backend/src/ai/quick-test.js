import OpenAI from 'openai';
import { config } from '../config/environment.js';

console.log('🔌 Testing OpenAI API Connection with GPT-4.1...');
console.log('═'.repeat(50));

async function testConnection() {
    try {
        console.log('🔑 API Key loaded:', config.OPENAI_API_KEY ? 'Yes' : 'No');
        console.log('🔑 Key preview:', config.OPENAI_API_KEY?.substring(0, 20) + '...');
        
        const client = new OpenAI({
            apiKey: config.OPENAI_API_KEY
        });

        console.log('\n🤖 Making test call to GPT-4.1...');
        
        const response = await client.chat.completions.create({
            model: 'gpt-4-1106-preview',
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful assistant testing API connectivity.'
                },
                {
                    role: 'user',
                    content: 'Hello! Please confirm you are GPT-4.1 and working correctly. Respond briefly.'
                }
            ],
            max_tokens: 150,
            temperature: 0.1
        });

        console.log('✅ SUCCESS! GPT-4.1 is working!');
        console.log('🤖 Response:', response.choices[0].message.content);
        console.log('📊 Usage:', response.usage);
        console.log('🏷️  Model:', response.model);
        
        return true;

    } catch (error) {
        console.log('❌ ERROR:', error.message);
        
        if (error.status === 401) {
            console.log('💡 This is an authentication error - check your API key');
        } else if (error.status === 429) {
            console.log('💡 Rate limit or quota exceeded');
        } else if (error.status === 404) {
            console.log('💡 Model not found - GPT-4.1 might not be available');
        }
        
        return false;
    }
}

testConnection();
