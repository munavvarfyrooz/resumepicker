#!/usr/bin/env node

/**
 * Blog Migration Script for Production
 * 
 * This script migrates blog posts and categories from development to production database.
 * Run this after deploying to production to transfer all blog content.
 */

const { Pool } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

// Blog data to migrate (exported from development)
const blogPosts = [
  {
    id: 5,
    title: "10 Game-Changing Recruitment Trends Every HR Leader Must Know in 2025",
    slug: "recruitment-trends-hr-leaders-2025",
    content: `# The Recruitment Revolution: 10 Trends Shaping the Future of Hiring

The world of talent acquisition is evolving at breakneck speed. As we navigate through 2025, HR leaders who stay ahead of these emerging trends will gain a significant competitive advantage in attracting and retaining top talent.

## 1. AI-Powered Candidate Screening 🤖

Artificial intelligence has moved from experimental to essential. Modern AI systems can:
- Screen thousands of resumes in minutes
- Identify hidden talent patterns
- Reduce unconscious bias in initial screening
- Predict candidate success probability

**Impact**: Companies report 70% faster screening times and 45% better quality hires.

## 2. Video-First Interview Processes 📹

Remote work normalization has made video interviews the new standard:
- AI-powered interview analysis
- Automated scheduling and coordination
- Recorded interviews for team review
- Bias-free assessment tools

## 3. Skills-Based Hiring Over Degree Requirements 🎯

The degree inflation bubble is finally bursting:
- Focus on demonstrable skills
- Portfolio-based assessments
- Micro-learning certifications
- Real-world project evaluations

## 4. Predictive Analytics for Turnover Prevention 📊

Data science is revolutionizing retention strategies:
- Early warning systems for flight risk
- Personalized retention interventions
- Career path optimization
- Compensation adjustment recommendations

## 5. Candidate Experience Automation 🚀

Creating seamless candidate journeys through technology:
- Chatbot-powered initial screening
- Automated status updates
- Personalized communication flows
- Mobile-first application processes

## 6. Diversity, Equity & Inclusion by Design 🌈

Moving beyond checkbox diversity to systematic inclusion:
- Algorithmic bias detection
- Inclusive job description optimization
- Diverse interview panel automation
- Equity metrics dashboard

## 7. Real-Time Market Intelligence 📈

Staying competitive requires constant market awareness:
- Salary benchmarking automation
- Competitor talent movement tracking
- Skills demand forecasting
- Geographic talent mapping

## 8. Gig Economy Integration 💼

Blending full-time and flexible talent strategies:
- Hybrid workforce planning
- Freelancer quality assessment
- Project-based talent pools
- Flexible engagement models

## 9. Employee Referral Gamification 🎮

Making referrals more engaging and effective:
- Social referral platforms
- Incentive optimization algorithms
- Network effect amplification
- Quality scoring systems

## 10. Continuous Recruitment Marketing 📱

Building talent pipelines before you need them:
- Employer brand automation
- Content marketing funnels
- Talent community nurturing
- Proactive engagement strategies

## Implementing These Trends in Your Organization

### Start with Data Foundation
Before implementing new technologies, establish solid data collection and analysis capabilities. Understanding your current recruitment metrics is crucial for measuring improvement.

### Choose Your Technology Stack Wisely
Not every trend requires immediate adoption. Prioritize based on:
- Current pain points
- Available budget
- Team capabilities
- Expected ROI

### Focus on Integration
Ensure new tools work seamlessly with existing systems:
- API compatibility
- Data synchronization
- User experience consistency
- Workflow optimization

## The SmartHire Advantage

Our platform incorporates many of these cutting-edge trends:

✅ **AI-Powered Screening**: Advanced algorithms for intelligent candidate ranking
✅ **Predictive Analytics**: Success probability modeling and bias detection
✅ **Automation**: Streamlined workflows and candidate communication
✅ **Market Intelligence**: Real-time salary and skills demand insights
✅ **Integration Ready**: Works with existing HR technology stacks

## Measuring Success

Track these key metrics to evaluate your recruitment transformation:

### Efficiency Metrics
- Time-to-hire reduction
- Cost-per-hire optimization
- Recruiter productivity gains
- Process automation percentage

### Quality Metrics
- New hire performance ratings
- 90-day retention rates
- Manager satisfaction scores
- Candidate experience ratings

### Strategic Metrics
- Diversity hiring improvements
- Skills gap reduction
- Talent pipeline strength
- Employer brand metrics

## Looking Ahead: 2026 and Beyond

The recruitment landscape will continue evolving rapidly. Emerging technologies to watch:

- **Virtual Reality Interviews**: Immersive candidate assessment
- **Blockchain Credentials**: Verified skill and experience records
- **Quantum Computing**: Ultra-fast candidate matching algorithms
- **Neural Interface**: Direct skill assessment technologies

## Conclusion

The organizations that thrive in the next decade will be those that embrace these recruitment innovations today. The question is not whether these trends will reshape hiring—it is whether your organization will lead or follow.

**Ready to implement these game-changing trends?** SmartHire provides the technology foundation to transform your recruitment strategy and stay ahead of the competition.

---

*Download our complete "2025 Recruitment Trends Implementation Guide" for detailed strategies and timelines for adopting these innovations in your organization.*`,
    excerpt: "Essential guide to the 10 most important recruitment trends in 2025. From AI-powered screening to predictive analytics, discover how leading HR teams are transforming their talent acquisition strategies.",
    status: "published",
    featuredImage: "/test-blog-images/hero-recruitment.svg",
    tags: ["HR Trends", "Recruitment", "AI", "Future of Work", "Digital Transformation", "Talent Acquisition", "HR Technology"],
    metaTitle: "10 Game-Changing Recruitment Trends for HR Leaders in 2025",
    metaDescription: "Discover the 10 most important recruitment trends in 2025. Essential guide for HR leaders covering AI screening, predictive analytics, skills-based hiring, and digital transformation strategies.",
    isPinned: true,
    publishedAt: new Date().toISOString(),
    authorId: "admin-001"
  }
];

const blogCategories = [
  {
    id: 1,
    name: "Recruitment Tips",
    slug: "recruitment-tips",
    description: "Expert advice and best practices for successful recruitment"
  },
  {
    id: 2,
    name: "Industry News",
    slug: "industry-news", 
    description: "Latest updates and trends in the hiring industry"
  }
];

const blogPostCategories = [
  { postId: 5, categoryId: 1 }, // Recruitment Tips
  { postId: 5, categoryId: 2 }  // Industry News
];

async function migrateBlogData() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable not found');
    console.log('Please set your production DATABASE_URL before running this script');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('🔄 Starting blog data migration to production...');
    
    // Check if admin user exists in production
    const adminCheck = await pool.query('SELECT id FROM users WHERE id = $1', ['admin-001']);
    if (adminCheck.rows.length === 0) {
      console.error('❌ Admin user not found in production database');
      console.log('Please ensure admin user exists before migrating blog data');
      process.exit(1);
    }
    
    // Migrate categories first
    console.log('📁 Migrating blog categories...');
    for (const category of blogCategories) {
      try {
        await pool.query(`
          INSERT INTO blog_categories (name, slug, description, created_at)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description
        `, [category.name, category.slug, category.description]);
        
        console.log(`  ✅ Category: ${category.name}`);
      } catch (error) {
        console.log(`  ⚠️  Category ${category.name} may already exist, skipping...`);
      }
    }
    
    // Migrate blog posts
    console.log('📝 Migrating blog posts...');
    for (const post of blogPosts) {
      try {
        const result = await pool.query(`
          INSERT INTO blog_posts (
            title, slug, content, excerpt, status, featured_image, 
            tags, meta_title, meta_description, is_pinned, 
            published_at, author_id, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
          ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            content = EXCLUDED.content,
            excerpt = EXCLUDED.excerpt,
            status = EXCLUDED.status,
            featured_image = EXCLUDED.featured_image,
            tags = EXCLUDED.tags,
            meta_title = EXCLUDED.meta_title,
            meta_description = EXCLUDED.meta_description,
            is_pinned = EXCLUDED.is_pinned,
            published_at = EXCLUDED.published_at,
            updated_at = NOW()
          RETURNING id
        `, [
          post.title, post.slug, post.content, post.excerpt, post.status,
          post.featuredImage, post.tags, post.metaTitle, post.metaDescription,
          post.isPinned, post.publishedAt, post.authorId
        ]);
        
        const postId = result.rows[0].id;
        
        // Link post to categories
        for (const relation of blogPostCategories.filter(r => r.postId === post.id)) {
          const categoryResult = await pool.query('SELECT id FROM blog_categories WHERE id = $1', [relation.categoryId]);
          if (categoryResult.rows.length > 0) {
            await pool.query(`
              INSERT INTO blog_post_categories (post_id, category_id)
              VALUES ($1, $2)
              ON CONFLICT DO NOTHING
            `, [postId, relation.categoryId]);
          }
        }
        
        console.log(`  ✅ Post: ${post.title}`);
      } catch (error) {
        console.log(`  ⚠️  Post ${post.title} may already exist, updating...`);
      }
    }
    
    // Verify migration
    const postCount = await pool.query('SELECT COUNT(*) FROM blog_posts WHERE status = $1', ['published']);
    const categoryCount = await pool.query('SELECT COUNT(*) FROM blog_categories');
    
    console.log('\n🎉 Blog migration completed successfully!');
    console.log(`📊 Migrated: ${postCount.rows[0].count} published posts, ${categoryCount.rows[0].count} categories`);
    console.log('\n🌐 Your blog is now live in production:');
    console.log('   - Public blog: https://your-domain.replit.app/blog');
    console.log('   - Admin management: https://your-domain.replit.app/blog-management');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateBlogData().catch(console.error);
}

module.exports = { migrateBlogData };