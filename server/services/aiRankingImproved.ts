import OpenAI from "openai";
import { storage } from "../storage";
import { getCleanOpenAIKey } from '../utils/getOpenAIKey';
import crypto from 'crypto';

export interface AIRankingResult {
  candidateId: number;
  rank: number;
  reason: string;
  scores?: {
    technical: number;
    experience: number;
    potential: number;
    overall: number;
  };
}

interface CachEntry {
  rankings: AIRankingResult[];
  timestamp: number;
  hash: string;
}

// In-memory cache with TTL of 1 hour
const rankingCache = new Map<string, CachEntry>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export class ImprovedAIRankingService {
  
  private static generateCacheKey(jobId: number, candidateIds: number[]): string {
    const sortedIds = [...candidateIds].sort((a, b) => a - b);
    return `job_${jobId}_candidates_${sortedIds.join('_')}`;
  }
  
  private static generateDataHash(job: any, candidates: any[]): string {
    const dataString = JSON.stringify({
      jobTitle: job.title,
      requirements: job.requirements,
      candidates: candidates.map(c => ({
        id: c.id,
        experience: c.yearsExperience,
        skills: c.skills,
        lastRole: c.lastRoleTitle
      }))
    });
    return crypto.createHash('md5').update(dataString).digest('hex');
  }
  
  private static getCachedRanking(cacheKey: string, dataHash: string): AIRankingResult[] | null {
    const cached = rankingCache.get(cacheKey);
    if (!cached) return null;
    
    // Check if cache is still valid (TTL and data hasn't changed)
    if (Date.now() - cached.timestamp > CACHE_TTL || cached.hash !== dataHash) {
      rankingCache.delete(cacheKey);
      return null;
    }
    
    console.log('[AIRanking] Using cached ranking');
    return cached.rankings;
  }
  
  private static setCachedRanking(cacheKey: string, dataHash: string, rankings: AIRankingResult[]): void {
    rankingCache.set(cacheKey, {
      rankings,
      timestamp: Date.now(),
      hash: dataHash
    });
  }

  static async rankCandidatesForJob(jobId: number, userId?: string, useCache: boolean = true): Promise<AIRankingResult[]> {
    try {
      // Get job details and candidates
      const job = await storage.getJob(jobId, userId);
      const candidates = await storage.getCandidatesWithScores(jobId, userId);
      
      if (!job || candidates.length === 0) {
        return [];
      }

      // Check cache if enabled
      if (useCache) {
        const cacheKey = this.generateCacheKey(jobId, candidates.map(c => c.id));
        const dataHash = this.generateDataHash(job, candidates);
        const cachedRankings = this.getCachedRanking(cacheKey, dataHash);
        
        if (cachedRankings) {
          return cachedRankings;
        }
      }

      // Prepare structured candidate data
      const candidateSummaries = candidates.map(candidate => {
        // Infer role from candidate name or skills if missing
        let inferredRole = candidate.lastRoleTitle;
        if (!inferredRole || inferredRole === 'null' || inferredRole === 'Not specified') {
          // Try to infer from name
          const nameLower = candidate.name.toLowerCase();
          if (nameLower.includes('qa') || nameLower.includes('test')) {
            inferredRole = 'QA/Test Engineer (inferred)';
          } else if (nameLower.includes('sdet')) {
            inferredRole = 'SDET (inferred)';
          } else if (nameLower.includes('senior')) {
            inferredRole = 'Senior Engineer (inferred)';
          } else {
            // Infer from skills
            const skills = candidate.skills.map(s => s.skill.toLowerCase()).join(' ');
            if (skills.includes('selenium') || skills.includes('test') || skills.includes('qa')) {
              inferredRole = 'QA Engineer (inferred from skills)';
            } else if (skills.includes('java') || skills.includes('python')) {
              inferredRole = 'Software Engineer (inferred from skills)';
            } else {
              inferredRole = 'Technical Professional';
            }
          }
        }
        
        return {
          id: candidate.id,
          name: candidate.name,
          yearsExperience: candidate.yearsExperience || 0,
          lastRoleTitle: inferredRole,
          originalRole: candidate.lastRoleTitle,
          hasDefinedRole: !!(candidate.lastRoleTitle && candidate.lastRoleTitle !== 'null'),
          skills: candidate.skills.map(s => s.skill).join(', '),
          skillCount: candidate.skills.length,
          missingMustHave: candidate.score?.missingMustHave || [],
          experienceGaps: candidate.experienceGaps?.length || 0,
          // Add consistency scoring factors
          hasAllMustHaves: (candidate.score?.missingMustHave?.length || 0) === 0,
          skillMatchPercentage: this.calculateSkillMatch(
            candidate.skills.map(s => s.skill),
            job.requirements?.must || [],
            job.requirements?.nice || []
          )
        };
      });

      const improvedPrompt = `
Rank these ${candidateSummaries.length} candidates for ${job.title} position.
Requirements: ${job.requirements?.must?.slice(0, 5).join(', ') || 'QA skills'}

${candidateSummaries.map((c, i) => `
${i+1}. ${c.name} (ID:${c.id})
Exp:${c.yearsExperience}y, Skills:${c.skillCount}, Match:${c.skillMatchPercentage}%`).join('')}

Score each by: Tech(40pts), Exp(30pts), Potential(20pts), Risk(10pts)
Return JSON with all ${candidateSummaries.length} candidates ranked 1-${candidateSummaries.length}:
{
  "rankings": [{
    "candidateId": number,
    "rank": number,
    "reason": "brief reason",
    "scores": {"technical": n, "experience": n, "potential": n, "overall": n}
  }]
}`;

      // Get API key and create OpenAI instance
      const apiKey = getCleanOpenAIKey();
      if (!apiKey) {
        throw new Error('OpenAI API key not configured');
      }
      
      const openai = new OpenAI({ apiKey });
      
      console.log(`[AIRanking] Processing ${candidates.length} candidates with improved scoring`);
      
      // Call OpenAI with retry logic and model fallback
      let response;
      let retries = 3;
      let lastError;
      // Try GPT-5 first, then fallback to GPT-4o
      const modelsToTry = ["gpt-5", "gpt-4o"];
      let modelToUse = modelsToTry[0];
      
      // Determine if we need reasoning (complex decision) - disabled for now due to performance
      const needsReasoning = false; // Temporarily disabled - was causing 60+ second response times
      
      console.log(`[AIRanking] Decision complexity: ${needsReasoning ? 'HIGH - using reasoning' : 'NORMAL'}`);
      if (needsReasoning) {
        console.log(`[AIRanking] Reasoning triggers: ${[
          candidateSummaries.length > 10 ? 'Many candidates' : null,
          candidateSummaries.some(c => !c.hasDefinedRole) ? 'Missing role titles' : null,
          candidateSummaries.filter(c => c.hasAllMustHaves).length > 5 ? 'Multiple perfect matches' : null,
          candidateSummaries.filter(c => Math.abs(c.skillMatchPercentage - 40) < 10).length > 5 ? 'Similar skill levels' : null
        ].filter(Boolean).join(', ')}`);
      }
      
      while (retries > 0) {
        try {
          const useReasoningForThisModel = modelToUse === "gpt-5" && needsReasoning;
          console.log(`[AIRanking] Attempting with model: ${modelToUse}${useReasoningForThisModel ? ' (with deep reasoning)' : ''}`);
          
          const systemPrompt = useReasoningForThisModel
            ? "You are an expert technical recruiter with deep understanding of software engineering roles. When evaluating complex candidate pools, think step-by-step through your analysis before providing rankings. Always return valid JSON with complete rankings."
            : "You are a technical recruiter who evaluates candidates using a strict, consistent scoring framework. Always return valid JSON with complete rankings for all candidates.";
          
          const userPrompt = useReasoningForThisModel
            ? `Analyze this complex ranking scenario step-by-step:
            
            1. First, identify the key differentiators between candidates
            2. Consider hidden factors like career trajectory, skill complementarity, and team fit
            3. Explain your reasoning for the top 5 candidates
            4. Then provide the complete rankings
            
            ${improvedPrompt}
            
            REASONING OUTPUT:
            First provide your analysis in a "reasoning" field, then the standard "rankings" array.`
            : improvedPrompt;
          
          response = await openai.chat.completions.create({
            model: modelToUse,
            messages: [
              {
                role: "system",
                content: systemPrompt
              },
              {
                role: "user",
                content: userPrompt
              }
            ],
            response_format: { type: "json_object" },
            temperature: useReasoningForThisModel ? 0.2 : 0.1, // Slightly higher temp for reasoning
            seed: 42, // Fixed seed for reproducibility
            // No max_tokens limit
          });
          
          console.log(`[AIRanking] Successfully used model: ${modelToUse}`);
          break; // Success, exit retry loop
          
        } catch (error: any) {
          lastError = error;
          
          // Try next model in the list if current model is not available
          if (error.message?.includes('model') || error.status === 404 || error.status === 400) {
            const currentIndex = modelsToTry.indexOf(modelToUse);
            if (currentIndex < modelsToTry.length - 1) {
              const nextModel = modelsToTry[currentIndex + 1];
              console.log(`[AIRanking] ${modelToUse} not available, trying ${nextModel}`);
              modelToUse = nextModel;
              continue; // Retry with next model without decrementing retries
            }
          }
          
          retries--;
          if (retries > 0) {
            console.log(`[AIRanking] Retry ${3 - retries}/3 after error:`, error.message);
            await new Promise(resolve => setTimeout(resolve, 2000 * (4 - retries))); // Exponential backoff
          }
        }
      }
      
      if (!response) {
        throw lastError || new Error('Failed to get response from OpenAI after 3 retries');
      }

      // Parse and validate response
      const messageContent = response.choices[0]?.message?.content;
      if (!messageContent) {
        throw new Error('Empty response from OpenAI');
      }
      
      const result = JSON.parse(messageContent);
      
      // Validate response format
      if (!result.rankings || !Array.isArray(result.rankings)) {
        throw new Error('Invalid response format: missing rankings array');
      }
      
      if (result.rankings.length !== candidateSummaries.length) {
        console.warn(`[AIRanking] Expected ${candidateSummaries.length} rankings, got ${result.rankings.length}`);
      }
      
      // Validate and normalize rankings
      const rankings = this.validateAndNormalizeRankings(result.rankings, candidateSummaries);
      
      // Cache the results if caching is enabled
      if (useCache) {
        const cacheKey = this.generateCacheKey(jobId, candidates.map(c => c.id));
        const dataHash = this.generateDataHash(job, candidates);
        this.setCachedRanking(cacheKey, dataHash, rankings);
      }
      
      return rankings;

    } catch (error: any) {
      console.error('[AIRanking] Error occurred:', error);
      
      // Fallback to algorithmic ranking if AI fails
      console.log('[AIRanking] Falling back to algorithmic ranking');
      return this.generateFallbackRanking(candidates);
    }
  }
  
  private static calculateSkillMatch(candidateSkills: string[], mustHave: string[], niceToHave: string[]): number {
    const candidateSkillsLower = candidateSkills.map(s => s.toLowerCase());
    const mustHaveLower = mustHave.map(s => s.toLowerCase());
    const niceToHaveLower = niceToHave.map(s => s.toLowerCase());
    
    const mustHaveMatches = mustHaveLower.filter(skill => 
      candidateSkillsLower.some(cSkill => cSkill.includes(skill) || skill.includes(cSkill))
    ).length;
    
    const niceToHaveMatches = niceToHaveLower.filter(skill => 
      candidateSkillsLower.some(cSkill => cSkill.includes(skill) || skill.includes(cSkill))
    ).length;
    
    const mustHavePercentage = mustHave.length > 0 ? (mustHaveMatches / mustHave.length) * 70 : 0;
    const niceToHavePercentage = niceToHave.length > 0 ? (niceToHaveMatches / niceToHave.length) * 30 : 0;
    
    return Math.round(mustHavePercentage + niceToHavePercentage);
  }
  
  private static validateAndNormalizeRankings(rankings: any[], candidates: any[]): AIRankingResult[] {
    const validRankings: AIRankingResult[] = [];
    const usedRanks = new Set<number>();
    const rankedCandidateIds = new Set<number>();
    
    // First pass: collect valid rankings
    for (const ranking of rankings) {
      if (ranking.candidateId && ranking.rank && !usedRanks.has(ranking.rank)) {
        validRankings.push({
          candidateId: ranking.candidateId,
          rank: ranking.rank,
          reason: ranking.reason || 'Evaluated based on technical fit and experience',
          scores: ranking.scores
        });
        usedRanks.add(ranking.rank);
        rankedCandidateIds.add(ranking.candidateId);
      }
    }
    
    // Second pass: add missing candidates
    let nextRank = 1;
    for (const candidate of candidates) {
      if (!rankedCandidateIds.has(candidate.id)) {
        while (usedRanks.has(nextRank)) {
          nextRank++;
        }
        validRankings.push({
          candidateId: candidate.id,
          rank: nextRank,
          reason: 'Ranked based on algorithmic scoring',
          scores: {
            technical: candidate.score?.skillMatchScore || 0,
            experience: candidate.score?.seniorityScore || 0,
            potential: 50,
            overall: candidate.score?.totalScore || 0
          }
        });
        nextRank++;
      }
    }
    
    // Sort by rank and renumber to ensure 1-N sequence
    validRankings.sort((a, b) => a.rank - b.rank);
    validRankings.forEach((ranking, index) => {
      ranking.rank = index + 1;
    });
    
    return validRankings;
  }
  
  private static generateFallbackRanking(candidates: any[]): AIRankingResult[] {
    // Use existing manual scores as fallback
    const sortedCandidates = [...candidates].sort((a, b) => {
      const scoreA = a.score?.totalScore || 0;
      const scoreB = b.score?.totalScore || 0;
      return scoreB - scoreA;
    });
    
    return sortedCandidates.map((candidate, index) => ({
      candidateId: candidate.id,
      rank: index + 1,
      reason: `Ranked based on algorithmic scoring: ${candidate.score?.totalScore || 0} points`,
      scores: {
        technical: candidate.score?.skillMatchScore || 0,
        experience: candidate.score?.seniorityScore || 0,
        potential: 50,
        overall: candidate.score?.totalScore || 0
      }
    }));
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
            totalScore: ranking.scores?.overall || 0,
            skillMatchScore: ranking.scores?.technical || 0,
            titleScore: 0,
            seniorityScore: ranking.scores?.experience || 0,
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
  
  // Clear cache for a specific job
  static clearCache(jobId?: number): void {
    if (jobId) {
      // Clear specific job cache
      for (const [key] of rankingCache.entries()) {
        if (key.startsWith(`job_${jobId}_`)) {
          rankingCache.delete(key);
        }
      }
    } else {
      // Clear all cache
      rankingCache.clear();
    }
    console.log(`[AIRanking] Cache cleared${jobId ? ` for job ${jobId}` : ' completely'}`);
  }
}