import type { TemplateData } from '../../../types/templates';

export const awardCertificateTemplate: TemplateData = {
  metadata: {
    id: 'certificate-award-001',
    name: 'Award Certificate',
    description: 'Modern award certificate for competitions and recognition',
    category: 'certificates',
    tags: ['certificate', 'award', 'competition', 'winner', 'prize'],
    isPremium: false,
    version: 1,
    author: 'PDF Editor Team',
    createdAt: '2024-01-15T00:00:00Z',
    placeholders: [
      { id: 'event', key: '{{EVENT}}', label: 'Event Name', defaultValue: 'Innovation Challenge 2024', type: 'text', required: true },
      { id: 'recipient', key: '{{RECIPIENT}}', label: 'Winner Name', defaultValue: 'Team Alpha', type: 'text', required: true },
      { id: 'award', key: '{{AWARD}}', label: 'Award Title', defaultValue: 'First Place', type: 'text' },
      { id: 'category', key: '{{CATEGORY}}', label: 'Category', defaultValue: 'Best Innovation', type: 'text' },
      { id: 'date', key: '{{DATE}}', label: 'Date', defaultValue: new Date().toLocaleDateString(), type: 'date' },
    ],
  },
  content: {
    pages: [
      {
        textItems: [
          { text: '★ AWARD ★', xNorm: 0.50, yNormTop: 0.12, fontSize: 16, fontFamily: 'Lato', color: '#fbbf24', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: '{{EVENT}}', xNorm: 0.50, yNormTop: 0.20, fontSize: 24, fontFamily: 'Lato', color: '#1f2937', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: 'Proudly Presents', xNorm: 0.50, yNormTop: 0.30, fontSize: 12, fontFamily: 'Lato', color: '#6b7280', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: '{{AWARD}}', xNorm: 0.50, yNormTop: 0.38, fontSize: 36, fontFamily: 'Lato', color: '#7c3aed', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: 'to', xNorm: 0.50, yNormTop: 0.48, fontSize: 12, fontFamily: 'Lato', color: '#6b7280', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: '{{RECIPIENT}}', xNorm: 0.50, yNormTop: 0.54, fontSize: 28, fontFamily: 'Lato', color: '#1f2937', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: 'Category: {{CATEGORY}}', xNorm: 0.50, yNormTop: 0.64, fontSize: 14, fontFamily: 'Lato', color: '#7c3aed', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: '{{DATE}}', xNorm: 0.50, yNormTop: 0.72, fontSize: 11, fontFamily: 'Lato', color: '#9ca3af', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: '________________________', xNorm: 0.50, yNormTop: 0.84, fontSize: 12, fontFamily: 'Lato', color: '#d1d5db', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: 'Event Organizer', xNorm: 0.50, yNormTop: 0.88, fontSize: 10, fontFamily: 'Lato', color: '#6b7280', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
        ],
        imageItems: [],
        shapes: [
          { type: 'rectangle', xNorm: 0.06, yNormTop: 0.06, widthNorm: 0.88, heightNorm: 0.88, strokeColor: '#7c3aed', strokeWidth: 3, fillColor: null, index: 0, x: 0, y: 0, width: 0, height: 0 },
          { type: 'rectangle', xNorm: 0.08, yNormTop: 0.08, widthNorm: 0.84, heightNorm: 0.84, strokeColor: '#fbbf24', strokeWidth: 1, fillColor: null, index: 0, x: 0, y: 0, width: 0, height: 0 },
          { type: 'line', xNorm: 0.25, yNormTop: 0.26, widthNorm: 0.50, heightNorm: 0, strokeColor: '#7c3aed', strokeWidth: 2, index: 0, x: 0, y: 0, width: 0, height: 0 },
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
