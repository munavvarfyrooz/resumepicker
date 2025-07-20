import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface SkillsAnalysis {
  mustHaveSkills: string[];
  niceToHaveSkills: string[];
  reasoning: string;
}

export class JobAnalysisService {
  static async extractSkillsFromJobDescription(jobDescription: string): Promise<SkillsAnalysis> {
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

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
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
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      return {
        mustHaveSkills: result.mustHaveSkills || [],
        niceToHaveSkills: result.niceToHaveSkills || [],
        reasoning: result.reasoning || "Analysis completed",
      };
    } catch (error) {
      console.error('Job analysis failed:', error);
      return {
        mustHaveSkills: [],
        niceToHaveSkills: [],
        reasoning: "Unable to analyze job description automatically",
      };
    }
  }
}