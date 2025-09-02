import OpenAI from "openai";
import { storage } from "../storage";
import { getCleanOpenAIKey } from '../utils/getOpenAIKey';

export interface AIRankingResult {
  candidateId: number;
  rank: number;
  reason: string;
}

export class AIRankingService {
  static async rankCandidatesForJob(jobId: number, userId?: string): Promise<AIRankingResult[]> {
    try {
      // Get fresh API key and create OpenAI instance
      const apiKey = getCleanOpenAIKey();
      if (!apiKey) {
        console.error('[AIRanking] No OpenAI API key available');
        return [];
      }
      
      const openai = new OpenAI({ apiKey });
      
      // Get job details and candidates - filtered by user for proper isolation
      const job = await storage.getJob(jobId, userId);
      const candidates = await storage.getCandidatesWithScores(jobId, userId);
      
      if (!job || candidates.length === 0) {
        return [];
      }

      // Prepare candidate summaries for AI analysis
      const candidateSummaries = candidates.map(candidate => ({
        id: candidate.id,
        name: candidate.name,
        yearsExperience: candidate.yearsExperience || 0,
        lastRoleTitle: candidate.lastRoleTitle || 'Not specified',
        skills: candidate.skills.map(s => s.skill).join(', '),
        currentScore: Math.round(candidate.score?.totalScore || 0),
        missingMustHave: candidate.score?.missingMustHave || [],
        experienceGaps: candidate.experienceGaps?.length || 0
      }));

      const prompt = `
You are an expert technical recruiter with 15+ years of experience. Your rankings often differ from algorithmic scoring because you understand team dynamics, growth potential, and real-world project needs that algorithms miss. 

Job Title: ${job.title}
Job Requirements:
Must-have skills: ${job.requirements?.must?.join(', ') || 'None specified'}
Nice-to-have skills: ${job.requirements?.nice?.join(', ') || 'None specified'}

Candidates to rank:
${candidateSummaries.map((c, i) => `
${i + 1}. ${c.name} (ID: ${c.id})
   - Experience: ${c.yearsExperience} years
   - Last Role: ${c.lastRoleTitle}
   - Skills: ${c.skills}
   - Years in Industry: ${c.yearsExperience}
   - Career Progression: ${c.lastRoleTitle}
   - Skill Breadth: ${c.skills ? c.skills.split(',').length : 0} skills listed
   - Missing Must-Have Skills: ${c.missingMustHave.length > 0 ? c.missingMustHave.join(', ') : 'None'}
   - Experience Gaps: ${c.experienceGaps} periods
`).join('')}

Instructions:
1. Ignore the algorithm scores completely - focus on holistic candidate evaluation
2. Prioritize practical experience, skill depth, and role-specific expertise
3. Consider soft skills, adaptability, and growth potential beyond just technical skills
4. Look for red flags like frequent job changes or skill mismatches
5. Consider team fit, communication abilities inferred from background
6. Weight recent, relevant experience more heavily than years of experience
7. Rank from 1 (best fit) to ${candidateSummaries.length} (lowest fit)
8. Provide specific reasoning that differs from purely algorithmic scoring

Respond with JSON in this exact format:
{
  "rankings": [
    {
      "candidateId": 123,
      "rank": 1,
      "reason": "Strong technical fit with all must-have skills and relevant experience..."
    }
  ]
}
`;

      // Log processing info
      console.log(`[AIRanking] Processing ${candidates.length} candidates`);
      
      // Try GPT-5 first, then GPT-4o
      let response;
      const modelsToTry = ["gpt-5", "gpt-4o"];
      let modelUsed = "";
      
      for (const model of modelsToTry) {
        try {
          console.log(`[AIRanking] Attempting to use ${model} model`);
          response = await openai.chat.completions.create({
            model: model,
          messages: [
            {
              role: "system",
              content: "You are an expert technical recruiter with deep understanding of software engineering roles and candidate evaluation. Always respond with valid JSON."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
          // No max_tokens limit - let OpenAI return complete response
        });
        modelUsed = model;
        console.log(`[AIRanking] Successfully using model: ${model}`);
        break; // Success, exit loop
      } catch (error: any) {
        console.log(`[AIRanking] ${model} not available: ${error.message}`);
        if (model === modelsToTry[modelsToTry.length - 1]) {
          // Last model in list, throw error
          throw new Error(`No available models. Tried: ${modelsToTry.join(', ')}`);
        }
        // Try next model
      }
    }
    
    if (!response) {
      throw new Error('Failed to get response from any model');
    }
      
      console.log(`[AIRanking] Successfully used model: ${modelUsed}`);

      // Log the raw response for debugging
      console.log('[AIRanking] OpenAI response received');
      console.log('[AIRanking] Response choices:', response.choices?.length);
      console.log('[AIRanking] Response content:', response.choices[0]?.message?.content);
      
      if (!response.choices || response.choices.length === 0) {
        throw new Error('No response from OpenAI');
      }
      
      const messageContent = response.choices[0].message.content;
      if (!messageContent) {
        throw new Error('Empty response from OpenAI');
      }
      
      const result = JSON.parse(messageContent);
      
      if (!result.rankings || !Array.isArray(result.rankings)) {
        throw new Error('Invalid AI response format');
      }

      // Process AI rankings and ensure proper 1-N ranking sequence
      const aiRankings = result.rankings || [];
      const allRankings: AIRankingResult[] = [];
      
      // Create a map of ranked candidates
      const rankedIds = new Set(aiRankings.map((r: any) => r.candidateId));
      
      // Add AI-ranked candidates (map AI ranks to actual candidate IDs)
      aiRankings.forEach((ranking: any) => {
        // The AI uses candidateId, but we need to find the actual candidate
        const candidate = candidateSummaries.find(c => c.id === ranking.candidateId);
        if (candidate) {
          allRankings.push({
            candidateId: candidate.id,
            rank: ranking.rank,
            reason: ranking.reason || 'AI ranking analysis'
          });
        }
      });
      
      // Add unranked candidates with sequential ranks
      const unrankedCandidates = candidateSummaries.filter(c => !rankedIds.has(c.id));
      const maxRank = Math.max(...allRankings.map(r => r.rank), 0);
      
      unrankedCandidates.forEach((candidate, index) => {
        allRankings.push({
          candidateId: candidate.id,
          rank: maxRank + index + 1,
          reason: 'Standard evaluation based on profile analysis'
        });
      });
      
      // Ensure ranks are 1-N by re-sorting and re-numbering
      allRankings.sort((a, b) => a.rank - b.rank);
      allRankings.forEach((ranking, index) => {
        ranking.rank = index + 1;
      });

      return allRankings;

    } catch (error: any) {
      console.error('[AIRanking] Error occurred:', error);
      console.error('[AIRanking] Error message:', error?.message);
      console.error('[AIRanking] Error stack:', error?.stack);
      
      // Check for API key issues
      if (error?.status === 401 || error?.message?.includes('401') || error?.message?.includes('API key')) {
        console.error('OpenAI API Key Error: The API key is invalid or missing. Please check your OPENAI_API_KEY in the .env file.');
        throw new Error('OpenAI API key is invalid. Please contact the administrator to update the API key.');
      }
      
      // Log detailed error for debugging
      if (error?.response) {
        console.error('OpenAI API Response:', error.response.status, error.response.data);
      }
      
      // Check for JSON parsing errors
      if (error?.message?.includes('JSON') || error?.message?.includes('parse')) {
        console.error('[AIRanking] JSON parsing error - OpenAI response may be malformed');
        throw new Error('AI ranking failed: Unable to parse OpenAI response. Please try again.');
      }
      
      throw new Error(`AI ranking failed: ${error?.message || 'Unknown error'}`);
    }
  }

  static async saveAIRankings(jobId: number, rankings: AIRankingResult[]): Promise<void> {
    try {
      for (const ranking of rankings) {
        // Check if score record exists, if not create it
        const existingScore = await storage.getScore(ranking.candidateId, jobId);
        
        if (!existingScore) {
          // Create a basic score record with default values
          await storage.saveScore({
            candidateId: ranking.candidateId,
            jobId: jobId,
            totalScore: 0,
            skillMatchScore: 0,
            titleScore: 0,
            seniorityScore: 0,
            recencyScore: 0,
            gapPenalty: 0,
            missingMustHave: [],
            explanation: 'Auto-created for AI ranking',
            weights: {
              skills: 50,
              title: 20,
              seniority: 15,
              recency: 10,
              gaps: 5
            }
          });
        }
        
        // Now update with AI ranking
        await storage.updateScoreAIRanking(
          ranking.candidateId,
          jobId,
          ranking.rank,
          ranking.reason
        );
      }
    } catch (error) {
      console.error('Failed to save AI rankings:', error);
      throw error;
    }
  }
}