import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Auth.css';

const LoggedInRegister = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({ backend: false, database: false, env: '', apiUrl: '' });
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Log the API URL being used
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        console.log('Registration page - API URL:', apiUrl);
        
        const response = await api.get('/health');
        if (response.data) {
          setConnectionStatus({
            backend: true,
            database: response.data.database?.connected || false,
            env: response.data.environment || 'unknown',
            apiUrl: apiUrl
          });
        }
      } catch (err) {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        console.error('Registration page - Connection check failed:', err);
        console.error('Registration page - API URL:', apiUrl);
        setConnectionStatus({
          backend: false,
          database: false,
          env: 'unknown',
          apiUrl: apiUrl
        });
      }
    };
    checkConnection();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate password confirmation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await register(username, password);
      navigate('/quiz');
    } catch (err) {
      console.error('Registration error:', err);
      // Show more detailed error message
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          (err.code === 'ERR_NETWORK' ? 'Cannot connect to server. Please check your connection.' : 'Registration failed');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Sign Up</h2>
        <div className="connection-status">
          <div className="status-item">
            <span className="status-label">Backend connection:</span>
            <span className={connectionStatus.backend ? 'status-success' : 'status-error'}>
              {connectionStatus.backend ? 'Successful' : 'Failed'} ({connectionStatus.env})
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Database connection:</span>
            <span className={connectionStatus.database ? 'status-success' : 'status-error'}>
              {connectionStatus.database ? 'Successful' : 'Failed'} ({connectionStatus.env})
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">API URL:</span>
            <span className="status-info" style={{ fontSize: '0.8em', wordBreak: 'break-all' }}>
              {connectionStatus.apiUrl || 'Not set'}
            </span>
          </div>
        </div>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={20}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>
        <p className="auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default LoggedInRegister;

