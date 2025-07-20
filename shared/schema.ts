import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
});

export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  filePath: text("file_path").notNull(),
  extractedText: text("extracted_text").notNull(),
  yearsExperience: integer("years_experience"),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const jobsRelations = relations(jobs, ({ many }) => ({
  skills: many(jobSkills),
  scores: many(scores),
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
