/**
 * Template Library Type Definitions
 * Types for the document templates feature
 */

import type { TextItem, ImageItem, Page } from './editor';
import type { ShapeItem } from './shapes';
import type { FormFieldItem } from './formFields';
import type { AnnotationItem } from './annotations';

// ============================================
// LAYOUT SYSTEM TYPES
// ============================================

/**
 * Predefined layout presets for common document structures
 */
export type LayoutPreset =
  | 'single-column'
  | 'two-column-equal'
  | 'two-column-sidebar-left'
  | 'two-column-sidebar-right'
  | 'three-column'
  | 'custom';

/**
 * A column definition within a layout
 * Uses normalized coordinates (0-1) for width and position
 */
export interface LayoutColumn {
  id: string;
  name: string;
  xNormStart: number;
  xNormEnd: number;
  paddingNorm?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

/**
 * A background region for visual styling
 * Rendered as a filled rectangle behind content
 */
export interface LayoutRegion {
  id: string;
  name: string;
  xNormStart: number;
  xNormEnd: number;
  yNormStart: number;
  yNormEnd: number;
  backgroundColor: string;
  zIndex?: number;
}

/**
 * A semantic section that groups related content
 * Sections belong to columns and contain items
 */
export interface LayoutSection {
  id: string;
  name: string;
  columnId: string;
  order: number;
  yNormStart?: number;
  yNormEnd?: number;
  headerStyle?: {
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    showUnderline?: boolean;
    underlineColor?: string;
  };
  itemIds?: string[];
}

/**
 * Complete layout definition for a template
 */
export interface TemplateLayout {
  preset: LayoutPreset;
  columns: LayoutColumn[];
  regions?: LayoutRegion[];
  sections?: LayoutSection[];
  defaultTextColorByColumn?: Record<string, string>;
  pageMargins?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

// ============================================
// TEMPLATE TYPES
// ============================================

// Template Categories
export type TemplateCategory =
  | 'invoices'
  | 'resumes'
  | 'forms'
  | 'letterheads'
  | 'certificates'
  | 'labels'
  | 'coverLetters';

// Category display labels
export const CATEGORY_LABELS: Record<TemplateCategory | 'all', string> = {
  all: 'All Templates',
  invoices: 'Invoices',
  resumes: 'Resumes',
  forms: 'Forms',
  letterheads: 'Letterheads',
  certificates: 'Certificates',
  labels: 'Labels',
  coverLetters: 'Cover Letters',
};

// Category icons (emoji)
export const CATEGORY_ICONS: Record<TemplateCategory, string> = {
  invoices: '$',
  resumes: 'CV',
  forms: 'F',
  letterheads: 'LH',
  certificates: 'C',
  labels: 'L',
  coverLetters: 'CL',
};

// Placeholder definition for customizable template fields
export interface TemplatePlaceholder {
  id: string;
  key: string;              // e.g., "{{COMPANY_NAME}}"
  label: string;            // Human-readable label
  defaultValue: string;
  type: 'text' | 'date' | 'number' | 'multiline';
  required?: boolean;
}

// Template metadata
export interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  thumbnail?: string;       // Base64 or URL
  tags: string[];
  isPremium: boolean;       // Future monetization
  version: number;
  author?: string;
  createdAt: string;        // ISO date string
  placeholders: TemplatePlaceholder[];
  layout?: TemplateLayout;  // Optional layout metadata for structured templates
}

// Template content (same structure as JSON export)
export interface TemplateContent {
  pages: Page[];
  textItems: TextItem[];
  imageItems: ImageItem[];
  shapeItems: ShapeItem[];
  formFields: FormFieldItem[];
  annotationItems: AnnotationItem[];
}

// Complete template data
export interface TemplateData {
  metadata: TemplateMetadata;
  content: TemplateContent;
}

// Placeholder values map
export interface PlaceholderValues {
  [key: string]: string;
}

// Template state for the hook
export interface TemplateState {
  templates: TemplateData[];
  categories: (TemplateCategory | 'all')[];
  selectedCategory: TemplateCategory | 'all';
  searchQuery: string;
  isLoading: boolean;
  previewTemplate: TemplateData | null;
  pendingTemplate: TemplateData | null;
  isPlaceholderModalOpen: boolean;
  placeholderValues: PlaceholderValues;
}

// All available categories for filtering
export const ALL_CATEGORIES: (TemplateCategory | 'all')[] = [
  'all',
  'invoices',
  'resumes',
  'forms',
  'letterheads',
  'certificates',
  'labels',
  'coverLetters',
];

// ============================================
// AI-GENERATED TEMPLATE TYPES
// ============================================

/**
 * Resume style variants for AI generation
 */
export type ResumeStyle =
  | 'professional'  // Two-column with dark sidebar
  | 'modern'        // Two-column clean with accent colors
  | 'classic'       // Single column traditional
  | 'creative';     // Colorful header with accent elements

/**
 * Work Experience entry for resume
 */
export interface WorkExperienceEntry {
  id: string;
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  achievements: string[];
}

/**
 * Education entry for resume
 */
export interface EducationEntry {
  id: string;
  degree: string;
  institution: string;
  location?: string;
  startDate: string;
  endDate: string;
}

/**
 * Language proficiency entry
 */
export interface LanguageEntry {
  id: string;
  language: string;
  proficiency: 'Native' | 'Fluent' | 'Professional' | 'Intermediate' | 'Basic';
}

/**
 * Complete resume input data collected from user
 */
export interface ResumeInputData {
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  address: string;
  linkedIn?: string;
  website?: string;
  profilePhotoDescription?: string;
  profileSummary: string;
  workExperience: WorkExperienceEntry[];
  education: EducationEntry[];
  skills: string[];
  languages: LanguageEntry[];
  hobbies: string[];
}

/**
 * AI Template color scheme
 */
export interface AIColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  textDark: string;
  textLight: string;
  background: string;
}

/**
 * AI Template typography settings
 */
export interface AITypography {
  titleSize: number;
  headingSize: number;
  subheadingSize: number;
  bodySize: number;
  smallSize: number;
  fontFamily: string;
}

/**
 * AI Template Definition for resume generation
 */
export interface AITemplateDefinition {
  style: ResumeStyle;
  layoutPreset: LayoutPreset;
  colorScheme: AIColorScheme;
  typography: AITypography;
  sections: {
    sidebar?: string[];
    main?: string[];
    header?: string[];
  };
}

/**
 * Extended Template Metadata for AI-generated templates
 */
export interface AITemplateMetadata {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  thumbnail?: string;
  tags: string[];
  isPremium: boolean;
  version: number;
  author?: string;
  createdAt: string;
  generationMode: 'ai-generated';
  inputSchema: 'resume';
  aiDefinition: AITemplateDefinition;
}

/**
 * Union type for both static and AI templates
 */
export type AnyTemplateData =
  | TemplateData
  | { metadata: AITemplateMetadata; content?: TemplateContent }
  | { metadata: GenericAITemplateMetadata; content?: TemplateContent };

/**
 * Type guard to check if a template is AI-generated
 */
export function isAITemplate(
  template: AnyTemplateData
): template is { metadata: AITemplateMetadata | GenericAITemplateMetadata; content?: TemplateContent } {
  return 'generationMode' in template.metadata &&
         (template.metadata as any).generationMode === 'ai-generated';
}

/**
 * Get default resume data with sample values for testing
 */
export function getDefaultResumeData(): ResumeInputData {
  return {
    fullName: 'John Smith',
    jobTitle: 'Senior Software Engineer',
    email: 'john.smith@example.com',
    phone: '+1 (555) 123-4567',
    address: 'San Francisco, CA',
    linkedIn: 'linkedin.com/in/johnsmith',
    website: 'johnsmith.dev',
    profilePhotoDescription: 'Professional headshot',
    profileSummary: 'Experienced software engineer with 8+ years of expertise in full-stack development. Passionate about building scalable applications and mentoring junior developers. Strong background in React, Node.js, and cloud technologies.',
    workExperience: [
      {
        id: '1',
        title: 'Senior Software Engineer',
        company: 'Tech Solutions Inc.',
        location: 'San Francisco, CA',
        startDate: '2020-01',
        endDate: 'Present',
        achievements: [
          'Led development of microservices architecture serving 2M+ users',
          'Reduced API response time by 40% through optimization',
          'Mentored team of 5 junior developers',
        ],
      },
      {
        id: '2',
        title: 'Software Engineer',
        company: 'StartupXYZ',
        location: 'New York, NY',
        startDate: '2017-03',
        endDate: '2019-12',
        achievements: [
          'Built real-time collaboration features using WebSockets',
          'Implemented CI/CD pipeline reducing deployment time by 60%',
        ],
      },
    ],
    education: [
      {
        id: '1',
        degree: 'Master of Science in Computer Science',
        institution: 'Stanford University',
        startDate: '2015',
        endDate: '2017',
      },
      {
        id: '2',
        degree: 'Bachelor of Science in Software Engineering',
        institution: 'MIT',
        startDate: '2011',
        endDate: '2015',
      },
    ],
    skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'AWS', 'Docker', 'PostgreSQL', 'GraphQL', 'Git'],
    languages: [
      { id: '1', language: 'English', proficiency: 'Native' },
      { id: '2', language: 'Spanish', proficiency: 'Intermediate' },
    ],
    hobbies: ['Open Source Contributing', 'Rock Climbing', 'Photography', 'Chess'],
  };
}

// ============================================
// INVOICE INPUT DATA TYPES
// ============================================

/**
 * Invoice style variants for AI generation
 */
export type InvoiceStyle = 'professional' | 'basic' | 'freelancer';

/**
 * Invoice line item (for products/services)
 */
export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  // Freelancer-specific: hours instead of quantity
  hours?: number;
}

/**
 * Complete invoice input data
 */
export interface InvoiceInputData {
  // Company/Freelancer info
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  companyLogo?: string;
  // Freelancer-specific
  freelancerTitle?: string;  // e.g., "Freelance Developer"
  hourlyRate?: number;       // Default hourly rate
  // Invoice details
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  // Client info
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  // Project info (for freelancer)
  projectName?: string;
  // Line items (services/products)
  lineItems: InvoiceLineItem[];
  // Totals
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount?: number;
  discountPercent?: number;
  total: number;
  // Total hours (for freelancer)
  totalHours?: number;
  // Payment info
  paymentTerms: string;
  paymentMethod?: string;
  bankDetails?: string;
  notes?: string;
}

/**
 * Get default invoice data with comprehensive test data
 */
export function getDefaultInvoiceData(): InvoiceInputData {
  return {
    companyName: 'Bright Ideas Digital Agency',
    companyEmail: 'billing@brightideas.com',
    companyPhone: '(555) 123-4567',
    companyAddress: '123 Innovation Drive, Suite 400\nSan Francisco, CA 94102',
    invoiceNumber: 'INV-2024-0042',
    invoiceDate: '2024-12-15',
    dueDate: '2025-01-14',
    clientName: 'TechStart Ventures LLC',
    clientEmail: 'accounts@techstart.com',
    clientAddress: '789 Startup Boulevard\nAustin, TX 78701',
    projectName: 'E-Commerce Platform Redesign',
    lineItems: [
      { id: '1', description: 'Frontend Development - React/TypeScript', quantity: 80, rate: 150, amount: 12000, hours: 80 },
      { id: '2', description: 'Backend API Development - Node.js', quantity: 60, rate: 150, amount: 9000, hours: 60 },
      { id: '3', description: 'UI/UX Design & Prototyping', quantity: 40, rate: 125, amount: 5000, hours: 40 },
      { id: '4', description: 'Database Architecture & Setup', quantity: 20, rate: 175, amount: 3500, hours: 20 },
      { id: '5', description: 'Testing & Quality Assurance', quantity: 25, rate: 100, amount: 2500, hours: 25 },
    ],
    subtotal: 32000,
    taxRate: 8.25,
    discount: 0,
    taxAmount: 2640,
    total: 34640,
    totalHours: 225,
    paymentTerms: 'Net 30 - Payment due within 30 days of invoice date.',
    paymentMethod: 'Bank Transfer (ACH), Wire Transfer, or Credit Card (+3% processing fee)',
    bankDetails: 'Bank: First National Bank | Account: 1234567890 | Routing: 021000021',
    notes: 'Thank you for your business! This project includes 30 days of post-launch support.',
  };
}

/**
 * Get freelancer-style invoice data
 */
export function getDefaultFreelancerInvoiceData(): InvoiceInputData {
  return {
    companyName: 'Sarah Mitchell',
    companyEmail: 'sarah@mitchelldev.com',
    companyPhone: '(555) 987-6543',
    companyAddress: '456 Developer Lane\nPortland, OR 97201',
    freelancerTitle: 'Full-Stack Developer & Consultant',
    hourlyRate: 95,
    invoiceNumber: 'SM-2024-018',
    invoiceDate: '2024-12-20',
    dueDate: '2025-01-03',
    clientName: 'GreenLeaf Organics',
    clientEmail: 'maria@greenleaf.com',
    clientAddress: '321 Organic Way\nSeattle, WA 98101',
    projectName: 'Inventory Management System',
    lineItems: [
      { id: '1', description: 'System Architecture & Planning', hours: 8, quantity: 8, rate: 95, amount: 760 },
      { id: '2', description: 'Database Design & Implementation', hours: 16, quantity: 16, rate: 95, amount: 1520 },
      { id: '3', description: 'Backend Development', hours: 32, quantity: 32, rate: 95, amount: 3040 },
      { id: '4', description: 'Frontend Dashboard Development', hours: 24, quantity: 24, rate: 95, amount: 2280 },
      { id: '5', description: 'Integration & Testing', hours: 12, quantity: 12, rate: 95, amount: 1140 },
      { id: '6', description: 'Documentation & Training', hours: 6, quantity: 6, rate: 95, amount: 570 },
    ],
    subtotal: 9310,
    taxRate: 0,
    discount: 0,
    taxAmount: 0,
    total: 9310,
    totalHours: 98,
    paymentTerms: 'Payment due within 14 days. Thank you for working with me!',
    paymentMethod: 'PayPal, Venmo, or Direct Bank Transfer',
    notes: 'Includes source code and documentation. Additional support available at standard hourly rate.',
  };
}

// ============================================
// FORM INPUT DATA TYPES
// ============================================

/**
 * Form style variants
 */
export type FormStyle = 'contact' | 'registration' | 'feedback';

/**
 * Form field definition
 */
export interface FormFieldDefinition {
  id: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'checkbox' | 'radio' | 'select' | 'date' | 'number';
  placeholder?: string;
  defaultValue?: string; // Pre-filled value for testing
  required: boolean | 'Yes' | 'No'; // Can be boolean or Yes/No string from modal
  options?: string[] | string; // For radio/select/checkbox groups - can be array or comma-separated string
  groupName?: string; // For grouping radio/checkbox options
  width?: 'full' | 'half'; // Layout control
}

/**
 * Registration type option
 */
export interface RegistrationTypeOption {
  id: string;
  name: string;
  price: number;
  description?: string;
}

/**
 * Complete form input data
 */
export interface FormInputData {
  // Form header
  companyName: string;
  formTitle: string;
  formDescription: string;
  // Event/Registration specific
  eventName?: string;
  eventDate?: string;
  eventLocation?: string;
  // Registration types (for registration forms)
  registrationTypes?: RegistrationTypeOption[];
  // Feedback specific
  productName?: string;
  satisfactionOptions?: string[];
  // Fields
  fields: FormFieldDefinition[];
  // Sections (for organizing fields)
  sections?: Array<{
    id: string;
    title: string;
    fieldIds: string[];
  }>;
  // Footer
  submitButtonText: string;
  privacyNote?: string;
  requiredFieldNote: string;
  thankYouMessage?: string;
}

/**
 * Get default contact form data
 */
export function getDefaultFormData(): FormInputData {
  return {
    companyName: 'Apex Solutions Inc.',
    formTitle: 'Contact Us',
    formDescription: 'Have a question or want to work together? Fill out the form below and we\'ll get back to you within 24 hours.',
    fields: [
      { id: '1', label: 'First Name', type: 'text', placeholder: 'John', defaultValue: 'Michael', required: true, width: 'half' },
      { id: '2', label: 'Last Name', type: 'text', placeholder: 'Smith', defaultValue: 'Thompson', required: true, width: 'half' },
      { id: '3', label: 'Email Address', type: 'email', placeholder: 'john.smith@email.com', defaultValue: 'michael.thompson@techcorp.com', required: true, width: 'half' },
      { id: '4', label: 'Phone Number', type: 'phone', placeholder: '(555) 123-4567', defaultValue: '(555) 987-6543', required: false, width: 'half' },
      { id: '5', label: 'Company', type: 'text', placeholder: 'Your company name', defaultValue: 'TechCorp Industries', required: false, width: 'full' },
      { id: '6', label: 'Subject', type: 'select', placeholder: 'Select a topic', defaultValue: 'Partnership', required: true, options: ['General Inquiry', 'Sales', 'Support', 'Partnership', 'Other'], width: 'full' },
      { id: '7', label: 'Message', type: 'textarea', placeholder: 'Tell us how we can help you...', defaultValue: 'I am interested in discussing a potential partnership between our companies. We have been impressed with your recent product launches and believe there could be significant synergy. Please contact me at your earliest convenience to schedule a meeting.', required: true, width: 'full' },
      { id: '8', label: 'Subscribe to newsletter', type: 'checkbox', defaultValue: 'true', required: false, width: 'full' },
    ],
    submitButtonText: 'Send Message',
    privacyNote: 'By submitting this form, you agree to our Privacy Policy.',
    requiredFieldNote: '* Required fields',
    thankYouMessage: 'Thank you for reaching out! We\'ll be in touch soon.',
  };
}

/**
 * Get registration form data
 */
export function getDefaultRegistrationFormData(): FormInputData {
  return {
    companyName: 'TechConf 2024',
    formTitle: 'Registration Form',
    formDescription: 'Join us for the biggest tech conference of the year! Register below to secure your spot.',
    eventName: 'TechConf 2024 - Innovation Summit',
    eventDate: 'March 15-17, 2024',
    eventLocation: 'San Francisco Convention Center',
    registrationTypes: [
      { id: '1', name: 'Standard Pass', price: 299, description: 'Full conference access' },
      { id: '2', name: 'VIP Pass', price: 599, description: 'Priority seating + networking dinner' },
      { id: '3', name: 'Virtual Pass', price: 99, description: 'Online streaming access' },
    ],
    fields: [
      { id: '1', label: 'First Name', type: 'text', placeholder: 'Enter first name', defaultValue: 'Emily', required: true, width: 'half' },
      { id: '2', label: 'Last Name', type: 'text', placeholder: 'Enter last name', defaultValue: 'Rodriguez', required: true, width: 'half' },
      { id: '3', label: 'Email Address', type: 'email', placeholder: 'your@email.com', defaultValue: 'emily.rodriguez@innovate.io', required: true, width: 'half' },
      { id: '4', label: 'Phone Number', type: 'phone', placeholder: '(555) 000-0000', defaultValue: '(555) 234-5678', required: false, width: 'half' },
      { id: '5', label: 'Company/Organization', type: 'text', placeholder: 'Your company', defaultValue: 'Innovate Solutions', required: false, width: 'half' },
      { id: '6', label: 'Job Title', type: 'text', placeholder: 'Your role', defaultValue: 'Product Manager', required: false, width: 'half' },
      { id: '7', label: 'Dietary Requirements', type: 'checkbox', defaultValue: 'Vegetarian', required: false, options: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Kosher', 'Halal', 'None'], groupName: 'dietary' },
      { id: '8', label: 'Special Accommodations', type: 'textarea', placeholder: 'Any accessibility needs or special requests?', defaultValue: 'Wheelchair accessible seating preferred. Will need assistance with stairs if any.', required: false, width: 'full' },
      { id: '9', label: 'How did you hear about us?', type: 'select', defaultValue: 'Colleague', options: ['Social Media', 'Email', 'Colleague', 'Website', 'Other'], required: false, width: 'full' },
    ],
    sections: [
      { id: 'personal', title: 'Personal Information', fieldIds: ['1', '2', '3', '4'] },
      { id: 'professional', title: 'Professional Information', fieldIds: ['5', '6'] },
      { id: 'preferences', title: 'Preferences', fieldIds: ['7', '8', '9'] },
    ],
    submitButtonText: 'Complete Registration',
    requiredFieldNote: '* Required fields',
    privacyNote: 'Your information is secure and will only be used for event communications.',
  };
}

/**
 * Get feedback form data
 */
export function getDefaultFeedbackFormData(): FormInputData {
  return {
    companyName: 'CloudSync Software',
    formTitle: 'Customer Feedback',
    formDescription: 'Your feedback helps us improve! Please take a moment to share your experience.',
    productName: 'CloudSync Pro',
    satisfactionOptions: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied'],
    fields: [
      { id: '1', label: 'Overall Satisfaction', type: 'radio', defaultValue: 'Satisfied', required: true, options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied'], groupName: 'satisfaction' },
      { id: '2', label: 'Would you recommend us?', type: 'radio', defaultValue: 'Probably', required: true, options: ['Definitely', 'Probably', 'Maybe', 'Probably Not', 'Definitely Not'], groupName: 'recommend' },
      { id: '3', label: 'What do you like most about our product?', type: 'textarea', placeholder: 'Tell us what you love...', defaultValue: 'The user interface is intuitive and the sync speed is impressive. I especially appreciate the real-time collaboration features.', required: false, width: 'full' },
      { id: '4', label: 'What could we improve?', type: 'textarea', placeholder: 'Share your suggestions...', defaultValue: 'Would love to see better offline support and a dark mode option for the desktop app.', required: false, width: 'full' },
      { id: '5', label: 'How long have you been using our product?', type: 'select', defaultValue: '6-12 months', options: ['Less than 1 month', '1-6 months', '6-12 months', '1-2 years', 'More than 2 years'], required: false, width: 'full' },
      { id: '6', label: 'Name (Optional)', type: 'text', placeholder: 'Your name', defaultValue: 'David Chen', required: false, width: 'half' },
      { id: '7', label: 'Email (Optional)', type: 'email', placeholder: 'your@email.com', defaultValue: 'david.chen@startup.com', required: false, width: 'half' },
      { id: '8', label: 'May we contact you about your feedback?', type: 'checkbox', defaultValue: 'true', required: false },
    ],
    submitButtonText: 'Submit Feedback',
    requiredFieldNote: '* Required fields',
    thankYouMessage: 'Thank you for your valuable feedback!',
  };
}

// ============================================
// LETTERHEAD INPUT DATA TYPES
// ============================================

/**
 * Letterhead style variants
 */
export type LetterheadStyle = 'corporate' | 'personal' | 'minimalist';

/**
 * Complete letterhead input data
 */
export interface LetterheadInputData {
  // Company/Personal info (corporate uses company name, personal uses your name)
  companyName: string;
  tagline?: string;
  address: string;
  cityStateZip?: string; // For personal style: separate city/state line
  phone: string;
  email: string;
  website?: string;
  // Letter content
  date: string;
  recipientName: string;
  recipientTitle?: string;
  recipientCompany?: string;
  recipientAddress?: string;
  salutation: string;
  bodyParagraphs: (string | { id?: string; text: string })[];
  closing: string;
  senderName: string;
  senderTitle?: string;
  // Style-specific
  headerAlignment?: 'left' | 'center' | 'right'; // Personal uses center
}

/**
 * Get default corporate letterhead data
 */
export function getDefaultLetterheadData(): LetterheadInputData {
  return {
    companyName: 'ACME Corporation',
    tagline: 'Excellence in Every Detail',
    address: '123 Business Ave, Suite 100\nNew York, NY 10001',
    phone: '(555) 123-4567',
    email: 'info@acmecorp.com',
    website: 'www.acmecorp.com',
    date: '2024-12-25',
    recipientName: 'John Doe',
    recipientTitle: 'Director of Operations',
    recipientCompany: 'Client Corp',
    recipientAddress: '456 Client Street\nBoston, MA 02101',
    salutation: 'Dear Mr. Doe,',
    bodyParagraphs: [
      { id: '1', text: 'I am writing to discuss our upcoming partnership and the exciting opportunities it presents for both organizations. Our team has been impressed with your company\'s innovative approach and market leadership.' },
      { id: '2', text: 'Our team has been working diligently to prepare the project proposal, and we believe the collaboration will bring significant value to your operations. The attached documentation outlines our proposed timeline and deliverables.' },
      { id: '3', text: 'I look forward to scheduling a meeting to discuss the details further. Please let me know your availability for next week, and I will arrange a time that works for both parties.' },
    ],
    closing: 'Sincerely,',
    senderName: 'Jane Smith',
    senderTitle: 'Chief Executive Officer',
    headerAlignment: 'left',
  };
}

/**
 * Get personal letterhead data
 */
export function getDefaultPersonalLetterheadData(): LetterheadInputData {
  return {
    companyName: 'John Smith',
    address: '456 Oak Street, Apt 12B\nBoston, MA 02101',
    phone: '(555) 987-6543',
    email: 'john.smith@email.com',
    date: '2024-12-25',
    recipientName: 'Dear Friend',
    recipientAddress: '789 Maple Lane\nCambridge, MA 02139',
    salutation: 'Dear Friend,',
    bodyParagraphs: [
      { id: '1', text: 'I hope this letter finds you well. It has been a while since we last connected, and I wanted to reach out to share some exciting news about the upcoming holiday season.' },
      { id: '2', text: 'I recently had the opportunity to reflect on our friendship and the many memories we have shared over the years. Your support has meant so much to me, and I am grateful for everything.' },
      { id: '3', text: 'I would love to catch up soon. Perhaps we could meet for coffee next week or arrange a video call at your convenience. Let me know what works best for you.' },
    ],
    closing: 'Warm regards,',
    senderName: 'John Smith',
    headerAlignment: 'center',
  };
}

/**
 * Get minimalist letterhead data
 */
export function getDefaultMinimalistLetterheadData(): LetterheadInputData {
  return {
    companyName: 'Modern Studio',
    address: '789 Design District, Floor 5\nLos Angeles, CA 90001',
    phone: '(555) 456-7890',
    email: 'hello@modernstudio.com',
    website: 'modernstudio.com',
    date: '2024-12-25',
    recipientName: 'Creative Team',
    recipientCompany: 'Innovation Labs',
    recipientAddress: '321 Tech Boulevard\nSan Francisco, CA 94102',
    salutation: 'Hello,',
    bodyParagraphs: [
      { id: '1', text: 'Thank you for reaching out regarding the upcoming project collaboration. We are excited about the potential to work together and create something truly remarkable.' },
      { id: '2', text: 'Our team specializes in creating elegant, user-focused designs that drive engagement and deliver measurable results. We believe our approach aligns well with your vision for the project.' },
      { id: '3', text: 'Let us schedule a call this week to discuss the project scope and timeline in detail. I am available Tuesday through Thursday afternoons.' },
    ],
    closing: 'Best,',
    senderName: 'Alex Designer',
    senderTitle: 'Creative Director',
    headerAlignment: 'left',
  };
}

// ============================================
// CERTIFICATE INPUT DATA TYPES
// ============================================

/**
 * Certificate style variants
 */
export type CertificateStyle = 'achievement' | 'completion' | 'award';

/**
 * Certificate signature
 */
export interface CertificateSignature {
  id: string;
  name: string;
  title: string;
}

/**
 * Complete certificate input data
 */
export interface CertificateInputData {
  // Organization
  organizationName: string;
  organizationLogo?: string;
  // Certificate details
  certificateTitle: string;
  certificateSubtitle?: string;
  presentationText: string;
  recipientName: string;
  achievementText: string;
  achievementDescription?: string;
  date: string;
  // Completion-specific fields
  courseName?: string;
  hoursCompleted?: number;
  instructorName?: string;
  // Award-specific fields
  eventName?: string;
  awardTitle?: string;  // e.g., "First Place", "Gold Medal"
  category?: string;    // e.g., "Best Innovation", "Excellence in Design"
  // Signatures
  signatures: CertificateSignature[];
  // Optional
  certificateNumber?: string;
  validUntil?: string;
  // Style options
  borderStyle?: 'single' | 'double' | 'ornate';
  accentColor?: string;
}

/**
 * Get default achievement certificate data
 */
export function getDefaultCertificateData(): CertificateInputData {
  return {
    organization: 'Excellence Academy',
    organizationName: 'Excellence Academy',
    title: 'CERTIFICATE',
    certificateTitle: 'CERTIFICATE',
    subtitle: 'OF ACHIEVEMENT',
    certificateSubtitle: 'OF ACHIEVEMENT',
    presentationText: 'This certificate is proudly presented to',
    recipientName: 'John Doe',
    recognitionText: 'in recognition of',
    achievement: 'Outstanding Performance',
    achievementText: 'Outstanding Performance',
    description: 'In recognition of exceptional dedication and excellence in completing the Advanced Leadership Program with distinction.',
    achievementDescription: 'In recognition of exceptional dedication and excellence in completing the Advanced Leadership Program with distinction.',
    date: '2024-12-25',
    signatures: [
      { id: '1', name: 'Dr. Sarah Johnson', title: 'Director' },
      { id: '2', name: 'Michael Chen', title: 'Program Coordinator' },
    ],
    certificateNumber: 'CERT-2024-001',
    borderStyle: 'single',
  };
}

/**
 * Get completion certificate data
 */
export function getDefaultCompletionCertificateData(): CertificateInputData {
  return {
    organization: 'Learning Institute',
    organizationName: 'Learning Institute',
    title: 'Certificate of Completion',
    certificateTitle: 'Certificate of Completion',
    presentationText: 'This is to certify that',
    recipientName: 'Jane Smith',
    recognitionText: 'has successfully completed',
    achievement: 'Advanced Web Development Course',
    achievementText: 'has successfully completed',
    courseName: 'Advanced Web Development',
    hours: 40,
    hoursCompleted: 40,
    description: 'Completed 40 hours of comprehensive instruction covering React, Node.js, and modern web technologies.',
    achievementDescription: 'Completed 40 hours of comprehensive instruction covering React, Node.js, and modern web technologies.',
    date: '2024-12-25',
    instructorName: 'Prof. David Wilson',
    signatures: [
      { id: '1', name: 'Prof. David Wilson', title: 'Instructor' },
      { id: '2', name: 'Dr. Emily Brown', title: 'Program Director' },
    ],
    certificateNumber: 'COMP-2024-0128',
    borderStyle: 'single',
    accentColor: '#059669',
  };
}

/**
 * Get award certificate data
 */
export function getDefaultAwardCertificateData(): CertificateInputData {
  return {
    organization: 'Global Innovation Summit',
    organizationName: 'Global Innovation Summit',
    eventName: 'Innovation Challenge 2024',
    title: 'AWARD',
    certificateTitle: 'AWARD',
    subtitle: 'FIRST PLACE',
    awardTitle: 'First Place',
    presentationText: 'Proudly Presents',
    recipientName: 'Team Alpha',
    recognitionText: 'for excellence in',
    achievement: 'First Place - Best Innovation',
    achievementText: 'First Place',
    category: 'Best Innovation',
    description: 'For outstanding innovation in sustainable technology solutions that address climate change challenges.',
    achievementDescription: 'For outstanding innovation in sustainable technology solutions that address climate change challenges.',
    date: '2024-12-25',
    signatures: [
      { id: '1', name: 'Alexandra Rivera', title: 'Event Organizer' },
      { id: '2', name: 'Dr. Marcus Chen', title: 'Head Judge' },
    ],
    certificateNumber: 'AWD-2024-GOLD',
    borderStyle: 'double',
    accentColor: '#7c3aed',
  };
}

// ============================================
// LABEL INPUT DATA TYPES
// ============================================

/**
 * Label style variants
 */
export type LabelStyle = 'shipping' | 'mailing' | 'product';

/**
 * Complete label input data
 */
export interface LabelInputData {
  // For shipping/mailing labels - Sender info
  companyName?: string;
  companyLogo?: string;
  fromName?: string;
  fromAddress: string;
  fromCity?: string;
  fromState?: string;
  fromZip?: string;
  fromCountry?: string;
  fromPhone?: string;
  // Recipient info
  toName: string;
  toCompany?: string;
  toAddress: string;
  toCity?: string;
  toState?: string;
  toZip?: string;
  toCountry?: string;
  toPhone?: string;
  // Shipping specific
  trackingNumber?: string;
  weight?: string;
  dimensions?: string;  // e.g., "12x8x6 in"
  shippingMethod?: string;
  carrier?: string;  // e.g., "UPS", "FedEx", "USPS"
  serviceType?: string;  // e.g., "Ground", "2-Day", "Overnight"
  shipDate?: string;
  deliveryDate?: string;
  // Package info
  packageCount?: string;  // e.g., "1 of 3"
  referenceNumber?: string;
  poNumber?: string;  // Purchase order
  // Product label specific
  brandName?: string;
  productName?: string;
  productDescription?: string;
  barcode?: string;
  sku?: string;
  upc?: string;
  price?: string;
  salePrice?: string;
  quantity?: string;
  lotNumber?: string;
  expirationDate?: string;
  madeIn?: string;  // Country of origin
  ingredients?: string[];
  warnings?: string[];
  // Common
  priority?: 'standard' | 'express' | 'overnight';
  fragile?: boolean;
  handleWithCare?: boolean;
  keepDry?: boolean;
  thisWayUp?: boolean;
  // Customs (international)
  customsValue?: string;
  customsDescription?: string;
  hsCode?: string;
}

/**
 * Get default shipping label data
 */
export function getDefaultLabelData(): LabelInputData {
  return {
    companyName: 'TechGadgets Inc.',
    fromName: 'TechGadgets Fulfillment Center',
    fromAddress: '123 Warehouse Blvd\nColumbus, OH 43215\nUSA',
    fromCity: 'Columbus',
    fromState: 'OH',
    fromZip: '43215',
    fromCountry: 'USA',
    fromPhone: '(614) 555-0100',
    toName: 'Sarah Johnson',
    toAddress: '456 Maple Avenue, Apt 7B\nPortland, OR 97201\nUSA',
    toCity: 'Portland',
    toState: 'OR',
    toZip: '97201',
    toCountry: 'USA',
    toPhone: '(503) 555-0199',
    trackingNumber: '1Z999AA10123456784',
    weight: '2.5 lbs',
    dimensions: '12x8x6 in',
    shippingMethod: 'Ground',
    carrier: 'UPS',
    serviceType: 'Standard',
    specialInstructions: 'Leave at front door if no answer',
    shipDate: '2024-12-25',
    priority: 'standard',
    fragile: false,
    referenceNumber: 'ORD-2024-78542',
  };
}

/**
 * Get mailing label data
 */
export function getDefaultMailingLabelData(): LabelInputData {
  return {
    companyName: 'Smith & Associates',
    fromName: 'Jennifer Smith, Attorney at Law',
    fromAddress: '789 Business Park Drive, Suite 300\nChicago, IL 60601',
    fromCity: 'Chicago',
    fromState: 'IL',
    fromZip: '60601',
    toName: 'Mr. Robert Williams',
    toCompany: 'Williams Consulting Group',
    toAddress: '321 Corporate Plaza, Floor 15\nNew York, NY 10001',
    toCity: 'New York',
    toState: 'NY',
    toZip: '10001',
    trackingNumber: 'USPS-7890-1234-5678',
    weight: '0.5 lbs',
    carrier: 'USPS',
    serviceType: 'Priority',
    specialInstructions: 'Confidential - Deliver to addressee only',
    priority: 'standard',
  };
}

/**
 * Get product label data
 */
export function getDefaultProductLabelData(): LabelInputData {
  return {
    brandName: 'NATURELUX',
    productName: 'Organic Lavender Essential Oil',
    productDescription: 'Pure therapeutic grade essential oil. Steam distilled from organic lavender flowers.',
    price: '$24.99',
    salePrice: '$19.99',
    sku: 'NLX-LAV-30ML',
    upc: '012345678901',
    barcode: '012345678901',
    quantity: '30 ml / 1 fl oz',
    lotNumber: 'LOT-2024-1205',
    expirationDate: '12/2026',
    madeIn: 'France',
    ingredients: ['100% Pure Lavandula Angustifolia Oil'],
    warnings: ['For external use only', 'Keep out of reach of children', 'Avoid contact with eyes'],
    fromName: 'NatureLux Co.',
    fromAddress: '555 Wellness Way\nBoulder, CO 80301',
    toName: 'Retail Customer',
    toAddress: 'Various Locations',
    carrier: 'Other',
    serviceType: 'Standard',
    weight: '0.2 lbs',
    specialInstructions: 'Store in cool, dry place',
  };
}

// ============================================
// COVER LETTER INPUT DATA TYPES
// ============================================

/**
 * Cover letter style variants
 */
export type CoverLetterStyle = 'professional' | 'creative' | 'entry-level';

/**
 * Skill or highlight bullet for cover letters
 */
export interface CoverLetterBullet {
  id: string;
  text: string;
}

/**
 * Complete cover letter input data
 */
export interface CoverLetterInputData {
  // Personal info
  yourName: string;
  yourEmail: string;
  yourPhone: string;
  yourAddress?: string;
  linkedIn?: string;
  portfolio?: string;
  website?: string;
  // Creative-specific
  tagline?: string;  // e.g., "Designer & Creative Thinker"
  // Entry-level specific
  degree?: string;
  university?: string;
  graduationYear?: string;
  // Date
  date: string;
  // Recipient info
  hiringManagerName: string;
  hiringManagerTitle?: string;
  companyName: string;
  companyAddress?: string;
  departmentName?: string;
  // Position
  positionTitle: string;
  jobReferenceNumber?: string;
  whereFoundJob?: string;  // e.g., "LinkedIn", "Company website"
  // Letter content
  salutation?: string;  // e.g., "Dear Ms. Doe,", "Hey Team!"
  openingParagraph: string;
  bodyParagraphs: string[];
  // Skills/highlights (for creative style with bullet points)
  keySkills?: CoverLetterBullet[];
  whyCompanyParagraph?: string;  // Why interested in this company
  closingParagraph: string;
  // Signature
  closing: string;
  // Style options
  showContactInHeader?: boolean;
  accentColor?: string;
}

/**
 * Get default professional cover letter data
 */
export function getDefaultCoverLetterData(): CoverLetterInputData {
  return {
    yourName: 'John Smith',
    email: 'john.smith@email.com',
    yourEmail: 'john.smith@email.com',
    phone: '(555) 123-4567',
    yourPhone: '(555) 123-4567',
    yourAddress: '123 Main Street, New York, NY 10001',
    linkedin: 'linkedin.com/in/johnsmith',
    linkedIn: 'linkedin.com/in/johnsmith',
    portfolio: 'johnsmith.dev',
    date: '2024-12-25',
    hiringManager: 'Ms. Jane Doe',
    hiringManagerName: 'Ms. Jane Doe',
    hiringManagerTitle: 'Hiring Manager',
    company: 'Tech Innovations Inc.',
    companyName: 'Tech Innovations Inc.',
    companyAddress: '456 Tech Ave, San Francisco, CA 94102',
    position: 'Senior Software Engineer',
    positionTitle: 'Senior Software Engineer',
    salutation: 'Dear Ms. Doe,',
    opening: 'I am writing to express my strong interest in the Senior Software Engineer position at Tech Innovations Inc. With over 8 years of experience in full-stack development and a passion for building scalable applications, I am confident I would be a valuable addition to your team.',
    openingParagraph: 'I am writing to express my strong interest in the Senior Software Engineer position at Tech Innovations Inc. With over 8 years of experience in full-stack development and a passion for building scalable applications, I am confident I would be a valuable addition to your team.',
    keyPoints: ['Led development of microservices architecture serving 2M+ users', 'Reduced API response times by 40% through optimization', 'Mentored team of 5 junior developers', 'Expert in React, Node.js, and cloud technologies'],
    experienceSummary: 'In my current role at StartupXYZ, I led the development of a microservices architecture that now serves over 2 million users. I reduced API response times by 40% through strategic optimization and mentored a team of 5 junior developers.',
    bodyParagraphs: [
      'In my current role at StartupXYZ, I led the development of a microservices architecture that now serves over 2 million users.',
      'I am particularly drawn to Tech Innovations Inc. because of your commitment to using technology to solve real-world problems.',
    ],
    whyCompany: 'I am particularly drawn to Tech Innovations Inc. because of your commitment to using technology to solve real-world problems. Your recent work on AI-powered healthcare solutions aligns perfectly with my interest in impactful technology.',
    whyCompanyParagraph: 'I am particularly drawn to Tech Innovations Inc. because of your commitment to using technology to solve real-world problems. Your recent work on AI-powered healthcare solutions aligns perfectly with my interest in impactful technology.',
    closing: 'I would welcome the opportunity to discuss how my skills and experience align with your needs. Thank you for considering my application.',
    closingParagraph: 'I would welcome the opportunity to discuss how my skills and experience align with your needs. Thank you for considering my application.',
    signOff: 'Sincerely,',
    showContactInHeader: false,
  };
}

/**
 * Get creative cover letter data
 */
export function getDefaultCreativeCoverLetterData(): CoverLetterInputData {
  return {
    yourName: 'Alex Creative',
    email: 'alex@creative.io',
    yourEmail: 'alex@creative.io',
    phone: '(555) 234-5678',
    yourPhone: '(555) 234-5678',
    portfolio: 'alexcreative.io',
    linkedin: 'linkedin.com/in/alexcreative',
    linkedIn: 'linkedin.com/in/alexcreative',
    tagline: 'Designer & Creative Thinker',
    date: '2024-12-25',
    hiringManager: 'Creative Team',
    hiringManagerName: 'Creative Team',
    company: 'Dream Company',
    companyName: 'Dream Company',
    position: 'Senior Designer',
    positionTitle: 'Senior Designer',
    salutation: 'Hey Dream Company Team!',
    opening: 'I am thrilled about the opportunity to join your team as a Senior Designer. Your company\'s innovative approach and creative culture align perfectly with my passion and expertise.',
    openingParagraph: 'I am thrilled about the opportunity to join your team as a Senior Designer. Your company\'s innovative approach and creative culture align perfectly with my passion and expertise.',
    keyPoints: ['Creative problem-solving with a user-first mindset', 'Strong visual design skills across multiple platforms', 'Experience collaborating with cross-functional teams', 'Passion for pushing creative boundaries'],
    keySkills: [
      { id: '1', text: 'Creative problem-solving with a user-first mindset' },
      { id: '2', text: 'Strong visual design skills across multiple platforms' },
      { id: '3', text: 'Experience collaborating with cross-functional teams' },
      { id: '4', text: 'Passion for pushing creative boundaries' },
    ],
    experienceSummary: 'Over the past 6 years, I\'ve led design initiatives for brands ranging from startups to Fortune 500 companies. My work has resulted in a 45% increase in user engagement and multiple design awards.',
    bodyParagraphs: [
      'Over the past 6 years, I\'ve led design initiatives for brands ranging from startups to Fortune 500 companies.',
    ],
    whyCompany: 'I\'ve been following Dream Company\'s work for years, and I\'m constantly inspired by how you blend innovation with user-centric design. The recent rebrand project was particularly impressive.',
    whyCompanyParagraph: 'I\'ve been following Dream Company\'s work for years, and I\'m constantly inspired by how you blend innovation with user-centric design. The recent rebrand project was particularly impressive.',
    closing: 'I would love to chat about how I can contribute to Dream Company\'s continued success. Let\'s create something amazing together!',
    closingParagraph: 'I would love to chat about how I can contribute to Dream Company\'s continued success. Let\'s create something amazing together!',
    signOff: 'Creatively yours,',
    showContactInHeader: true,
    accentColor: '#7c3aed',
  };
}

/**
 * Get entry-level cover letter data
 */
export function getDefaultEntryLevelCoverLetterData(): CoverLetterInputData {
  return {
    yourName: 'Jane Graduate',
    email: 'jane.graduate@email.com',
    yourEmail: 'jane.graduate@email.com',
    phone: '(555) 789-0123',
    yourPhone: '(555) 789-0123',
    linkedin: 'linkedin.com/in/janegraduate',
    linkedIn: 'linkedin.com/in/janegraduate',
    portfolio: 'janegraduate.github.io',
    tagline: 'Computer Science Graduate',
    degree: 'Bachelor of Science in Computer Science',
    university: 'State University',
    graduationYear: '2024',
    date: '2024-12-25',
    hiringManager: 'Hiring Manager',
    hiringManagerName: 'Hiring Manager',
    company: 'Target Company',
    companyName: 'Target Company',
    position: 'Junior Developer',
    positionTitle: 'Junior Developer',
    salutation: 'Dear Hiring Manager,',
    opening: 'I am excited to apply for the Junior Developer position at Target Company. As a recent graduate with a Bachelor of Science in Computer Science from State University, I am eager to start my career and contribute to your team.',
    openingParagraph: 'I am excited to apply for the Junior Developer position at Target Company. As a recent graduate with a Bachelor of Science in Computer Science from State University, I am eager to start my career and contribute to your team.',
    keyPoints: ['Built a full-stack e-commerce application using React and Node.js', 'Completed a summer internship at TechStart Inc.', 'Led a team project developing a mobile app for campus events', 'Strong foundation in data structures and algorithms'],
    keySkills: [
      { id: '1', text: 'Built a full-stack e-commerce application using React and Node.js' },
      { id: '2', text: 'Completed a summer internship at TechStart Inc.' },
      { id: '3', text: 'Led a team project developing a mobile app for campus events' },
    ],
    experienceSummary: 'During my studies, I developed a strong foundation in software development principles, data structures, and algorithms. Through coursework, projects, and internships, I have gained practical experience in modern web technologies including React, Node.js, and Python.',
    bodyParagraphs: [
      'During my studies, I developed a strong foundation in software development principles, data structures, and algorithms.',
    ],
    whyCompany: 'I am particularly drawn to Target Company because of your commitment to mentoring new developers and your innovative products. I am confident that my enthusiasm, work ethic, and willingness to learn would make me a valuable addition to your team.',
    whyCompanyParagraph: 'I am particularly drawn to Target Company because of your commitment to mentoring new developers and your innovative products. I am confident that my enthusiasm, work ethic, and willingness to learn would make me a valuable addition to your team.',
    closing: 'Thank you for considering my application. I would welcome the opportunity to discuss how I can contribute to Target Company. I look forward to hearing from you.',
    closingParagraph: 'Thank you for considering my application. I would welcome the opportunity to discuss how I can contribute to Target Company. I look forward to hearing from you.',
    signOff: 'Best regards,',
    showContactInHeader: true,
    accentColor: '#10b981',
  };
}

// ============================================
// UNIFIED INPUT SCHEMA TYPE
// ============================================

/**
 * All supported input schema types
 */
export type InputSchemaType =
  | 'resume'
  | 'invoice'
  | 'form'
  | 'letterhead'
  | 'certificate'
  | 'label'
  | 'coverLetter';

/**
 * Style type mapping
 */
export type StyleType =
  | ResumeStyle
  | InvoiceStyle
  | FormStyle
  | LetterheadStyle
  | CertificateStyle
  | LabelStyle
  | CoverLetterStyle;

/**
 * Union of all input data types
 */
export type AnyInputData =
  | ResumeInputData
  | InvoiceInputData
  | FormInputData
  | LetterheadInputData
  | CertificateInputData
  | LabelInputData
  | CoverLetterInputData;

/**
 * Generic AI Template Definition
 */
export interface GenericAITemplateDefinition {
  style: StyleType;
  layoutPreset: LayoutPreset;
  colorScheme: AIColorScheme;
  typography: AITypography;
  sections: {
    header?: string[];
    main?: string[];
    sidebar?: string[];
    footer?: string[];
  };
}

/**
 * Generic AI Template Metadata
 */
export interface GenericAITemplateMetadata {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  thumbnail?: string;
  tags: string[];
  isPremium: boolean;
  version: number;
  author?: string;
  createdAt: string;
  generationMode: 'ai-generated';
  inputSchema: InputSchemaType;
  aiDefinition: GenericAITemplateDefinition;
}
