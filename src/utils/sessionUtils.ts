/**
 * Utility to check if user is authenticated before making API calls
 */
export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('token');
  return !!token;
};

/**
 * Utility to validate session before API operations
 * Throws an error if session is invalid
 */
export const validateSession = (): void => {
  if (!isAuthenticated()) {
    // Trigger session expiration event
    window.dispatchEvent(new CustomEvent('auth:session-expired', {
      detail: { reason: 'No valid session found' }
    }));
    
    throw new Error('Session expired. Please log in again.');
  }
};

/**
 * Enhanced API wrapper that validates session before each call
 */
export const secureApiCall = async <T>(
  apiCall: () => Promise<T>,
  operationName: string = 'API operation'
): Promise<T> => {
  validateSession();
  
  try {
    return await apiCall();
  } catch (error: any) {
    // If we get a 401, ensure session expiration is triggered
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:session-expired', {
        detail: { reason: `${operationName} failed due to invalid session` }
      }));
    }
    throw error;
  }
};