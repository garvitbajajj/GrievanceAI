/**
 * LeaveFlowModal.jsx
 * A modal that appears when the user tries to navigate away from the grievance flow.
 */
import { motion, AnimatePresence } from 'framer-motion';
import './LeaveFlowModal.css';

export default function LeaveFlowModal({ open, onStay, onLeave, loading }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="leave-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="leave-modal card"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="leave-modal-icon">
              <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--saffron)' }}>
                warning
              </span>
            </div>

            <h2 className="leave-modal-title">Incomplete Submission</h2>

            <p className="leave-modal-desc">
              Your grievance has <strong>not been submitted</strong> yet and is still incomplete.
              If you leave now, your progress will be <strong>permanently deleted</strong>.
            </p>

            <div className="leave-modal-actions">
              <button
                className="btn btn-outline leave-modal-btn"
                onClick={onLeave}
                disabled={loading}
              >
                {loading ? (
                  <span>Deleting…</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                    Yes, discard & leave
                  </>
                )}
              </button>

              <button
                className="btn btn-primary leave-modal-btn"
                onClick={onStay}
                disabled={loading}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
                Continue submission
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
