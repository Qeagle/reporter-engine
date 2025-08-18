import React from 'react';
import { useSessionManager } from '../hooks/useSessionManager';

const SessionExpiredNotification: React.FC = () => {
  const { showExpiredMessage, expirationReason, dismissMessage } = useSessionManager();

  if (!showExpiredMessage) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg">
        <div className="flex justify-between items-start">
          <div>
            <strong className="font-bold text-sm">Session Expired</strong>
            <p className="text-sm mt-1">
              {expirationReason || 'Your session has expired. Please log in again.'}
            </p>
          </div>
          <button
            onClick={dismissMessage}
            className="text-red-700 hover:text-red-900 ml-2"
            title="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionExpiredNotification;