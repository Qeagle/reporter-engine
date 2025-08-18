import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface SessionState {
  isExpired: boolean;
  expirationReason: string | null;
  showExpiredMessage: boolean;
}

export const useSessionManager = () => {
  const { isAuthenticated } = useAuth();
  const [sessionState, setSessionState] = useState<SessionState>({
    isExpired: false,
    expirationReason: null,
    showExpiredMessage: false
  });

  useEffect(() => {
    const handleSessionExpiration = (event: CustomEvent) => {
      setSessionState({
        isExpired: true,
        expirationReason: event.detail?.reason || 'Session expired',
        showExpiredMessage: true
      });

      // Auto-hide the message after 5 seconds
      setTimeout(() => {
        setSessionState(prev => ({ ...prev, showExpiredMessage: false }));
      }, 5000);
    };

    // Listen for session expiration events
    window.addEventListener('auth:session-expired', handleSessionExpiration as EventListener);

    return () => {
      window.removeEventListener('auth:session-expired', handleSessionExpiration as EventListener);
    };
  }, []);

  // Reset session state when user logs back in
  useEffect(() => {
    if (isAuthenticated) {
      setSessionState({
        isExpired: false,
        expirationReason: null,
        showExpiredMessage: false
      });
    }
  }, [isAuthenticated]);

  const dismissMessage = () => {
    setSessionState(prev => ({ ...prev, showExpiredMessage: false }));
  };

  return {
    ...sessionState,
    dismissMessage
  };
};