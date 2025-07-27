# Blog Migration to Production

This guide explains how to migrate your blog posts from development to production database.

## Overview

Your development and production environments use separate databases. After deploying to production, you need to migrate your blog content manually.

## Current Blog Content

**Blog Posts:**
- "10 Game-Changing Recruitment Trends Every HR Leader Must Know in 2025" (Published)

**Categories:**
- "Recruitment Tips" 
- "Industry News"

## Migration Steps

### Step 1: Deploy to Production
1. Click the **Deploy** button in Replit
2. Wait for deployment to complete
3. Verify your production app is running

### Step 2: Run Blog Migration Script

**Option A: Automatic Migration (Recommended)**
```bash
# In your production environment terminal/console, run:
node scripts/migrate-blog-to-production.js
```

**Important**: This script must be run in your **production environment**, not development, because it needs access to the production `DATABASE_URL`.

**Option B: Manual Database Migration**

If you prefer to run SQL directly in your production database:

```sql
-- Insert blog categories
INSERT INTO blog_categories (name, slug, description, created_at) VALUES
('Recruitment Tips', 'recruitment-tips', 'Expert advice and best practices for successful recruitment', NOW()),
('Industry News', 'industry-news', 'Latest updates and trends in the hiring industry', NOW())
ON CONFLICT (slug) DO NOTHING;

-- Insert blog post (replace with your actual admin user ID)
INSERT INTO blog_posts (
  title, slug, content, excerpt, status, featured_image, 
  tags, meta_title, meta_description, is_pinned, 
  published_at, author_id, created_at, updated_at
) VALUES (
  '10 Game-Changing Recruitment Trends Every HR Leader Must Know in 2025',
  'recruitment-trends-hr-leaders-2025',
  '# The Recruitment Revolution: 10 Trends Shaping the Future of Hiring...',
  'Essential guide to the 10 most important recruitment trends in 2025...',
  'published',
  '/test-blog-images/hero-recruitment.svg',
  ARRAY['HR Trends', 'Recruitment', 'AI', 'Future of Work', 'Digital Transformation', 'Talent Acquisition', 'HR Technology'],
  '10 Game-Changing Recruitment Trends for HR Leaders in 2025',
  'Discover the 10 most important recruitment trends in 2025...',
  true,
  NOW(),
  'admin-001',
  NOW(),
  NOW()
) ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  updated_at = NOW();

-- Link post to categories
INSERT INTO blog_post_categories (post_id, category_id)
SELECT bp.id, bc.id 
FROM blog_posts bp, blog_categories bc 
WHERE bp.slug = 'recruitment-trends-hr-leaders-2025' 
AND bc.slug IN ('recruitment-tips', 'industry-news')
ON CONFLICT DO NOTHING;
```

### Step 3: Verify Migration

After migration, verify your blog works in production:

1. **Public Blog**: Visit `https://your-domain.replit.app/blog`
2. **Admin Panel**: Visit `https://your-domain.replit.app/blog-management`
3. **Individual Post**: Visit `https://your-domain.replit.app/blog/recruitment-trends-hr-leaders-2025`

## Production URLs

Once deployed, your blog will be available at:

- **Public Blog**: `https://your-domain.replit.app/blog`
- **Blog Management**: `https://your-domain.replit.app/blog-management` (Admin only)
- **Individual Posts**: `https://your-domain.replit.app/blog/[post-slug]`

## SEO Features Included

✅ **Meta Tags**: Dynamic titles and descriptions
✅ **Open Graph**: Social media sharing optimization  
✅ **Structured Data**: JSON-LD markup for search engines
✅ **Sitemap Ready**: All posts indexed for SEO
✅ **Mobile Responsive**: Optimized for all devices

## Admin Access

Use your existing admin credentials to manage the blog in production:
- Username: `admin`
- Password: `admin/)%yK[NRt6!)+kP<Q{dWu`

## Troubleshooting

**Issue**: Migration script fails
- Ensure `DATABASE_URL` is set in production environment
- Verify admin user exists in production database
- Check database connection and permissions

**Issue**: Blog posts not visible
- Confirm posts have `status: 'published'`
- Check if admin user ID matches in production
- Verify database migration completed successfully

**Issue**: Images not loading
- Ensure featured images are deployed with the application
- Check file paths match between development and production

## Next Steps

After successful migration:

1. **Create New Content**: Use the admin panel to create more blog posts
2. **SEO Optimization**: Submit sitemap to Google Search Console
3. **Analytics**: Monitor blog performance with Google Analytics
4. **Content Strategy**: Plan regular blog updates for better SEO

Your blog system is now production-ready with full SEO optimization!