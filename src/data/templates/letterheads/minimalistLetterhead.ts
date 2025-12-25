import type { TemplateData } from '../../../types/templates';

export const minimalistLetterheadTemplate: TemplateData = {
  metadata: {
    id: 'letterhead-minimalist-001',
    name: 'Minimalist Letterhead',
    description: 'Clean, minimal letterhead design with subtle accents',
    category: 'letterheads',
    tags: ['letterhead', 'minimalist', 'clean', 'modern', 'simple'],
    isPremium: false,
    version: 1,
    author: 'PDF Editor Team',
    createdAt: '2024-01-15T00:00:00Z',
    placeholders: [
      { id: 'name', key: '{{NAME}}', label: 'Name/Company', defaultValue: 'MODERN STUDIO', type: 'text', required: true },
      { id: 'email', key: '{{EMAIL}}', label: 'Email', defaultValue: 'hello@modernstudio.com', type: 'text' },
      { id: 'phone', key: '{{PHONE}}', label: 'Phone', defaultValue: '(555) 456-7890', type: 'text' },
    ],
  },
  content: {
    pages: [
      {
        textItems: [
          { text: '{{NAME}}', xNorm: 0.05, yNormTop: 0.05, fontSize: 24, fontFamily: 'Lato', color: '#111827', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: 'December 25, 2024', xNorm: 0.05, yNormTop: 0.16, fontSize: 10, fontFamily: 'Lato', color: '#6b7280', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: 'Creative Team, Innovation Labs', xNorm: 0.05, yNormTop: 0.22, fontSize: 11, fontFamily: 'Lato', color: '#374151', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: '789 Design District, Floor 5, Los Angeles, CA 90001', xNorm: 0.05, yNormTop: 0.25, fontSize: 11, fontFamily: 'Lato', color: '#374151', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: 'Thank you for reaching out regarding the upcoming project collaboration. We are excited about the potential to work together. Our team specializes in creating elegant, user-focused designs that drive engagement.', xNorm: 0.05, yNormTop: 0.34, fontSize: 11, fontFamily: 'Lato', color: '#374151', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: 'Best,', xNorm: 0.05, yNormTop: 0.70, fontSize: 11, fontFamily: 'Lato', color: '#374151', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: 'Alex Designer, Creative Director', xNorm: 0.05, yNormTop: 0.76, fontSize: 11, fontFamily: 'Lato', color: '#374151', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: '{{EMAIL}}', xNorm: 0.05, yNormTop: 0.94, fontSize: 9, fontFamily: 'Lato', color: '#9ca3af', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: '{{PHONE}}', xNorm: 0.95, yNormTop: 0.94, fontSize: 9, fontFamily: 'Lato', color: '#9ca3af', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
        ],
        imageItems: [],
        shapes: [
          { type: 'rectangle', xNorm: 0.05, yNormTop: 0.09, widthNorm: 0.06, heightNorm: 0.003, strokeColor: '#111827', strokeWidth: 0, fillColor: '#111827', index: 0, x: 0, y: 0, width: 0, height: 0 },
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
