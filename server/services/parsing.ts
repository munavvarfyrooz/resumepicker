import * as fs from 'fs';
import * as path from 'path';
import mammoth from 'mammoth';
import { format } from 'date-fns';
import pdfParse from 'pdf-parse';
import { AIParsingService } from './aiParsing';

export interface ParsedCV {
  text: string;
  skills: string[];
  yearsExperience?: number;
  lastRoleTitle?: string;
  experienceGaps: Array<{
    start: string;
    end: string;
    months: number;
  }>;
  experienceTimeline: Array<{
    company: string;
    role: string;
    startDate: string;
    endDate: string;
    yearsInRole: number;
  }>;
}

export class CVParser {
  static async parseBuffer(buffer: Buffer, filename: string): Promise<ParsedCV> {
    const fileType = filename.toLowerCase().endsWith('.pdf') ? 'pdf' : 
                    filename.toLowerCase().endsWith('.docx') ? 'docx' : 'txt';
    
    let text = '';
    
    if (fileType === 'pdf') {
      text = await this.parsePDFBuffer(buffer);
    } else if (fileType === 'docx') {
      text = await this.parseDOCXBuffer(buffer);
    } else if (fileType === 'txt') {
      text = buffer.toString('utf-8');
    } else {
      throw new Error('Unsupported file type');
    }

    return this.extractStructuredData(text);
  }

  private static async parsePDFBuffer(buffer: Buffer): Promise<string> {
    try {
      const data = await pdfParse(buffer);
      return data.text || 'No text content found in PDF';
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw new Error('Failed to parse PDF file');
    }
  }

  private static async parseDOCXBuffer(buffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || 'No text content found in DOCX';
    } catch (error) {
      console.error('DOCX parsing error:', error);
      throw new Error('Failed to parse DOCX file');
    }
  }

  private static skillKeywords = [
    'react', 'angular', 'vue', 'javascript', 'typescript', 'node.js', 'python', 'java',
    'html', 'css', 'scss', 'sass', 'tailwind', 'bootstrap', 'mongodb', 'postgresql',
    'mysql', 'redis', 'aws', 'docker', 'kubernetes', 'git', 'graphql', 'rest api',
    'express', 'next.js', 'nuxt.js', 'redux', 'vuex', 'webpack', 'vite', 'jest',
    'cypress', 'testing library', 'sql', 'nosql', 'microservices', 'agile', 'scrum',
    'firebase', 'azure', 'gcp', 'ci/cd', 'devops', 'linux', 'bash', 'terraform'
  ];

  static async parseFile(filePath: string, fileType: string): Promise<ParsedCV> {
    let text = '';

    switch (fileType.toLowerCase()) {
      case 'pdf':
        text = await this.parsePDF(filePath);
        break;
      case 'docx':
        text = await this.parseDOCX(filePath);
        break;
      case 'txt':
        text = await this.parseTXT(filePath);
        break;
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }

    return await this.extractStructuredData(text);
  }

  private static async parsePDF(filePath: string): Promise<string> {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const buffer = fs.readFileSync(filePath);
      
      if (buffer.length === 0) {
        throw new Error('PDF file is empty');
      }

      const data = await pdfParse(buffer);
      return data.text || 'No text content found in PDF';
    } catch (error) {
      console.error('PDF parsing error for file:', filePath, error);
      // Return a more specific error message for debugging
      if (error instanceof Error) {
        return `PDF parsing failed: ${error.message}`;
      }
      return 'Error parsing PDF file';
    }
  }

  private static async parseDOCX(filePath: string): Promise<string> {
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  private static async parseTXT(filePath: string): Promise<string> {
    return fs.readFileSync(filePath, 'utf-8');
  }

  private static async extractStructuredData(text: string): Promise<ParsedCV> {
    // Use AI parsing for enhanced extraction
    const aiResult = await AIParsingService.extractSkillsWithAI(text);
    
    // Combine AI results with traditional parsing as fallback
    const normalizedText = text.toLowerCase();
    const traditionalSkills = this.extractSkills(normalizedText);
    const traditionalYears = this.extractYearsExperience(normalizedText);
    const traditionalTitle = this.extractLastRole(text);
    
    return {
      text,
      skills: aiResult.skills.length > 0 ? aiResult.skills : traditionalSkills,
      yearsExperience: aiResult.yearsExperience ?? traditionalYears,
      lastRoleTitle: aiResult.jobTitle ?? traditionalTitle,
      experienceGaps: this.extractGaps(text),
      experienceTimeline: this.extractTimeline(text),
    };
  }

  private static extractSkills(text: string): string[] {
    const foundSkills: string[] = [];
    
    for (const skill of this.skillKeywords) {
      if (text.includes(skill.toLowerCase())) {
        foundSkills.push(skill);
      }
    }
    
    return [...new Set(foundSkills)]; // Remove duplicates
  }

  private static extractYearsExperience(text: string): number | undefined {
    // Look for patterns like "5 years", "5+ years", "5-7 years", "3.8 years"
    const patterns = [
      /(\d+(?:\.\d+)?)\+?\s*years?\s+(?:of\s+)?(?:hands-on\s+)?experience/gi,
      /(\d+(?:\.\d+)?)\+?\s*years?\s+experience/gi,
      /(\d+)\+?\s*years?\s+in/gi,
      /experience.*?(\d+)\+?\s*years?/gi,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const numbers = match[0].match(/(\d+(?:\.\d+)?)/g);
        if (numbers) {
          return parseFloat(numbers[0]);
        }
      }
    }

    return undefined;
  }

  private static extractLastRole(text: string): string | undefined {
    // Look for common job titles and also extract from typical CV patterns
    const titles = [
      'quality engineer', 'test engineer', 'automation engineer', 'sdet',
      'senior developer', 'senior engineer', 'lead developer', 'principal engineer',
      'frontend developer', 'backend developer', 'full stack developer',
      'software engineer', 'software developer', 'web developer',
      'react developer', 'javascript developer', 'python developer',
      'devops engineer', 'data engineer', 'machine learning engineer',
      'associate consultant', 'consultant', 'qa engineer', 'qa analyst'
    ];

    const upperText = text.substring(0, Math.min(1500, text.length));
    
    // First, try to find titles in the first few lines
    for (const title of titles) {
      const regex = new RegExp(title, 'gi');
      if (regex.test(upperText)) {
        return title.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
      }
    }

    // Look for patterns like "Company Name — Job Title"
    const jobTitlePattern = /—\s*([^•\n]+)/g;
    const matches = upperText.match(jobTitlePattern);
    if (matches && matches.length > 0) {
      const title = matches[0].replace('—', '').trim();
      if (title.length < 50 && title.length > 3) {
        return title;
      }
    }

    return undefined;
  }

  private static extractGaps(text: string): Array<{ start: string; end: string; months: number }> {
    // Simplified gap detection - this would need more sophisticated parsing in production
    return [];
  }

  private static extractTimeline(text: string): Array<{
    company: string;
    role: string;
    startDate: string;
    endDate: string;
    yearsInRole: number;
  }> {
    // Simplified timeline extraction - this would need more sophisticated parsing in production
    return [];
  }
}
