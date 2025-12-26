import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const TYPE_ICONS = {
  shape: '\u25A1',      // White square
  text: 'T',
  image: '\u{1F5BC}',   // Frame with picture
  formField: '\u{1F4DD}', // Memo
  annotation: '\u{1F58D}', // Crayon
};

const TYPE_LABELS = {
  shape: 'Shape',
  text: 'Text',
  image: 'Image',
  formField: 'Form',
  annotation: 'Note',
};

export function LayerItem({
  layer,
  onToggleVisibility,
  onToggleLock,
  onRename,
  onSelect,
  disabled,
  isDragOverlay,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(layer.name);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: layer.id, disabled: disabled || layer.locked });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleNameSubmit = () => {
    if (editName.trim() && editName !== layer.name) {
      onRename?.(editName.trim());
    } else {
      setEditName(layer.name);
    }
    setIsEditing(false);
  };

  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNameSubmit();
    }
    if (e.key === 'Escape') {
      setEditName(layer.name);
      setIsEditing(false);
    }
  };

  const handleClick = (e) => {
    if (!isEditing && !disabled) {
      onSelect?.();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`layer-item ${isDragging ? 'dragging' : ''} ${isDragOverlay ? 'drag-overlay' : ''} ${layer.isSelected ? 'selected' : ''} ${!layer.visible ? 'hidden-layer' : ''} ${disabled ? 'viewer-disabled' : ''}`}
      onClick={handleClick}
    >
      {/* Drag Handle */}
      <span
        className="layer-drag-handle"
        {...attributes}
        {...listeners}
        title="Drag to reorder"
      >
        &#x2807;
      </span>

      {/* Type Icon */}
      <span className="layer-type-icon" title={TYPE_LABELS[layer.type]}>
        {TYPE_ICONS[layer.type]}
      </span>

      {/* Name (editable) */}
      {isEditing ? (
        <input
          className="layer-name-input"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleNameSubmit}
          onKeyDown={handleNameKeyDown}
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className="layer-name"
          onDoubleClick={(e) => {
            if (!disabled) {
              e.stopPropagation();
              setIsEditing(true);
            }
          }}
          title={layer.name}
        >
          {layer.name}
        </span>
      )}

      {/* Controls */}
      <div className="layer-controls">
        <button
          className={`layer-control-btn ${layer.visible ? '' : 'inactive'}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility?.();
          }}
          title={layer.visible ? 'Hide layer' : 'Show layer'}
          disabled={disabled}
        >
          {layer.visible ? '\u{1F441}' : '\u{1F441}\u200D\u{1F5E8}'}
        </button>
        <button
          className={`layer-control-btn ${layer.locked ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleLock?.();
          }}
          title={layer.locked ? 'Unlock layer' : 'Lock layer'}
          disabled={disabled}
        >
          {layer.locked ? '\u{1F512}' : '\u{1F513}'}
        </button>
      </div>
    </div>
  );
}
