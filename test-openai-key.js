const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function testKey() {
  try {
    console.log('Testing OpenAI API key...');
    console.log('Key ends with:', process.env.OPENAI_API_KEY?.slice(-8));
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Say 'API key works!'" }],
      max_tokens: 10
    });
    
    console.log('✅ API Key is valid!');
    console.log('Response:', response.choices[0].message.content);
  } catch (error) {
    console.error('❌ API Key test failed:');
    console.error('Status:', error.status);
    console.error('Message:', error.message);
    if (error.status === 401) {
      console.error('\n⚠️  The API key is invalid or expired. Please update OPENAI_API_KEY in .env file');
    }
  }
}

testKey();