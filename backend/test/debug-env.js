/**
 * Debug Environment Variables
 */

import 'dotenv/config';

console.log('Environment variables:');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Present' : 'Missing');
console.log('REDDIT_CLIENT_ID:', process.env.REDDIT_CLIENT_ID ? 'Present' : 'Missing');
console.log('REDDIT_CLIENT_SECRET:', process.env.REDDIT_CLIENT_SECRET ? 'Present' : 'Missing');
console.log('REDDIT_USER_AGENT:', process.env.REDDIT_USER_AGENT || 'Missing');
