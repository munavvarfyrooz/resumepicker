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
  username: varchar("username").unique().notNull(),
  email: varchar("email").unique(),
  password: varchar("password").notNull(),
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
  createdBy: varchar("created_by").references(() => users.id).notNull(),
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

// Blog management tables
export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: varchar("slug").unique().notNull(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  status: varchar("status", { enum: ["draft", "published", "archived"] }).notNull().default("draft"),
  featuredImage: varchar("featured_image"),
  featuredImageAlt: varchar("featured_image_alt"),
  tags: text("tags").array(),
  metaTitle: varchar("meta_title"),
  metaDescription: text("meta_description"),
  readingTime: integer("reading_time"), // estimated reading time in minutes
  viewCount: integer("view_count").default(0),
  isPinned: boolean("is_pinned").default(false),
  publishedAt: timestamp("published_at"),
  scheduledAt: timestamp("scheduled_at"), // for scheduled publishing
  authorId: varchar("author_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const blogCategories = pgTable("blog_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name").unique().notNull(),
  slug: varchar("slug").unique().notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const blogPostCategories = pgTable("blog_post_categories", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => blogPosts.id).notNull(),
  categoryId: integer("category_id").references(() => blogCategories.id).notNull(),
});

// Media library for blog images and assets
export const mediaAssets = pgTable("media_assets", {
  id: serial("id").primaryKey(),
  filename: varchar("filename").notNull(),
  originalFilename: varchar("original_filename").notNull(),
  filePath: varchar("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type").notNull(),
  width: integer("width"),
  height: integer("height"),
  altText: text("alt_text"),
  uploadedBy: varchar("uploaded_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  jobs: many(jobs),
  sessions: many(userSessions),
  actions: many(userActions),
  blogPosts: many(blogPosts),
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

export const blogPostsRelations = relations(blogPosts, ({ one, many }) => ({
  author: one(users, {
    fields: [blogPosts.authorId],
    references: [users.id],
  }),
  categories: many(blogPostCategories),
}));

export const blogCategoriesRelations = relations(blogCategories, ({ many }) => ({
  posts: many(blogPostCategories),
}));

export const blogPostCategoriesRelations = relations(blogPostCategories, ({ one }) => ({
  post: one(blogPosts, {
    fields: [blogPostCategories.postId],
    references: [blogPosts.id],
  }),
  category: one(blogCategories, {
    fields: [blogPostCategories.categoryId],
    references: [blogCategories.id],
  }),
}));

// Insert schemas
export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
  createdBy: true,
}).extend({
  title: z.string().min(1, "Job title is required").trim(),
  description: z.string().min(1, "Job description is required").trim(),
});

export const insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true,
  createdAt: true,
});

export const insertScoreSchema = createInsertSchema(scores).omit({
  id: true,
  createdAt: true,
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  authorId: true,
}).extend({
  title: z.string().min(1, "Title is required").trim(),
  content: z.string().min(1, "Content is required").trim(),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
});

export const insertBlogCategorySchema = createInsertSchema(blogCategories).omit({
  id: true,
  createdAt: true,
}).extend({
  name: z.string().min(1, "Category name is required").trim(),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
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
export type InsertUser = typeof users.$inferInsert;
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type UserSession = typeof userSessions.$inferSelect;
export type UserAction = typeof userActions.$inferSelect;
export type InsertUserAction = typeof userActions.$inferInsert;

// Blog types
export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogCategory = typeof blogCategories.$inferSelect;
export type InsertBlogCategory = z.infer<typeof insertBlogCategorySchema>;
export type BlogPostCategory = typeof blogPostCategories.$inferSelect;

export interface BlogPostWithCategories extends BlogPost {
  categories: BlogCategory[];
  author: User;
}

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

// Media types
export type MediaAsset = typeof mediaAssets.$inferSelect;
export type InsertMediaAsset = typeof mediaAssets.$inferInsert;
