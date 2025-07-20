import * as fs from 'fs';
import * as path from 'path';
import mammoth from 'mammoth';
import { format } from 'date-fns';

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

    return this.extractInformation(text);
  }

  private static async parsePDF(filePath: string): Promise<string> {
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      return data.text;
    } catch (error) {
      console.error('PDF parsing error:', error);
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

  private static extractInformation(text: string): ParsedCV {
    const normalizedText = text.toLowerCase();
    
    return {
      text,
      skills: this.extractSkills(normalizedText),
      yearsExperience: this.extractYearsExperience(normalizedText),
      lastRoleTitle: this.extractLastRole(text),
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
    // Look for patterns like "5 years", "5+ years", "5-7 years"
    const patterns = [
      /(\d+)\+?\s*years?\s+(?:of\s+)?experience/gi,
      /(\d+)\+?\s*years?\s+in/gi,
      /experience.*?(\d+)\+?\s*years?/gi,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const numbers = match[0].match(/(\d+)/g);
        if (numbers) {
          return parseInt(numbers[0]);
        }
      }
    }

    return undefined;
  }

  private static extractLastRole(text: string): string | undefined {
    // Simple extraction - look for common job titles near the top of the document
    const titles = [
      'senior developer', 'senior engineer', 'lead developer', 'principal engineer',
      'frontend developer', 'backend developer', 'full stack developer',
      'software engineer', 'software developer', 'web developer',
      'react developer', 'javascript developer', 'python developer',
      'devops engineer', 'data engineer', 'machine learning engineer'
    ];

    const upperText = text.substring(0, Math.min(1000, text.length));
    
    for (const title of titles) {
      const regex = new RegExp(title, 'gi');
      if (regex.test(upperText)) {
        return title.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
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
