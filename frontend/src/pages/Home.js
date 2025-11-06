import React from 'react';
import { Link } from 'react-router-dom';
import PublicHeader from '../components/Common/PublicHeader';
import './Home.css';

const Home = () => {
  return (
    <div className="home">
      <PublicHeader />
      <div className="hero">
        <h1 className="hero-title">🎓 Learn English the Fun Way!</h1>
        <p className="hero-subtitle">
          Create interactive quizzes, host live sessions, and improve your English skills through gamification
        </p>
        <div className="hero-actions">
          <Link to="/join" className="btn btn-success btn-large">
            Join Quiz
          </Link>
        </div>
      </div>

      <div className="features">
        <div className="feature-card">
          <div className="feature-icon">📝</div>
          <h3>Create Quizzes</h3>
          <p>Build engaging English learning quizzes with multiple-choice questions</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🎯</div>
          <h3>Live Sessions</h3>
          <p>Host real-time quiz sessions where participants join and compete</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📚</div>
          <h3>Learn English</h3>
          <p>Practice vocabulary, grammar, and reading comprehension</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🏆</div>
          <h3>Track Progress</h3>
          <p>Monitor your learning progress and see your improvement over time</p>
        </div>
      </div>
    </div>
  );
};

export default Home;

