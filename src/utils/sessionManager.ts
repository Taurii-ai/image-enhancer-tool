// Session management utility to handle user authentication persistence
// This ensures users have to log in again when they close/refresh the app

let sessionActive = false;

export const initializeSession = () => {
  // Check if this is a page refresh vs new session
  const wasActive = sessionStorage.getItem('enhpix_session_active');
  
  if (wasActive === 'true') {
    // This is a page refresh, keep user logged in
    sessionActive = true;
  } else {
    // This is a new session, clear any stored user data
    localStorage.removeItem('enhpix_user');
    sessionActive = false;
  }
  
  // Mark session as active
  sessionStorage.setItem('enhpix_session_active', 'true');
  
  // Clear session data when tab/window is closed
  window.addEventListener('beforeunload', () => {
    sessionStorage.removeItem('enhpix_session_active');
  });
  
  // Clear session data when user navigates away
  window.addEventListener('pagehide', () => {
    sessionStorage.removeItem('enhpix_session_active');
  });
};

export const clearUserSession = () => {
  localStorage.removeItem('enhpix_user');
  sessionStorage.removeItem('enhpix_session_active');
  sessionActive = false;
};

export const isSessionActive = () => {
  return sessionActive;
};