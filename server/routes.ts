import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { insertJobSchema, insertCandidateSchema, type ScoreWeights } from "@shared/schema";
import { CVParser } from "./services/parsing";
import { ScoringEngine } from "./services/scoring";
import { FileStorage } from "./utils/fileStorage";
import { JobAnalysisService } from "./services/jobAnalysis";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.txt') || file.originalname.endsWith('.pdf') || file.originalname.endsWith('.docx')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, and TXT files are allowed.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Jobs endpoints
  app.get('/api/jobs', async (req, res) => {
    try {
      const jobs = await storage.getJobs();
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch jobs' });
    }
  });

  app.get('/api/jobs/candidate-counts', async (req, res) => {
    try {
      const counts = await storage.getCandidateCountsByJob();
      res.json(counts);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch candidate counts' });
    }
  });

  app.get('/api/jobs/:id', async (req, res) => {
    try {
      const job = await storage.getJob(parseInt(req.params.id));
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
      res.json(job);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch job' });
    }
  });

  app.post('/api/jobs', async (req, res) => {
    try {
      const validatedData = insertJobSchema.parse(req.body);
      const job = await storage.createJob(validatedData);
      
      // Extract and save job skills
      if (validatedData.requirements) {
        const skills = [
          ...(validatedData.requirements.must as string[]).map(skill => ({ skill, required: true })),
          ...(validatedData.requirements.nice as string[]).map(skill => ({ skill, required: false }))
        ];
        await storage.setJobSkills(job.id, skills);
      }
      
      res.status(201).json(job);
    } catch (error) {
      res.status(400).json({ error: 'Invalid job data' });
    }
  });

  app.put('/api/jobs/:id', async (req, res) => {
    try {
      const validatedData = insertJobSchema.parse(req.body);
      const job = await storage.updateJob(parseInt(req.params.id), validatedData);
      
      // Update job skills
      if (validatedData.requirements) {
        const skills = [
          ...(validatedData.requirements.must as string[]).map(skill => ({ skill, required: true })),
          ...(validatedData.requirements.nice as string[]).map(skill => ({ skill, required: false }))
        ];
        await storage.setJobSkills(job.id, skills);
      }
      
      res.json(job);
    } catch (error) {
      res.status(400).json({ error: 'Invalid job data' });
    }
  });

  app.delete('/api/jobs/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteJob(id);
      res.status(204).send();
    } catch (error) {
      console.error('Failed to delete job:', error);
      res.status(500).json({ error: 'Failed to delete job' });
    }
  });

  // AI Analysis endpoint for extracting skills from job description
  app.post('/api/jobs/analyze-skills', async (req, res) => {
    try {
      const { description } = req.body;
      
      if (!description || typeof description !== 'string') {
        return res.status(400).json({ error: 'Job description is required' });
      }

      const analysis = await JobAnalysisService.extractSkillsFromJobDescription(description);
      res.json(analysis);
    } catch (error) {
      console.error('Failed to analyze job description:', error);
      res.status(500).json({ error: 'Failed to analyze job description' });
    }
  });

  // Candidates endpoints
  app.get('/api/candidates', async (req, res) => {
    try {
      const candidates = await storage.getCandidates();
      res.json(candidates);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch candidates' });
    }
  });

  app.get('/api/candidates/:id', async (req, res) => {
    try {
      const candidate = await storage.getCandidate(parseInt(req.params.id));
      if (!candidate) {
        return res.status(404).json({ error: 'Candidate not found' });
      }
      res.json(candidate);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch candidate' });
    }
  });

  app.delete('/api/candidates/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCandidate(id);
      res.status(204).send();
    } catch (error) {
      console.error('Failed to delete candidate:', error);
      res.status(500).json({ error: 'Failed to delete candidate' });
    }
  });

  // File upload endpoint
  app.post('/api/upload', upload.array('files', 10), async (req, res) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const results = [];

      for (const file of req.files) {
        try {
          // Save file
          const fileInfo = await FileStorage.saveFile(
            file.buffer,
            file.originalname,
            file.mimetype
          );

          // Parse CV
          const parsedCV = await CVParser.parseFile(fileInfo.filePath, fileInfo.fileType);

          // Extract name and email from CV text (simplified)
          const name = extractName(parsedCV.text) || file.originalname.replace(/\.[^/.]+$/, "");
          const email = extractEmail(parsedCV.text) || `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`;

          // Create candidate record
          const candidateData = {
            name,
            email,
            fileName: fileInfo.fileName,
            fileType: fileInfo.fileType,
            filePath: fileInfo.filePath,
            extractedText: parsedCV.text,
            yearsExperience: parsedCV.yearsExperience,
            lastRoleTitle: parsedCV.lastRoleTitle,
            experienceGaps: parsedCV.experienceGaps,
            experienceTimeline: parsedCV.experienceTimeline,
          };

          const candidate = await storage.createCandidate(candidateData);

          // Save skills
          await storage.setCandidateSkills(candidate.id, parsedCV.skills);

          results.push({
            success: true,
            candidate,
            fileName: file.originalname,
          });
        } catch (error) {
          results.push({
            success: false,
            error: (error as Error).message,
            fileName: file.originalname,
          });
        }
      }

      res.json({ results });
    } catch (error) {
      res.status(500).json({ error: 'Upload failed' });
    }
  });

  // Scoring endpoints
  app.get('/api/jobs/:jobId/candidates', async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const candidates = await storage.getCandidatesWithScores(jobId);
      res.json(candidates);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch candidates with scores' });
    }
  });

  app.post('/api/score/:candidateId/:jobId', async (req, res) => {
    try {
      const candidateId = parseInt(req.params.candidateId);
      const jobId = parseInt(req.params.jobId);
      const weights: ScoreWeights = req.body.weights || {
        skills: 0.5,
        title: 0.2,
        seniority: 0.15,
        recency: 0.1,
        gaps: 0.05,
      };

      const scoreBreakdown = await ScoringEngine.scoreCandidate(candidateId, jobId, weights);
      
      const scoreData = {
        candidateId,
        jobId,
        totalScore: scoreBreakdown.totalScore,
        skillMatchScore: scoreBreakdown.skillMatchScore,
        titleScore: scoreBreakdown.titleScore,
        seniorityScore: scoreBreakdown.seniorityScore,
        recencyScore: scoreBreakdown.recencyScore,
        gapPenalty: scoreBreakdown.gapPenalty,
        missingMustHave: scoreBreakdown.missingMustHave,
        explanation: scoreBreakdown.explanation,
        weights,
      };

      const score = await storage.saveScore(scoreData);
      res.json(score);
    } catch (error) {
      res.status(500).json({ error: 'Failed to calculate score' });
    }
  });

  app.post('/api/jobs/:jobId/rescore', async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const weights: ScoreWeights = req.body.weights;

      if (!weights) {
        return res.status(400).json({ error: 'Weights are required' });
      }

      // Get all candidates for this job
      const candidates = await storage.getCandidatesWithScores(jobId);

      // Re-score all candidates
      for (const candidate of candidates) {
        const scoreBreakdown = await ScoringEngine.scoreCandidate(candidate.id, jobId, weights);
        
        const scoreData = {
          candidateId: candidate.id,
          jobId,
          totalScore: scoreBreakdown.totalScore,
          skillMatchScore: scoreBreakdown.skillMatchScore,
          titleScore: scoreBreakdown.titleScore,
          seniorityScore: scoreBreakdown.seniorityScore,
          recencyScore: scoreBreakdown.recencyScore,
          gapPenalty: scoreBreakdown.gapPenalty,
          missingMustHave: scoreBreakdown.missingMustHave,
          explanation: scoreBreakdown.explanation,
          weights,
        };

        await storage.saveScore(scoreData);
      }

      res.json({ success: true, message: 'All candidates re-scored' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to re-score candidates' });
    }
  });

  // Export endpoint
  app.post('/api/export/shortlist', async (req, res) => {
    try {
      const { candidateIds, jobId } = req.body;
      
      if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
        return res.status(400).json({ error: 'Candidate IDs are required' });
      }

      const candidates = await storage.getCandidatesWithScores(jobId);
      const shortlistedCandidates = candidates.filter(c => candidateIds.includes(c.id));

      // Generate CSV
      const csvHeaders = 'Name,Email,Total Score,Skill Match %,Years Experience,Last Role,Missing Must-Have\n';
      const csvRows = shortlistedCandidates.map(candidate => {
        const score = candidate.score;
        return [
          candidate.name,
          candidate.email,
          score?.totalScore || 0,
          score?.skillMatchScore || 0,
          candidate.yearsExperience || 0,
          candidate.lastRoleTitle || '',
          score?.missingMustHave?.join('; ') || 'None'
        ].map(field => `"${field}"`).join(',');
      }).join('\n');

      const csv = csvHeaders + csvRows;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="shortlist.csv"');
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: 'Failed to export shortlist' });
    }
  });

  // Helper function to extract name from CV text
  function extractName(text: string): string | null {
    const lines = text.split('\n').slice(0, 10); // Check first 10 lines
    
    for (const line of lines) {
      const trimmed = line.trim();
      // Look for lines that might be names (2-4 words, proper case)
      if (trimmed.length > 0 && trimmed.length < 50) {
        const words = trimmed.split(/\s+/);
        if (words.length >= 2 && words.length <= 4) {
          const isName = words.every(word => 
            /^[A-Z][a-z]+$/.test(word) && word.length >= 2
          );
          if (isName) {
            return trimmed;
          }
        }
      }
    }
    
    return null;
  }

  // Helper function to extract email from CV text
  function extractEmail(text: string): string | null {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const match = text.match(emailRegex);
    return match ? match[0] : null;
  }

  const httpServer = createServer(app);
  return httpServer;
}
