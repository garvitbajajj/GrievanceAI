/**
 * GrievanceFlowContext.jsx
 * Tracks whether the user is currently inside the grievance submission flow.
 * Used by NavigationGuard to warn before leaving, and by Sidebar to intercept clicks.
 */
import { createContext, useContext, useState, useCallback } from 'react';

const GrievanceFlowContext = createContext({
  activeGrievanceId: null,
  enterFlow: () => {},
  exitFlow: () => {},
  isInFlow: false,
});

export function GrievanceFlowProvider({ children }) {
  const [activeGrievanceId, setActiveGrievanceId] = useState(null);

  const enterFlow = useCallback((id) => setActiveGrievanceId(id), []);
  const exitFlow = useCallback(() => setActiveGrievanceId(null), []);

  return (
    <GrievanceFlowContext.Provider value={{
      activeGrievanceId,
      enterFlow,
      exitFlow,
      isInFlow: !!activeGrievanceId,
    }}>
      {children}
    </GrievanceFlowContext.Provider>
  );
}

export function useGrievanceFlow() {
  return useContext(GrievanceFlowContext);
}
