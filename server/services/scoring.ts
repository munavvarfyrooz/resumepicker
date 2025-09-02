import { type ScoreWeights, type CandidateWithScore, type Job } from "@shared/schema";
import { storage } from "../storage";
import { AIParsingService } from './aiParsing';

export interface ScoreBreakdown {
  totalScore: number;
  skillMatchScore: number;
  titleScore: number;
  seniorityScore: number;
  recencyScore: number;
  gapPenalty: number;
  missingMustHave: string[];
  explanation: string;
}

export class ScoringEngine {
  private static defaultWeights: ScoreWeights = {
    skills: 0.5,
    title: 0.2,
    seniority: 0.15,
    recency: 0.1,
    gaps: 0.05,
  };

  static async scoreCandidate(
    candidateId: number,
    jobId: number,
    weights: ScoreWeights = this.defaultWeights
  ): Promise<ScoreBreakdown> {
    const candidate = await storage.getCandidate(candidateId);
    const job = await storage.getJob(jobId);
    
    if (!candidate || !job) {
      throw new Error('Candidate or job not found');
    }

    const candidateSkills = await storage.getCandidateSkills(candidateId);
    const jobSkills = await storage.getJobSkills(jobId);

    const skillMatch = this.calculateSkillMatch(candidateSkills, jobSkills);
    const titleMatch = await this.calculateTitleMatch(candidate.lastRoleTitle, job.title);
    const seniorityMatch = this.calculateSeniorityMatch(candidate.yearsExperience);
    const recencyScore = this.calculateRecencyScore(candidate.createdAt);
    const gapPenalty = this.calculateGapPenalty(candidate.experienceGaps || []);

    const skillMatchScore = skillMatch.score;
    const titleScore = titleMatch;
    const seniorityScore = seniorityMatch;
    const recencyScoreValue = recencyScore;
    const gapPenaltyValue = gapPenalty;

    const totalScore = Math.round(
      skillMatchScore * weights.skills +
      titleScore * weights.title +
      seniorityScore * weights.seniority +
      recencyScoreValue * weights.recency +
      (100 - gapPenaltyValue) * weights.gaps
    );

    const explanation = this.generateExplanation(
      candidate,
      job,
      {
        skillMatchScore,
        titleScore,
        seniorityScore,
        recencyScore: recencyScoreValue,
        gapPenalty: gapPenaltyValue,
        missingMustHave: skillMatch.missingMust,
      }
    );

    return {
      totalScore,
      skillMatchScore,
      titleScore,
      seniorityScore,
      recencyScore: recencyScoreValue,
      gapPenalty: gapPenaltyValue,
      missingMustHave: skillMatch.missingMust,
      explanation,
    };
  }

  private static calculateSkillMatch(
    candidateSkills: string[],
    jobSkills: { skill: string; required: boolean }[]
  ): { score: number; missingMust: string[] } {
    // If no job skills are defined, return 0 score
    if (!jobSkills || jobSkills.length === 0) {
      return {
        score: 0,
        missingMust: [],
      };
    }

    const requiredSkills = jobSkills.filter(s => s.required).map(s => s.skill.toLowerCase());
    const niceToHaveSkills = jobSkills.filter(s => !s.required).map(s => s.skill.toLowerCase());
    const candidateSkillsLower = candidateSkills.map(s => s.toLowerCase());

    const missingMust = requiredSkills.filter(skill => 
      !candidateSkillsLower.some(cSkill => cSkill.includes(skill) || skill.includes(cSkill))
    );

    const matchedRequired = requiredSkills.filter(skill => 
      candidateSkillsLower.some(cSkill => cSkill.includes(skill) || skill.includes(cSkill))
    ).length;

    const matchedNiceToHave = niceToHaveSkills.filter(skill => 
      candidateSkillsLower.some(cSkill => cSkill.includes(skill) || skill.includes(cSkill))
    ).length;

    // Calculate scores based on what's actually defined
    let score = 0;
    
    if (requiredSkills.length > 0) {
      // Required skills are worth 80% of total score
      score += (matchedRequired / requiredSkills.length) * 80;
    }
    
    if (niceToHaveSkills.length > 0) {
      // Nice-to-have skills are worth 20% of total score
      score += (matchedNiceToHave / niceToHaveSkills.length) * 20;
    } else if (requiredSkills.length > 0) {
      // If only required skills exist, they're worth 100%
      score = (matchedRequired / requiredSkills.length) * 100;
    }

    return {
      score: Math.round(score),
      missingMust: missingMust,
    };
  }

  private static async calculateTitleMatch(candidateTitle?: string, jobTitle?: string): Promise<number> {
    if (!candidateTitle || !jobTitle) return 50;

    const candidateTitleLower = candidateTitle.toLowerCase();
    const jobTitleLower = jobTitle.toLowerCase();

    // Direct match
    if (candidateTitleLower.includes(jobTitleLower) || jobTitleLower.includes(candidateTitleLower)) {
      return 100;
    }

    // Use AI semantic similarity for better matching
    try {
      const similarity = await AIParsingService.calculateSemanticSimilarity(candidateTitle, jobTitle);
      const aiScore = Math.round(similarity * 100);
      
      // Combine AI score with traditional matching
      const traditionalScore = this.calculateTraditionalTitleMatch(candidateTitle, jobTitle);
      
      // Use higher of the two scores
      return Math.max(aiScore, traditionalScore);
    } catch (error) {
      console.error('AI title matching failed, using traditional method:', error);
      return this.calculateTraditionalTitleMatch(candidateTitle, jobTitle);
    }
  }

  private static calculateTraditionalTitleMatch(candidateTitle: string, jobTitle: string): number {
    const candidateTitleLower = candidateTitle.toLowerCase();
    const jobTitleLower = jobTitle.toLowerCase();

    // Seniority level matching
    const seniorityLevels = ['junior', 'mid', 'senior', 'lead', 'principal', 'staff'];
    const candidateLevel = seniorityLevels.findIndex(level => candidateTitleLower.includes(level));
    const jobLevel = seniorityLevels.findIndex(level => jobTitleLower.includes(level));

    if (candidateLevel >= 0 && jobLevel >= 0) {
      const levelDiff = Math.abs(candidateLevel - jobLevel);
      return Math.max(50, 100 - (levelDiff * 15));
    }

    // Basic keyword matching
    const candidateKeywords = candidateTitleLower.split(/\s+/);
    const jobKeywords = jobTitleLower.split(/\s+/);
    const matches = candidateKeywords.filter(word => jobKeywords.includes(word)).length;
    
    return Math.min(90, matches * 20 + 30);
  }

  private static calculateSeniorityMatch(yearsExperience?: number): number {
    if (!yearsExperience) return 50;

    if (yearsExperience >= 8) return 100;
    if (yearsExperience >= 5) return 85;
    if (yearsExperience >= 3) return 70;
    if (yearsExperience >= 1) return 55;
    return 30;
  }

  private static calculateRecencyScore(lastActivity: Date): number {
    const now = new Date();
    const monthsAgo = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24 * 30);

    if (monthsAgo <= 1) return 100;
    if (monthsAgo <= 3) return 90;
    if (monthsAgo <= 6) return 80;
    if (monthsAgo <= 12) return 70;
    return 50;
  }

  private static calculateGapPenalty(gaps: Array<{ start: string; end: string; months: number }>): number {
    const totalGapMonths = gaps.reduce((sum, gap) => sum + gap.months, 0);
    
    if (totalGapMonths === 0) return 0;
    if (totalGapMonths <= 3) return 5;
    if (totalGapMonths <= 6) return 15;
    if (totalGapMonths <= 12) return 25;
    return 40;
  }

  private static generateExplanation(
    candidate: any,
    job: any,
    scores: {
      skillMatchScore: number;
      titleScore: number;
      seniorityScore: number;
      recencyScore: number;
      gapPenalty: number;
      missingMustHave: string[];
    }
  ): string {
    const parts: string[] = [];

    // Opening
    parts.push(`${candidate.name} is a ${this.getMatchQuality(scores.skillMatchScore + scores.titleScore)} match for the ${job.title} position.`);

    // Skills assessment
    if (scores.missingMustHave.length === 0) {
      parts.push("The candidate meets all required technical skills.");
    } else {
      parts.push(`However, they are missing ${scores.missingMustHave.length} critical skill(s): ${scores.missingMustHave.join(', ')}.`);
    }

    // Experience assessment
    if (candidate.yearsExperience) {
      if (candidate.yearsExperience >= 5) {
        parts.push(`With ${candidate.yearsExperience} years of experience, they demonstrate strong seniority for this role.`);
      } else {
        parts.push(`With ${candidate.yearsExperience} years of experience, they may need additional mentoring.`);
      }
    }

    // Title relevance
    if (scores.titleScore >= 80) {
      parts.push("Their current role aligns well with the position requirements.");
    } else if (scores.titleScore >= 60) {
      parts.push("Their current role has some relevance to the position.");
    } else {
      parts.push("Their current role differs significantly from the position requirements.");
    }

    // Gap assessment
    if (scores.gapPenalty === 0) {
      parts.push("The candidate shows consistent employment history with no significant gaps.");
    } else if (scores.gapPenalty <= 15) {
      parts.push("There are minor employment gaps that should be discussed during interview.");
    } else {
      parts.push("There are significant employment gaps that require clarification.");
    }

    return parts.join(' ');
  }

  private static getMatchQuality(combinedScore: number): string {
    if (combinedScore >= 160) return "excellent";
    if (combinedScore >= 140) return "very good";
    if (combinedScore >= 120) return "good";
    if (combinedScore >= 100) return "fair";
    return "poor";
  }
}
