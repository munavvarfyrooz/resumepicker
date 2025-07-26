# SmartHire - CV Ranking & JD Matching Platform

## Overview

SmartHire is an intelligent CV ranking and job description matching system built with a modern full-stack architecture. The platform enables recruiters to upload CVs in bulk, create job descriptions, and automatically rank candidates using a configurable transparent scoring algorithm.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a monorepo structure with a clear separation between client and server code:

- **Frontend**: React SPA with TypeScript, served by Vite
- **Backend**: Express.js API server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **File Storage**: Local file system with multer for handling CV uploads
- **Build System**: Vite for frontend bundling, esbuild for backend production builds

## Key Components

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety
- **Styling**: Tailwind CSS with a custom design system inspired by Notion
- **State Management**: Zustand for client-side state
- **Data Fetching**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Radix UI primitives with custom styling
- **Table Management**: TanStack Table for advanced sorting and filtering
- **File Uploads**: react-dropzone for drag-and-drop CV uploads

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for type safety across the stack
- **Database ORM**: Drizzle for type-safe SQL queries and migrations
- **File Processing**: 
  - pdf-parse for PDF text extraction
  - mammoth for DOCX document parsing
  - Built-in support for plain text files
- **Upload Handling**: multer with memory storage and file type validation

### Database Schema
The PostgreSQL database contains the following main entities:
- **jobs**: Store job postings with requirements (must-have vs nice-to-have skills)
- **candidates**: CV data with extracted information and file metadata
- **candidate_skills**: Normalized skill data linked to candidates
- **job_skills**: Required and optional skills for each job
- **scores**: Calculated matching scores between candidates and jobs

## Data Flow

### CV Upload Process
1. Files are uploaded via drag-and-drop interface
2. Server validates file types (PDF, DOCX, TXT)
3. Text extraction occurs using appropriate parser
4. Skills and experience data are extracted using pattern matching
5. Candidate record is created with normalized data
6. Skills are stored in separate table for efficient querying

### Dual Ranking System
The system provides two distinct ranking approaches:

#### Manual Rank (Algorithmic Scoring)
A weighted scoring approach with five main components:
- **Skills Match (50% default)**: Evaluates required vs nice-to-have skills alignment
- **Title Relevance (20% default)**: Job title similarity analysis
- **Seniority Level (15% default)**: Experience level assessment based on years
- **Recency (10% default)**: How recent the candidate's work activity is
- **Gap Penalty (5% default)**: Deduction for employment gaps

#### AI Rank (OpenAI-Powered Intelligence)
- **GPT-4o Analysis**: Uses advanced AI to evaluate candidates holistically
- **Technical Fit Assessment**: Considers both hard skills and soft indicators
- **Contextual Understanding**: Balances algorithmic scores with human insights
- **Reasoning Provided**: Each AI ranking includes explanation for the decision
- **Experience-Weighted**: Factors in role requirements, seniority, and career progression

Both ranking systems can be calculated independently and compared for comprehensive candidate evaluation.

### Job Description Processing
1. Markdown-based job descriptions are created in the editor
2. Skills are manually categorized as "must-have" or "nice-to-have"
3. Requirements are stored as structured JSON data
4. Skills are normalized for consistent matching

## External Dependencies

### Production Dependencies
- **@neondatabase/serverless**: PostgreSQL connection pooling for serverless environments
- **drizzle-orm**: Type-safe ORM for database operations
- **pdf-parse**: PDF text extraction library
- **mammoth**: Microsoft Word document parser
- **date-fns**: Date manipulation utilities
- **multer**: File upload middleware for Express

### Development Tools
- **Vite**: Fast development server and build tool
- **TypeScript**: Static type checking
- **Tailwind CSS**: Utility-first CSS framework
- **drizzle-kit**: Database migration and introspection tool

### AI Integration Points
- **OpenAI Integration**: ✅ ACTIVE - GPT-3.5-turbo for enhanced CV text analysis and skill extraction
- **Embeddings Service**: ✅ ACTIVE - Text embeddings for semantic similarity matching
- **AI-Powered Features**:
  - Enhanced skill extraction using natural language understanding
  - Semantic job title matching for better relevance scoring
  - Intelligent text parsing for complex CV formats
- **External APIs**: Modular design allows for easy integration with job boards or ATS systems

## Deployment Strategy

The application is designed for flexible deployment options:

### Development
- Single command startup with `npm run dev`
- Hot reloading for both frontend and backend
- Database migrations with `npm run db:push`
- Seed data available for testing

### Production
- Frontend builds to static assets for CDN deployment
- Backend compiles to optimized JavaScript bundle
- Environment-based configuration
- Database connection pooling for scalability

### Environment Configuration
The application requires the following environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `UPLOAD_DIR`: Directory for file storage (optional, defaults to 'uploads')
- `NODE_ENV`: Environment mode (development/production)
- `ENABLE_AI_EMBEDDINGS`: Feature flag for AI integration
- `OPENAI_API_KEY`: For future AI features (optional)

## Recent Changes

### Latest Updates (July 23, 2025)
- **Authentication System Complete**: Built entirely new simple authentication system from scratch after previous complex system failed
- **Admin Login Working**: Successfully created working admin credentials with strong generated password that work in both development and production
- **Admin Dashboard**: Created comprehensive admin panel with user management, analytics, and system monitoring capabilities
- **User Role Management**: Added role-based access control with user/admin permissions and status management
- **Usage Analytics**: Implemented detailed analytics tracking user sessions, job creation, candidate uploads, and system usage
- **Database Schema Enhancement**: Extended database with user tables, session tracking, and activity logging for complete audit trail
- **Protected Routes**: Secured all API endpoints with authentication middleware and admin-only access controls
- **Landing Page**: Created professional marketing landing page for unauthenticated users showcasing platform features
- **Home Dashboard**: Built personalized home page for authenticated users with quick actions and getting started guidance
- **Session Management**: Implemented secure session handling with PostgreSQL storage and automatic token refresh
- **User Interface Updates**: Enhanced UI with authentication state management and proper routing based on user status
- **Navigation Simplification**: Streamlined UI to single dashboard approach, removed multiple confusing navigation options
- **Job Status Fix**: Jobs now default to 'active' status instead of 'draft' for better user experience
- **Data Isolation Enhancement**: Fixed candidate count endpoint to properly filter by user context, preventing display of other users' data
- **Admin Login Fix**: Resolved admin authentication issues by updating password hash format and improving error handling
- **Plugin Error Resolution**: Fixed apiRequest parameter order issues in AdminDashboard that caused unhandled promise rejections
- **Session Tracking Implementation**: Fixed login tracking system to properly update last login timestamps and create user session records
- **Analytics Data Correction**: Resolved incorrect candidate upload counts by fixing database join queries in usage analytics
- **Job Creation Validation**: Added proper validation to prevent empty jobs and enforce required title/description fields
- **Production Admin Login Fix**: Resolved admin authentication issues in production by regenerating password hash and fixing session configuration
- **Git Integration**: Successfully pushed all improvements to GitHub repository with proper authentication
- **Code Quality Improvements**: Enhanced error handling, fixed TypeScript issues, and improved app stability
- **Authentication Rewrite**: Completely rebuilt authentication system using simple session-based approach instead of complex passport/openid stack
- **Production Ready**: Admin authentication now works reliably in production environment with proper password hashing and session management
- **Logout Fix**: Updated logout buttons to use proper POST requests instead of browser navigation, eliminating 404 errors
- **Password Hash Migration**: Fixed legacy password hash format compatibility for existing users (fyru, admin-prod)
- **Production Database Migration**: Successfully migrated database schema to production-ready state with proper authentication tables
- **Deployment Scripts**: Created migration scripts and deployment documentation for production environments
- **Admin Password Standardization**: Updated both admin accounts to use consistent 'admin123' password for easier production deployment
- **Session Storage Fix**: Corrected session table name from 'session' to 'sessions' for proper PostgreSQL integration
- **Production Password Sync**: Successfully updated admin passwords in production database with correct crypto hashes
- **Deployment Scripts Enhanced**: Created comprehensive scripts for production password updates and verification
- **Strong Password Implementation**: Updated admin account with cryptographically strong 20-character password for enhanced security
- **Security Compliance**: Implemented enterprise-grade password security with special characters and random generation

### Deployment
The system is built to scale horizontally with stateless backend services and can be deployed on platforms like Railway, Vercel, or traditional VPS environments.