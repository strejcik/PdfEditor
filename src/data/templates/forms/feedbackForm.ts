import type { TemplateData } from '../../../types/templates';

export const feedbackFormTemplate: TemplateData = {
  metadata: {
    id: 'form-feedback-001',
    name: 'Feedback Form',
    description: 'Customer satisfaction and feedback collection form',
    category: 'forms',
    tags: ['form', 'feedback', 'survey', 'customer', 'satisfaction'],
    isPremium: false,
    version: 1,
    author: 'PDF Editor Team',
    createdAt: '2024-01-15T00:00:00Z',
    placeholders: [
      { id: 'company_name', key: '{{COMPANY_NAME}}', label: 'Company Name', defaultValue: 'CloudSync Software', type: 'text', required: true },
      { id: 'product_name', key: '{{PRODUCT_NAME}}', label: 'Product/Service Name', defaultValue: 'CloudSync Pro', type: 'text' },
    ],
  },
  content: {
    pages: [
      {
        textItems: [
          { text: '{{COMPANY_NAME}}', xNorm: 0.05, yNormTop: 0.04, fontSize: 18, fontFamily: 'Lato', color: '#1e293b', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: 'Customer Feedback Form', xNorm: 0.05, yNormTop: 0.10, fontSize: 24, fontFamily: 'Lato', color: '#10b981', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: 'Your feedback about {{PRODUCT_NAME}} helps us improve!', xNorm: 0.05, yNormTop: 0.16, fontSize: 12, fontFamily: 'Lato', color: '#64748b', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: 'Overall Satisfaction', xNorm: 0.05, yNormTop: 0.23, fontSize: 13, fontFamily: 'Lato', color: '#10b981', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: 'How satisfied are you with our product/service?', xNorm: 0.05, yNormTop: 0.27, fontSize: 11, fontFamily: 'Lato', color: '#374151', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: 'Very Satisfied', xNorm: 0.10, yNormTop: 0.31, fontSize: 10, fontFamily: 'Lato', color: '#4b5563', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: 'Satisfied', xNorm: 0.28, yNormTop: 0.31, fontSize: 10, fontFamily: 'Lato', color: '#4b5563', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: 'Neutral', xNorm: 0.43, yNormTop: 0.31, fontSize: 10, fontFamily: 'Lato', color: '#4b5563', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: 'Dissatisfied', xNorm: 0.57, yNormTop: 0.31, fontSize: 10, fontFamily: 'Lato', color: '#4b5563', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: 'Very Dissatisfied', xNorm: 0.74, yNormTop: 0.31, fontSize: 10, fontFamily: 'Lato', color: '#4b5563', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: 'Would you recommend us to others?', xNorm: 0.05, yNormTop: 0.38, fontSize: 11, fontFamily: 'Lato', color: '#374151', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: 'Definitely', xNorm: 0.10, yNormTop: 0.42, fontSize: 10, fontFamily: 'Lato', color: '#4b5563', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: 'Probably', xNorm: 0.28, yNormTop: 0.42, fontSize: 10, fontFamily: 'Lato', color: '#4b5563', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: 'Maybe', xNorm: 0.43, yNormTop: 0.42, fontSize: 10, fontFamily: 'Lato', color: '#4b5563', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: 'Unlikely', xNorm: 0.57, yNormTop: 0.42, fontSize: 10, fontFamily: 'Lato', color: '#4b5563', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: 'Detailed Feedback', xNorm: 0.05, yNormTop: 0.50, fontSize: 13, fontFamily: 'Lato', color: '#10b981', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: 'What did you like most?', xNorm: 0.05, yNormTop: 0.54, fontSize: 11, fontFamily: 'Lato', color: '#374151', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: 'What could we improve?', xNorm: 0.05, yNormTop: 0.67, fontSize: 11, fontFamily: 'Lato', color: '#374151', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: 'Contact Information (Optional)', xNorm: 0.05, yNormTop: 0.80, fontSize: 13, fontFamily: 'Lato', color: '#10b981', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: 'Name', xNorm: 0.05, yNormTop: 0.84, fontSize: 11, fontFamily: 'Lato', color: '#374151', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: 'Email', xNorm: 0.52, yNormTop: 0.84, fontSize: 11, fontFamily: 'Lato', color: '#374151', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: 'Thank you for your valuable feedback!', xNorm: 0.50, yNormTop: 0.94, fontSize: 11, fontFamily: 'Lato', color: '#10b981', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
        ],
        imageItems: [],
        shapes: [
          { type: 'line', xNorm: 0.05, yNormTop: 0.20, widthNorm: 0.90, heightNorm: 0, strokeColor: '#10b981', strokeWidth: 2, index: 0, x: 0, y: 0, width: 0, height: 0 },
        ],
        formFields: [
          // Satisfaction rating - "Satisfied" selected as default
          { type: 'radio', fieldName: 'satisfaction_5', groupName: 'satisfaction', xNorm: 0.05, yNormTop: 0.31, widthNorm: 0.025, heightNorm: 0.018, fontSize: 10, fontFamily: 'Lato', textColor: '#1f2937', backgroundColor: '#ffffff', borderColor: '#10b981', borderWidth: 1, index: 0, x: 0, y: 0, width: 0, height: 0 },
          { type: 'radio', fieldName: 'satisfaction_4', groupName: 'satisfaction', defaultValue: 'true', xNorm: 0.23, yNormTop: 0.31, widthNorm: 0.025, heightNorm: 0.018, fontSize: 10, fontFamily: 'Lato', textColor: '#1f2937', backgroundColor: '#ffffff', borderColor: '#10b981', borderWidth: 1, index: 0, x: 0, y: 0, width: 0, height: 0 },
          { type: 'radio', fieldName: 'satisfaction_3', groupName: 'satisfaction', xNorm: 0.38, yNormTop: 0.31, widthNorm: 0.025, heightNorm: 0.018, fontSize: 10, fontFamily: 'Lato', textColor: '#1f2937', backgroundColor: '#ffffff', borderColor: '#10b981', borderWidth: 1, index: 0, x: 0, y: 0, width: 0, height: 0 },
          { type: 'radio', fieldName: 'satisfaction_2', groupName: 'satisfaction', xNorm: 0.52, yNormTop: 0.31, widthNorm: 0.025, heightNorm: 0.018, fontSize: 10, fontFamily: 'Lato', textColor: '#1f2937', backgroundColor: '#ffffff', borderColor: '#10b981', borderWidth: 1, index: 0, x: 0, y: 0, width: 0, height: 0 },
          { type: 'radio', fieldName: 'satisfaction_1', groupName: 'satisfaction', xNorm: 0.69, yNormTop: 0.31, widthNorm: 0.025, heightNorm: 0.018, fontSize: 10, fontFamily: 'Lato', textColor: '#1f2937', backgroundColor: '#ffffff', borderColor: '#10b981', borderWidth: 1, index: 0, x: 0, y: 0, width: 0, height: 0 },
          // Recommendation rating - "Probably" selected as default
          { type: 'radio', fieldName: 'recommend_5', groupName: 'recommend', xNorm: 0.05, yNormTop: 0.42, widthNorm: 0.025, heightNorm: 0.018, fontSize: 10, fontFamily: 'Lato', textColor: '#1f2937', backgroundColor: '#ffffff', borderColor: '#10b981', borderWidth: 1, index: 0, x: 0, y: 0, width: 0, height: 0 },
          { type: 'radio', fieldName: 'recommend_4', groupName: 'recommend', defaultValue: 'true', xNorm: 0.23, yNormTop: 0.42, widthNorm: 0.025, heightNorm: 0.018, fontSize: 10, fontFamily: 'Lato', textColor: '#1f2937', backgroundColor: '#ffffff', borderColor: '#10b981', borderWidth: 1, index: 0, x: 0, y: 0, width: 0, height: 0 },
          { type: 'radio', fieldName: 'recommend_3', groupName: 'recommend', xNorm: 0.38, yNormTop: 0.42, widthNorm: 0.025, heightNorm: 0.018, fontSize: 10, fontFamily: 'Lato', textColor: '#1f2937', backgroundColor: '#ffffff', borderColor: '#10b981', borderWidth: 1, index: 0, x: 0, y: 0, width: 0, height: 0 },
          { type: 'radio', fieldName: 'recommend_2', groupName: 'recommend', xNorm: 0.52, yNormTop: 0.42, widthNorm: 0.025, heightNorm: 0.018, fontSize: 10, fontFamily: 'Lato', textColor: '#1f2937', backgroundColor: '#ffffff', borderColor: '#10b981', borderWidth: 1, index: 0, x: 0, y: 0, width: 0, height: 0 },
          // Textarea with example feedback
          { type: 'textarea', fieldName: 'liked_most', defaultValue: 'The customer support team was incredibly helpful and responsive. The product quality exceeded my expectations, and the delivery was faster than promised.', xNorm: 0.05, yNormTop: 0.57, widthNorm: 0.90, heightNorm: 0.08, placeholder: 'Tell us what you enjoyed...', required: false, fontSize: 11, fontFamily: 'Lato', textColor: '#1f2937', backgroundColor: '#f9fafb', borderColor: '#d1d5db', borderWidth: 1, index: 0, x: 0, y: 0, width: 0, height: 0 },
          { type: 'textarea', fieldName: 'improvements', defaultValue: 'It would be great to have more color options available. Also, consider adding a mobile app for easier order tracking.', xNorm: 0.05, yNormTop: 0.70, widthNorm: 0.90, heightNorm: 0.08, placeholder: 'Share your suggestions...', required: false, fontSize: 11, fontFamily: 'Lato', textColor: '#1f2937', backgroundColor: '#f9fafb', borderColor: '#d1d5db', borderWidth: 1, index: 0, x: 0, y: 0, width: 0, height: 0 },
          // Contact information with example data
          { type: 'textInput', fieldName: 'contact_name', defaultValue: 'Sarah Johnson', xNorm: 0.05, yNormTop: 0.87, widthNorm: 0.43, heightNorm: 0.04, placeholder: 'Your name', required: false, fontSize: 11, fontFamily: 'Lato', textColor: '#1f2937', backgroundColor: '#f9fafb', borderColor: '#d1d5db', borderWidth: 1, index: 0, x: 0, y: 0, width: 0, height: 0 },
          { type: 'textInput', fieldName: 'contact_email', defaultValue: 'sarah.johnson@email.com', xNorm: 0.52, yNormTop: 0.87, widthNorm: 0.43, heightNorm: 0.04, placeholder: 'Your email', required: false, fontSize: 11, fontFamily: 'Lato', textColor: '#1f2937', backgroundColor: '#f9fafb', borderColor: '#d1d5db', borderWidth: 1, index: 0, x: 0, y: 0, width: 0, height: 0 },
        ],
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
