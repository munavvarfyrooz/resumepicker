# ResumePicker - AI-Powered Resume Screening & Candidate Selection Platform

An intelligent resume screening and candidate selection system with AI-powered ranking, built using React, Express, TypeScript, and PostgreSQL.

## 🚀 Features

### Core Functionality
- **Bulk Resume Upload**: Support for PDF, DOCX, and TXT file formats
- **Job Description Editor**: Advanced editor with automatic skills extraction
- **AI-Powered Parsing**: Extract skills, experience, roles, and employment gaps using GPT-5
- **Transparent Scoring**: Configurable weights with detailed score breakdowns
- **Advanced Filtering**: Filter by experience, skills, location, and requirements
- **Export Capabilities**: CSV export for shortlisted candidates
- **Google Analytics Integration**: Track user behavior and application usage

### AI-Enhanced Scoring System
- **Skills Match** (50% default weight): AI-evaluated required vs nice-to-have skills
- **Title Relevance** (20% default weight): Job title alignment analysis
- **Seniority Level** (15% default weight): Experience level assessment
- **Recency** (10% default weight): How recent the candidate's activity is
- **Gap Penalty** (5% default weight): Employment gap analysis

### User Interface
- **Modern Design**: Clean, professional interface
- **Responsive Layout**: Left sidebar, main content area, and detail drawer
- **Real-time Updates**: Live scoring updates when weights change
- **Sortable Tables**: Multi-column sorting with advanced table functionality
- **Interactive Filters**: Dynamic filtering with visual feedback
- **Blog System**: Integrated blog for content marketing

## 🛠 Tech Stack

### Frontend
- **React 18** with Vite for fast development
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Zustand** for state management
- **TanStack Table** for advanced table functionality
- **TanStack Query** for server state management
- **react-dropzone** for file uploads
- **Google Analytics** for usage tracking

### Backend
- **Node.js** with Express.js
- **TypeScript** for type-safe backend development
- **Drizzle ORM** with PostgreSQL
- **OpenAI GPT-5** for AI-powered analysis
- **JWT Authentication** with refresh tokens
- **Email service** with password reset functionality
- **pdf-parse** for PDF text extraction
- **mammoth** for DOCX parsing

### Database
- **PostgreSQL** with pgvector extension for AI embeddings
- **Database migrations** with Drizzle Kit
- **Structured schema** for candidates, jobs, skills, scores, and blog posts

### Infrastructure
- **AWS EC2** for hosting
- **Nginx** for reverse proxy
- **SSL/TLS** with Let's Encrypt
- **systemd** for process management

## 📦 Installation

### Prerequisites
- Node.js 18 or higher
- PostgreSQL database
- npm package manager

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/munavvarfyrooz/resumepicker.git
   cd resumepicker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file with:
   ```bash
   # Database
   DATABASE_URL=postgresql://username:password@localhost:5432/resumepicker
   
   # Authentication
   JWT_SECRET=your_jwt_secret_here
   JWT_REFRESH_SECRET=your_refresh_secret_here
   
   # OpenAI API
   OPENAI_API_KEY=your_openai_api_key_here
   
   # Email Service
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASSWORD=your_app_password
   
   # Google Analytics
   VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   
   # Application
   APP_URL=https://resumepicker.com
   ```

4. **Set up the database**
   ```bash
   # Push the database schema
   npm run db:push
   
   # Seed with sample data (optional)
   npm run seed
   ```

## 🚀 Quick Start

### Development Mode
```bash
# Start both frontend and backend in development mode
npm run dev
