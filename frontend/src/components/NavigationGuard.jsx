/**
 * NavigationGuard.jsx
 * Drop this into any grievance flow page.
 * - Registers the grievance ID into the flow context
 * - Warns the user on `beforeunload` (browser close / refresh)
 * - Cleans up on unmount if the flow is complete
 */
import { useEffect } from 'react';
import { useGrievanceFlow } from '../context/GrievanceFlowContext';

export default function NavigationGuard({ grievanceId }) {
  const { enterFlow } = useGrievanceFlow();

  // Register this grievance in the flow
  useEffect(() => {
    if (grievanceId) enterFlow(grievanceId);
  }, [grievanceId, enterFlow]);

  // Warn on browser close / refresh
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = ''; // Chrome requires returnValue to be set
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  return null; // renders nothing
}
