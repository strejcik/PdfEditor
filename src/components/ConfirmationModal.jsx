import React from 'react';

/**
 * Reusable confirmation modal component
 * @param {Object} props
 * @param {boolean} props.open - Whether the modal is open
 * @param {string} props.title - Modal title
 * @param {string} props.message - Confirmation message
 * @param {Function} props.onConfirm - Callback when user confirms
 * @param {Function} props.onCancel - Callback when user cancels
 * @param {string} [props.confirmText="Proceed"] - Text for confirm button
 * @param {string} [props.cancelText="Cancel"] - Text for cancel button
 * @param {boolean} [props.danger=false] - Whether to style confirm button as danger
 */
export const ConfirmationModal = ({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Proceed",
  cancelText = "Cancel",
  danger = false,
}) => {
  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2 className="modal-title">{title}</h2>
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          <button
            className="btn btn-secondary"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
