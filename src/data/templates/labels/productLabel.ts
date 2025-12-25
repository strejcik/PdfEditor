import type { TemplateData } from '../../../types/templates';

export const productLabelTemplate: TemplateData = {
  metadata: {
    id: 'label-product-001',
    name: 'Product Label',
    description: 'Product label with name, description, and pricing',
    category: 'labels',
    tags: ['label', 'product', 'price', 'retail', 'tag'],
    isPremium: false,
    version: 1,
    author: 'PDF Editor Team',
    createdAt: '2024-01-15T00:00:00Z',
    placeholders: [
      { id: 'brand', key: '{{BRAND}}', label: 'Brand Name', defaultValue: 'NATURELUX', type: 'text', required: true },
      { id: 'product', key: '{{PRODUCT}}', label: 'Product Name', defaultValue: 'Organic Lavender Essential Oil', type: 'text', required: true },
      { id: 'description', key: '{{DESCRIPTION}}', label: 'Description', defaultValue: 'Pure therapeutic grade - 30ml', type: 'text' },
      { id: 'price', key: '{{PRICE}}', label: 'Price', defaultValue: '$24.99', type: 'text' },
      { id: 'sku', key: '{{SKU}}', label: 'SKU', defaultValue: 'NLX-LAV-30ML', type: 'text' },
    ],
  },
  content: {
    pages: [
      {
        textItems: [
          { text: '{{BRAND}}', xNorm: 0.50, yNormTop: 0.08, fontSize: 12, fontFamily: 'Lato', color: '#6b7280', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: '{{PRODUCT}}', xNorm: 0.50, yNormTop: 0.16, fontSize: 22, fontFamily: 'Lato', color: '#1f2937', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: '{{DESCRIPTION}}', xNorm: 0.50, yNormTop: 0.26, fontSize: 11, fontFamily: 'Lato', color: '#6b7280', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: '{{PRICE}}', xNorm: 0.50, yNormTop: 0.38, fontSize: 32, fontFamily: 'Lato', color: '#dc2626', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
          { text: '{{SKU}}', xNorm: 0.50, yNormTop: 0.52, fontSize: 10, fontFamily: 'Lato', color: '#9ca3af', boxPadding: 5, anchor: 'top', index: 0, x: 0, y: 0 },
        ],
        imageItems: [],
        shapes: [
          { type: 'rectangle', xNorm: 0.10, yNormTop: 0.05, widthNorm: 0.80, heightNorm: 0.55, strokeColor: '#1f2937', strokeWidth: 2, fillColor: null, index: 0, x: 0, y: 0, width: 0, height: 0 },
          { type: 'line', xNorm: 0.20, yNormTop: 0.34, widthNorm: 0.60, heightNorm: 0, strokeColor: '#e5e7eb', strokeWidth: 1, index: 0, x: 0, y: 0, width: 0, height: 0 },
          { type: 'line', xNorm: 0.20, yNormTop: 0.48, widthNorm: 0.60, heightNorm: 0, strokeColor: '#e5e7eb', strokeWidth: 1, index: 0, x: 0, y: 0, width: 0, height: 0 },
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
