import React from 'react';
import { FaClock, FaPause, FaPlay } from 'react-icons/fa';
import './StudyTimer.css';

/**
 * Study Timer Component
 * - Shows current study time for active page
 * - Pause/resume functionality
 * - Module-specific tracking
 */
const StudyTimer = ({ durationFormatted, isActive, onToggle }) => {
  return (
    <div className="study-timer">
      <FaClock className="study-timer-icon" />
      <span className="study-timer-time">{durationFormatted}</span>
      <button 
        onClick={onToggle} 
        className="study-timer-toggle"
        title={isActive ? 'Pause timer' : 'Resume timer'}
      >
        {isActive ? (
          <FaPause className="study-timer-pause-icon" />
        ) : (
          <FaPlay className="study-timer-play-icon" />
        )}
      </button>
    </div>
  );
};

export default StudyTimer;

