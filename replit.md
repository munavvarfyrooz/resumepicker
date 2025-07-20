# TalentMatch - CV Ranking & JD Matching Platform

## Overview

TalentMatch is an intelligent CV ranking and job description matching system built with a modern full-stack architecture. The platform enables recruiters to upload CVs in bulk, create job descriptions, and automatically rank candidates using a configurable transparent scoring algorithm.

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

### Scoring Algorithm
The system uses a weighted scoring approach with five main components:
- **Skills Match (50% default)**: Evaluates required vs nice-to-have skills alignment
- **Title Relevance (20% default)**: Job title similarity analysis
- **Seniority Level (15% default)**: Experience level assessment based on years
- **Recency (10% default)**: How recent the candidate's work activity is
- **Gap Penalty (5% default)**: Deduction for employment gaps

Scores are calculated in real-time and can be re-calculated when weights are adjusted.

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

### Future Integration Points
- **Embeddings Service**: Abstract service ready for AI/ML integration (currently using mock data)
- **OpenAI Integration**: Placeholder for advanced text analysis and skill extraction
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

The system is built to scale horizontally with stateless backend services and can be deployed on platforms like Railway, Vercel, or traditional VPS environments.