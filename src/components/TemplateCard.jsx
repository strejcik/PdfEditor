/**
 * TemplateCard Component
 * Individual template card with thumbnail, info, and action buttons
 */

import React from 'react';
import { CATEGORY_LABELS } from '../types/templates';

export default function TemplateCard({ template, onPreview, onUse, disabled }) {
  const { metadata } = template;

  // Get first letter of category for placeholder
  const categoryInitial = metadata.category.charAt(0).toUpperCase();

  return (
    <div className="template-card">
      {/* Thumbnail */}
      <div className="template-card-thumbnail">
        {metadata.thumbnail ? (
          <img src={metadata.thumbnail} alt={metadata.name} />
        ) : (
          <div className="template-card-placeholder">
            {categoryInitial}
          </div>
        )}
        {metadata.isPremium && (
          <span className="template-card-premium-badge">Premium</span>
        )}
      </div>

      {/* Info */}
      <div className="template-card-info">
        <h4 className="template-card-name">{metadata.name}</h4>
        <p className="template-card-description">{metadata.description}</p>
        <div className="template-card-category">
          {CATEGORY_LABELS[metadata.category]}
        </div>
      </div>

      {/* Actions */}
      <div className="template-card-actions">
        <button
          className="template-card-btn template-card-btn-preview"
          onClick={onPreview}
          disabled={disabled}
        >
          Preview
        </button>
        <button
          className="template-card-btn template-card-btn-use"
          onClick={onUse}
          disabled={disabled || metadata.isPremium}
        >
          {metadata.isPremium ? 'Unlock' : 'Use'}
        </button>
      </div>
    </div>
  );
}
