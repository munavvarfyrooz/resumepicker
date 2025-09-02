import { storage } from '../storage';
import { ScoringEngine } from './scoring';

export interface BatchScoreData {
  candidateId: number;
  jobId: number;
  candidate: any;
  job: any;
  candidateSkills: any[];
  jobSkills: any[];
}

export class OptimizedScoringEngine {
  // Batch fetch all data needed for scoring
  static async batchFetchScoringData(candidateIds: number[], jobId: number): Promise<Map<number, BatchScoreData>> {
    // Fetch job data once
    const job = await storage.getJob(jobId);
    const jobSkills = await storage.getJobSkills(jobId);
    
    // Batch fetch all candidates
    const candidatesPromise = Promise.all(
      candidateIds.map(id => storage.getCandidate(id))
    );
    
    // Batch fetch all candidate skills
    const skillsPromise = Promise.all(
      candidateIds.map(id => storage.getCandidateSkills(id))
    );
    
    const [candidates, allCandidateSkills] = await Promise.all([
      candidatesPromise,
      skillsPromise
    ]);
    
    // Create map for easy lookup
    const dataMap = new Map<number, BatchScoreData>();
    
    candidateIds.forEach((candidateId, index) => {
      if (candidates[index]) {
        dataMap.set(candidateId, {
          candidateId,
          jobId,
          candidate: candidates[index],
          job,
          candidateSkills: allCandidateSkills[index] || [],
          jobSkills: jobSkills || []
        });
      }
    });
    
    return dataMap;
  }
  
  // Calculate scores using pre-fetched data
  static calculateScoreFromBatchData(data: BatchScoreData, weights: any) {
    const { candidate, job, candidateSkills, jobSkills } = data;
    
    // Calculate skill match using imported ScoringEngine
    const skillMatch = (ScoringEngine as any).calculateSkillMatch(candidateSkills, jobSkills);
    
    // Calculate title match (simplified for batch processing)
    const titleScore = this.calculateTitleMatch(
      candidate.lastRoleTitle || '',
      job.title || ''
    );
    
    // Calculate seniority score
    const seniorityScore = this.calculateSeniorityScore(
      candidate.yearsExperience || 0,
      job.minExperience || 0,
      job.maxExperience || 99
    );
    
    // Calculate recency score
    const recencyScore = this.calculateRecencyScore(candidate.lastWorkDate);
    
    // Calculate gap penalty
    const gapPenalty = this.calculateGapPenalty(candidate.gapMonths || 0);
    
    // Calculate total score
    const totalScore = 
      skillMatch.score * weights.skills +
      titleScore * weights.title +
      seniorityScore * weights.seniority +
      recencyScore * weights.recency -
      gapPenalty * weights.gaps;
    
    return {
      totalScore: Math.max(0, Math.min(100, totalScore)),
      skillMatchScore: skillMatch.score,
      titleScore,
      seniorityScore,
      recencyScore,
      gapPenalty,
      missingMustHave: skillMatch.missingMustHave,
      explanation: this.generateExplanation({
        skillMatch: skillMatch.score,
        titleScore,
        seniorityScore,
        recencyScore,
        gapPenalty,
        weights
      })
    };
  }
  
  private static calculateTitleMatch(candidateTitle: string, jobTitle: string): number {
    if (!candidateTitle || !jobTitle) return 0;
    
    const candWords = candidateTitle.toLowerCase().split(/\s+/);
    const jobWords = jobTitle.toLowerCase().split(/\s+/);
    
    // Check for exact match
    if (candidateTitle.toLowerCase() === jobTitle.toLowerCase()) return 100;
    
    // Check for partial matches
    const matchingWords = candWords.filter(word => 
      jobWords.some(jWord => jWord.includes(word) || word.includes(jWord))
    );
    
    return (matchingWords.length / Math.max(candWords.length, jobWords.length)) * 100;
  }
  
  private static calculateSeniorityScore(years: number, min: number, max: number): number {
    if (years < min) {
      // Under-qualified: reduce score based on how far below minimum
      return Math.max(0, 100 - (min - years) * 20);
    } else if (years > max) {
      // Over-qualified: slight penalty
      return Math.max(70, 100 - (years - max) * 5);
    } else {
      // Within range: perfect score
      return 100;
    }
  }
  
  private static calculateRecencyScore(lastWorkDate: Date | null): number {
    if (!lastWorkDate) return 100; // Currently employed or no data
    
    const monthsAgo = Math.floor(
      (Date.now() - new Date(lastWorkDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    
    if (monthsAgo <= 3) return 100;
    if (monthsAgo <= 6) return 90;
    if (monthsAgo <= 12) return 75;
    if (monthsAgo <= 24) return 50;
    return 25;
  }
  
  private static calculateGapPenalty(gapMonths: number): number {
    if (gapMonths <= 3) return 0;
    if (gapMonths <= 6) return 5;
    if (gapMonths <= 12) return 10;
    if (gapMonths <= 24) return 20;
    return 30;
  }
  
  private static generateExplanation(scores: any): string {
    const parts = [];
    
    if (scores.skillMatch >= 80) {
      parts.push('Strong skill match');
    } else if (scores.skillMatch >= 50) {
      parts.push('Moderate skill match');
    } else {
      parts.push('Limited skill match');
    }
    
    if (scores.titleScore >= 70) {
      parts.push('relevant job title');
    }
    
    if (scores.seniorityScore >= 90) {
      parts.push('ideal experience level');
    } else if (scores.seniorityScore < 50) {
      parts.push('experience mismatch');
    }
    
    if (scores.gapPenalty > 10) {
      parts.push('employment gap concerns');
    }
    
    return parts.join(', ') || 'Candidate evaluated based on multiple factors';
  }
}