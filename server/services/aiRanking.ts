import OpenAI from "openai";
import { storage } from "../storage";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface AIRankingResult {
  candidateId: number;
  rank: number;
  reason: string;
}

export class AIRankingService {
  static async rankCandidatesForJob(jobId: number): Promise<AIRankingResult[]> {
    try {
      // Get job details and candidates
      const job = await storage.getJob(jobId);
      const candidates = await storage.getCandidatesWithScores(jobId);
      
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
You are an expert technical recruiter tasked with ranking candidates for a job position. 

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
   - Current Algorithm Score: ${c.currentScore}/100
   - Missing Must-Have Skills: ${c.missingMustHave.length > 0 ? c.missingMustHave.join(', ') : 'None'}
   - Experience Gaps: ${c.experienceGaps} periods
`).join('')}

Instructions:
1. Consider both technical fit and overall candidate profile
2. Factor in skill relevance, experience level, and potential red flags
3. Balance algorithm scores with human insights about role requirements
4. Rank from 1 (best fit) to ${candidateSummaries.length} (lowest fit)
5. Provide specific reasoning for each ranking decision

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

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
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
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
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

    } catch (error) {
      console.error('AI ranking failed:', error);
      return [];
    }
  }

  static async saveAIRankings(jobId: number, rankings: AIRankingResult[]): Promise<void> {
    try {
      for (const ranking of rankings) {
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