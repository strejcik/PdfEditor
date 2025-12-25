/**
 * Template Field Schemas
 * Defines the input fields and sections for each AI-generated template type
 */

// ============================================================================
// Invoice Schema
// ============================================================================

export const INVOICE_INPUT_SCHEMA = [
  // Company Info
  { id: 'company_name', key: 'companyName', label: 'Company Name', type: 'text', required: true, placeholder: 'Your Company LLC' },
  { id: 'company_address', key: 'companyAddress', label: 'Company Address', type: 'multiline', rows: 2, placeholder: '123 Business St\nCity, ST 12345' },
  { id: 'company_email', key: 'companyEmail', label: 'Company Email', type: 'email', placeholder: 'billing@company.com' },
  { id: 'company_phone', key: 'companyPhone', label: 'Company Phone', type: 'phone', placeholder: '(555) 123-4567' },

  // Invoice Details
  { id: 'invoice_number', key: 'invoiceNumber', label: 'Invoice Number', type: 'text', required: true, placeholder: 'INV-2024-001' },
  { id: 'invoice_date', key: 'invoiceDate', label: 'Invoice Date', type: 'date', required: true },
  { id: 'due_date', key: 'dueDate', label: 'Due Date', type: 'date', required: true },

  // Client Info
  { id: 'client_name', key: 'clientName', label: 'Client Name', type: 'text', required: true, placeholder: 'Client Company Inc.' },
  { id: 'client_address', key: 'clientAddress', label: 'Client Address', type: 'multiline', rows: 2, placeholder: '456 Client Ave\nCity, ST 67890' },
  { id: 'client_email', key: 'clientEmail', label: 'Client Email', type: 'email', placeholder: 'client@example.com' },

  // Line Items
  {
    id: 'line_items',
    key: 'lineItems',
    label: 'Line Items',
    type: 'entries',
    required: true,
    maxItems: 10,
    entryLabel: 'Item',
    entrySchema: {
      fields: [
        { key: 'description', label: 'Description', type: 'text', required: true, placeholder: 'Service or product description' },
        { key: 'quantity', label: 'Quantity', type: 'number', required: true, defaultValue: 1, min: 1 },
        { key: 'rate', label: 'Rate ($)', type: 'number', required: true, defaultValue: 0, step: 0.01, min: 0 },
      ],
    },
  },

  // Totals
  { id: 'tax_rate', key: 'taxRate', label: 'Tax Rate (%)', type: 'number', defaultValue: 0, min: 0, max: 100, step: 0.1 },
  { id: 'discount', key: 'discount', label: 'Discount ($)', type: 'number', defaultValue: 0, min: 0, step: 0.01 },

  // Notes
  { id: 'notes', key: 'notes', label: 'Notes', type: 'multiline', rows: 2, placeholder: 'Payment terms, thank you message, etc.' },
  { id: 'payment_terms', key: 'paymentTerms', label: 'Payment Terms', type: 'text', placeholder: 'Net 30' },
];

export const INVOICE_FIELD_SECTIONS = [
  { id: 'company', label: 'Your Company', fields: ['company_name', 'company_address', 'company_email', 'company_phone'] },
  { id: 'invoice', label: 'Invoice Details', fields: ['invoice_number', 'invoice_date', 'due_date'] },
  { id: 'client', label: 'Bill To', fields: ['client_name', 'client_address', 'client_email'] },
  { id: 'items', label: 'Line Items', description: 'Add the services or products you are billing for', fields: ['line_items'] },
  { id: 'totals', label: 'Totals & Discounts', fields: ['tax_rate', 'discount'] },
  { id: 'notes', label: 'Notes & Terms', fields: ['notes', 'payment_terms'] },
];

// ============================================================================
// Form Schema
// ============================================================================

// Available form field types that map to actual form elements
export const FORM_FIELD_TYPES = [
  { value: 'text', label: 'Text Input', description: 'Single line text field' },
  { value: 'email', label: 'Email', description: 'Email address input' },
  { value: 'phone', label: 'Phone', description: 'Phone number input' },
  { value: 'textarea', label: 'Text Area', description: 'Multi-line text field' },
  { value: 'select', label: 'Dropdown', description: 'Dropdown selection menu' },
  { value: 'checkbox', label: 'Checkbox', description: 'Single checkbox or checkbox group' },
  { value: 'radio', label: 'Radio Buttons', description: 'Single choice from options' },
  { value: 'date', label: 'Date', description: 'Date picker' },
  { value: 'number', label: 'Number', description: 'Numeric input' },
];

export const FORM_INPUT_SCHEMA = [
  // Form Info
  { id: 'form_title', key: 'formTitle', label: 'Form Title', type: 'text', required: true, placeholder: 'Contact Us' },
  { id: 'form_description', key: 'formDescription', label: 'Description', type: 'multiline', rows: 2, placeholder: 'Please fill out the form below...' },
  { id: 'company_name', key: 'companyName', label: 'Company/Organization Name', type: 'text', placeholder: 'Your Company' },

  // Form Fields
  {
    id: 'fields',
    key: 'fields',
    label: 'Form Fields',
    type: 'entries',
    required: true,
    maxItems: 15,
    entryLabel: 'Field',
    entrySchema: {
      fields: [
        { key: 'label', label: 'Field Label', type: 'text', required: true, placeholder: 'Full Name' },
        {
          key: 'type',
          label: 'Field Type',
          type: 'select',
          required: true,
          options: ['text', 'email', 'phone', 'textarea', 'select', 'checkbox', 'radio', 'date', 'number'],
          description: 'Choose the type of form element'
        },
        { key: 'required', label: 'Required', type: 'select', options: ['Yes', 'No'], defaultValue: 'No' },
        { key: 'placeholder', label: 'Placeholder', type: 'text', placeholder: 'Enter placeholder text...' },
        {
          key: 'options',
          label: 'Options (for dropdown/radio/checkbox)',
          type: 'text',
          placeholder: 'Option1, Option2, Option3',
          description: 'Comma-separated list of options'
        },
        {
          key: 'width',
          label: 'Field Width',
          type: 'select',
          options: ['full', 'half'],
          defaultValue: 'full',
          description: 'Layout width of the field'
        },
      ],
    },
  },

  // Sections (optional)
  {
    id: 'sections',
    key: 'sections',
    label: 'Form Sections',
    type: 'entries',
    maxItems: 5,
    entryLabel: 'Section',
    description: 'Optional: Group fields into sections',
    entrySchema: {
      fields: [
        { key: 'title', label: 'Section Title', type: 'text', placeholder: 'Personal Information' },
        { key: 'description', label: 'Section Description', type: 'text', placeholder: 'Optional description' },
      ],
    },
  },

  // Footer
  { id: 'submit_button_text', key: 'submitButtonText', label: 'Submit Button Text', type: 'text', placeholder: 'Submit' },
  { id: 'privacy_note', key: 'privacyNote', label: 'Privacy Note', type: 'text', placeholder: 'Your information is secure and will not be shared.' },
];

export const FORM_FIELD_SECTIONS = [
  { id: 'info', label: 'Form Information', fields: ['form_title', 'form_description', 'company_name'] },
  { id: 'fields', label: 'Form Fields', description: 'Define the fields that users will fill out', fields: ['fields'] },
  { id: 'sections', label: 'Sections (Optional)', description: 'Group fields into logical sections', fields: ['sections'] },
  { id: 'footer', label: 'Footer & Submit', fields: ['submit_button_text', 'privacy_note'] },
];

// ============================================================================
// Letterhead Schema
// ============================================================================

export const LETTERHEAD_INPUT_SCHEMA = [
  // Sender Info
  { id: 'company_name', key: 'companyName', label: 'Company/Sender Name', type: 'text', required: true, placeholder: 'ACME Corporation' },
  { id: 'tagline', key: 'tagline', label: 'Tagline', type: 'text', placeholder: 'Excellence in Every Detail' },
  { id: 'address', key: 'address', label: 'Address', type: 'multiline', rows: 2, placeholder: '123 Business Ave\nCity, ST 12345' },
  { id: 'phone', key: 'phone', label: 'Phone', type: 'phone', placeholder: '(555) 123-4567' },
  { id: 'email', key: 'email', label: 'Email', type: 'email', placeholder: 'info@company.com' },
  { id: 'website', key: 'website', label: 'Website', type: 'url', placeholder: 'www.company.com' },

  // Letter Content
  { id: 'date', key: 'date', label: 'Date', type: 'date' },
  { id: 'recipient_name', key: 'recipientName', label: 'Recipient Name', type: 'text', placeholder: 'John Smith' },
  { id: 'recipient_title', key: 'recipientTitle', label: 'Recipient Title', type: 'text', placeholder: 'Director of Operations' },
  { id: 'recipient_company', key: 'recipientCompany', label: 'Recipient Company', type: 'text', placeholder: 'Client Company Inc.' },
  { id: 'recipient_address', key: 'recipientAddress', label: 'Recipient Address', type: 'multiline', rows: 2, placeholder: '456 Client St\nCity, ST 67890' },

  { id: 'salutation', key: 'salutation', label: 'Salutation', type: 'text', placeholder: 'Dear Mr. Smith,' },
  {
    id: 'body_paragraphs',
    key: 'bodyParagraphs',
    label: 'Letter Body',
    type: 'entries',
    maxItems: 10,
    entryLabel: 'Paragraph',
    entrySchema: {
      fields: [
        { key: 'text', label: 'Paragraph Text', type: 'multiline', rows: 3, placeholder: 'Enter paragraph content...' },
      ],
    },
  },
  { id: 'closing', key: 'closing', label: 'Closing', type: 'text', placeholder: 'Sincerely,' },
  { id: 'sender_name', key: 'senderName', label: 'Sender Name', type: 'text', placeholder: 'Jane Doe' },
  { id: 'sender_title', key: 'senderTitle', label: 'Sender Title', type: 'text', placeholder: 'CEO' },
];

export const LETTERHEAD_FIELD_SECTIONS = [
  { id: 'company', label: 'Company Information', fields: ['company_name', 'tagline', 'address', 'phone', 'email', 'website'] },
  { id: 'recipient', label: 'Recipient', fields: ['date', 'recipient_name', 'recipient_title', 'recipient_company', 'recipient_address'] },
  { id: 'content', label: 'Letter Content', fields: ['salutation', 'body_paragraphs', 'closing', 'sender_name', 'sender_title'] },
];

// ============================================================================
// Certificate Schema
// ============================================================================

export const CERTIFICATE_INPUT_SCHEMA = [
  // Organization Info
  { id: 'organization', key: 'organization', label: 'Organization Name', type: 'text', required: true, placeholder: 'Excellence Academy' },

  // Certificate Details
  { id: 'title', key: 'title', label: 'Certificate Title', type: 'text', required: true, placeholder: 'Certificate of Achievement' },
  { id: 'subtitle', key: 'subtitle', label: 'Subtitle', type: 'text', placeholder: 'OF ACHIEVEMENT' },
  { id: 'presentation_text', key: 'presentationText', label: 'Presentation Text', type: 'text', placeholder: 'This certificate is proudly presented to' },

  // Recipient
  { id: 'recipient_name', key: 'recipientName', label: 'Recipient Name', type: 'text', required: true, placeholder: 'John Doe' },
  { id: 'recognition_text', key: 'recognitionText', label: 'Recognition Text', type: 'text', placeholder: 'in recognition of' },
  { id: 'achievement', key: 'achievement', label: 'Achievement/Reason', type: 'text', required: true, placeholder: 'Outstanding Performance' },
  { id: 'description', key: 'description', label: 'Additional Description', type: 'multiline', rows: 2, placeholder: 'Additional details about the achievement...' },

  // Date & Signatures
  { id: 'date', key: 'date', label: 'Date', type: 'date' },
  {
    id: 'signatures',
    key: 'signatures',
    label: 'Signatures',
    type: 'entries',
    maxItems: 3,
    entryLabel: 'Signature',
    entrySchema: {
      fields: [
        { key: 'name', label: 'Name', type: 'text', placeholder: 'Jane Smith' },
        { key: 'title', label: 'Title', type: 'text', placeholder: 'Director' },
      ],
    },
  },

  // For completion certificates
  { id: 'course_name', key: 'courseName', label: 'Course/Program Name', type: 'text', placeholder: 'Advanced Web Development' },
  { id: 'hours', key: 'hours', label: 'Hours Completed', type: 'number', min: 0 },
];

export const CERTIFICATE_FIELD_SECTIONS = [
  { id: 'org', label: 'Organization', fields: ['organization'] },
  { id: 'title', label: 'Certificate Type', fields: ['title', 'subtitle', 'presentation_text'] },
  { id: 'recipient', label: 'Recipient Details', fields: ['recipient_name', 'recognition_text', 'achievement', 'description'] },
  { id: 'course', label: 'Course Details (Optional)', description: 'For completion certificates', fields: ['course_name', 'hours'] },
  { id: 'date', label: 'Date & Signatures', fields: ['date', 'signatures'] },
];

// ============================================================================
// Label Schema
// ============================================================================

export const LABEL_INPUT_SCHEMA = [
  // From Address
  { id: 'from_name', key: 'fromName', label: 'From Name', type: 'text', placeholder: 'Your Company' },
  { id: 'from_address', key: 'fromAddress', label: 'From Address', type: 'multiline', rows: 3, placeholder: '123 Sender St\nCity, ST 12345' },

  // To Address
  { id: 'to_name', key: 'toName', label: 'To Name', type: 'text', required: true, placeholder: 'Recipient Name' },
  { id: 'to_address', key: 'toAddress', label: 'To Address', type: 'multiline', rows: 3, required: true, placeholder: '456 Recipient Ave\nCity, ST 67890' },

  // Shipping Details
  { id: 'tracking_number', key: 'trackingNumber', label: 'Tracking Number', type: 'text', placeholder: 'TRK123456789' },
  { id: 'weight', key: 'weight', label: 'Weight', type: 'text', placeholder: '2.5 lbs' },
  { id: 'carrier', key: 'carrier', label: 'Carrier', type: 'select', options: ['USPS', 'UPS', 'FedEx', 'DHL', 'Other'] },
  { id: 'service_type', key: 'serviceType', label: 'Service Type', type: 'select', options: ['Standard', 'Priority', 'Express', 'Overnight'] },

  // Additional
  { id: 'special_instructions', key: 'specialInstructions', label: 'Special Instructions', type: 'text', placeholder: 'Fragile, Handle with Care' },
];

export const LABEL_FIELD_SECTIONS = [
  { id: 'from', label: 'Ship From', fields: ['from_name', 'from_address'] },
  { id: 'to', label: 'Ship To', fields: ['to_name', 'to_address'] },
  { id: 'shipping', label: 'Shipping Details', fields: ['tracking_number', 'weight', 'carrier', 'service_type'] },
  { id: 'special', label: 'Special Instructions', fields: ['special_instructions'] },
];

// ============================================================================
// Cover Letter Schema
// ============================================================================

export const COVER_LETTER_INPUT_SCHEMA = [
  // Personal Info
  { id: 'your_name', key: 'yourName', label: 'Your Name', type: 'text', required: true, placeholder: 'John Smith' },
  { id: 'tagline', key: 'tagline', label: 'Professional Tagline', type: 'text', placeholder: 'Senior Software Engineer' },
  { id: 'email', key: 'email', label: 'Email', type: 'email', placeholder: 'john.smith@email.com' },
  { id: 'phone', key: 'phone', label: 'Phone', type: 'phone', placeholder: '(555) 123-4567' },
  { id: 'linkedin', key: 'linkedin', label: 'LinkedIn', type: 'url', placeholder: 'linkedin.com/in/johnsmith' },
  { id: 'portfolio', key: 'portfolio', label: 'Portfolio/Website', type: 'url', placeholder: 'johnsmith.dev' },

  // Target Job
  { id: 'company', key: 'company', label: 'Company Name', type: 'text', required: true, placeholder: 'Dream Company Inc.' },
  { id: 'position', key: 'position', label: 'Position', type: 'text', required: true, placeholder: 'Senior Software Engineer' },
  { id: 'hiring_manager', key: 'hiringManager', label: 'Hiring Manager Name', type: 'text', placeholder: 'Ms. Jane Doe' },
  { id: 'date', key: 'date', label: 'Date', type: 'date' },

  // Letter Content
  { id: 'opening', key: 'opening', label: 'Opening Paragraph', type: 'multiline', rows: 3, placeholder: 'I am writing to express my strong interest in the [Position] role at [Company]...' },
  {
    id: 'key_points',
    key: 'keyPoints',
    label: 'Key Points/Achievements',
    type: 'list',
    maxItems: 5,
    placeholder: 'Add a key achievement or skill...',
  },
  { id: 'experience_summary', key: 'experienceSummary', label: 'Experience Summary', type: 'multiline', rows: 4, placeholder: 'Describe your relevant experience and achievements...' },
  { id: 'why_company', key: 'whyCompany', label: 'Why This Company', type: 'multiline', rows: 3, placeholder: 'Explain why you are interested in this specific company...' },
  { id: 'closing', key: 'closing', label: 'Closing Paragraph', type: 'multiline', rows: 2, placeholder: 'Thank you for considering my application. I look forward to the opportunity to discuss...' },
  { id: 'sign_off', key: 'signOff', label: 'Sign Off', type: 'text', placeholder: 'Sincerely,' },
];

export const COVER_LETTER_FIELD_SECTIONS = [
  { id: 'personal', label: 'Your Information', fields: ['your_name', 'tagline', 'email', 'phone', 'linkedin', 'portfolio'] },
  { id: 'job', label: 'Target Position', fields: ['company', 'position', 'hiring_manager', 'date'] },
  { id: 'content', label: 'Letter Content', description: 'Craft your compelling cover letter', fields: ['opening', 'key_points', 'experience_summary', 'why_company', 'closing', 'sign_off'] },
];
