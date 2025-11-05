import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Home.css';

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="home">
      <div className="hero">
        <h1 className="hero-title">🎓 Learn English the Fun Way!</h1>
        <p className="hero-subtitle">
          Create interactive quizzes, host live sessions, and improve your English skills through gamification
        </p>
        {!user ? (
          <div className="hero-actions">
            <Link to="/register" className="btn btn-primary btn-large">
              Get Started
            </Link>
            <Link to="/join" className="btn btn-success btn-large">
              Join Quiz
            </Link>
            <Link to="/browse" className="btn btn-secondary btn-large">
              Browse Quizzes
            </Link>
            <Link to="/login" className="btn btn-secondary btn-large">
              Login
            </Link>
          </div>
        ) : (
          <div className="hero-actions">
            <Link to="/dashboard" className="btn btn-primary btn-large">
              Go to Dashboard
            </Link>
            <Link to="/join" className="btn btn-success btn-large">
              Join Quiz
            </Link>
            <Link to="/browse" className="btn btn-secondary btn-large">
              Browse Quizzes
            </Link>
            <Link to="/create-quiz" className="btn btn-secondary btn-large">
              Create Quiz
            </Link>
          </div>
        )}
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

