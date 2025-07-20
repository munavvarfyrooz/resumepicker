import { db } from "../server/db";
import { jobs, candidates, candidateSkills, jobSkills, scores } from "@shared/schema";
import { CVParser } from "../server/services/parsing";
import { ScoringEngine } from "../server/services/scoring";
import { storage } from "../server/storage";

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  try {
    // Clean existing data
    console.log('🧹 Cleaning existing data...');
    await db.delete(scores);
    await db.delete(candidateSkills);
    await db.delete(jobSkills);
    await db.delete(candidates);
    await db.delete(jobs);

    // Create sample job
    console.log('📝 Creating sample job...');
    const [sampleJob] = await db.insert(jobs).values({
      title: 'Senior React Developer',
      description: `# Senior React Developer

We are looking for an experienced React developer to join our growing team.

## Responsibilities
- Develop and maintain React applications
- Collaborate with the design team to implement user interfaces
- Write clean, maintainable, and testable code
- Participate in code reviews and technical discussions
- Mentor junior developers

## What we offer
- Competitive salary
- Flexible working hours
- Remote work options
- Professional development opportunities
- Great team culture

## About the role
This is a senior-level position requiring significant experience in modern web development. You'll be working on challenging projects and have the opportunity to make a significant impact on our product.`,
      requirements: {
        must: ['React', 'TypeScript', 'JavaScript', 'HTML', 'CSS'],
        nice: ['Node.js', 'GraphQL', 'AWS', 'Docker', 'Jest']
      },
      status: 'active'
    }).returning();

    // Set job skills
    await storage.setJobSkills(sampleJob.id, [
      { skill: 'React', required: true },
      { skill: 'TypeScript', required: true },
      { skill: 'JavaScript', required: true },
      { skill: 'HTML', required: true },
      { skill: 'CSS', required: true },
      { skill: 'Node.js', required: false },
      { skill: 'GraphQL', required: false },
      { skill: 'AWS', required: false },
      { skill: 'Docker', required: false },
      { skill: 'Jest', required: false },
    ]);

    // Create sample candidates
    console.log('👥 Creating sample candidates...');
    
    const sampleCandidates = [
      {
        name: 'John Doe',
        email: 'john.doe@email.com',
        fileName: 'john_doe_cv.pdf',
        fileType: 'pdf',
        filePath: '/uploads/john_doe_cv.pdf',
        extractedText: `John Doe
Senior Frontend Developer
john.doe@email.com | +1 (555) 123-4567

EXPERIENCE
Senior Frontend Developer | TechCorp Inc. | 2021 - Present
• Led development of React-based web applications serving 100k+ users
• Implemented TypeScript migration improving code quality by 40%
• Mentored 3 junior developers and conducted technical interviews
• Built reusable component library used across 5+ projects
• Technologies: React, TypeScript, JavaScript, HTML, CSS, Redux, Jest

Frontend Developer | StartupXYZ | 2019 - 2021
• Developed responsive web applications using React and modern CSS
• Collaborated with UX team to implement pixel-perfect designs
• Optimized application performance reducing load time by 60%
• Technologies: React, JavaScript, HTML, CSS, Sass, Webpack

Junior Developer | WebSolutions Ltd. | 2017 - 2019
• Built web applications using HTML, CSS, and vanilla JavaScript
• Learned React and contributed to team's first React project
• Participated in agile development process
• Technologies: HTML, CSS, JavaScript, jQuery, Bootstrap

EDUCATION
Bachelor of Computer Science | State University | 2013-2017

SKILLS
• Frontend: React, TypeScript, JavaScript, HTML5, CSS3, Sass, Redux
• Tools: Git, Webpack, Jest, Cypress, Docker
• Backend: Node.js, Express (basic knowledge)
• Cloud: AWS S3, CloudFront (basic knowledge)`,
        yearsExperience: 8,
        lastRoleTitle: 'Senior Frontend Developer',
        experienceGaps: [],
        experienceTimeline: [
          {
            company: 'TechCorp Inc.',
            role: 'Senior Frontend Developer',
            startDate: '2021-01',
            endDate: 'Present',
            yearsInRole: 3
          },
          {
            company: 'StartupXYZ',
            role: 'Frontend Developer', 
            startDate: '2019-03',
            endDate: '2021-01',
            yearsInRole: 2
          },
          {
            company: 'WebSolutions Ltd.',
            role: 'Junior Developer',
            startDate: '2017-06',
            endDate: '2019-03', 
            yearsInRole: 2
          }
        ]
      },
      {
        name: 'Sarah Smith',
        email: 'sarah.smith@email.com',
        fileName: 'sarah_smith_resume.docx',
        fileType: 'docx',
        filePath: '/uploads/sarah_smith_resume.docx',
        extractedText: `Sarah Smith
React Developer
sarah.smith@email.com | +1 (555) 987-6543

PROFESSIONAL EXPERIENCE

React Developer | InnovateHub | 2020 - Present
• Developed and maintained React applications with TypeScript
• Implemented responsive designs and optimized for mobile devices
• Worked with REST APIs and integrated third-party services
• Collaborated in agile team using Scrum methodology
• Technologies: React, TypeScript, JavaScript, HTML, CSS, Redux Toolkit

Full Stack Developer | DevStudio | 2018 - 2020  
• Built full-stack applications using React and Node.js
• Designed and implemented RESTful APIs
• Worked with MongoDB and PostgreSQL databases
• Technologies: React, Node.js, Express, MongoDB, PostgreSQL

EDUCATION
Bachelor of Software Engineering | Tech University | 2014-2018

SKILLS & TECHNOLOGIES
Frontend: React, TypeScript, JavaScript, HTML5, CSS3, Sass, Redux
Backend: Node.js, Express, MongoDB, PostgreSQL
Tools: Git, Webpack, npm, Postman
Testing: Jest, React Testing Library

Missing: GraphQL experience`,
        yearsExperience: 5,
        lastRoleTitle: 'React Developer',
        experienceGaps: [
          {
            start: '2020-06',
            end: '2020-12',
            months: 6
          }
        ],
        experienceTimeline: [
          {
            company: 'InnovateHub',
            role: 'React Developer',
            startDate: '2020-12',
            endDate: 'Present',
            yearsInRole: 3
          },
          {
            company: 'DevStudio',
            role: 'Full Stack Developer',
            startDate: '2018-02',
            endDate: '2020-06',
            yearsInRole: 2
          }
        ]
      },
      {
        name: 'Mike Johnson',
        email: 'mike.j@email.com',
        fileName: 'mike_johnson_cv.txt',
        fileType: 'txt',
        filePath: '/uploads/mike_johnson_cv.txt',
        extractedText: `Mike Johnson
Junior Frontend Developer
mike.j@email.com | +1 (555) 456-7890

WORK EXPERIENCE

Junior Frontend Developer | CodeCraft | 2022 - Present
• Learning React and modern frontend development practices
• Built simple web applications using HTML, CSS, and JavaScript
• Assisted senior developers with bug fixes and feature implementation
• Technologies: HTML, CSS, JavaScript, basic React

Web Development Intern | TechStart | 2021 - 2022
• Created static websites using HTML, CSS, and basic JavaScript
• Learned version control with Git
• Participated in daily standups and sprint planning

EDUCATION
Associate Degree in Web Development | Community College | 2019-2021

SKILLS
HTML5, CSS3, JavaScript (ES6), Git, basic React knowledge
Learning: TypeScript, advanced React patterns

NOTES
New to the industry but eager to learn. Missing experience with TypeScript and advanced React concepts.`,
        yearsExperience: 3,
        lastRoleTitle: 'Junior Frontend Developer',
        experienceGaps: [],
        experienceTimeline: [
          {
            company: 'CodeCraft',
            role: 'Junior Frontend Developer',
            startDate: '2022-01',
            endDate: 'Present',
            yearsInRole: 2
          },
          {
            company: 'TechStart',
            role: 'Web Development Intern',
            startDate: '2021-06',
            endDate: '2022-01',
            yearsInRole: 1
          }
        ]
      }
    ];

    // Insert candidates and their skills
    for (const candidateData of sampleCandidates) {
      console.log(`📄 Processing candidate: ${candidateData.name}`);
      
      const [candidate] = await db.insert(candidates).values(candidateData).returning();
      
      // Parse skills from CV text
      const parsedCV = CVParser.extractSkills(candidateData.extractedText.toLowerCase());
      
      // Add some additional skills based on the CV content
      let skillsList = parsedCV;
      
      if (candidateData.name === 'John Doe') {
        skillsList = ['React', 'TypeScript', 'JavaScript', 'HTML', 'CSS', 'Redux', 'Jest', 'Node.js', 'AWS', 'Docker'];
      } else if (candidateData.name === 'Sarah Smith') {
        skillsList = ['React', 'TypeScript', 'JavaScript', 'HTML', 'CSS', 'Redux', 'Node.js', 'MongoDB', 'PostgreSQL'];
      } else if (candidateData.name === 'Mike Johnson') {
        skillsList = ['HTML', 'CSS', 'JavaScript', 'Git', 'React'];
      }
      
      await storage.setCandidateSkills(candidate.id, skillsList);
      
      // Generate scores for this candidate
      console.log(`📊 Calculating scores for: ${candidateData.name}`);
      const scoreBreakdown = await ScoringEngine.scoreCandidate(candidate.id, sampleJob.id);
      
      const scoreData = {
        candidateId: candidate.id,
        jobId: sampleJob.id,
        totalScore: scoreBreakdown.totalScore,
        skillMatchScore: scoreBreakdown.skillMatchScore,
        titleScore: scoreBreakdown.titleScore,
        seniorityScore: scoreBreakdown.seniorityScore,
        recencyScore: scoreBreakdown.recencyScore,
        gapPenalty: scoreBreakdown.gapPenalty,
        missingMustHave: scoreBreakdown.missingMustHave,
        explanation: scoreBreakdown.explanation,
        weights: {
          skills: 0.5,
          title: 0.2,
          seniority: 0.15,
          recency: 0.1,
          gaps: 0.05,
        },
      };
      
      await storage.saveScore(scoreData);
    }

    // Create another sample job (draft)
    console.log('📝 Creating additional sample job...');
    const [draftJob] = await db.insert(jobs).values({
      title: 'Full Stack Engineer',
      description: `# Full Stack Engineer

Join our team as a full stack engineer to work on exciting projects.

## Requirements
- Experience with React and Node.js
- Understanding of databases
- Good communication skills

## Nice to have
- Docker experience
- Cloud platform knowledge
- DevOps experience`,
      requirements: {
        must: ['React', 'Node.js', 'JavaScript', 'SQL'],
        nice: ['Docker', 'AWS', 'DevOps', 'TypeScript']
      },
      status: 'draft'
    }).returning();

    await storage.setJobSkills(draftJob.id, [
      { skill: 'React', required: true },
      { skill: 'Node.js', required: true },
      { skill: 'JavaScript', required: true },
      { skill: 'SQL', required: true },
      { skill: 'Docker', required: false },
      { skill: 'AWS', required: false },
      { skill: 'DevOps', required: false },
      { skill: 'TypeScript', required: false },
    ]);

    console.log('✅ Database seeding completed successfully!');
    console.log(`
📊 Summary:
- Jobs created: 2 (1 active, 1 draft)
- Candidates created: 3
- Skills extracted and scored for all candidates
- Scores calculated based on job requirements

🚀 You can now start the application and see the seeded data!
    `);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run the seed script
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedDatabase };
