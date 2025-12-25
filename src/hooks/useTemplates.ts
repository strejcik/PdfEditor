/**
 * useTemplates Hook
 * Manages template library state including filtering, search, preview, and placeholder editing
 * Supports both static templates and AI-generated templates for all categories
 */

import { useState, useCallback, useMemo } from 'react';
import type {
  TemplateData,
  TemplateCategory,
  PlaceholderValues,
  AnyTemplateData,
  ResumeInputData,
  InvoiceInputData,
  FormInputData,
  LetterheadInputData,
  CertificateInputData,
  LabelInputData,
  CoverLetterInputData,
  GenericAITemplateMetadata,
  InputSchemaType,
  AnyInputData,
} from '../types/templates';
import {
  isAITemplate,
  getDefaultResumeData,
  getDefaultInvoiceData,
  getDefaultFreelancerInvoiceData,
  getDefaultFormData,
  getDefaultRegistrationFormData,
  getDefaultFeedbackFormData,
  getDefaultLetterheadData,
  getDefaultPersonalLetterheadData,
  getDefaultMinimalistLetterheadData,
  getDefaultCertificateData,
  getDefaultCompletionCertificateData,
  getDefaultAwardCertificateData,
  getDefaultLabelData,
  getDefaultMailingLabelData,
  getDefaultProductLabelData,
  getDefaultCoverLetterData,
  getDefaultCreativeCoverLetterData,
  getDefaultEntryLevelCoverLetterData,
} from '../types/templates';
import { ALL_TEMPLATES, getTemplatesByCategory, searchTemplates } from '../data/templates';
import { generateResumeContent } from '../utils/ai/resumeGenerator';
import { generateInvoiceContent } from '../utils/ai/invoiceGenerator';
import { generateFormContent } from '../utils/ai/formGenerator';
import { generateLetterheadContent } from '../utils/ai/letterheadGenerator';
import { generateCertificateContent } from '../utils/ai/certificateGenerator';
import { generateLabelContent } from '../utils/ai/labelGenerator';
import { generateCoverLetterContent } from '../utils/ai/coverLetterGenerator';

export function useTemplates() {
  // UI State
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<AnyTemplateData | null>(null);
  const [isPlaceholderModalOpen, setIsPlaceholderModalOpen] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<AnyTemplateData | null>(null);
  const [placeholderValues, setPlaceholderValues] = useState<PlaceholderValues>({});

  // AI Template State - Generic input data
  const [inputData, setInputData] = useState<AnyInputData | null>(null);
  const [inputSchema, setInputSchema] = useState<InputSchemaType | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Filtered templates based on category and search
  const filteredTemplates = useMemo(() => {
    let templates = getTemplatesByCategory(selectedCategory);
    if (searchQuery.trim()) {
      const searchResults = searchTemplates(searchQuery);
      templates = templates.filter((t) => searchResults.includes(t));
    }
    return templates;
  }, [selectedCategory, searchQuery]);

  // All available categories
  const categories: (TemplateCategory | 'all')[] = [
    'all',
    'invoices',
    'resumes',
    'forms',
    'letterheads',
    'certificates',
    'labels',
    'coverLetters',
  ];

  // Open preview modal
  const openPreview = useCallback((template: AnyTemplateData) => {
    setPreviewTemplate(template);
  }, []);

  // Close preview modal
  const closePreview = useCallback(() => {
    setPreviewTemplate(null);
  }, []);

  // Get default input data based on schema and style
  const getDefaultInputData = useCallback((schema: InputSchemaType, style: string): AnyInputData => {
    switch (schema) {
      case 'resume':
        // All resume styles use the same default data
        return getDefaultResumeData();
      case 'invoice':
        if (style === 'freelancer') return getDefaultFreelancerInvoiceData();
        return getDefaultInvoiceData(); // professional, basic
      case 'form':
        if (style === 'registration') return getDefaultRegistrationFormData();
        if (style === 'feedback') return getDefaultFeedbackFormData();
        return getDefaultFormData(); // contact
      case 'letterhead':
        if (style === 'personal') return getDefaultPersonalLetterheadData();
        if (style === 'minimalist') return getDefaultMinimalistLetterheadData();
        return getDefaultLetterheadData(); // corporate
      case 'certificate':
        if (style === 'completion') return getDefaultCompletionCertificateData();
        if (style === 'award') return getDefaultAwardCertificateData();
        return getDefaultCertificateData(); // achievement
      case 'label':
        if (style === 'mailing') return getDefaultMailingLabelData();
        if (style === 'product') return getDefaultProductLabelData();
        return getDefaultLabelData(); // shipping
      case 'coverLetter':
        if (style === 'creative') return getDefaultCreativeCoverLetterData();
        if (style === 'entry-level') return getDefaultEntryLevelCoverLetterData();
        return getDefaultCoverLetterData(); // professional
      default:
        return getDefaultResumeData();
    }
  }, []);

  // Initiate template loading
  // For AI templates: opens input editor modal
  // For static templates with placeholders: opens placeholder editor
  // For static templates without placeholders: returns template directly
  const initiateTemplateLoad = useCallback((template: AnyTemplateData): TemplateData | null => {
    if (isAITemplate(template)) {
      // AI template - determine schema and open editor modal
      const aiMetadata = template.metadata as GenericAITemplateMetadata;
      const schema = aiMetadata.inputSchema;
      const style = aiMetadata.aiDefinition.style as string;

      setInputSchema(schema);
      setInputData(getDefaultInputData(schema, style));
      setPendingTemplate(template);
      setIsPlaceholderModalOpen(true);
      setGenerationError(null);
      return null;
    }

    // Static template - check for placeholders
    const staticTemplate = template as TemplateData;
    if (staticTemplate.metadata.placeholders && staticTemplate.metadata.placeholders.length > 0) {
      // Initialize placeholder values with defaults
      const initialValues: PlaceholderValues = {};
      staticTemplate.metadata.placeholders.forEach((p) => {
        initialValues[p.key] = p.defaultValue;
      });
      setPlaceholderValues(initialValues);
      setPendingTemplate(template);
      setIsPlaceholderModalOpen(true);
      return null;
    } else {
      // No placeholders, return template directly
      return staticTemplate;
    }
  }, [getDefaultInputData]);

  // Update a placeholder value (for static templates)
  const updatePlaceholderValue = useCallback((key: string, value: string) => {
    setPlaceholderValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Generic update input field function
  const updateInputField = useCallback(<T extends AnyInputData, K extends keyof T>(
    field: K,
    value: T[K]
  ) => {
    setInputData((prev) => prev ? { ...prev, [field]: value } as AnyInputData : null);
  }, []);

  // Type-specific update functions for convenience
  const updateResumeField = useCallback(<K extends keyof ResumeInputData>(
    field: K,
    value: ResumeInputData[K]
  ) => {
    updateInputField(field, value);
  }, [updateInputField]);

  const updateInvoiceField = useCallback(<K extends keyof InvoiceInputData>(
    field: K,
    value: InvoiceInputData[K]
  ) => {
    updateInputField(field, value);
  }, [updateInputField]);

  const updateFormField = useCallback(<K extends keyof FormInputData>(
    field: K,
    value: FormInputData[K]
  ) => {
    updateInputField(field, value);
  }, [updateInputField]);

  const updateLetterheadField = useCallback(<K extends keyof LetterheadInputData>(
    field: K,
    value: LetterheadInputData[K]
  ) => {
    updateInputField(field, value);
  }, [updateInputField]);

  const updateCertificateField = useCallback(<K extends keyof CertificateInputData>(
    field: K,
    value: CertificateInputData[K]
  ) => {
    updateInputField(field, value);
  }, [updateInputField]);

  const updateLabelField = useCallback(<K extends keyof LabelInputData>(
    field: K,
    value: LabelInputData[K]
  ) => {
    updateInputField(field, value);
  }, [updateInputField]);

  const updateCoverLetterField = useCallback(<K extends keyof CoverLetterInputData>(
    field: K,
    value: CoverLetterInputData[K]
  ) => {
    updateInputField(field, value);
  }, [updateInputField]);

  // Apply placeholder values and get final template content (static templates)
  const applyPlaceholders = useCallback((): TemplateData | null => {
    if (!pendingTemplate || isAITemplate(pendingTemplate)) return null;

    const staticTemplate = pendingTemplate as TemplateData;

    // Deep clone the template content
    const resolvedContent = JSON.parse(JSON.stringify(staticTemplate.content));

    // Replace placeholders in text
    const replacePlaceholders = (text: string): string => {
      let result = text;
      Object.entries(placeholderValues).forEach(([key, value]) => {
        // Escape special regex characters in key
        const escapedKey = key.replace(/[{}]/g, '\\$&');
        result = result.replace(new RegExp(escapedKey, 'g'), value);
      });
      return result;
    };

    // Process pages
    if (resolvedContent.pages) {
      resolvedContent.pages.forEach((page: any) => {
        if (page.textItems) {
          page.textItems = page.textItems.map((item: any) => ({
            ...item,
            text: replacePlaceholders(item.text),
          }));
        }
      });
    }

    // Process flat textItems
    if (resolvedContent.textItems) {
      resolvedContent.textItems = resolvedContent.textItems.map((item: any) => ({
        ...item,
        text: replacePlaceholders(item.text),
      }));
    }

    const resolvedTemplate: TemplateData = {
      ...staticTemplate,
      content: resolvedContent,
    };

    // Reset state
    setIsPlaceholderModalOpen(false);
    setPendingTemplate(null);
    setPlaceholderValues({});

    return resolvedTemplate;
  }, [pendingTemplate, placeholderValues]);

  // Generate AI template content based on the input schema
  // Accepts currentInputData as parameter to ensure we use the latest state (avoids stale closure)
  const generateAndApplyTemplate = useCallback(async (
    apiKey: string,
    currentInputData?: AnyInputData | null
  ): Promise<TemplateData | null> => {
    // Use passed inputData if provided (fresh from component), otherwise fall back to state
    const dataToUse = currentInputData !== undefined ? currentInputData : inputData;

    if (!pendingTemplate || !dataToUse || !inputSchema || !isAITemplate(pendingTemplate)) {
      return null;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      const aiMetadata = pendingTemplate.metadata as GenericAITemplateMetadata;
      let generatedContent;

      // Call the appropriate generator based on input schema
      switch (inputSchema) {
        case 'resume':
          generatedContent = await generateResumeContent(
            apiKey,
            dataToUse as ResumeInputData,
            aiMetadata.aiDefinition
          );
          break;
        case 'invoice':
          generatedContent = await generateInvoiceContent(
            apiKey,
            dataToUse as InvoiceInputData,
            aiMetadata.aiDefinition
          );
          break;
        case 'form':
          generatedContent = await generateFormContent(
            apiKey,
            dataToUse as FormInputData,
            aiMetadata.aiDefinition
          );
          break;
        case 'letterhead':
          generatedContent = await generateLetterheadContent(
            apiKey,
            dataToUse as LetterheadInputData,
            aiMetadata.aiDefinition
          );
          break;
        case 'certificate':
          generatedContent = await generateCertificateContent(
            apiKey,
            dataToUse as CertificateInputData,
            aiMetadata.aiDefinition
          );
          break;
        case 'label':
          generatedContent = await generateLabelContent(
            apiKey,
            dataToUse as LabelInputData,
            aiMetadata.aiDefinition
          );
          break;
        case 'coverLetter':
          generatedContent = await generateCoverLetterContent(
            apiKey,
            dataToUse as CoverLetterInputData,
            aiMetadata.aiDefinition
          );
          break;
        default:
          throw new Error(`Unknown input schema: ${inputSchema}`);
      }

      const resolvedTemplate: TemplateData = {
        metadata: {
          id: aiMetadata.id,
          name: aiMetadata.name,
          description: aiMetadata.description,
          category: aiMetadata.category,
          thumbnail: aiMetadata.thumbnail,
          tags: aiMetadata.tags,
          isPremium: aiMetadata.isPremium,
          version: aiMetadata.version,
          author: aiMetadata.author,
          createdAt: aiMetadata.createdAt,
          placeholders: [],
        },
        content: generatedContent,
      };

      // Reset state
      setIsPlaceholderModalOpen(false);
      setPendingTemplate(null);
      setInputData(null);
      setInputSchema(null);

      return resolvedTemplate;
    } catch (error: any) {
      setGenerationError(error.message || 'Failed to generate template');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [pendingTemplate, inputData, inputSchema]);

  // Cancel placeholder/input editing
  const cancelPlaceholderEdit = useCallback(() => {
    setIsPlaceholderModalOpen(false);
    setPendingTemplate(null);
    setPlaceholderValues({});
    setInputData(null);
    setInputSchema(null);
    setGenerationError(null);
  }, []);

  // Clear generation error
  const clearGenerationError = useCallback(() => {
    setGenerationError(null);
  }, []);

  // Reset all state
  const resetState = useCallback(() => {
    setSelectedCategory('all');
    setSearchQuery('');
    setPreviewTemplate(null);
    setIsPlaceholderModalOpen(false);
    setPendingTemplate(null);
    setPlaceholderValues({});
    setInputData(null);
    setInputSchema(null);
    setIsGenerating(false);
    setGenerationError(null);
  }, []);

  // Check if pending template is AI-generated
  const isPendingAITemplate = pendingTemplate ? isAITemplate(pendingTemplate) : false;

  // Legacy support: resumeInputData alias
  const resumeInputData = inputSchema === 'resume' ? inputData as ResumeInputData : null;
  const invoiceInputData = inputSchema === 'invoice' ? inputData as InvoiceInputData : null;
  const formInputData = inputSchema === 'form' ? inputData as FormInputData : null;
  const letterheadInputData = inputSchema === 'letterhead' ? inputData as LetterheadInputData : null;
  const certificateInputData = inputSchema === 'certificate' ? inputData as CertificateInputData : null;
  const labelInputData = inputSchema === 'label' ? inputData as LabelInputData : null;
  const coverLetterInputData = inputSchema === 'coverLetter' ? inputData as CoverLetterInputData : null;

  return {
    // State
    templates: filteredTemplates,
    allTemplates: ALL_TEMPLATES,
    categories,
    selectedCategory,
    searchQuery,
    previewTemplate,
    isPlaceholderModalOpen,
    pendingTemplate,
    placeholderValues,

    // AI Template State
    inputData,
    inputSchema,
    isGenerating,
    generationError,
    isPendingAITemplate,

    // Type-specific input data (for convenience)
    resumeInputData,
    invoiceInputData,
    formInputData,
    letterheadInputData,
    certificateInputData,
    labelInputData,
    coverLetterInputData,

    // Actions
    setSelectedCategory,
    setSearchQuery,
    openPreview,
    closePreview,
    initiateTemplateLoad,
    updatePlaceholderValue,
    applyPlaceholders,
    cancelPlaceholderEdit,
    resetState,

    // AI Template Actions - Generic
    updateInputField,

    // AI Template Actions - Type-specific
    updateResumeField,
    updateInvoiceField,
    updateFormField,
    updateLetterheadField,
    updateCertificateField,
    updateLabelField,
    updateCoverLetterField,

    // Generation
    generateAndApplyTemplate,
    clearGenerationError,
  };
}
