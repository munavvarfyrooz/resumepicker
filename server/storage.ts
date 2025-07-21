import { 
  jobs, 
  candidates, 
  candidateSkills, 
  jobSkills, 
  scores, 
  users,
  userSessions,
  userActions,
  type Job, 
  type Candidate, 
  type CandidateWithScore, 
  type Score, 
  type User,
  type UpsertUser,
  type UserSession,
  type UserAction,
  type InsertUserAction,
  type InsertJob, 
  type InsertCandidate, 
  type InsertScore, 
  type ScoreWeights,
  type UserStats,
  type UsageStats,
  type UserUsageDetail
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, count, sql, gte } from "drizzle-orm";

export interface IStorage {
  // Authentication
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // User management
  getAllUsers(): Promise<User[]>;
  updateUserRole(userId: string, role: 'user' | 'admin'): Promise<User>;
  updateUserStatus(userId: string, isActive: boolean): Promise<User>;
  
  // Session tracking
  createUserSession(userId: string, ipAddress?: string, userAgent?: string): Promise<UserSession>;
  endUserSession(sessionId: number): Promise<void>;
  
  // Activity tracking
  logUserAction(action: InsertUserAction): Promise<UserAction>;
  
  // Analytics
  getUserStats(): Promise<UserStats>;
  getUsageStats(): Promise<UsageStats>;
  getUserUsageDetails(): Promise<UserUsageDetail[]>;
  
  // Jobs
  getJobs(userId?: string): Promise<Job[]>;
  getJob(id: number, userId?: string): Promise<Job | undefined>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: number, job: Partial<InsertJob>): Promise<Job>;
  deleteJob(id: number): Promise<void>;
  
  // Candidates
  getCandidates(userId?: string): Promise<Candidate[]>;
  getCandidate(id: number, userId?: string): Promise<Candidate | undefined>;
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  deleteCandidate(id: number): Promise<void>;
  getCandidatesWithScores(jobId: number, userId?: string): Promise<CandidateWithScore[]>;
  
  // Skills
  getCandidateSkills(candidateId: number): Promise<string[]>;
  setCandidateSkills(candidateId: number, skills: string[]): Promise<void>;
  getJobSkills(jobId: number): Promise<{ skill: string; required: boolean }[]>;
  setJobSkills(jobId: number, skills: { skill: string; required: boolean }[]): Promise<void>;
  
  // Scores
  getScore(candidateId: number, jobId: number): Promise<Score | undefined>;
  saveScore(score: InsertScore): Promise<Score>;
  updateScoreWeights(jobId: number, weights: ScoreWeights): Promise<void>;
  
  // Utility methods
  getCandidateCountsByJob(): Promise<Record<number, number>>;
}

export class DatabaseStorage implements IStorage {
  // Authentication methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        lastLoginAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // User management methods
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUserRole(userId: string, role: 'user' | 'admin'): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Session tracking
  async createUserSession(userId: string, ipAddress?: string, userAgent?: string): Promise<UserSession> {
    const [session] = await db
      .insert(userSessions)
      .values({
        userId,
        ipAddress,
        userAgent,
      })
      .returning();
    return session;
  }

  async endUserSession(sessionId: number): Promise<void> {
    await db
      .update(userSessions)
      .set({ sessionEnd: new Date() })
      .where(eq(userSessions.id, sessionId));
  }

  // Activity tracking
  async logUserAction(action: InsertUserAction): Promise<UserAction> {
    const [userAction] = await db
      .insert(userActions)
      .values(action)
      .returning();
    return userAction;
  }

  // Analytics methods
  async getUserStats(): Promise<UserStats> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [totalUsers] = await db
      .select({ count: count() })
      .from(users);

    const [activeUsers] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.isActive, true));

    const [newUsers] = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.createdAt, oneWeekAgo));

    const [adminUsers] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.role, 'admin'));

    return {
      totalUsers: totalUsers.count,
      activeUsers: activeUsers.count,
      newUsersThisWeek: newUsers.count,
      adminUsers: adminUsers.count,
    };
  }

  async getUsageStats(): Promise<UsageStats> {
    const [totalJobs] = await db
      .select({ count: count() })
      .from(jobs);

    const [totalCandidates] = await db
      .select({ count: count() })
      .from(candidates);

    const [uploadActions] = await db
      .select({ count: count() })
      .from(userActions)
      .where(eq(userActions.action, 'upload'));

    // Calculate average candidates per job
    const avgCandidatesPerJob = totalJobs.count > 0 
      ? Math.round(totalCandidates.count / totalJobs.count * 100) / 100
      : 0;

    return {
      totalJobs: totalJobs.count,
      totalCandidates: totalCandidates.count,
      totalUploads: uploadActions.count,
      avgCandidatesPerJob,
    };
  }

  async getUserUsageDetails(): Promise<UserUsageDetail[]> {
    const userUsage = await db
      .select({
        user: users,
        jobsCreated: sql<number>`count(distinct ${jobs.id})`.as('jobs_created'),
        candidatesUploaded: sql<number>`count(distinct ${userActions.id})`.as('candidates_uploaded'),
        totalSessions: sql<number>`count(distinct ${userSessions.id})`.as('total_sessions'),
      })
      .from(users)
      .leftJoin(jobs, eq(jobs.createdBy, users.id))
      .leftJoin(userActions, and(
        eq(userActions.userId, users.id),
        eq(userActions.action, 'upload')
      ))
      .leftJoin(userSessions, eq(userSessions.userId, users.id))
      .groupBy(users.id)
      .orderBy(desc(users.lastLoginAt));

    return userUsage.map(row => ({
      user: row.user,
      jobsCreated: row.jobsCreated || 0,
      candidatesUploaded: row.candidatesUploaded || 0,
      lastActivity: row.user.lastLoginAt,
      totalSessions: row.totalSessions || 0,
    }));
  }
  async getJobs(userId?: string): Promise<Job[]> {
    if (userId) {
      return await db.select().from(jobs).where(eq(jobs.createdBy, userId)).orderBy(desc(jobs.createdAt));
    }
    return await db.select().from(jobs).orderBy(desc(jobs.createdAt));
  }

  async getJob(id: number, userId?: string): Promise<Job | undefined> {
    if (userId) {
      const [job] = await db.select().from(jobs).where(and(eq(jobs.id, id), eq(jobs.createdBy, userId)));
      return job || undefined;
    }
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job || undefined;
  }

  async createJob(job: InsertJob): Promise<Job> {
    const insertData: any = {
      title: job.title,
      description: job.description,
      requirements: job.requirements || { must: [], nice: [] },
      status: job.status || 'draft', // Default to draft, becomes active when saved
      createdBy: job.createdBy // Add user association
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

  async deleteJob(id: number): Promise<void> {
    // Delete related data first (cascade delete)
    await db.delete(jobSkills).where(eq(jobSkills.jobId, id));
    await db.delete(scores).where(eq(scores.jobId, id));
    
    // Delete the job
    await db.delete(jobs).where(eq(jobs.id, id));
  }

  async getCandidates(userId?: string): Promise<Candidate[]> {
    if (userId) {
      return await db.select().from(candidates).where(eq(candidates.createdBy, userId)).orderBy(desc(candidates.createdAt));
    }
    return await db.select().from(candidates).orderBy(desc(candidates.createdAt));
  }

  async getCandidate(id: number, userId?: string): Promise<Candidate | undefined> {
    if (userId) {
      const [candidate] = await db.select().from(candidates).where(and(eq(candidates.id, id), eq(candidates.createdBy, userId)));
      return candidate || undefined;
    }
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
      createdBy: candidate.createdBy, // Add user association
      experienceGaps: candidate.experienceGaps || [],
      experienceTimeline: candidate.experienceTimeline || []
    };
    const [newCandidate] = await db.insert(candidates).values(candidateData).returning();
    return newCandidate;
  }

  async deleteCandidate(id: number): Promise<void> {
    // Delete related data first (cascade delete)
    await db.delete(candidateSkills).where(eq(candidateSkills.candidateId, id));
    await db.delete(scores).where(eq(scores.candidateId, id));
    
    // Delete the candidate
    await db.delete(candidates).where(eq(candidates.id, id));
  }

  async getCandidatesWithScores(jobId: number, userId?: string): Promise<CandidateWithScore[]> {
    let candidatesList;
    if (userId) {
      candidatesList = await db.select().from(candidates).where(eq(candidates.createdBy, userId));
    } else {
      candidatesList = await db.select().from(candidates);
    }
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

  async updateScoreAIRanking(candidateId: number, jobId: number, aiRank: number, aiRankReason: string): Promise<void> {
    await db
      .update(scores)
      .set({
        aiRank,
        aiRankReason,
      })
      .where(and(eq(scores.candidateId, candidateId), eq(scores.jobId, jobId)));
  }

  async getCandidateCountsByJob(userId?: string): Promise<Record<number, number>> {
    // Get user's jobs only when userId is provided
    const allJobs = await this.getJobs(userId);
    const counts: Record<number, number> = {};
    
    for (const job of allJobs) {
      const candidatesWithScores = await this.getCandidatesWithScores(job.id, userId);
      counts[job.id] = candidatesWithScores.length;
    }
    
    return counts;
  }
}

export const storage = new DatabaseStorage();
