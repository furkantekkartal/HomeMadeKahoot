import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Auth.css';

const LoggedInLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({ backend: false, database: false, env: '' });
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await api.get('/health');
        if (response.data) {
          setConnectionStatus({
            backend: true,
            database: response.data.database?.connected || false,
            env: response.data.environment || 'unknown'
          });
        }
      } catch (err) {
        setConnectionStatus({
          backend: false,
          database: false,
          env: 'unknown'
        });
      }
    };
    checkConnection();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/quiz');
    } catch (err) {
      console.error('Login error:', err);
      // Show more detailed error message
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          (err.response?.status === 401 ? 'Invalid username or password' : 'Login failed');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Login</h2>
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
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="auth-footer">
          Don't have an account? <Link to="/register">Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default LoggedInLogin;

