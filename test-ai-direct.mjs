import fs from 'fs';
import OpenAI from 'openai';

// Read API key directly from .env
const envContent = fs.readFileSync('.env', 'utf-8');
const match = envContent.match(/OPENAI_API_KEY=(.+)/);
const apiKey = match ? match[1].trim() : null;

console.log('Testing AI Skill Extraction...');
console.log('Key exists:', Boolean(apiKey));

const openai = new OpenAI({ apiKey });

const jobDescription = `
We need a Senior React Developer with expertise in:
- React.js and TypeScript (required)
- Redux for state management (required)
- GraphQL APIs (required)
- 5+ years of experience (required)

Nice to have:
- Next.js framework
- Docker containerization
- AWS cloud services
`;

async function testSkillExtraction() {
  try {
    console.log('Calling OpenAI for skill extraction...');
    const start = Date.now();
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert technical recruiter. Extract skills from job descriptions and categorize them as must-have or nice-to-have. Always respond with valid JSON."
        },
        {
          role: "user",
          content: `Analyze this job description and extract skills:\n\n${jobDescription}\n\nRespond with JSON: {"mustHaveSkills": [...], "niceToHaveSkills": [...], "reasoning": "..."}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 500
    });
    
    const result = JSON.parse(response.choices[0].message.content);
    console.log('\n✅ AI EXTRACTION SUCCESS\!');
    console.log('Time taken:', Date.now() - start, 'ms');
    console.log('\nExtracted skills:');
    console.log('Must Have:', result.mustHaveSkills);
    console.log('Nice to Have:', result.niceToHaveSkills);
    console.log('Reasoning:', result.reasoning);
    
  } catch (error) {
    console.error('\n❌ AI EXTRACTION FAILED:');
    console.error('Error:', error.message);
    if (error.code) console.error('Code:', error.code);
    if (error.status) console.error('Status:', error.status);
    if (error.response?.data) console.error('Response:', error.response.data);
  }
}

testSkillExtraction();
