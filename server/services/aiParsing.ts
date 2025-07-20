import { EmbeddingsService } from './embeddings';

export interface AISkillExtraction {
  skills: string[];
  yearsExperience: number | null;
  jobTitle: string | null;
  relevantExperience: string[];
}

export class AIParsingService {
  private static apiKey = process.env.OPENAI_API_KEY;

  static async extractSkillsWithAI(cvText: string): Promise<AISkillExtraction> {
    if (!this.apiKey) {
      console.warn('OpenAI API key not available, falling back to basic parsing');
      return this.fallbackParsing(cvText);
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are an expert HR assistant that analyzes CVs. Extract structured information from the following CV text and return ONLY valid JSON in this exact format:
{
  "skills": ["skill1", "skill2", ...],
  "yearsExperience": number_or_null,
  "jobTitle": "most_recent_job_title_or_null",
  "relevantExperience": ["experience1", "experience2", ...]
}

Focus on technical skills, programming languages, frameworks, tools, and methodologies. For years of experience, extract the total professional experience mentioned. For job title, use the most recent role. For relevant experience, list key achievements or responsibilities.`
            },
            {
              role: 'user',
              content: cvText
            }
          ],
          temperature: 0.1,
          max_tokens: 1000
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content.trim();
      
      // Parse the JSON response
      const parsed = JSON.parse(content);
      
      return {
        skills: Array.isArray(parsed.skills) ? parsed.skills : [],
        yearsExperience: typeof parsed.yearsExperience === 'number' ? parsed.yearsExperience : null,
        jobTitle: typeof parsed.jobTitle === 'string' ? parsed.jobTitle : null,
        relevantExperience: Array.isArray(parsed.relevantExperience) ? parsed.relevantExperience : []
      };
    } catch (error) {
      console.error('AI parsing failed, falling back to basic parsing:', error);
      return this.fallbackParsing(cvText);
    }
  }

  static async calculateSemanticSimilarity(text1: string, text2: string): Promise<number> {
    if (!this.apiKey) {
      return this.basicTextSimilarity(text1, text2);
    }

    try {
      const embedding1 = await EmbeddingsService.generateEmbedding(text1);
      const embedding2 = await EmbeddingsService.generateEmbedding(text2);
      
      return this.cosineSimilarity(embedding1.vector, embedding2.vector);
    } catch (error) {
      console.error('Semantic similarity calculation failed:', error);
      return this.basicTextSimilarity(text1, text2);
    }
  }

  private static fallbackParsing(cvText: string): AISkillExtraction {
    const normalizedText = cvText.toLowerCase();
    
    // Basic skill extraction
    const commonSkills = [
      'javascript', 'python', 'java', 'react', 'node.js', 'sql', 'css', 'html',
      'typescript', 'angular', 'vue', 'php', 'c++', 'c#', 'ruby', 'go',
      'docker', 'kubernetes', 'aws', 'azure', 'git', 'linux', 'mongodb',
      'postgresql', 'mysql', 'redis', 'jenkins', 'selenium', 'cypress',
      'agile', 'scrum', 'rest', 'api', 'graphql', 'microservices'
    ];
    
    const foundSkills = commonSkills.filter(skill => 
      normalizedText.includes(skill.toLowerCase())
    );

    // Basic years extraction
    const yearMatches = cvText.match(/(\d+)\+?\s*years?\s+(?:of\s+)?experience/gi);
    const yearsExperience = yearMatches ? parseInt(yearMatches[0].match(/\d+/)?.[0] || '0') : null;

    return {
      skills: foundSkills,
      yearsExperience,
      jobTitle: null,
      relevantExperience: []
    };
  }

  private static basicTextSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    const words2 = text2.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    
    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];
    
    return intersection.length / union.length;
  }

  private static cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;
    
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    
    return dotProduct / (normA * normB);
  }
}