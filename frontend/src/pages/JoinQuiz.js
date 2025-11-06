import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionAPI } from '../services/api';
import PublicHeader from '../components/Common/PublicHeader';
import './JoinQuiz.css';

const JoinQuiz = () => {
  const [pin, setPin] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!pin.trim() || pin.length !== 4) {
      setError('Please enter a valid 4-digit PIN');
      return;
    }

    if (!username.trim() || username.length < 2) {
      setError('Please enter a username (at least 2 characters)');
      return;
    }

    setLoading(true);
    try {
      const response = await sessionAPI.getSessionByPIN(pin);
      const session = response.data;
      navigate(`/play/${session._id}`, { state: { username } });
    } catch (err) {
      setError(err.response?.data?.message || 'Session not found. Please check the PIN.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="join-quiz-container">
      <PublicHeader />
      <div className="join-quiz-card">
        <h1>Join Quiz</h1>
        <p className="subtitle">Enter the game PIN and your username to join</p>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Game PIN</label>
            <input
              type="text"
              className="form-input pin-input"
              placeholder="0000"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              maxLength={4}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Your Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={2}
              maxLength={20}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-large btn-block" disabled={loading}>
            {loading ? 'Joining...' : 'Join Quiz'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default JoinQuiz;

