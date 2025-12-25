/**
 * TemplatePreviewModal Component
 * Full-screen modal for previewing template details before loading
 */

import React, { useEffect } from 'react';
import { CATEGORY_LABELS } from '../types/templates';

export function TemplatePreviewModal({ template, onUse, onClose }) {
  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!template) return null;

  const { metadata, content } = template;
  // AI templates don't have content until generated - handle gracefully
  const pageCount = content?.pages?.length || 1;
  const textCount = content?.pages?.reduce((acc, p) => acc + (p.textItems?.length || 0), 0) || 0;
  const shapeCount = content?.pages?.reduce((acc, p) => acc + (p.shapes?.length || 0), 0) || 0;
  const formFieldCount = content?.pages?.reduce((acc, p) => acc + (p.formFields?.length || 0), 0) || 0;
  const isAITemplate = !content;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="template-preview-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="template-preview-header">
          <div className="template-preview-title-section">
            <h2 className="template-preview-title">{metadata.name}</h2>
            <span className="template-preview-category">
              {CATEGORY_LABELS[metadata.category]}
            </span>
            {metadata.isPremium && (
              <span className="template-card-premium-badge">Premium</span>
            )}
          </div>
          <button className="template-preview-close" onClick={onClose}>
            &#10005;
          </button>
        </div>

        {/* Content */}
        <div className="template-preview-content">
          {/* Left: Preview Area */}
          <div className="template-preview-area">
            <div className="template-preview-canvas">
              {metadata.thumbnail ? (
                <img src={metadata.thumbnail} alt={metadata.name} />
              ) : (
                <div className="template-preview-placeholder">
                  <div className="template-preview-placeholder-icon">
                    {metadata.category.charAt(0).toUpperCase()}
                  </div>
                  <p>Preview will be generated when template is loaded</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Details */}
          <div className="template-preview-details">
            <div className="template-preview-section">
              <h3>Description</h3>
              <p>{metadata.description}</p>
            </div>

            <div className="template-preview-section">
              <h3>Template Contents</h3>
              {isAITemplate ? (
                <p style={{ color: '#6b7280', fontStyle: 'italic' }}>
                  This is an AI-generated template. Content will be created based on your input.
                </p>
              ) : (
                <ul className="template-preview-stats">
                  <li><span>{pageCount}</span> Page{pageCount !== 1 ? 's' : ''}</li>
                  <li><span>{textCount}</span> Text Element{textCount !== 1 ? 's' : ''}</li>
                  <li><span>{shapeCount}</span> Shape{shapeCount !== 1 ? 's' : ''}</li>
                  {formFieldCount > 0 && (
                    <li><span>{formFieldCount}</span> Form Field{formFieldCount !== 1 ? 's' : ''}</li>
                  )}
                </ul>
              )}
            </div>

            {metadata.placeholders?.length > 0 && (
              <div className="template-preview-section">
                <h3>Customizable Fields</h3>
                <ul className="template-preview-placeholders">
                  {metadata.placeholders.map((p) => (
                    <li key={p.id}>
                      {p.label}
                      {p.required && <span className="template-required">*</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {metadata.tags?.length > 0 && (
              <div className="template-preview-section">
                <h3>Tags</h3>
                <div className="template-preview-tags">
                  {metadata.tags.map((tag) => (
                    <span key={tag} className="template-tag">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="template-preview-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={onUse}
            disabled={metadata.isPremium}
          >
            {metadata.isPremium ? 'Unlock Premium' : 'Use This Template'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TemplatePreviewModal;
