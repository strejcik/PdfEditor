import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { LayerItem } from './LayerItem';

export function LayerPanel({
  layers,
  onToggleVisibility,
  onToggleLock,
  onRename,
  onSelect,
  onReorder,
  onClose,
  isViewer,
}) {
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over?.id && over) {
      const oldIndex = layers.findIndex((l) => l.id === active.id);
      const newIndex = layers.findIndex((l) => l.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder?.(oldIndex, newIndex);
      }
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const activeLayer = activeId ? layers.find((l) => l.id === activeId) : null;

  return (
    <>
      <div className="panel-header">
        <div className="panel-title">
          <span className="panel-title-icon">&#9776;</span>
          Layers
        </div>
        <button className="panel-close-btn" onClick={onClose} title="Close panel">
          &#10005;
        </button>
      </div>

      <div className="panel-content layer-panel-content">
        {layers.length === 0 ? (
          <div className="layer-empty-state">
            <p>No layers on this page</p>
            <p className="layer-empty-hint">Add shapes, text, images, or annotations to see them here</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext
              items={layers.map((l) => l.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="layer-list">
                {layers.map((layer) => (
                  <LayerItem
                    key={layer.id}
                    layer={layer}
                    onToggleVisibility={() => onToggleVisibility?.(layer)}
                    onToggleLock={() => onToggleLock?.(layer)}
                    onRename={(name) => onRename?.(layer, name)}
                    onSelect={() => onSelect?.(layer)}
                    disabled={isViewer}
                  />
                ))}
              </div>
            </SortableContext>

            <DragOverlay>
              {activeLayer ? (
                <LayerItem
                  layer={activeLayer}
                  isDragOverlay
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        <div className="layer-panel-footer">
          <div className="layer-count">
            {layers.length} {layers.length === 1 ? 'layer' : 'layers'}
          </div>
          <div className="layer-legend">
            <span title="Drag to reorder">&#x2807; Reorder</span>
            <span title="Double-click to rename">&#x270E; Rename</span>
          </div>
        </div>
      </div>
    </>
  );
}
