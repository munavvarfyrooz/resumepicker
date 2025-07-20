import { jobs, candidates, candidateSkills, jobSkills, scores, type Job, type Candidate, type CandidateWithScore, type Score, type InsertJob, type InsertCandidate, type InsertScore, type ScoreWeights } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // Jobs
  getJobs(): Promise<Job[]>;
  getJob(id: number): Promise<Job | undefined>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: number, job: Partial<InsertJob>): Promise<Job>;
  
  // Candidates
  getCandidates(): Promise<Candidate[]>;
  getCandidate(id: number): Promise<Candidate | undefined>;
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  getCandidatesWithScores(jobId: number): Promise<CandidateWithScore[]>;
  
  // Skills
  getCandidateSkills(candidateId: number): Promise<string[]>;
  setCandidateSkills(candidateId: number, skills: string[]): Promise<void>;
  getJobSkills(jobId: number): Promise<{ skill: string; required: boolean }[]>;
  setJobSkills(jobId: number, skills: { skill: string; required: boolean }[]): Promise<void>;
  
  // Scores
  getScore(candidateId: number, jobId: number): Promise<Score | undefined>;
  saveScore(score: InsertScore): Promise<Score>;
  updateScoreWeights(jobId: number, weights: ScoreWeights): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getJobs(): Promise<Job[]> {
    return await db.select().from(jobs).orderBy(desc(jobs.createdAt));
  }

  async getJob(id: number): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job || undefined;
  }

  async createJob(job: InsertJob): Promise<Job> {
    const insertData: any = {
      title: job.title,
      description: job.description,
      requirements: job.requirements || { must: [], nice: [] },
      status: job.status || 'draft'
    };
    const [newJob] = await db.insert(jobs).values(insertData).returning();
    return newJob;
  }

  async updateJob(id: number, job: Partial<InsertJob>): Promise<Job> {
    const updateData: any = {};
    if (job.title !== undefined) updateData.title = job.title;
    if (job.description !== undefined) updateData.description = job.description;
    if (job.status !== undefined) updateData.status = job.status;
    if (job.requirements !== undefined) {
      updateData.requirements = {
        must: Array.isArray(job.requirements.must) ? job.requirements.must : [],
        nice: Array.isArray(job.requirements.nice) ? job.requirements.nice : []
      };
    }
    const [updatedJob] = await db.update(jobs).set(updateData).where(eq(jobs.id, id)).returning();
    return updatedJob;
  }

  async getCandidates(): Promise<Candidate[]> {
    return await db.select().from(candidates).orderBy(desc(candidates.createdAt));
  }

  async getCandidate(id: number): Promise<Candidate | undefined> {
    const [candidate] = await db.select().from(candidates).where(eq(candidates.id, id));
    return candidate || undefined;
  }

  async createCandidate(candidate: InsertCandidate): Promise<Candidate> {
    const candidateData: any = {
      name: candidate.name,
      email: candidate.email,
      fileName: candidate.fileName,
      fileType: candidate.fileType,
      filePath: candidate.filePath,
      extractedText: candidate.extractedText,
      yearsExperience: candidate.yearsExperience,
      lastRoleTitle: candidate.lastRoleTitle,
      experienceGaps: candidate.experienceGaps || [],
      experienceTimeline: candidate.experienceTimeline || []
    };
    const [newCandidate] = await db.insert(candidates).values(candidateData).returning();
    return newCandidate;
  }

  async getCandidatesWithScores(jobId: number): Promise<CandidateWithScore[]> {
    const candidatesList = await db.select().from(candidates);
    const candidatesWithScores: CandidateWithScore[] = [];

    for (const candidate of candidatesList) {
      const [score] = await db.select().from(scores)
        .where(and(eq(scores.candidateId, candidate.id), eq(scores.jobId, jobId)));
      
      const skills = await db.select().from(candidateSkills)
        .where(eq(candidateSkills.candidateId, candidate.id));

      candidatesWithScores.push({
        ...candidate,
        score: score || undefined,
        skills,
      });
    }

    return candidatesWithScores.sort((a, b) => (b.score?.totalScore || 0) - (a.score?.totalScore || 0));
  }

  async getCandidateSkills(candidateId: number): Promise<string[]> {
    const skills = await db.select().from(candidateSkills)
      .where(eq(candidateSkills.candidateId, candidateId));
    return skills.map(s => s.skill);
  }

  async setCandidateSkills(candidateId: number, skills: string[]): Promise<void> {
    // Delete existing skills
    await db.delete(candidateSkills).where(eq(candidateSkills.candidateId, candidateId));
    
    // Insert new skills
    if (skills.length > 0) {
      await db.insert(candidateSkills).values(
        skills.map(skill => ({ candidateId, skill }))
      );
    }
  }

  async getJobSkills(jobId: number): Promise<{ skill: string; required: boolean }[]> {
    const skills = await db.select().from(jobSkills)
      .where(eq(jobSkills.jobId, jobId));
    return skills.map(s => ({ skill: s.skill, required: s.required }));
  }

  async setJobSkills(jobId: number, skills: { skill: string; required: boolean }[]): Promise<void> {
    // Delete existing skills
    await db.delete(jobSkills).where(eq(jobSkills.jobId, jobId));
    
    // Insert new skills
    if (skills.length > 0) {
      await db.insert(jobSkills).values(
        skills.map(s => ({ jobId, skill: s.skill, required: s.required }))
      );
    }
  }

  async getScore(candidateId: number, jobId: number): Promise<Score | undefined> {
    const [score] = await db.select().from(scores)
      .where(and(eq(scores.candidateId, candidateId), eq(scores.jobId, jobId)));
    return score || undefined;
  }

  async saveScore(score: InsertScore): Promise<Score> {
    // Check if score exists
    const existing = await this.getScore(score.candidateId, score.jobId);
    
    const scoreData: any = {
      candidateId: score.candidateId,
      jobId: score.jobId,
      totalScore: score.totalScore,
      skillMatchScore: score.skillMatchScore,
      titleScore: score.titleScore,
      seniorityScore: score.seniorityScore,
      recencyScore: score.recencyScore,
      gapPenalty: score.gapPenalty,
      missingMustHave: score.missingMustHave || [],
      explanation: score.explanation,
      weights: score.weights
    };
    
    if (existing) {
      const [updatedScore] = await db.update(scores)
        .set(scoreData)
        .where(and(eq(scores.candidateId, score.candidateId), eq(scores.jobId, score.jobId)))
        .returning();
      return updatedScore;
    } else {
      const [newScore] = await db.insert(scores).values(scoreData).returning();
      return newScore;
    }
  }

  async updateScoreWeights(jobId: number, weights: ScoreWeights): Promise<void> {
    await db.update(scores)
      .set({ weights })
      .where(eq(scores.jobId, jobId));
  }
}

export const storage = new DatabaseStorage();
