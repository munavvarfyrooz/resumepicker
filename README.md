# TalentMatch - CV Ranking & JD Matching Platform

An intelligent CV ranking and job description matching system with transparent scoring, built using React, Express, TypeScript, and PostgreSQL.

![TalentMatch Screenshot](https://via.placeholder.com/800x400/2563EB/FFFFFF?text=TalentMatch+Dashboard)

## 🚀 Features

### Core Functionality
- **Bulk CV Upload**: Support for PDF, DOCX, and TXT file formats
- **Job Description Editor**: Markdown-based editor with skills extraction
- **Intelligent Parsing**: Extract skills, experience, roles, and employment gaps
- **Transparent Scoring**: Configurable weights with detailed breakdowns
- **Advanced Filtering**: Filter by experience, skills, and requirements
- **Export Capabilities**: CSV export for shortlisted candidates

### Scoring System
- **Skills Match** (50% default weight): Evaluates required vs nice-to-have skills
- **Title Relevance** (20% default weight): Job title alignment analysis
- **Seniority Level** (15% default weight): Experience level assessment
- **Recency** (10% default weight): How recent the candidate's activity is
- **Gap Penalty** (5% default weight): Employment gap analysis

### User Interface
- **Notion-like Design**: Clean, modern interface
- **Responsive Layout**: Left sidebar, main content, and detail drawer
- **Real-time Updates**: Live scoring updates when weights change
- **Sortable Tables**: Multi-column sorting with TanStack Table
- **Interactive Filters**: Dynamic filtering with visual feedback

## 🛠 Tech Stack

### Frontend
- **React 18** with Vite for fast development
- **TypeScript** for type safety
- **Tailwind CSS** for styling with custom design tokens
- **Zustand** for state management
- **TanStack Table** for advanced table functionality
- **TanStack Query** for server state management
- **react-dropzone** for file uploads
- **react-markdown** for JD preview

### Backend
- **Node.js** with Express.js
- **TypeScript** for type-safe backend development
- **Drizzle ORM** with PostgreSQL
- **pdf-parse** for PDF text extraction
- **mammoth** for DOCX parsing
- **date-fns** for date manipulation
- **multer** for file upload handling

### Database
- **PostgreSQL** with pgvector extension (optional)
- **Database migrations** with Drizzle Kit
- **Structured schema** for candidates, jobs, skills, and scores

### Testing
- **Jest** for unit testing
- **Type-safe API testing** with TypeScript

## 📦 Installation

### Prerequisites
- Node.js 18 or higher
- PostgreSQL database
- npm or yarn package manager

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd talentmatch
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Database configuration (these are automatically provided in deployment)
   DATABASE_URL=postgresql://username:password@localhost:5432/talentmatch
   
   # Optional: Enable AI features (requires OpenAI API key)
   ENABLE_AI_EMBEDDINGS=false
   OPENAI_API_KEY=your_openai_api_key_here
   
   # File upload directory (optional, defaults to 'uploads')
   UPLOAD_DIR=uploads
   ```

4. **Set up the database**
   ```bash
   # Push the database schema
   npm run db:push
   
   # Seed with sample data
   npm run seed
   ```

## 🚀 Quick Start

### Development Mode
```bash
# Start both frontend and backend in development mode
npm run dev
