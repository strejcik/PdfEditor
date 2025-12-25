/**
 * PlaceholderEditorModal Component
 * Modal for customizing template placeholders before loading
 * Supports both static templates and AI-generated templates for all categories
 */

import React, { useEffect, useState } from 'react';
import { RESUME_INPUT_SCHEMA, RESUME_FIELD_SECTIONS } from '../types/resumeFields';
import {
  INVOICE_INPUT_SCHEMA,
  INVOICE_FIELD_SECTIONS,
  FORM_INPUT_SCHEMA,
  FORM_FIELD_SECTIONS,
  LETTERHEAD_INPUT_SCHEMA,
  LETTERHEAD_FIELD_SECTIONS,
  CERTIFICATE_INPUT_SCHEMA,
  CERTIFICATE_FIELD_SECTIONS,
  LABEL_INPUT_SCHEMA,
  LABEL_FIELD_SECTIONS,
  COVER_LETTER_INPUT_SCHEMA,
  COVER_LETTER_FIELD_SECTIONS,
} from '../types/templateFieldSchemas';

// ============================================================================
// Sub-Components for Input Fields
// ============================================================================

/**
 * List input for skills, hobbies, etc.
 */
function ListInputField({ field, value = [], onChange }) {
  const [inputValue, setInputValue] = useState('');

  const addItem = () => {
    if (inputValue.trim() && value.length < (field.maxItems || 10)) {
      onChange([...value, inputValue.trim()]);
      setInputValue('');
    }
  };

  const removeItem = (index) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem();
    }
  };

  return (
    <div className="list-input-field">
      <div className="list-items">
        {value.map((item, index) => (
          <div key={index} className="list-item-tag">
            <span>{item}</span>
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="list-item-remove"
            >
              x
            </button>
          </div>
        ))}
      </div>
      <div className="list-input-row">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={field.placeholder || 'Add item...'}
          className="panel-input list-input"
        />
        <button
          type="button"
          onClick={addItem}
          className="btn btn-small"
          disabled={value.length >= (field.maxItems || 10)}
        >
          Add
        </button>
      </div>
      {field.maxItems && (
        <span className="list-count">{value.length}/{field.maxItems}</span>
      )}
    </div>
  );
}

/**
 * Entry field for work experience, education, line items, etc.
 */
function EntryInputField({ field, value = [], onChange }) {
  const addEntry = () => {
    if (value.length < (field.maxItems || 10)) {
      const newEntry = { id: Date.now().toString() };
      field.entrySchema.fields.forEach((f) => {
        if (f.type === 'multiline') {
          newEntry[f.key] = [];
        } else if (f.type === 'number') {
          newEntry[f.key] = f.defaultValue || 0;
        } else {
          newEntry[f.key] = f.defaultValue || '';
        }
      });
      onChange([...value, newEntry]);
    }
  };

  const updateEntry = (index, key, newValue) => {
    const updated = [...value];
    // Handle arrays (achievements, etc.)
    if (Array.isArray(updated[index][key]) && typeof newValue === 'string') {
      updated[index] = {
        ...updated[index],
        [key]: newValue.split('\n').filter((line) => line.trim()),
      };
    } else {
      updated[index] = { ...updated[index], [key]: newValue };
    }
    onChange(updated);
  };

  const removeEntry = (index) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="entry-input-field">
      {value.map((entry, entryIndex) => (
        <div key={entry.id} className="entry-card">
          <div className="entry-header">
            <span className="entry-title">
              {field.entryLabel || field.label} {entryIndex + 1}
            </span>
            <button
              type="button"
              onClick={() => removeEntry(entryIndex)}
              className="entry-remove"
            >
              Remove
            </button>
          </div>
          <div className="entry-fields">
            {field.entrySchema.fields.map((subField) => (
              <div key={subField.key} className="entry-field">
                <label className="entry-field-label">
                  {subField.label}
                  {subField.required && <span className="template-required"> *</span>}
                </label>
                {subField.type === 'multiline' ? (
                  <textarea
                    className="panel-textarea entry-textarea"
                    value={
                      Array.isArray(entry[subField.key])
                        ? entry[subField.key].join('\n')
                        : entry[subField.key] || ''
                    }
                    onChange={(e) => updateEntry(entryIndex, subField.key, e.target.value)}
                    placeholder={subField.placeholder}
                    rows={3}
                  />
                ) : subField.type === 'select' ? (
                  <select
                    className="panel-input"
                    value={entry[subField.key] || ''}
                    onChange={(e) => updateEntry(entryIndex, subField.key, e.target.value)}
                  >
                    <option value="">Select...</option>
                    {subField.options?.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : subField.type === 'number' ? (
                  <input
                    type="number"
                    className="panel-input"
                    value={entry[subField.key] || 0}
                    onChange={(e) => updateEntry(entryIndex, subField.key, parseFloat(e.target.value) || 0)}
                    placeholder={subField.placeholder}
                    step={subField.step || 1}
                    min={subField.min}
                    max={subField.max}
                  />
                ) : (
                  <input
                    type="text"
                    className="panel-input"
                    value={entry[subField.key] || ''}
                    onChange={(e) => updateEntry(entryIndex, subField.key, e.target.value)}
                    placeholder={subField.placeholder}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      {value.length < (field.maxItems || 10) && (
        <button type="button" onClick={addEntry} className="btn btn-secondary add-entry-btn">
          + Add {field.entryLabel || field.label}
        </button>
      )}
    </div>
  );
}

/**
 * Render a single field based on its type
 */
function renderField(field, value, onChange, inputData) {
  if (field.type === 'list') {
    return (
      <ListInputField
        field={field}
        value={value || []}
        onChange={(v) => onChange(field.key, v)}
      />
    );
  }

  if (field.type === 'entries') {
    return (
      <EntryInputField
        field={field}
        value={value || []}
        onChange={(v) => onChange(field.key, v)}
      />
    );
  }

  if (field.type === 'multiline') {
    return (
      <>
        <textarea
          className="panel-textarea"
          value={value || ''}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
          rows={field.rows || 4}
        />
        {field.maxLength && (
          <span className="char-count">
            {(value || '').length}/{field.maxLength}
          </span>
        )}
      </>
    );
  }

  if (field.type === 'select') {
    return (
      <select
        className="panel-input"
        value={value || ''}
        onChange={(e) => onChange(field.key, e.target.value)}
      >
        <option value="">Select...</option>
        {field.options?.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  if (field.type === 'number') {
    return (
      <input
        type="number"
        className="panel-input"
        value={value ?? ''}
        onChange={(e) => onChange(field.key, parseFloat(e.target.value) || 0)}
        placeholder={field.placeholder}
        step={field.step || 1}
        min={field.min}
        max={field.max}
      />
    );
  }

  if (field.type === 'date') {
    return (
      <input
        type="date"
        className="panel-input"
        value={value || ''}
        onChange={(e) => onChange(field.key, e.target.value)}
      />
    );
  }

  // Default: text, email, phone, url
  return (
    <input
      type={
        field.type === 'email'
          ? 'email'
          : field.type === 'phone'
            ? 'tel'
            : field.type === 'url'
              ? 'url'
              : 'text'
      }
      className="panel-input"
      value={value || ''}
      onChange={(e) => onChange(field.key, e.target.value)}
      placeholder={field.placeholder}
    />
  );
}

// ============================================================================
// Schema and Section Mappings
// ============================================================================

const SCHEMA_CONFIG = {
  resume: {
    schema: RESUME_INPUT_SCHEMA,
    sections: RESUME_FIELD_SECTIONS,
    title: 'Create Your Resume',
    icon: '📄',
    buttonText: 'Generate Resume',
    description: 'Fill in your details. The AI will generate a professionally formatted resume.',
    validateFn: (data) => data?.fullName?.trim() && data?.jobTitle?.trim() && data?.email?.trim(),
  },
  invoice: {
    schema: INVOICE_INPUT_SCHEMA,
    sections: INVOICE_FIELD_SECTIONS,
    title: 'Create Your Invoice',
    icon: '💵',
    buttonText: 'Generate Invoice',
    description: 'Fill in your invoice details including line items. The AI will generate a professional invoice.',
    validateFn: (data) => data?.companyName?.trim() && data?.clientName?.trim() && data?.lineItems?.length > 0,
  },
  form: {
    schema: FORM_INPUT_SCHEMA,
    sections: FORM_FIELD_SECTIONS,
    title: 'Create Your Form',
    icon: '📋',
    buttonText: 'Generate Form',
    description: 'Define your form fields and sections. The AI will create a professional form layout.',
    validateFn: (data) => data?.formTitle?.trim() && data?.fields?.length > 0,
  },
  letterhead: {
    schema: LETTERHEAD_INPUT_SCHEMA,
    sections: LETTERHEAD_FIELD_SECTIONS,
    title: 'Create Your Letterhead',
    icon: '✉️',
    buttonText: 'Generate Letterhead',
    description: 'Fill in your letter details. The AI will create a professional letterhead.',
    validateFn: (data) => data?.companyName?.trim() || data?.senderName?.trim(),
  },
  certificate: {
    schema: CERTIFICATE_INPUT_SCHEMA,
    sections: CERTIFICATE_FIELD_SECTIONS,
    title: 'Create Your Certificate',
    icon: '🏆',
    buttonText: 'Generate Certificate',
    description: 'Fill in the certificate details. The AI will create a beautiful certificate.',
    validateFn: (data) => data?.recipientName?.trim() && data?.title?.trim(),
  },
  label: {
    schema: LABEL_INPUT_SCHEMA,
    sections: LABEL_FIELD_SECTIONS,
    title: 'Create Your Label',
    icon: '🏷️',
    buttonText: 'Generate Label',
    description: 'Fill in the label details. The AI will create a professional label.',
    validateFn: (data) => data?.toName?.trim() && data?.toAddress?.trim(),
  },
  coverLetter: {
    schema: COVER_LETTER_INPUT_SCHEMA,
    sections: COVER_LETTER_FIELD_SECTIONS,
    title: 'Create Your Cover Letter',
    icon: '📝',
    buttonText: 'Generate Cover Letter',
    description: 'Fill in your details. The AI will create a compelling cover letter.',
    validateFn: (data) => data?.yourName?.trim() && data?.company?.trim() && data?.position?.trim(),
  },
};

// ============================================================================
// Main Modal Component
// ============================================================================

export function PlaceholderEditorModal({
  isOpen,
  template,
  placeholderValues,
  inputData,
  inputSchema,
  isPendingAITemplate,
  isGenerating,
  generationError,
  onUpdateValue,
  onUpdateInputField,
  onConfirm,
  onCancel,
  // Legacy prop support
  resumeInputData,
  onUpdateResumeField,
}) {
  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isGenerating) {
        onCancel();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onCancel, isGenerating]);

  if (!isOpen || !template) return null;

  // Use legacy props if new ones not provided
  const activeInputData = inputData || resumeInputData;
  const activeSchema = inputSchema || (resumeInputData ? 'resume' : null);
  const activeUpdateFn = onUpdateInputField || onUpdateResumeField;

  // Render AI Template Form
  if (isPendingAITemplate && activeInputData && activeSchema) {
    const config = SCHEMA_CONFIG[activeSchema];

    if (!config) {
      console.error('Unknown input schema:', activeSchema);
      return null;
    }

    const isValid = config.validateFn(activeInputData);

    return (
      <div className="modal-backdrop" onClick={isGenerating ? undefined : onCancel}>
        <div
          className="modal resume-editor-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="modal-title">
            <span className="modal-title-icon">{config.icon}</span>
            {config.title}
          </h2>
          <p className="modal-message">
            {config.description} Using <strong>{template.metadata.name}</strong> template.
          </p>

          {generationError && (
            <div className="error-banner">
              <span className="error-icon">&#9888;</span>
              {generationError}
            </div>
          )}

          <div className="resume-form-sections">
            {config.sections.map((section) => (
              <div key={section.id} className="resume-section">
                <h3 className="section-header">{section.label}</h3>
                {section.description && (
                  <p className="section-description">{section.description}</p>
                )}
                <div className="section-fields">
                  {section.fields.map((fieldId) => {
                    const field = config.schema.find((f) => f.id === fieldId);
                    if (!field) return null;

                    const fieldValue = activeInputData[field.key];

                    return (
                      <div
                        key={field.id}
                        className={`panel-input-group ${field.type === 'entries' ? 'entries-group' : ''}`}
                      >
                        <label className="panel-input-label">
                          {field.label}
                          {field.required && <span className="template-required"> *</span>}
                        </label>
                        {field.description && (
                          <span className="field-description">{field.description}</span>
                        )}
                        {renderField(field, fieldValue, activeUpdateFn, activeInputData)}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="modal-actions">
            <button
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={isGenerating}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={onConfirm}
              disabled={!isValid || isGenerating}
            >
              {isGenerating ? (
                <>
                  <span className="spinner"></span>
                  Generating...
                </>
              ) : (
                config.buttonText
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Static Template Form (existing behavior)
  const { placeholders } = template.metadata;

  if (!placeholders || placeholders.length === 0) return null;

  const isValid = placeholders
    .filter((p) => p.required)
    .every((p) => placeholderValues[p.key]?.trim());

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal placeholder-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">
          <span className="modal-title-icon">&#9998;</span>
          Customize Template
        </h2>
        <p className="modal-message">
          Fill in the fields below to personalize your{' '}
          <strong>{template.metadata.name}</strong> template.
        </p>

        <div className="placeholder-form">
          {placeholders.map((placeholder) => (
            <div key={placeholder.id} className="panel-input-group">
              <label className="panel-input-label">
                {placeholder.label}
                {placeholder.required && <span className="template-required"> *</span>}
              </label>
              {placeholder.type === 'multiline' ? (
                <textarea
                  className="panel-textarea"
                  value={placeholderValues[placeholder.key] || ''}
                  onChange={(e) => onUpdateValue(placeholder.key, e.target.value)}
                  rows={3}
                  placeholder={`Enter ${placeholder.label.toLowerCase()}...`}
                />
              ) : placeholder.type === 'date' ? (
                <input
                  type="date"
                  className="panel-input"
                  value={placeholderValues[placeholder.key] || ''}
                  onChange={(e) => onUpdateValue(placeholder.key, e.target.value)}
                />
              ) : (
                <input
                  type={placeholder.type === 'number' ? 'number' : 'text'}
                  className="panel-input"
                  value={placeholderValues[placeholder.key] || ''}
                  onChange={(e) => onUpdateValue(placeholder.key, e.target.value)}
                  placeholder={`Enter ${placeholder.label.toLowerCase()}...`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={!isValid}>
            Apply Template
          </button>
        </div>
      </div>
    </div>
  );
}

export default PlaceholderEditorModal;
