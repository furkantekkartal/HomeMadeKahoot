import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaIdCard, FaQuestionCircle, FaPlus } from 'react-icons/fa';
import './New.css';

const New = () => {
  const navigate = useNavigate();

  return (
    <div className="new-container">
      <div className="new-header">
        <h1>Create New</h1>
        <p className="new-subtitle">Choose what you'd like to create</p>
      </div>

      <div className="new-options">
        <div 
          className="new-option-card"
          onClick={() => navigate('/create-deck')}
        >
          <div className="new-option-icon">
            <FaIdCard />
          </div>
          <h2>New Deck</h2>
          <p>Create a new flashcard deck to study with</p>
          <div className="new-option-button">
            <FaPlus /> Create Deck
          </div>
        </div>

        <div 
          className="new-option-card"
          onClick={() => navigate('/create-quiz')}
        >
          <div className="new-option-icon">
            <FaQuestionCircle />
          </div>
          <h2>New Quiz</h2>
          <p>Create a new quiz to test your knowledge</p>
          <div className="new-option-button">
            <FaPlus /> Create Quiz
          </div>
        </div>
      </div>
    </div>
  );
};

export default New;

