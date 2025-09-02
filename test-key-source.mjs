import dotenv from 'dotenv';

// Show where the key is coming from
console.log('Testing API key sources...\n');

// Check shell environment
const envKey = process.env.OPENAI_API_KEY;
if (envKey) {
  console.log('❌ Found key in shell environment (overrides .env)');
  console.log('   Ends with:', envKey.slice(-8));
  delete process.env.OPENAI_API_KEY;
  console.log('   Removed from environment\n');
}

// Load from .env file
dotenv.config();
const dotenvKey = process.env.OPENAI_API_KEY;
if (dotenvKey) {
  console.log('✅ Found key in .env file');
  console.log('   Ends with:', dotenvKey.slice(-8));
} else {
  console.log('❌ No key found in .env file');
}

// Test the key
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function testKey() {
  try {
    console.log('\nTesting API key validity...');
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Say 'works'" }],
      max_tokens: 5
    });
    console.log('✅ API Key is VALID!');
    console.log('Response:', response.choices[0].message.content);
  } catch (error) {
    console.log('❌ API Key is INVALID');
    console.log('Error:', error.message.substring(0, 100));
  }
}

testKey();