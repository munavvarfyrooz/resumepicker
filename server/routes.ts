import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { insertJobSchema, insertCandidateSchema, insertBlogPostSchema, insertBlogCategorySchema, type ScoreWeights } from "@shared/schema";
import path from "path";
import { readFile } from "fs/promises";
import { CVParser } from "./services/parsing";
import { ScoringEngine } from "./services/scoring";
import { FileStorage } from "./utils/fileStorage";
import { JobAnalysisService } from "./services/jobAnalysis";
import { setupSimpleAuth, requireAuth, requireAdmin, createAdminUser } from "./simpleAuth";
import { setupMediaRoutes } from "./mediaRoutes";

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
  // Set up simple authentication
  setupSimpleAuth(app);
  
  // Create admin user if it doesn't exist
  await createAdminUser();

  // Note: Auth routes are handled in simpleAuth.ts

  // Support contact endpoint
  app.post('/api/support/contact', requireAuth, async (req: any, res) => {
    try {
      const { subject, category, message, email, name } = req.body;
      const user = await storage.getUser(req.session.userId);
      
      if (!subject || !category || !message) {
        return res.status(400).json({ message: "Subject, category, and message are required" });
      }

      // Import email service and send support email
      const { emailService } = await import('./services/emailService');
      await emailService.sendSupportEmail({
        fromUser: {
          name: name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'User',
          email: email || user?.email || 'noreply@resumepicker.com',
          username: user?.username || 'User'
        },
        subject,
        category,
        message,
        userId: req.session.userId
      });

      res.json({ message: "Support request sent successfully" });
    } catch (error) {
      console.error("Error sending support email:", error);
      res.status(500).json({ message: "Failed to send support request" });
    }
  });

  // Admin routes
  app.get('/api/admin/users', requireAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.get('/api/admin/stats/users', requireAdmin, async (req: any, res) => {
    try {
      const stats = await storage.getUserStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ error: 'Failed to fetch user stats' });
    }
  });

  app.get('/api/admin/stats/usage', requireAdmin, async (req: any, res) => {
    try {
      const stats = await storage.getUsageStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching usage stats:", error);
      res.status(500).json({ error: 'Failed to fetch usage stats' });
    }
  });

  app.get('/api/admin/users/usage', requireAdmin, async (req: any, res) => {
    try {
      const userUsage = await storage.getUserUsageDetails();
      res.json(userUsage);
    } catch (error) {
      console.error("Error fetching user usage details:", error);
      res.status(500).json({ error: 'Failed to fetch user usage details' });
    }
  });

  app.patch('/api/admin/users/:id/role', requireAdmin, async (req: any, res) => {
    try {
      const { role } = req.body;
      if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      const user = await storage.updateUserRole(req.params.id, role);
      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ error: 'Failed to update user role' });
    }
  });

  app.patch('/api/admin/users/:id/status', requireAdmin, async (req: any, res) => {
    try {
      const { isActive } = req.body;
      const user = await storage.updateUserStatus(req.params.id, isActive);
      res.json(user);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ error: 'Failed to update user status' });
    }
  });

  // Validate reset token endpoint
  app.post('/api/validate-reset-token', async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }

      // Check if token is valid
      const user = await storage.getUserByPasswordResetToken(token);
      
      if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }

      res.json({ valid: true });
    } catch (error) {
      console.error("Token validation error:", error);
      res.status(500).json({ message: "Failed to validate token" });
    }
  });

  // Email verification endpoint
  app.post('/api/verify-email', async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Verification token is required" });
      }

      // Verify the token and update user
      const user = await storage.verifyEmail(token);
      
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired verification token" });
      }

      res.json({ 
        message: "Email verified successfully!",
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ message: "Failed to verify email" });
    }
  });

  // User password change endpoint
  app.post('/api/auth/change-password', requireAuth, async (req: any, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters long" });
      }

      const user = await storage.getUser((req as any).userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Import verifyPassword from simpleAuth
      const { verifyPassword } = await import('./simpleAuth');
      
      // Verify current password
      const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Update to new password
      await storage.updateUserPassword((req as any).userId, newPassword);

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Jobs endpoints (protected)
  app.get('/api/jobs', requireAuth, async (req: any, res) => {
    try {
      const jobs = await storage.getJobs((req as any).userId);
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch jobs' });
    }
  });

  app.get('/api/jobs/candidate-counts', requireAuth, async (req: any, res) => {
    try {
      const counts = await storage.getCandidateCountsByJob((req as any).userId);
      res.json(counts);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch candidate counts' });
    }
  });

  app.get('/api/jobs/:id', requireAuth, async (req: any, res) => {
    try {
      const job = await storage.getJob(parseInt(req.params.id), (req as any).userId);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
      res.json(job);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch job' });
    }
  });

  app.post('/api/jobs', requireAuth, async (req: any, res) => {
    try {
      const validatedData = insertJobSchema.parse(req.body);
      const job = await storage.createJob({
        ...validatedData,
        createdBy: (req as any).userId,
      });
      
      // Log user action and update activity
      await storage.logUserAction({
        userId: (req as any).userId,
        action: 'create_job',
        resourceType: 'job',
        resourceId: job.id,
        metadata: { title: job.title },
      });
      await storage.updateUserActivity((req as any).userId);
      
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

  app.put('/api/jobs/:id', requireAuth, async (req, res) => {
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
  app.get('/api/candidates', requireAuth, async (req: any, res) => {
    try {
      const candidates = await storage.getCandidates((req as any).userId);
      res.json(candidates);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch candidates' });
    }
  });

  app.get('/api/candidates/:id', requireAuth, async (req: any, res) => {
    try {
      const candidate = await storage.getCandidate(parseInt(req.params.id), (req as any).userId);
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

  // File upload endpoint with flexible field handling
  app.post('/api/upload', requireAuth, (req, res, next) => {
    // Try both 'files' and 'file' field names to handle various upload scenarios
    const uploadHandler = upload.any();
    
    uploadHandler(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        console.error('Multer error:', err);
        return res.status(400).json({ 
          error: `Upload error: ${err.message}`,
          code: err.code 
        });
      } else if (err) {
        console.error('Upload error:', err);
        return res.status(500).json({ error: 'File upload failed' });
      }
      next();
    });
  }, async (req, res) => {
    try {
      console.log('Upload request received:', {
        filesCount: req.files ? req.files.length : 0,
        fieldNames: req.files ? (req.files as any[]).map((f: any) => f.fieldname) : [],
        body: Object.keys(req.body)
      });

      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        console.error('No files in request:', { files: req.files, body: req.body });
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const results = [];

      for (const file of req.files) {
        try {
          // Parse CV first
          const parsedCV = await CVParser.parseBuffer(file.buffer, file.originalname);

          // Extract name and email from CV text
          const name = extractName(parsedCV.text) || file.originalname.replace(/\.[^/.]+$/, "");
          const email = extractEmail(parsedCV.text) || `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`;

          // Check for duplicates by email or filename (within user's candidates)
          const existingCandidates = await storage.getCandidates((req as any).userId);
          const duplicateByEmail = existingCandidates.find(c => c.email === email);
          const duplicateByFilename = existingCandidates.find(c => c.fileName === file.originalname);
          
          if (duplicateByEmail || duplicateByFilename) {
            results.push({
              success: false,
              error: `Duplicate candidate: ${duplicateByEmail ? 'email already exists' : 'filename already uploaded'}`,
              fileName: file.originalname,
            });
            continue;
          }

          // Save file only if not duplicate
          const fileInfo = await FileStorage.saveFile(
            file.buffer,
            file.originalname,
            file.mimetype
          );

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

          const candidate = await storage.createCandidate({
            ...candidateData,
            createdBy: (req as any).userId as string, // Add user association
          });

          // Save skills
          await storage.setCandidateSkills(candidate.id, parsedCV.skills);
          
          // Update user activity
          await storage.updateUserActivity((req as any).userId);

          results.push({
            success: true,
            candidate,
            fileName: file.originalname,
          });
        } catch (error) {
          console.error('Error processing file:', file.originalname, error);
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
  app.get('/api/jobs/:jobId/candidates', requireAuth, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const candidates = await storage.getCandidatesWithScores(jobId, (req as any).userId);
      
      // Update user activity when viewing candidates
      await storage.updateUserActivity((req as any).userId);
      
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

  app.post('/api/jobs/:jobId/rescore', requireAuth, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const userId = req.userId; // Get user ID from auth middleware
      const weights: ScoreWeights = req.body.weights;

      if (!weights) {
        return res.status(400).json({ error: 'Weights are required' });
      }

      // Get only the current user's candidates for this job
      const candidates = await storage.getCandidatesWithScores(jobId, userId);

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

  // Generate manual rankings based on scores for all candidates
  app.post('/api/jobs/:jobId/manual-rank', requireAuth, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const userId = req.userId;
      const weights: ScoreWeights = req.body.weights || {
        skills: 0.5,
        title: 0.2,
        seniority: 0.15,
        recency: 0.1,
        gaps: 0.05,
      };

      // Get only the current user's candidates for this job
      const candidates = await storage.getCandidatesWithScores(jobId, userId);
      const scoredCandidates = [];

      // Calculate scores for all candidates
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
        scoredCandidates.push({ 
          candidateId: candidate.id, 
          totalScore: scoreBreakdown.totalScore,
          name: candidate.name 
        });
      }

      // Sort by score (highest first) and assign manual ranks
      scoredCandidates.sort((a, b) => b.totalScore - a.totalScore);
      
      // Update manual ranks
      for (let i = 0; i < scoredCandidates.length; i++) {
        await storage.updateScoreManualRanking(
          scoredCandidates[i].candidateId, 
          jobId, 
          i + 1  // Rank starts from 1
        );
      }

      res.json({ 
        success: true, 
        message: `Manual ranking complete for ${scoredCandidates.length} candidates`,
        rankings: scoredCandidates.map((c, i) => ({
          rank: i + 1,
          candidateId: c.candidateId,
          name: c.name,
          totalScore: c.totalScore
        }))
      });
    } catch (error) {
      console.error('Manual ranking error:', error);
      res.status(500).json({ error: 'Failed to generate manual rankings' });
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

  // CV Download endpoint
  app.get('/api/candidates/:id/download', async (req, res) => {
    try {
      const candidateId = parseInt(req.params.id);
      const candidate = await storage.getCandidate(candidateId);
      
      if (!candidate) {
        return res.status(404).json({ error: 'Candidate not found' });
      }

      const filePath = candidate.filePath;
      
      try {
        const fileBuffer = await readFile(filePath);
        const fileName = candidate.fileName;
        
        // Set appropriate headers for download
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.send(fileBuffer);
      } catch (fileError) {
        res.status(404).json({ error: 'CV file not found on server' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to download CV' });
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

  // Generate AI rankings for candidates
  app.post('/api/jobs/:jobId/ai-rank', async (req: any, res) => {
    try {
      // Get userId directly from session for proper user isolation
      const sessionUserId = (req.session as any)?.userId;
      if (!sessionUserId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const jobId = parseInt(req.params.jobId);
      const { AIRankingService } = await import('./services/aiRanking');
      const rankings = await AIRankingService.rankCandidatesForJob(jobId, sessionUserId);
      
      if (rankings.length > 0) {
        await AIRankingService.saveAIRankings(jobId, rankings);
      }
      
      res.json({ success: true, rankings });
    } catch (error) {
      console.error('AI ranking error:', error);
      res.status(500).json({ error: 'Failed to generate AI rankings' });
    }
  });

  // Test email endpoint
  app.post("/api/test-email", requireAuth, async (req: any, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email address is required" });
      }

      const user = (req.session as any).user;
      
      // Send test email
      const { emailService } = await import('./services/emailService');
      const success = await emailService.sendEmail({
        to: email,
        subject: 'Test Email from ResumePicker',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Test Email Successful!</h2>
            
            <p>Hi ${user.username},</p>
            
            <p>This is a test email from ResumePicker to verify that your SMTP configuration is working correctly.</p>
            
            <p>If you're reading this, it means:</p>
            <ul>
              <li>✅ Your SMTP credentials are configured correctly</li>
              <li>✅ Email sending is functional</li>
              <li>✅ You can now use all email features in ResumePicker</li>
            </ul>
            
            <p>Email features include:</p>
            <ul>
              <li>New user registration notifications</li>
              <li>Email verification for new accounts</li>
              <li>Password reset functionality</li>
              <li>Various notification emails</li>
            </ul>
            
            <hr style="border: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #666; font-size: 14px;">
              This test was initiated from the ResumePicker dashboard.
            </p>
          </div>
        `
      });

      if (success) {
        res.json({ message: "Test email sent successfully!" });
      } else {
        res.status(500).json({ message: "Failed to send test email. Check server logs for details." });
      }
    } catch (error) {
      console.error("[EMAIL] Test email error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Blog management routes
  app.get('/api/blog/posts', async (req, res) => {
    try {
      const status = req.query.status as 'draft' | 'published' | 'archived' | undefined;
      const posts = await storage.getBlogPosts(status);
      res.json(posts);
    } catch (error) {
      console.error("Error fetching blog posts:", error);
      res.status(500).json({ error: 'Failed to fetch blog posts' });
    }
  });

  app.get('/api/blog/posts/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const post = await storage.getBlogPost(id);
      if (!post) {
        return res.status(404).json({ error: 'Blog post not found' });
      }
      res.json(post);
    } catch (error) {
      console.error("Error fetching blog post:", error);
      res.status(500).json({ error: 'Failed to fetch blog post' });
    }
  });

  app.get('/api/blog/posts/slug/:slug', async (req, res) => {
    try {
      const slug = req.params.slug;
      const post = await storage.getBlogPostBySlug(slug);
      if (!post) {
        return res.status(404).json({ error: 'Blog post not found' });
      }
      res.json(post);
    } catch (error) {
      console.error("Error fetching blog post by slug:", error);
      res.status(500).json({ error: 'Failed to fetch blog post' });
    }
  });

  app.post('/api/blog/posts', requireAdmin, async (req: any, res) => {
    try {
      const postData = insertBlogPostSchema.parse(req.body);
      const post = await storage.createBlogPost({
        ...postData,
        authorId: (req as any).userId
      });
      
      // Set categories if provided
      if (req.body.categoryIds && Array.isArray(req.body.categoryIds)) {
        await storage.setBlogPostCategories(post.id, req.body.categoryIds);
      }
      
      // Log the action
      await storage.logUserAction({
        userId: (req as any).userId,
        action: 'create_blog_post',
        resourceType: 'blog_post',
        resourceId: post.id,
        metadata: { title: post.title }
      });
      
      res.status(201).json(post);
    } catch (error: any) {
      console.error("Error creating blog post:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid blog post data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to create blog post' });
    }
  });

  app.put('/api/blog/posts/:id', requireAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const postData = insertBlogPostSchema.partial().parse(req.body);
      const post = await storage.updateBlogPost(id, postData);
      
      // Update categories if provided
      if (req.body.categoryIds && Array.isArray(req.body.categoryIds)) {
        await storage.setBlogPostCategories(id, req.body.categoryIds);
      }
      
      // Log the action
      if ((req as any).userId) {
        await storage.logUserAction({
          userId: (req as any).userId,
          action: 'update_blog_post',
          resourceType: 'blog_post',
          resourceId: id,
          metadata: { title: post.title }
        });
      }
      
      res.json(post);
    } catch (error: any) {
      console.error("Error updating blog post:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid blog post data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to update blog post' });
    }
  });

  app.post('/api/blog/posts/:id/publish', requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const post = await storage.publishBlogPost(id);
      
      // Log the action
      if ((req as any).userId) {
        await storage.logUserAction({
          userId: (req as any).userId,
          action: 'publish_blog_post',
          resourceType: 'blog_post',
          resourceId: id,
          metadata: { title: post.title }
        });
      }
      
      res.json(post);
    } catch (error) {
      console.error("Error publishing blog post:", error);
      res.status(500).json({ error: 'Failed to publish blog post' });
    }
  });

  app.delete('/api/blog/posts/:id', requireAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteBlogPost(id);
      
      // Log the action
      await storage.logUserAction({
        userId: (req as any).userId,
        action: 'delete_blog_post',
        resourceType: 'blog_post',
        resourceId: id
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting blog post:", error);
      res.status(500).json({ error: 'Failed to delete blog post' });
    }
  });

  // Blog categories routes
  app.get('/api/blog/categories', async (req, res) => {
    try {
      const categories = await storage.getBlogCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching blog categories:", error);
      res.status(500).json({ error: 'Failed to fetch blog categories' });
    }
  });

  app.post('/api/blog/categories', requireAdmin, async (req: any, res) => {
    try {
      const categoryData = insertBlogCategorySchema.parse(req.body);
      const category = await storage.createBlogCategory(categoryData);
      res.status(201).json(category);
    } catch (error: any) {
      console.error("Error creating blog category:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid category data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to create blog category' });
    }
  });

  app.put('/api/blog/categories/:id', requireAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const categoryData = insertBlogCategorySchema.partial().parse(req.body);
      const category = await storage.updateBlogCategory(id, categoryData);
      res.json(category);
    } catch (error: any) {
      console.error("Error updating blog category:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid category data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to update blog category' });
    }
  });

  app.delete('/api/blog/categories/:id', requireAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteBlogCategory(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting blog category:", error);
      res.status(500).json({ error: 'Failed to delete blog category' });
    }
  });

  // Set up media routes for image uploads
  setupMediaRoutes(app);

  // Serve static files
  app.use('/uploads', express.static(path.join(import.meta.dirname, '..', 'uploads')));
  app.use('/test-blog-images', express.static(path.join(import.meta.dirname, '..', 'test-blog-images')));

  const httpServer = createServer(app);
  return httpServer;
}
