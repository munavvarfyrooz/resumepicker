import { 
  jobs, 
  candidates, 
  candidateSkills, 
  jobSkills, 
  scores, 
  users,
  userSessions,
  userActions,
  blogPosts,
  blogCategories,
  blogPostCategories,
  mediaAssets,
  type Job, 
  type Candidate, 
  type CandidateWithScore, 
  type Score, 
  type User,
  type UpsertUser,
  type InsertUser,
  type UserSession,
  type UserAction,
  type InsertUserAction,
  type InsertJob, 
  type InsertCandidate, 
  type InsertScore, 
  type ScoreWeights,
  type UserStats,
  type UsageStats,
  type UserUsageDetail,
  type BlogPost,
  type InsertBlogPost,
  type BlogCategory,
  type InsertBlogCategory,
  type BlogPostWithCategories,
  type MediaAsset,
  type InsertMediaAsset
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, count, sql, gte } from "drizzle-orm";

export interface IStorage {
  // Authentication
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserEmailVerified(userId: string, verified: boolean): Promise<void>;
  updateUserPasswordResetToken(userId: string, token: string | null, expires: Date | null): Promise<void>;
  updateUserEmailVerificationToken(userId: string, token: string | null): Promise<void>;
  verifyEmail(token: string): Promise<User | undefined>;
  getUserByPasswordResetToken(token: string): Promise<User | undefined>;
  
  // User management
  getAllUsers(): Promise<User[]>;
  updateUserRole(userId: string, role: 'user' | 'admin'): Promise<User>;
  updateUserStatus(userId: string, isActive: boolean): Promise<User>;
  updateUserLastLogin(userId: string): Promise<User>;
  updateUserPassword(userId: string, newPassword: string): Promise<void>;
  
  // Session tracking
  createUserSession(userId: string, ipAddress?: string, userAgent?: string): Promise<UserSession>;
  endUserSession(sessionId: number): Promise<void>;
  
  // Activity tracking
  logUserAction(action: InsertUserAction): Promise<UserAction>;
  
  // Media operations
  createMediaAsset(insertAsset: InsertMediaAsset): Promise<MediaAsset>;
  getMediaAssets(): Promise<MediaAsset[]>;
  getMediaAsset(id: number): Promise<MediaAsset | undefined>;
  deleteMediaAsset(id: number): Promise<void>;

  // Analytics
  getUserStats(): Promise<UserStats>;
  getUsageStats(): Promise<UsageStats>;
  getUserUsageDetails(): Promise<UserUsageDetail[]>;
  
  // Jobs
  getJobs(userId?: string): Promise<Job[]>;
  getJob(id: number, userId?: string): Promise<Job | undefined>;
  createJob(job: InsertJob & { createdBy: string }): Promise<Job>;
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
  updateScoreAIRanking(candidateId: number, jobId: number, aiRank: number, aiRankReason: string): Promise<void>;
  updateScoreManualRanking(candidateId: number, jobId: number, manualRank: number): Promise<void>;
  
  // Blog management
  getBlogPosts(status?: 'draft' | 'published' | 'archived'): Promise<BlogPostWithCategories[]>;
  getBlogPost(id: number): Promise<BlogPostWithCategories | undefined>;
  getBlogPostBySlug(slug: string): Promise<BlogPostWithCategories | undefined>;
  createBlogPost(post: InsertBlogPost & { authorId: string }): Promise<BlogPost>;
  updateBlogPost(id: number, post: Partial<InsertBlogPost>): Promise<BlogPost>;
  deleteBlogPost(id: number): Promise<void>;
  publishBlogPost(id: number): Promise<BlogPost>;
  
  // Blog categories
  getBlogCategories(): Promise<BlogCategory[]>;
  createBlogCategory(category: InsertBlogCategory): Promise<BlogCategory>;
  updateBlogCategory(id: number, category: Partial<InsertBlogCategory>): Promise<BlogCategory>;
  deleteBlogCategory(id: number): Promise<void>;
  
  // Blog post categories
  setBlogPostCategories(postId: number, categoryIds: number[]): Promise<void>;
  
  // Utility methods
  getCandidateCountsByJob(): Promise<Record<number, number>>;
  updateUserActivity(userId: string): Promise<void>;
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
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

  async updateUserLastLogin(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async verifyEmail(token: string): Promise<User | undefined> {
    // Find user with this verification token
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.emailVerificationToken, token));
    
    if (!user) {
      return undefined;
    }

    // Update user to mark email as verified and clear token
    const [updatedUser] = await db
      .update(users)
      .set({ 
        emailVerified: true, 
        emailVerificationToken: null,
        updatedAt: new Date() 
      })
      .where(eq(users.id, user.id))
      .returning();
    
    return updatedUser;
  }

  async getUserByPasswordResetToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.passwordResetToken, token));
    
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
        sessionStart: new Date(),
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
    // Get all users first
    const allUsers = await db.select().from(users).orderBy(desc(users.lastActivityAt));
    
    // Get jobs count per user
    const jobCounts = await db
      .select({
        userId: jobs.createdBy,
        count: sql<number>`count(*)`.as('count')
      })
      .from(jobs)
      .groupBy(jobs.createdBy);
    
    // Get candidates count per user
    const candidateCounts = await db
      .select({
        userId: candidates.createdBy,
        count: sql<number>`count(*)`.as('count')
      })
      .from(candidates)
      .groupBy(candidates.createdBy);
    
    // Get sessions count per user
    const sessionCounts = await db
      .select({
        userId: userSessions.userId,
        count: sql<number>`count(*)`.as('count')
      })
      .from(userSessions)
      .groupBy(userSessions.userId);

    // Create lookup maps
    const jobCountMap = new Map(jobCounts.map(j => [j.userId, j.count]));
    const candidateCountMap = new Map(candidateCounts.map(c => [c.userId, c.count]));
    const sessionCountMap = new Map(sessionCounts.map(s => [s.userId, s.count]));

    return allUsers.map(user => ({
      user,
      jobsCreated: jobCountMap.get(user.id) || 0,
      candidatesUploaded: candidateCountMap.get(user.id) || 0,
      lastActivity: user.lastActivityAt || user.lastLoginAt,
      totalSessions: sessionCountMap.get(user.id) || 0,
    }));
  }
  
  // Update user's last activity timestamp
  async updateUserActivity(userId: string): Promise<void> {
    await db.update(users)
      .set({ lastActivityAt: new Date() })
      .where(eq(users.id, userId));
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

  async createJob(jobData: InsertJob & { createdBy: string }): Promise<Job> {
    // Validate required fields
    if (!jobData.title || jobData.title.trim() === '') {
      throw new Error('Job title is required');
    }
    if (!jobData.description || jobData.description.trim() === '') {
      throw new Error('Job description is required');
    }

    const [newJob] = await db.insert(jobs).values({
      title: jobData.title.trim(),
      description: jobData.description.trim(),
      requirements: jobData.requirements || { must: [], nice: [] },
      status: jobData.status || 'active', // Default to active instead of draft
      createdBy: jobData.createdBy
    }).returning();
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

  async updateScoreManualRanking(candidateId: number, jobId: number, manualRank: number): Promise<void> {
    await db
      .update(scores)
      .set({
        manualRank,
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

  // Blog management methods
  async getBlogPosts(status?: 'draft' | 'published' | 'archived'): Promise<BlogPostWithCategories[]> {
    const query = db.select({
      id: blogPosts.id,
      title: blogPosts.title,
      slug: blogPosts.slug,
      content: blogPosts.content,
      excerpt: blogPosts.excerpt,
      status: blogPosts.status,
      featuredImage: blogPosts.featuredImage,
      tags: blogPosts.tags,
      metaTitle: blogPosts.metaTitle,
      metaDescription: blogPosts.metaDescription,
      publishedAt: blogPosts.publishedAt,
      authorId: blogPosts.authorId,
      createdAt: blogPosts.createdAt,
      updatedAt: blogPosts.updatedAt,
      author: {
        id: users.id,
        username: users.username,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role
      }
    }).from(blogPosts)
    .leftJoin(users, eq(blogPosts.authorId, users.id))
    .where(status ? eq(blogPosts.status, status) : undefined)
    .orderBy(desc(blogPosts.createdAt));

    const posts = await query;
    
    const postsWithCategories: BlogPostWithCategories[] = [];
    
    for (const post of posts) {
      const categories = await db.select({
        id: blogCategories.id,
        name: blogCategories.name,
        slug: blogCategories.slug,
        description: blogCategories.description,
        createdAt: blogCategories.createdAt
      })
      .from(blogCategories)
      .innerJoin(blogPostCategories, eq(blogCategories.id, blogPostCategories.categoryId))
      .where(eq(blogPostCategories.postId, post.id));

      postsWithCategories.push({
        ...post,
        author: post.author as User,
        categories,
        featuredImageAlt: null,
        readingTime: 0,
        viewCount: 0,
        isPinned: false,
        scheduledAt: null
      });
    }

    return postsWithCategories;
  }

  async getBlogPost(id: number): Promise<BlogPostWithCategories | undefined> {
    const [post] = await db.select({
      id: blogPosts.id,
      title: blogPosts.title,
      slug: blogPosts.slug,
      content: blogPosts.content,
      excerpt: blogPosts.excerpt,
      status: blogPosts.status,
      featuredImage: blogPosts.featuredImage,
      tags: blogPosts.tags,
      metaTitle: blogPosts.metaTitle,
      metaDescription: blogPosts.metaDescription,
      publishedAt: blogPosts.publishedAt,
      authorId: blogPosts.authorId,
      createdAt: blogPosts.createdAt,
      updatedAt: blogPosts.updatedAt,
      author: {
        id: users.id,
        username: users.username,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role
      }
    }).from(blogPosts)
    .leftJoin(users, eq(blogPosts.authorId, users.id))
    .where(eq(blogPosts.id, id));

    if (!post) return undefined;

    const categories = await db.select({
      id: blogCategories.id,
      name: blogCategories.name,
      slug: blogCategories.slug,
      description: blogCategories.description,
      createdAt: blogCategories.createdAt
    })
    .from(blogCategories)
    .innerJoin(blogPostCategories, eq(blogCategories.id, blogPostCategories.categoryId))
    .where(eq(blogPostCategories.postId, post.id));

    return {
      ...post,
      author: post.author as User,
      categories,
      featuredImageAlt: null,
      readingTime: 0,
      viewCount: 0,
      isPinned: false,
      scheduledAt: null
    };
  }

  async getBlogPostBySlug(slug: string): Promise<BlogPostWithCategories | undefined> {
    const [post] = await db.select({
      id: blogPosts.id,
      title: blogPosts.title,
      slug: blogPosts.slug,
      content: blogPosts.content,
      excerpt: blogPosts.excerpt,
      status: blogPosts.status,
      featuredImage: blogPosts.featuredImage,
      tags: blogPosts.tags,
      metaTitle: blogPosts.metaTitle,
      metaDescription: blogPosts.metaDescription,
      publishedAt: blogPosts.publishedAt,
      authorId: blogPosts.authorId,
      createdAt: blogPosts.createdAt,
      updatedAt: blogPosts.updatedAt,
      author: {
        id: users.id,
        username: users.username,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role
      }
    }).from(blogPosts)
    .leftJoin(users, eq(blogPosts.authorId, users.id))
    .where(eq(blogPosts.slug, slug));

    if (!post) return undefined;

    const categories = await db.select({
      id: blogCategories.id,
      name: blogCategories.name,
      slug: blogCategories.slug,
      description: blogCategories.description,
      createdAt: blogCategories.createdAt
    })
    .from(blogCategories)
    .innerJoin(blogPostCategories, eq(blogCategories.id, blogPostCategories.categoryId))
    .where(eq(blogPostCategories.postId, post.id));

    return {
      ...post,
      author: post.author as User,
      categories,
      featuredImageAlt: null,
      readingTime: 0,
      viewCount: 0,
      isPinned: false,
      scheduledAt: null
    };
  }

  async createBlogPost(postData: InsertBlogPost & { authorId: string }): Promise<BlogPost> {
    const [post] = await db.insert(blogPosts).values({
      ...postData,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return post;
  }

  async updateBlogPost(id: number, postData: Partial<InsertBlogPost>): Promise<BlogPost> {
    const [post] = await db.update(blogPosts)
      .set({
        ...postData,
        updatedAt: new Date()
      })
      .where(eq(blogPosts.id, id))
      .returning();
    return post;
  }

  async deleteBlogPost(id: number): Promise<void> {
    await db.delete(blogPostCategories).where(eq(blogPostCategories.postId, id));
    await db.delete(blogPosts).where(eq(blogPosts.id, id));
  }

  async publishBlogPost(id: number): Promise<BlogPost> {
    const [post] = await db.update(blogPosts)
      .set({
        status: 'published',
        publishedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(blogPosts.id, id))
      .returning();
    return post;
  }

  async getBlogCategories(): Promise<BlogCategory[]> {
    return await db.select().from(blogCategories).orderBy(blogCategories.name);
  }

  async createBlogCategory(categoryData: InsertBlogCategory): Promise<BlogCategory> {
    const [category] = await db.insert(blogCategories).values({
      ...categoryData,
      createdAt: new Date()
    }).returning();
    return category;
  }

  async updateBlogCategory(id: number, categoryData: Partial<InsertBlogCategory>): Promise<BlogCategory> {
    const [category] = await db.update(blogCategories)
      .set(categoryData)
      .where(eq(blogCategories.id, id))
      .returning();
    return category;
  }

  async deleteBlogCategory(id: number): Promise<void> {
    await db.delete(blogPostCategories).where(eq(blogPostCategories.categoryId, id));
    await db.delete(blogCategories).where(eq(blogCategories.id, id));
  }

  async setBlogPostCategories(postId: number, categoryIds: number[]): Promise<void> {
    await db.delete(blogPostCategories).where(eq(blogPostCategories.postId, postId));
    
    if (categoryIds.length > 0) {
      await db.insert(blogPostCategories).values(
        categoryIds.map(categoryId => ({ postId, categoryId }))
      );
    }
  }

  // Media operations implementation
  async createMediaAsset(insertAsset: InsertMediaAsset): Promise<MediaAsset> {
    const [mediaAsset] = await db
      .insert(mediaAssets)
      .values(insertAsset)
      .returning();
    return mediaAsset;
  }

  async getMediaAssets(): Promise<MediaAsset[]> {
    return await db
      .select()
      .from(mediaAssets)
      .orderBy(desc(mediaAssets.createdAt));
  }

  async getMediaAsset(id: number): Promise<MediaAsset | undefined> {
    const [mediaAsset] = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, id));
    return mediaAsset;
  }

  async deleteMediaAsset(id: number): Promise<void> {
    await db
      .delete(mediaAssets)
      .where(eq(mediaAssets.id, id));
  }
  async updateUserPassword(id: string, newPassword: string): Promise<void> {
    const bcrypt = await import('bcrypt');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    await db
      .update(users)
      .set({ 
        password: hashedPassword, 
        updatedAt: new Date() 
      })
      .where(eq(users.id, id));
  }

  async updateUserEmailVerified(userId: string, verified: boolean): Promise<void> {
    await db
      .update(users)
      .set({ 
        emailVerified: verified, 
        emailVerificationToken: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async updateUserPasswordResetToken(userId: string, token: string | null, expires: Date | null): Promise<void> {
    await db
      .update(users)
      .set({ 
        passwordResetToken: token, 
        passwordResetExpires: expires,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async updateUserEmailVerificationToken(userId: string, token: string | null): Promise<void> {
    await db
      .update(users)
      .set({ 
        emailVerificationToken: token,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();
