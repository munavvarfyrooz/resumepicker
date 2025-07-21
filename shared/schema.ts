import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real, varchar, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Authentication tables
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { enum: ["user", "admin"] }).notNull().default("user"),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Usage tracking tables
export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  sessionStart: timestamp("session_start").defaultNow().notNull(),
  sessionEnd: timestamp("session_end"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
});

export const userActions = pgTable("user_actions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  action: varchar("action").notNull(), // upload, create_job, score_candidates, etc.
  resourceType: varchar("resource_type"), // job, candidate, etc.
  resourceId: integer("resource_id"),
  metadata: jsonb("metadata"), // Additional action data
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  requirements: jsonb("requirements").$type<{
    must: string[];
    nice: string[];
  }>().notNull(),
  status: text("status", { enum: ["draft", "active", "closed"] }).notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: varchar("created_by").references(() => users.id),
});

export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  filePath: text("file_path").notNull(),
  extractedText: text("extracted_text").notNull(),
  yearsExperience: real("years_experience"),
  lastRoleTitle: text("last_role_title"),
  experienceGaps: jsonb("experience_gaps").$type<Array<{
    start: string;
    end: string;
    months: number;
  }>>(),
  experienceTimeline: jsonb("experience_timeline").$type<Array<{
    company: string;
    role: string;
    startDate: string;
    endDate: string;
    yearsInRole: number;
  }>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const candidateSkills = pgTable("candidate_skills", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
  skill: text("skill").notNull(),
  proficiency: text("proficiency", { enum: ["beginner", "intermediate", "advanced", "expert"] }),
});

export const jobSkills = pgTable("job_skills", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").references(() => jobs.id).notNull(),
  skill: text("skill").notNull(),
  required: boolean("required").notNull().default(false),
  weight: real("weight").notNull().default(1.0),
});

export const scores = pgTable("scores", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
  jobId: integer("job_id").references(() => jobs.id).notNull(),
  totalScore: real("total_score").notNull(),
  skillMatchScore: real("skill_match_score").notNull(),
  titleScore: real("title_score").notNull(),
  seniorityScore: real("seniority_score").notNull(),
  recencyScore: real("recency_score").notNull(),
  gapPenalty: real("gap_penalty").notNull(),
  missingMustHave: jsonb("missing_must_have").$type<string[]>().notNull(),
  explanation: text("explanation").notNull(),
  weights: jsonb("weights").$type<{
    skills: number;
    title: number;
    seniority: number;
    recency: number;
    gaps: number;
  }>().notNull(),
  manualRank: integer("manual_rank"), // Manual ranking position
  aiRank: integer("ai_rank"), // AI-generated ranking position  
  aiRankReason: text("ai_rank_reason"), // AI explanation for ranking
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  jobs: many(jobs),
  sessions: many(userSessions),
  actions: many(userActions),
}));

export const jobsRelations = relations(jobs, ({ many, one }) => ({
  skills: many(jobSkills),
  scores: many(scores),
  createdBy: one(users, {
    fields: [jobs.createdBy],
    references: [users.id],
  }),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

export const userActionsRelations = relations(userActions, ({ one }) => ({
  user: one(users, {
    fields: [userActions.userId],
    references: [users.id],
  }),
}));

export const candidatesRelations = relations(candidates, ({ many }) => ({
  skills: many(candidateSkills),
  scores: many(scores),
}));

export const candidateSkillsRelations = relations(candidateSkills, ({ one }) => ({
  candidate: one(candidates, {
    fields: [candidateSkills.candidateId],
    references: [candidates.id],
  }),
}));

export const jobSkillsRelations = relations(jobSkills, ({ one }) => ({
  job: one(jobs, {
    fields: [jobSkills.jobId],
    references: [jobs.id],
  }),
}));

export const scoresRelations = relations(scores, ({ one }) => ({
  candidate: one(candidates, {
    fields: [scores.candidateId],
    references: [candidates.id],
  }),
  job: one(jobs, {
    fields: [scores.jobId],
    references: [jobs.id],
  }),
}));

// Insert schemas
export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
  createdBy: true,
});

export const insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true,
  createdAt: true,
});

export const insertScoreSchema = createInsertSchema(scores).omit({
  id: true,
  createdAt: true,
});

// Types
export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Candidate = typeof candidates.$inferSelect;
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type CandidateSkill = typeof candidateSkills.$inferSelect;
export type JobSkill = typeof jobSkills.$inferSelect;
export type Score = typeof scores.$inferSelect;
export type InsertScore = z.infer<typeof insertScoreSchema>;

// Auth types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type UserSession = typeof userSessions.$inferSelect;
export type UserAction = typeof userActions.$inferSelect;
export type InsertUserAction = typeof userActions.$inferInsert;

export interface ScoreWeights {
  skills: number;
  title: number;
  seniority: number;
  recency: number;
  gaps: number;
}

export interface CandidateWithScore extends Candidate {
  score?: Score;
  skills: CandidateSkill[];
}

// Analytics interfaces
export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersThisWeek: number;
  adminUsers: number;
}

export interface UsageStats {
  totalJobs: number;
  totalCandidates: number;
  totalUploads: number;
  avgCandidatesPerJob: number;
}

export interface UserUsageDetail {
  user: User;
  jobsCreated: number;
  candidatesUploaded: number;
  lastActivity: Date | null;
  totalSessions: number;
}
