import OpenAI from "openai";
import { getCleanOpenAIKey } from '../utils/getOpenAIKey';

export interface SkillsAnalysis {
  mustHaveSkills: string[];
  niceToHaveSkills: string[];
  reasoning: string;
}

export class JobAnalysisService {
  static async extractSkillsFromJobDescription(jobDescription: string): Promise<SkillsAnalysis> {
    console.log('[JobAnalysis] Starting skill extraction from job description');
    
    // Get fresh API key and create new OpenAI instance for each request
    const apiKey = getCleanOpenAIKey();
    
    // Also try direct process.env access as backup
    const envKey = process.env.OPENAI_API_KEY;
    const finalKey = apiKey || envKey;
    
    console.log('[JobAnalysis] API key available:', !!finalKey);
    
    // Check if API key exists
    if (!finalKey) {
      console.error('[JobAnalysis] OPENAI_API_KEY is not available');
      return {
        mustHaveSkills: [],
        niceToHaveSkills: [],
        reasoning: "OpenAI API key is not configured",
      };
    }
    
    // Create OpenAI client with fresh key
    const openai = new OpenAI({ 
      apiKey: finalKey,
      maxRetries: 2,
      timeout: 20000 // 20 second timeout
    });
    
    try {
      const prompt = `
Analyze the following job description and extract technical skills, categorizing them as "must-have" (critical/required) or "nice-to-have" (preferred/bonus).

Job Description:
${jobDescription}

Instructions:
1. Extract specific technical skills, tools, frameworks, languages, and methodologies
2. Categorize based on how the job description presents them (required vs preferred)
3. Use consistent naming (e.g., "JavaScript" not "JS", "SQL" not "database queries")
4. Focus on concrete skills, not soft skills or general concepts
5. Include certifications, cloud platforms, and testing tools
6. Limit to 15 skills total (max 10 must-have, max 8 nice-to-have)

Respond with JSON in this exact format:
{
  "mustHaveSkills": ["skill1", "skill2"],
  "niceToHaveSkills": ["skill3", "skill4"],
  "reasoning": "Brief explanation of categorization logic"
}
`;

      console.log('[JobAnalysis] Calling OpenAI API...');
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // Using latest GPT-4o model for best accuracy
        messages: [
          {
            role: "system",
            content: "You are an expert technical recruiter who specializes in analyzing job descriptions and extracting relevant technical skills. Always respond with valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 500
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      console.log('[JobAnalysis] Successfully extracted skills:', {
        mustHave: result.mustHaveSkills?.length || 0,
        niceToHave: result.niceToHaveSkills?.length || 0
      });
      
      return {
        mustHaveSkills: result.mustHaveSkills || [],
        niceToHaveSkills: result.niceToHaveSkills || [],
        reasoning: result.reasoning || "Analysis completed",
      };
    } catch (error: any) {
      console.error('[JobAnalysis] OpenAI API call failed:', error?.message || error);
      console.error('[JobAnalysis] Error type:', error?.constructor?.name);
      console.error('[JobAnalysis] Error stack:', error?.stack?.split('\n').slice(0, 3).join('\n'));
      
      // Log specific OpenAI error details
      if (error?.response) {
        console.error('[JobAnalysis] API Response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }
      
      if (error?.code) {
        console.error('[JobAnalysis] Error code:', error.code);
      }
      
      // Provide fallback skill extraction using simple pattern matching
      console.log('[JobAnalysis] Using fallback pattern matching due to API failure');
      return this.fallbackSkillExtraction(jobDescription);
    }
  }
  
  static fallbackSkillExtraction(jobDescription: string): SkillsAnalysis {
    console.log('[JobAnalysis] Using fallback skill extraction');
    
    const commonSkills = [
      // Programming Languages
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'Ruby', 'Go', 'Rust', 'PHP', 'Swift', 'Kotlin',
      'Scala', 'R', 'MATLAB', 'Perl', 'Shell', 'Bash', 'PowerShell',
      
      // Frontend
      'React', 'Angular', 'Vue', 'Svelte', 'Next.js', 'Gatsby', 'HTML', 'CSS', 'SASS', 'LESS', 'Tailwind',
      'Bootstrap', 'Material-UI', 'jQuery', 'Redux', 'MobX', 'GraphQL', 'Apollo', 'Webpack', 'Vite',
      
      // Backend
      'Node.js', 'Express', 'Django', 'Flask', 'FastAPI', 'Spring', 'Spring Boot', '.NET', 'ASP.NET', 'Rails',
      'Laravel', 'Symfony', 'NestJS', 'Fastify', 'Koa', 'Gin', 'Echo', 'Fiber',
      
      // Databases
      'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Cassandra', 'DynamoDB', 'Oracle',
      'SQL Server', 'SQLite', 'MariaDB', 'CouchDB', 'Neo4j', 'Firebase', 'Supabase',
      
      // Cloud & DevOps
      'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Jenkins', 'CI/CD', 'Terraform', 'Ansible', 'Puppet',
      'Chef', 'GitLab', 'GitHub Actions', 'CircleCI', 'Travis CI', 'Prometheus', 'Grafana', 'ELK', 'Datadog',
      
      // Testing
      'Jest', 'Mocha', 'Jasmine', 'Selenium', 'Cypress', 'Playwright', 'TestNG', 'JUnit', 'PyTest', 'RSpec',
      'Cucumber', 'Postman', 'JMeter', 'LoadRunner', 'Appium',
      
      // Mobile
      'React Native', 'Flutter', 'Ionic', 'Xamarin', 'Android', 'iOS', 'SwiftUI', 'Objective-C',
      
      // Other
      'Git', 'REST', 'SOAP', 'API', 'Microservices', 'Agile', 'Scrum', 'JIRA', 'Linux', 'Windows', 'MacOS',
      'Machine Learning', 'AI', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'Pandas', 'NumPy'
    ];
    
    const mustHaveKeywords = ['required', 'must have', 'essential', 'mandatory', 'minimum', 'years of experience'];
    const niceToHaveKeywords = ['nice to have', 'preferred', 'bonus', 'plus', 'advantage', 'desirable', 'optional'];
    
    const foundMustHave: string[] = [];
    const foundNiceToHave: string[] = [];
    const lowerDescription = jobDescription.toLowerCase();
    
    // Extract skills based on keywords
    for (const skill of commonSkills) {
      const skillRegex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      if (skillRegex.test(jobDescription)) {
        // Check if it's in a must-have context
        const skillIndex = lowerDescription.indexOf(skill.toLowerCase());
        const contextStart = Math.max(0, skillIndex - 100);
        const contextEnd = Math.min(lowerDescription.length, skillIndex + 100);
        const context = lowerDescription.substring(contextStart, contextEnd);
        
        const isMustHave = mustHaveKeywords.some(keyword => context.includes(keyword));
        const isNiceToHave = niceToHaveKeywords.some(keyword => context.includes(keyword));
        
        if (isMustHave || (!isNiceToHave && foundMustHave.length < 8)) {
          if (!foundMustHave.includes(skill)) {
            foundMustHave.push(skill);
          }
        } else {
          if (!foundNiceToHave.includes(skill)) {
            foundNiceToHave.push(skill);
          }
        }
      }
    }
    
    return {
      mustHaveSkills: foundMustHave.slice(0, 10),
      niceToHaveSkills: foundNiceToHave.slice(0, 8),
      reasoning: "Skills extracted using pattern matching (OpenAI API unavailable)"
    };
  }
}