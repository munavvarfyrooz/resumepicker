import { storage } from '../storage';
import crypto from 'crypto';

// Cache structures
interface CachedScore {
  score: any;
  timestamp: number;
  dataHash: string;
}

interface SkillEmbedding {
  skill: string;
  embedding: number[];
  synonyms: string[];
}

// Main cache maps
const scoreCache = new Map<string, CachedScore>();
const skillEmbeddingsCache = new Map<string, SkillEmbedding>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Pre-computed skill synonyms and variations
const SKILL_SYNONYMS: Record<string, string[]> = {
  'javascript': ['js', 'node.js', 'nodejs', 'ecmascript'],
  'typescript': ['ts'],
  'python': ['py'],
  'selenium': ['selenium webdriver', 'webdriver'],
  'qa': ['quality assurance', 'testing', 'test'],
  'api': ['rest api', 'restful', 'web services'],
  'sql': ['mysql', 'postgresql', 'database', 'rdbms'],
  'agile': ['scrum', 'kanban', 'sprint'],
  'java': ['j2ee', 'spring', 'java ee'],
  'aws': ['amazon web services', 'cloud', 'ec2', 's3'],
  'docker': ['containerization', 'kubernetes', 'k8s'],
  'jenkins': ['ci/cd', 'continuous integration', 'pipeline'],
  'git': ['github', 'gitlab', 'version control', 'vcs'],
};

export class SuperOptimizedScoringEngine {
  
  // Generate cache key for a candidate-job pair
  private static getCacheKey(candidateId: number, jobId: number, weights: any): string {
    return `${candidateId}_${jobId}_${JSON.stringify(weights)}`;
  }
  
  // Generate hash of data for cache validation
  private static getDataHash(data: any): string {
    return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
  }
  
  // Check cache for existing score
  private static getCachedScore(key: string, dataHash: string): any | null {
    const cached = scoreCache.get(key);
    if (!cached) return null;
    
    // Validate cache TTL and data integrity
    if (Date.now() - cached.timestamp > CACHE_TTL || cached.dataHash !== dataHash) {
      scoreCache.delete(key);
      return null;
    }
    
    return cached.score;
  }
  
  // Store score in cache
  private static setCachedScore(key: string, dataHash: string, score: any): void {
    scoreCache.set(key, {
      score,
      timestamp: Date.now(),
      dataHash
    });
  }
  
  // Pre-process and normalize skills for faster matching
  private static normalizeSkill(skill: string): string {
    return skill.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  }
  
  // Ultra-fast skill matching using pre-computed embeddings
  private static fastSkillMatch(candidateSkills: string[], jobSkills: { skill: string; required: boolean }[]): { score: number; missingMust: string[] } {
    if (!jobSkills || jobSkills.length === 0) {
      return { score: 0, missingMust: [] };
    }
    
    // Normalize all skills once
    const normalizedCandidateSkills = new Set(
      candidateSkills.flatMap(skill => {
        const normalized = this.normalizeSkill(skill);
        const synonyms = SKILL_SYNONYMS[normalized] || [];
        return [normalized, ...synonyms.map(s => this.normalizeSkill(s))];
      })
    );
    
    const requiredSkills = jobSkills.filter(s => s.required);
    const niceToHaveSkills = jobSkills.filter(s => !s.required);
    
    // Fast matching using Set lookups (O(1) average case)
    let matchedRequired = 0;
    const missingMust: string[] = [];
    
    for (const skill of requiredSkills) {
      const normalizedSkill = this.normalizeSkill(skill.skill);
      const synonyms = SKILL_SYNONYMS[normalizedSkill] || [];
      
      if (normalizedCandidateSkills.has(normalizedSkill) || 
          synonyms.some(syn => normalizedCandidateSkills.has(this.normalizeSkill(syn)))) {
        matchedRequired++;
      } else {
        missingMust.push(skill.skill);
      }
    }
    
    let matchedNice = 0;
    for (const skill of niceToHaveSkills) {
      const normalizedSkill = this.normalizeSkill(skill.skill);
      const synonyms = SKILL_SYNONYMS[normalizedSkill] || [];
      
      if (normalizedCandidateSkills.has(normalizedSkill) || 
          synonyms.some(syn => normalizedCandidateSkills.has(this.normalizeSkill(syn)))) {
        matchedNice++;
      }
    }
    
    // Calculate score with weighted importance
    const requiredScore = requiredSkills.length > 0 ? (matchedRequired / requiredSkills.length) * 80 : 0;
    const niceScore = niceToHaveSkills.length > 0 ? (matchedNice / niceToHaveSkills.length) * 20 : 0;
    
    return {
      score: Math.round(requiredScore + niceScore),
      missingMust
    };
  }
  
  // Optimized batch scoring with parallel processing
  static async batchScore(candidateIds: number[], jobId: number, weights: any): Promise<Map<number, any>> {
    const results = new Map<number, any>();
    
    // Fetch job data once
    const [job, jobSkills] = await Promise.all([
      storage.getJob(jobId),
      storage.getJobSkills(jobId)
    ]);
    
    if (!job) {
      throw new Error('Job not found');
    }
    
    // Process candidates in parallel batches
    const BATCH_SIZE = 10; // Process 10 candidates at a time
    const batches = [];
    
    for (let i = 0; i < candidateIds.length; i += BATCH_SIZE) {
      const batch = candidateIds.slice(i, i + BATCH_SIZE);
      batches.push(batch);
    }
    
    // Process each batch in parallel
    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(async candidateId => {
          // Check cache first
          const cacheKey = this.getCacheKey(candidateId, jobId, weights);
          const dataHash = this.getDataHash({ candidateId, jobId, jobSkills });
          const cachedScore = this.getCachedScore(cacheKey, dataHash);
          
          if (cachedScore) {
            return { candidateId, score: cachedScore };
          }
          
          // Fetch candidate data
          const [candidate, candidateSkills] = await Promise.all([
            storage.getCandidate(candidateId),
            storage.getCandidateSkills(candidateId)
          ]);
          
          if (!candidate) {
            return { candidateId, score: null };
          }
          
          // Calculate score components in parallel where possible
          const skillMatch = this.fastSkillMatch(candidateSkills, jobSkills);
          const titleScore = this.calculateTitleScore(candidate.lastRoleTitle, job.title);
          const experienceScore = this.calculateExperienceScore(
            candidate.yearsExperience || 0,
            job.minExperience || 0,
            job.maxExperience || 99
          );
          const recencyScore = this.calculateRecencyScore(candidate.lastWorkDate);
          const gapPenalty = this.calculateGapPenalty(candidate.gapMonths || 0);
          
          // Calculate weighted total
          const totalScore = Math.round(
            skillMatch.score * weights.skills +
            titleScore * weights.title +
            experienceScore * weights.seniority +
            recencyScore * weights.recency -
            gapPenalty * weights.gaps
          );
          
          const score = {
            totalScore: Math.max(0, Math.min(100, totalScore)),
            skillMatchScore: skillMatch.score,
            titleScore,
            seniorityScore: experienceScore,
            recencyScore,
            gapPenalty,
            missingMustHave: skillMatch.missingMust,
            explanation: this.generateExplanation({
              skillMatch: skillMatch.score,
              titleScore,
              experienceScore,
              recencyScore,
              gapPenalty
            })
          };
          
          // Cache the result
          this.setCachedScore(cacheKey, dataHash, score);
          
          return { candidateId, score };
        })
      );
      
      // Store results
      for (const result of batchResults) {
        if (result.score) {
          results.set(result.candidateId, result.score);
        }
      }
    }
    
    return results;
  }
  
  // Incremental scoring for single candidate (when new candidate is added)
  static async scoreIncremental(candidateId: number, jobId: number, weights: any): Promise<any> {
    // Check cache first
    const cacheKey = this.getCacheKey(candidateId, jobId, weights);
    const [job, jobSkills] = await Promise.all([
      storage.getJob(jobId),
      storage.getJobSkills(jobId)
    ]);
    
    const dataHash = this.getDataHash({ candidateId, jobId, jobSkills });
    const cachedScore = this.getCachedScore(cacheKey, dataHash);
    
    if (cachedScore) {
      return cachedScore;
    }
    
    // Calculate fresh score
    const scores = await this.batchScore([candidateId], jobId, weights);
    return scores.get(candidateId);
  }
  
  // Optimized title matching with memoization
  private static titleMatchCache = new Map<string, number>();
  
  private static calculateTitleScore(candidateTitle: string | null, jobTitle: string | null): number {
    if (!candidateTitle || !jobTitle) return 0;
    
    const cacheKey = `${candidateTitle}::${jobTitle}`;
    if (this.titleMatchCache.has(cacheKey)) {
      return this.titleMatchCache.get(cacheKey)!;
    }
    
    const candLower = candidateTitle.toLowerCase();
    const jobLower = jobTitle.toLowerCase();
    
    // Exact match
    if (candLower === jobLower) {
      this.titleMatchCache.set(cacheKey, 100);
      return 100;
    }
    
    // Word-based matching
    const candWords = new Set(candLower.split(/\s+/));
    const jobWords = new Set(jobLower.split(/\s+/));
    
    let matchCount = 0;
    for (const word of jobWords) {
      if (candWords.has(word)) {
        matchCount++;
      }
    }
    
    const score = (matchCount / jobWords.size) * 100;
    this.titleMatchCache.set(cacheKey, score);
    return score;
  }
  
  // Simple, fast experience scoring
  private static calculateExperienceScore(years: number, min: number, max: number): number {
    if (years < min) {
      return Math.max(0, 100 - (min - years) * 20);
    } else if (years > max) {
      return Math.max(70, 100 - (years - max) * 5);
    }
    return 100;
  }
  
  // Optimized recency calculation
  private static calculateRecencyScore(lastWorkDate: Date | null): number {
    if (!lastWorkDate) return 100;
    
    const monthsAgo = Math.floor((Date.now() - new Date(lastWorkDate).getTime()) / 2628000000); // Milliseconds in a month
    
    if (monthsAgo <= 3) return 100;
    if (monthsAgo <= 6) return 90;
    if (monthsAgo <= 12) return 75;
    if (monthsAgo <= 24) return 50;
    return 25;
  }
  
  // Simple gap penalty
  private static calculateGapPenalty(gapMonths: number): number {
    if (gapMonths <= 3) return 0;
    if (gapMonths <= 6) return 5;
    if (gapMonths <= 12) return 10;
    if (gapMonths <= 24) return 20;
    return 30;
  }
  
  // Generate explanation
  private static generateExplanation(scores: any): string {
    const parts = [];
    
    if (scores.skillMatch >= 80) parts.push('Strong skill match');
    else if (scores.skillMatch >= 50) parts.push('Moderate skill match');
    else parts.push('Limited skill match');
    
    if (scores.titleScore >= 70) parts.push('relevant job title');
    if (scores.experienceScore >= 90) parts.push('ideal experience level');
    else if (scores.experienceScore < 50) parts.push('experience mismatch');
    
    if (scores.gapPenalty > 10) parts.push('employment gap concerns');
    
    return parts.join(', ') || 'Candidate evaluated based on multiple factors';
  }
  
  // Clear cache for specific job or all
  static clearCache(jobId?: number): void {
    if (jobId) {
      for (const [key] of scoreCache.entries()) {
        if (key.includes(`_${jobId}_`)) {
          scoreCache.delete(key);
        }
      }
    } else {
      scoreCache.clear();
    }
    console.log(`[SuperOptimizedScoring] Cache cleared${jobId ? ` for job ${jobId}` : ' completely'}`);
  }
  
  // Warm up cache by pre-computing common scores
  static async warmUpCache(jobId: number, candidateIds: number[], weights: any): Promise<void> {
    console.log(`[SuperOptimizedScoring] Warming up cache for ${candidateIds.length} candidates`);
    await this.batchScore(candidateIds, jobId, weights);
    console.log('[SuperOptimizedScoring] Cache warmed up');
  }
}