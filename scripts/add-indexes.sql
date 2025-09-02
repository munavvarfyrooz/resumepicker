-- Performance optimization indexes for ResumePicker

-- Jobs table indexes
CREATE INDEX IF NOT EXISTS idx_jobs_created_by ON jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);

-- Candidates table indexes
CREATE INDEX IF NOT EXISTS idx_candidates_job_id ON candidates(job_id);
CREATE INDEX IF NOT EXISTS idx_candidates_created_by ON candidates(created_by);
CREATE INDEX IF NOT EXISTS idx_candidates_created_at ON candidates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_candidates_job_created ON candidates(job_id, created_by);

-- Scores table indexes (most critical for performance)
CREATE INDEX IF NOT EXISTS idx_scores_candidate_id ON scores(candidate_id);
CREATE INDEX IF NOT EXISTS idx_scores_job_id ON scores(job_id);
CREATE INDEX IF NOT EXISTS idx_scores_candidate_job ON scores(candidate_id, job_id);
CREATE INDEX IF NOT EXISTS idx_scores_total_score ON scores(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_manual_rank ON scores(manual_rank);
CREATE INDEX IF NOT EXISTS idx_scores_ai_rank ON scores(ai_rank);

-- Skills tables indexes
CREATE INDEX IF NOT EXISTS idx_candidate_skills_candidate_id ON candidate_skills(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_skills_skill ON candidate_skills(skill);
CREATE INDEX IF NOT EXISTS idx_job_skills_job_id ON job_skills(job_id);
CREATE INDEX IF NOT EXISTS idx_job_skills_skill ON job_skills(skill);
CREATE INDEX IF NOT EXISTS idx_job_skills_required ON job_skills(required);

-- User activity tracking
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login DESC);

-- Blog posts indexes (if used)
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC);

-- Analyze tables for query optimization
ANALYZE jobs;
ANALYZE candidates;
ANALYZE scores;
ANALYZE candidate_skills;
ANALYZE job_skills;
ANALYZE users;

-- Show index usage stats
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM 
    pg_stat_user_indexes
ORDER BY 
    idx_scan DESC;