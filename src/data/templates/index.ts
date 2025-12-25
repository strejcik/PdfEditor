/**
 * Template Registry
 * Central export of all document templates
 */

import type { TemplateData, TemplateCategory, AnyTemplateData } from '../../types/templates';

// Invoice templates
import { professionalInvoiceTemplate } from './invoices/professionalInvoice';
import { freelancerInvoiceTemplate } from './invoices/freelancerInvoice';

// Resume templates
import { professionalResumeTemplate } from './resumes/professionalResume';

// Form templates
import { contactFormTemplate } from './forms/contactForm';
import { registrationFormTemplate } from './forms/registrationForm';

// Letterhead templates
import { corporateLetterheadTemplate } from './letterheads/corporateLetterhead';
import { personalLetterheadTemplate } from './letterheads/personalLetterhead';

// Certificate templates
import { achievementCertificateTemplate } from './certificates/achievementCertificate';
import { completionCertificateTemplate } from './certificates/completionCertificate';

// Label templates
import { mailingLabelTemplate } from './labels/mailingLabel';
import { shippingLabelTemplate } from './labels/shippingLabel';

// Cover Letter templates
import { professionalCoverLetterTemplate } from './coverLetters/professionalCoverLetter';
import { creativeCoverLetterTemplate } from './coverLetters/creativeCoverLetter';

// All templates registry (includes both static and AI-generated templates)
export const ALL_TEMPLATES: AnyTemplateData[] = [
  // Invoices
  professionalInvoiceTemplate,
  freelancerInvoiceTemplate,
  // Resumes
  professionalResumeTemplate,
  // Forms
  contactFormTemplate,
  registrationFormTemplate,
  // Letterheads
  corporateLetterheadTemplate,
  personalLetterheadTemplate,
  // Certificates
  achievementCertificateTemplate,
  completionCertificateTemplate,
  // Labels
  mailingLabelTemplate,
  shippingLabelTemplate,
  // Cover Letters
  professionalCoverLetterTemplate,
  creativeCoverLetterTemplate,
];

/**
 * Get templates filtered by category
 */
export function getTemplatesByCategory(category: TemplateCategory | 'all'): AnyTemplateData[] {
  if (category === 'all') return ALL_TEMPLATES;
  return ALL_TEMPLATES.filter((t) => t.metadata.category === category);
}

/**
 * Search templates by name, description, or tags
 */
export function searchTemplates(query: string): AnyTemplateData[] {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return ALL_TEMPLATES;

  return ALL_TEMPLATES.filter((t) =>
    t.metadata.name.toLowerCase().includes(lowerQuery) ||
    t.metadata.description.toLowerCase().includes(lowerQuery) ||
    t.metadata.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get only free templates
 */
export function getFreeTemplates(): AnyTemplateData[] {
  return ALL_TEMPLATES.filter((t) => !t.metadata.isPremium);
}

/**
 * Get only premium templates
 */
export function getPremiumTemplates(): AnyTemplateData[] {
  return ALL_TEMPLATES.filter((t) => t.metadata.isPremium);
}

/**
 * Get a template by ID
 */
export function getTemplateById(id: string): AnyTemplateData | undefined {
  return ALL_TEMPLATES.find((t) => t.metadata.id === id);
}
