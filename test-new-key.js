import OpenAI from 'openai';
import fs from 'fs';

// Force read the new key directly from file
const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/OPENAI_API_KEY=(.+)/);
const apiKey = match ? match[1].trim() : null;

console.log('Testing with key ending in:', apiKey?.slice(-5));

const openai = new OpenAI({ apiKey });

async function test() {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Say "Working!"' }],
      max_tokens: 10,
    });
    console.log('✅ SUCCESS:', response.choices[0].message.content);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();