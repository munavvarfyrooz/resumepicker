import OpenAI from 'openai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

async function checkAvailableModels() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('No OPENAI_API_KEY found in environment');
    return;
  }

  const openai = new OpenAI({ apiKey });
  
  try {
    // List available models
    console.log('Fetching available models...\n');
    const models = await openai.models.list();
    
    // Filter for GPT models that support chat completions
    const gptModels = models.data
      .filter(model => 
        model.id.includes('gpt') && 
        !model.id.includes('instruct') &&
        !model.id.includes('vision')
      )
      .map(model => model.id)
      .sort();
    
    console.log('Available GPT Chat Models:');
    console.log('==========================');
    gptModels.forEach(model => {
      console.log(`- ${model}`);
    });
    
    // Check for GPT-5
    const hasGPT5 = gptModels.some(model => model.includes('gpt-5'));
    console.log(`\nGPT-5 Available: ${hasGPT5 ? 'YES' : 'NO'}`);
    
    // Check for latest GPT-4 variants
    const gpt4Models = gptModels.filter(model => model.includes('gpt-4'));
    console.log(`\nGPT-4 Variants: ${gpt4Models.length > 0 ? gpt4Models.join(', ') : 'None'}`);
    
    // Test the latest model
    const latestModel = gpt4Models.includes('gpt-4o') ? 'gpt-4o' : 
                       gpt4Models.includes('gpt-4-turbo') ? 'gpt-4-turbo' : 
                       gpt4Models[0] || 'gpt-3.5-turbo';
    
    console.log(`\nTesting model: ${latestModel}`);
    const response = await openai.chat.completions.create({
      model: latestModel,
      messages: [{ role: 'user', content: 'Say "Model test successful" and nothing else.' }],
      max_tokens: 10
    });
    
    console.log(`Response: ${response.choices[0].message.content}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkAvailableModels();