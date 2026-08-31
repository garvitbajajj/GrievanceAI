import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './PopupModal.css';

/**
 * Reusable beautiful popup modal that replaces all browser alert() / confirm() calls.
 *
 * Props:
 *   open        {bool}     — whether to show
 *   type        {string}   — 'success' | 'error' | 'warning' | 'info' | 'confirm' | 'loading'
 *   title       {string}
 *   message     {string}
 *   confirmLabel {string}  — label for primary confirm button (default: 'OK')
 *   cancelLabel  {string}  — label for cancel/close button (default: 'Close')
 *   onConfirm   {fn}       — called when confirm button clicked (also closes)
 *   onClose     {fn}       — called when cancel/backdrop clicked
 *   hideCancel  {bool}     — hide the cancel button (for simple alerts)
 */
export default function PopupModal({
  open,
  type = 'info',
  title,
  message,
  confirmLabel,
  cancelLabel = 'Close',
  onConfirm,
  onClose,
  hideCancel = false,
}) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handle = (e) => { if (e.key === 'Escape' && onClose) onClose(); };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const icons = {
    success: 'check_circle',
    error:   'error',
    warning: 'warning',
    info:    'info',
    confirm: 'help',
    loading: 'progress_activity',
  };

  const defaultConfirmLabels = {
    success: 'Great!',
    error:   'Try Again',
    warning: 'Understood',
    info:    'Got it',
    confirm: 'Yes, Proceed',
    loading: 'Please wait…',
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="popup-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={type !== 'loading' ? onClose : undefined}
        >
          <motion.div
            className={`popup-card popup-${type}`}
            initial={{ opacity: 0, scale: 0.88, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 24 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            {/* Glow orb */}
            <div className="popup-glow" aria-hidden="true" />

            {/* Icon */}
            <div className={`popup-icon-wrap popup-icon-${type}`}>
              <span
                className={`material-symbols-outlined filled ${type === 'loading' ? 'popup-spin' : ''}`}
              >
                {icons[type]}
              </span>
            </div>

            {/* Content */}
            <div className="popup-body">
              {title && <h3 className="popup-title">{title}</h3>}
              {message && <p className="popup-message">{message}</p>}
            </div>

            {/* Actions */}
            {type !== 'loading' && (
              <div className="popup-actions">
                {!hideCancel && (
                  <button className="popup-btn popup-btn-cancel" onClick={onClose}>
                    {cancelLabel}
                  </button>
                )}
                {(onConfirm || hideCancel) && (
                  <button
                    className={`popup-btn popup-btn-confirm popup-confirm-${type}`}
                    onClick={() => { if (onConfirm) onConfirm(); else if (onClose) onClose(); }}
                  >
                    {confirmLabel || defaultConfirmLabels[type]}
                  </button>
                )}
              </div>
            )}

            {/* Close X */}
            {type !== 'loading' && onClose && (
              <button className="popup-close-x" onClick={onClose} aria-label="Close">
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
