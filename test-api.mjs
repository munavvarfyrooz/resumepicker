import fs from 'fs';
import OpenAI from 'openai';

// Read API key directly from .env
const envContent = fs.readFileSync('.env', 'utf-8');
const match = envContent.match(/OPENAI_API_KEY=(.+)/);
const apiKey = match ? match[1].trim() : null;

console.log('Testing OpenAI API...');
console.log('Key exists:', Boolean(apiKey));

const openai = new OpenAI({ apiKey });

try {
  console.log('Calling OpenAI gpt-4o-mini...');
  const start = Date.now();
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: "Reply with: working" }],
    max_tokens: 10
  });
  console.log('✅ SUCCESS\! Response:', completion.choices[0].message.content);
  console.log('Time taken:', Date.now() - start, 'ms');
} catch (error) {
  console.error('❌ FAILED:', error.message);
  if (error.cause) console.error('Cause:', error.cause);
}
