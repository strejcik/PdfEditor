import type { TemplateData } from '../../../types/templates';

export const entryLevelCoverLetterTemplate: TemplateData = {
  metadata: {
    id: 'coverletter-entrylevel-001',
    name: 'Entry-Level Cover Letter',
    description: 'Simple cover letter for new graduates and career starters',
    category: 'coverLetters',
    tags: ['cover letter', 'entry level', 'graduate', 'first job', 'simple'],
    isPremium: false,
    version: 1,
    author: 'PDF Editor Team',
    createdAt: '2024-01-15T00:00:00Z',
    placeholders: [
      { id: 'your_name', key: '{{YOUR_NAME}}', label: 'Your Name', defaultValue: 'Jane Graduate', type: 'text', required: true },
      { id: 'email', key: '{{EMAIL}}', label: 'Email', defaultValue: 'jane.graduate@email.com', type: 'text' },
      { id: 'phone', key: '{{PHONE}}', label: 'Phone', defaultValue: '(555) 789-0123', type: 'text' },
      { id: 'degree', key: '{{DEGREE}}', label: 'Degree', defaultValue: 'Bachelor of Science in Computer Science', type: 'text' },
      { id: 'university', key: '{{UNIVERSITY}}', label: 'University', defaultValue: 'State University', type: 'text' },
      { id: 'company', key: '{{COMPANY}}', label: 'Company', defaultValue: 'Target Company', type: 'text' },
      { id: 'position', key: '{{POSITION}}', label: 'Position', defaultValue: 'Junior Developer', type: 'text' },
    ],
  },
  content: {
    pages: [
      {
        textItems: [
          { text: '{{YOUR_NAME}}', xNorm: 0.50, yNormTop: 0.05, fontSize: 26, fontFamily: 'Lato', color: '#1f2937', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: '{{EMAIL}}  |  {{PHONE}}', xNorm: 0.50, yNormTop: 0.10, fontSize: 11, fontFamily: 'Lato', color: '#6b7280', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: 'Dear Hiring Manager,', xNorm: 0.05, yNormTop: 0.20, fontSize: 11, fontFamily: 'Lato', color: '#374151', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: 'I am excited to apply for the {{POSITION}} position at {{COMPANY}}. As a recent graduate with a {{DEGREE}} from {{UNIVERSITY}}, I am eager to start my career and contribute to your team.', xNorm: 0.05, yNormTop: 0.26, fontSize: 11, fontFamily: 'Lato', color: '#374151', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: 'During my studies, I developed a strong foundation in software development. Through coursework, projects, and internships, I have gained practical experience in:', xNorm: 0.05, yNormTop: 0.38, fontSize: 11, fontFamily: 'Lato', color: '#374151', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: '• Built a full-stack e-commerce application using React and Node.js', xNorm: 0.08, yNormTop: 0.46, fontSize: 11, fontFamily: 'Lato', color: '#4b5563', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: '• Completed a summer internship at TechStart Inc.', xNorm: 0.08, yNormTop: 0.50, fontSize: 11, fontFamily: 'Lato', color: '#4b5563', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: '• Led a team project developing a mobile app for campus events', xNorm: 0.08, yNormTop: 0.54, fontSize: 11, fontFamily: 'Lato', color: '#4b5563', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: 'I am particularly drawn to {{COMPANY}} because of your commitment to mentoring new developers. I am confident that my enthusiasm, work ethic, and willingness to learn would make me a valuable addition to your team.', xNorm: 0.05, yNormTop: 0.62, fontSize: 11, fontFamily: 'Lato', color: '#374151', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: 'Thank you for considering my application. I would welcome the opportunity to discuss how I can contribute to {{COMPANY}}. I look forward to hearing from you.', xNorm: 0.05, yNormTop: 0.76, fontSize: 11, fontFamily: 'Lato', color: '#374151', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: 'Best regards,', xNorm: 0.05, yNormTop: 0.88, fontSize: 11, fontFamily: 'Lato', color: '#374151', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: '{{YOUR_NAME}}', xNorm: 0.05, yNormTop: 0.93, fontSize: 12, fontFamily: 'Lato', color: '#1f2937', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
        ],
        imageItems: [],
        shapes: [
          { type: 'line', xNorm: 0.30, yNormTop: 0.14, widthNorm: 0.40, heightNorm: 0, strokeColor: '#10b981', strokeWidth: 2, index: 0, x: 0, y: 0, width: 0, height: 0 },
        ],
        formFields: [],
        annotations: [],
      },
    ],
    textItems: [],
    imageItems: [],
    shapeItems: [],
    formFields: [],
    annotationItems: [],
  },
};
