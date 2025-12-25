/**
 * Resume Field Definitions
 * Schema for collecting resume data in PlaceholderEditorModal
 */

import type { ResumeInputData } from './templates';

export type ResumeFieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'url'
  | 'multiline'
  | 'date'
  | 'list'
  | 'entries';

export interface ResumeEntryField {
  key: string;
  label: string;
  type: 'text' | 'multiline' | 'date' | 'select';
  required?: boolean;
  placeholder?: string;
  options?: string[]; // For select type
}

export interface ResumeEntrySchema {
  fields: ResumeEntryField[];
}

export interface ResumeFieldDefinition {
  id: string;
  key: keyof ResumeInputData;
  label: string;
  type: ResumeFieldType;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  entrySchema?: ResumeEntrySchema;
}

export interface ResumeFieldSection {
  id: string;
  label: string;
  fields: string[];
}

/**
 * Complete resume input schema
 */
export const RESUME_INPUT_SCHEMA: ResumeFieldDefinition[] = [
  // Personal Information
  {
    id: 'fullName',
    key: 'fullName',
    label: 'Full Name',
    type: 'text',
    required: true,
    placeholder: 'John Smith',
  },
  {
    id: 'jobTitle',
    key: 'jobTitle',
    label: 'Job Title',
    type: 'text',
    required: true,
    placeholder: 'Software Engineer',
  },
  {
    id: 'email',
    key: 'email',
    label: 'Email',
    type: 'email',
    required: true,
    placeholder: 'john@example.com',
  },
  {
    id: 'phone',
    key: 'phone',
    label: 'Phone',
    type: 'phone',
    placeholder: '+1 (555) 123-4567',
  },
  {
    id: 'address',
    key: 'address',
    label: 'Location',
    type: 'text',
    placeholder: 'New York, NY',
  },
  {
    id: 'linkedIn',
    key: 'linkedIn',
    label: 'LinkedIn',
    type: 'url',
    placeholder: 'linkedin.com/in/johnsmith',
  },
  {
    id: 'website',
    key: 'website',
    label: 'Website/Portfolio',
    type: 'url',
    placeholder: 'www.johnsmith.dev',
  },

  // Profile Summary
  {
    id: 'profileSummary',
    key: 'profileSummary',
    label: 'Profile Summary',
    type: 'multiline',
    maxLength: 500,
    placeholder: 'A brief overview of your professional background and career objectives...',
  },

  // Work Experience
  {
    id: 'workExperience',
    key: 'workExperience',
    label: 'Work Experience',
    type: 'entries',
    minItems: 0,
    maxItems: 5,
    entrySchema: {
      fields: [
        { key: 'title', label: 'Job Title', type: 'text', required: true, placeholder: 'Senior Developer' },
        { key: 'company', label: 'Company', type: 'text', required: true, placeholder: 'Tech Corp' },
        { key: 'location', label: 'Location', type: 'text', placeholder: 'San Francisco, CA' },
        { key: 'startDate', label: 'Start Date', type: 'text', required: true, placeholder: 'Jan 2020' },
        { key: 'endDate', label: 'End Date', type: 'text', placeholder: 'Present' },
        { key: 'achievements', label: 'Key Achievements (one per line)', type: 'multiline', placeholder: 'Led a team of 5 developers\nIncreased performance by 40%' },
      ],
    },
  },

  // Education
  {
    id: 'education',
    key: 'education',
    label: 'Education',
    type: 'entries',
    minItems: 0,
    maxItems: 3,
    entrySchema: {
      fields: [
        { key: 'degree', label: 'Degree', type: 'text', required: true, placeholder: 'Bachelor of Science in Computer Science' },
        { key: 'institution', label: 'Institution', type: 'text', required: true, placeholder: 'MIT' },
        { key: 'startDate', label: 'Start Date', type: 'text', placeholder: 'Sep 2014' },
        { key: 'endDate', label: 'End Date', type: 'text', placeholder: 'Jun 2018' },
      ],
    },
  },

  // Skills
  {
    id: 'skills',
    key: 'skills',
    label: 'Skills',
    type: 'list',
    minItems: 1,
    maxItems: 15,
    placeholder: 'Add a skill...',
  },

  // Languages
  {
    id: 'languages',
    key: 'languages',
    label: 'Languages',
    type: 'entries',
    minItems: 0,
    maxItems: 5,
    entrySchema: {
      fields: [
        { key: 'language', label: 'Language', type: 'text', required: true, placeholder: 'English' },
        {
          key: 'proficiency',
          label: 'Proficiency',
          type: 'select',
          required: true,
          options: ['Native', 'Fluent', 'Professional', 'Intermediate', 'Basic'],
        },
      ],
    },
  },

  // Hobbies
  {
    id: 'hobbies',
    key: 'hobbies',
    label: 'Hobbies & Interests',
    type: 'list',
    minItems: 0,
    maxItems: 8,
    placeholder: 'Add a hobby...',
  },
];

/**
 * Group fields by section for UI display
 */
export const RESUME_FIELD_SECTIONS: ResumeFieldSection[] = [
  {
    id: 'personal',
    label: 'Personal Information',
    fields: ['fullName', 'jobTitle', 'email', 'phone', 'address', 'linkedIn', 'website'],
  },
  {
    id: 'summary',
    label: 'Profile Summary',
    fields: ['profileSummary'],
  },
  {
    id: 'experience',
    label: 'Work Experience',
    fields: ['workExperience'],
  },
  {
    id: 'education',
    label: 'Education',
    fields: ['education'],
  },
  {
    id: 'skills',
    label: 'Skills & Languages',
    fields: ['skills', 'languages'],
  },
  {
    id: 'hobbies',
    label: 'Hobbies & Interests',
    fields: ['hobbies'],
  },
];

/**
 * Get field definition by ID
 */
export function getResumeField(fieldId: string): ResumeFieldDefinition | undefined {
  return RESUME_INPUT_SCHEMA.find((f) => f.id === fieldId);
}

/**
 * Validate required fields are filled
 */
export function validateResumeData(data: ResumeInputData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.fullName?.trim()) {
    errors.push('Full Name is required');
  }
  if (!data.jobTitle?.trim()) {
    errors.push('Job Title is required');
  }
  if (!data.email?.trim()) {
    errors.push('Email is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
