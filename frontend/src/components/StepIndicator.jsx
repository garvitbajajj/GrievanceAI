/**
 * StepIndicator.jsx — Animated civic progress trail
 * Steps: Describe → Verify → Details → Review
 */
import { motion } from 'framer-motion';
import './StepIndicator.css';

const STEPS = ['Describe', 'Verify', 'Details', 'Review'];

export default function StepIndicator({ currentStep = 0 }) {
  return (
    <div className="step-indicator">
      {STEPS.map((label, i) => {
        const isDone   = i < currentStep;
        const isActive = i === currentStep;
          const isLast   = i === STEPS.length - 1;

        return (
          <div key={label} className={`step-item ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}>
            {/* Circle */}
            <motion.div
              className="step-circle"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.08, duration: 0.35, type: 'spring', stiffness: 300, damping: 22 }}
            >
              {isDone ? (
                <motion.span
                  className="material-symbols-outlined step-check"
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  check
                </motion.span>
              ) : (
                <span>{i + 1}</span>
              )}
            </motion.div>

            {/* Label */}
            <motion.span 
              className="step-label"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 + 0.1, duration: 0.3 }}
            >
              {label}
            </motion.span>

              {/* Connector (not after last) */}
              {!isLast && (
                <div className="step-connector">
                  <motion.div
                    className="step-connector-fill"
                    initial={{ width: '0%' }}
                    animate={{ width: isDone ? '100%' : '0%' }}
                    transition={{ delay: i * 0.08 + 0.2, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                  />
                </div>
              )}
          </div>
        );
      })}
    </div>
  );
}