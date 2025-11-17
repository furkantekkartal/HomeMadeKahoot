import { useState, useEffect, useRef } from 'react';
import { studySessionAPI } from '../services/api';

/**
 * Custom hook for tracking study time
 * - Auto-starts/resumes on mount
 * - Pauses on unmount (preserves duration, can be resumed)
 * - Tracks idle time (2 minutes)
 * - Updates backend every minute
 * - Tracks user activity (mouse, keyboard, scroll, touch)
 */
export const useStudyTimer = (module, timerActive = true) => {
  const [sessionId, setSessionId] = useState(null);
  const [duration, setDuration] = useState(0); // in seconds
  const [isActive, setIsActive] = useState(true);
  const intervalRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const lastSaveRef = useRef(0);

  const startTimeRef = useRef(null);
  const durationRef = useRef(0); // Keep track of duration in ref for unmount
  const sessionIdRef = useRef(null); // Keep track of sessionId in ref for unmount

  const pageActiveStartRef = useRef(null); // When this page became active
  const isPageVisibleRef = useRef(true); // Track if page is visible

  // Start or resume session
  const startSession = async () => {
    try {
      const response = await studySessionAPI.start(module);
      if (response.data.success) {
        const sessionData = response.data.data;
        setSessionId(sessionData.sessionId);
        sessionIdRef.current = sessionData.sessionId;
        
        // Restore duration from saved session (don't add time while away)
        // Use durationSeconds if available for precision, otherwise fall back to minutes
        if (sessionData.durationSeconds !== undefined) {
          const baseDuration = sessionData.durationSeconds;
          setDuration(baseDuration);
          durationRef.current = baseDuration;
          lastSaveRef.current = baseDuration;
        } else if (sessionData.durationMinutes !== undefined) {
          const baseDuration = sessionData.durationMinutes * 60;
          setDuration(baseDuration);
          durationRef.current = baseDuration;
          lastSaveRef.current = baseDuration;
        } else {
          setDuration(0);
          durationRef.current = 0;
          lastSaveRef.current = 0;
        }
        
        // Mark when this page became active (for tracking time on this page only)
        pageActiveStartRef.current = Date.now();
        lastActivityRef.current = Date.now();
      }
    } catch (error) {
      console.error('Failed to start study session:', error);
    }
  };

  // Pause session (update last activity but keep it active)
  const pauseSession = async (sessionIdToPause, currentDuration) => {
    if (sessionIdToPause) {
      try {
        // Update the session's lastActivity and save current duration in seconds
        const currentMinutes = Math.floor(currentDuration / 60);
        await studySessionAPI.update(sessionIdToPause, currentMinutes, currentDuration);
      } catch (error) {
        console.error('Failed to pause study session:', error);
      }
    }
  };

  // End session (only called explicitly)
  const endSession = async () => {
    if (sessionId) {
      try {
        await studySessionAPI.end(sessionId);
        setSessionId(null);
        sessionIdRef.current = null;
        setDuration(0);
        durationRef.current = 0;
        lastSaveRef.current = 0;
      } catch (error) {
        console.error('Failed to end study session:', error);
      }
    }
  };

  // Reset session (end current and start new one)
  const resetSession = async () => {
    await endSession();
    // Small delay to ensure previous session is ended
    setTimeout(() => {
      startSession();
    }, 100);
  };

  // Update activity timestamp
  const updateActivity = () => {
    lastActivityRef.current = Date.now();
  };

  // Effect for timer - only counts time when page is active and visible
  useEffect(() => {
    if (isActive && sessionId && timerActive && isPageVisibleRef.current) {
      intervalRef.current = setInterval(() => {
        // Don't count time if page is not visible (tab in background, minimized, etc.)
        if (!isPageVisibleRef.current) {
          return;
        }
        
        // Check idle time (2 minutes = 120 seconds)
        const idleTime = (Date.now() - lastActivityRef.current) / 1000;
        
        if (idleTime < 120) {
          // User is active on THIS page, increment duration
          // Only count time when this specific page is mounted and visible
          setDuration((prev) => {
            const newDuration = prev + 1;
            durationRef.current = newDuration;
            
            // Update backend every minute (save both minutes and seconds)
            if (newDuration - lastSaveRef.current >= 60) {
              const durationMinutes = Math.floor(newDuration / 60);
              studySessionAPI.update(sessionId, durationMinutes, newDuration)
                .catch(console.error);
              lastSaveRef.current = newDuration;
            }
            
            return newDuration;
          });
        }
      }, 1000);
    } else {
      // Timer is paused, clear interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, sessionId, timerActive]);

  // Start/resume session on mount - page becomes active
  useEffect(() => {
    startSession();

    // Pause session on unmount - page becomes inactive
    // Save current duration so it can be resumed later
    return () => {
      // Clear interval immediately when leaving page
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // Save current duration to backend (page is now inactive)
      const currentSessionId = sessionIdRef.current;
      const currentDuration = durationRef.current;
      
      if (currentSessionId && currentDuration >= 0) {
        // Save the duration, but keep session active for resuming
        pauseSession(currentSessionId, currentDuration);
      }
    };
    // eslint-disable-next-line
  }, []);

  // Listen for user activity
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      updateActivity();
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, []);

  // Listen for page visibility changes (pause timer when tab is in background)
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      isPageVisibleRef.current = isVisible;
      
      // If page becomes visible again, update last activity to prevent idle detection
      if (isVisible) {
        updateActivity();
      } else {
        // Page is now hidden, save current duration to backend
        const currentSessionId = sessionIdRef.current;
        const currentDuration = durationRef.current;
        
        if (currentSessionId && currentDuration >= 0) {
          pauseSession(currentSessionId, currentDuration).catch(console.error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also handle when window loses focus (browser minimized, etc.)
    const handleBlur = () => {
      isPageVisibleRef.current = false;
      const currentSessionId = sessionIdRef.current;
      const currentDuration = durationRef.current;
      
      if (currentSessionId && currentDuration >= 0) {
        pauseSession(currentSessionId, currentDuration).catch(console.error);
      }
    };
    
    const handleFocus = () => {
      isPageVisibleRef.current = !document.hidden;
      if (!document.hidden) {
        updateActivity();
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Format duration helper
  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    duration, // in seconds
    durationMinutes: Math.floor(duration / 60),
    durationFormatted: formatDuration(duration),
    isActive,
    endSession,
    resetSession
  };
};

