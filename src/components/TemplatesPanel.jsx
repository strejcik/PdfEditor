/**
 * TemplatesPanel Component
 * Sidebar panel for browsing and loading document templates
 */

import React from 'react';
import { useEditor } from '../context/EditorProvider';
import { CATEGORY_LABELS } from '../types/templates';
import TemplateCard from './TemplateCard';

export function TemplatesPanel({ onLoadTemplate, onClose, isViewer }) {
  const { templates } = useEditor();

  const {
    templates: filteredTemplates,
    categories,
    selectedCategory,
    searchQuery,
    setSelectedCategory,
    setSearchQuery,
    openPreview,
    initiateTemplateLoad,
  } = templates;

  const handleUseTemplate = (template) => {
    const result = initiateTemplateLoad(template);
    if (result) {
      // No placeholders, load directly
      onLoadTemplate(result);
    }
  };

  return (
    <>
      <div className="panel-header">
        <div className="panel-title">
          <span className="panel-title-icon">&#128203;</span>
          Templates
        </div>
        <button className="panel-close-btn" onClick={onClose}>
          &#10005;
        </button>
      </div>

      <div className="panel-content">
        {/* Search */}
        <div className="panel-section">
          <input
            type="text"
            className="panel-input"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={isViewer}
          />
        </div>

        {/* Category Filter */}
        <div className="panel-section">
          <div className="panel-section-label">CATEGORIES</div>
          <div className="template-category-tabs">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`template-category-tab ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
                disabled={isViewer}
              >
                {cat === 'all' ? 'All' : CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Template Grid */}
        <div className="panel-section">
          <div className="panel-section-label">
            {filteredTemplates.length} TEMPLATE{filteredTemplates.length !== 1 ? 'S' : ''}
          </div>
          <div className="template-grid">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.metadata.id}
                template={template}
                onPreview={() => openPreview(template)}
                onUse={() => handleUseTemplate(template)}
                disabled={isViewer}
              />
            ))}
          </div>
          {filteredTemplates.length === 0 && (
            <div className="template-empty-state">
              No templates found. Try a different search or category.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default TemplatesPanel;
