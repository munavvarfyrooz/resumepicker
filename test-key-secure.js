import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testOpenAI() {
  try {
    console.log('Testing OpenAI API key...');
    console.log('Key format check: starts with', process.env.OPENAI_API_KEY?.substring(0, 7) + '...');
    console.log('Key length:', process.env.OPENAI_API_KEY?.length);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Reply with: API working' }],
      max_tokens: 10,
    });
    
    console.log('✅ SUCCESS! API Response:', response.choices[0].message.content);
    console.log('The OpenAI API key is valid and working!');
  } catch (error) {
    console.error('❌ API Error:', error.message);
    if (error.status) {
      console.error('Status code:', error.status);
    }
  }
}

testOpenAI();