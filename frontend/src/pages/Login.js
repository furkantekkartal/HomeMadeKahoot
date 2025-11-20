import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './Auth.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const LoggedInLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/quiz');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus(null);

    try {
      const response = await axios.get(`${API_URL}/health/check`, {
        timeout: 5000
      });

      const { backend, database, message } = response.data;
      
      if (backend === 'ok' && database === 'ok') {
        setConnectionStatus({
          type: 'success',
          message: '✓ Backend and database are connected',
          details: message
        });
      } else if (backend === 'ok' && database === 'error') {
        setConnectionStatus({
          type: 'warning',
          message: '⚠ Backend is running but database connection failed',
          details: response.data.databaseError || message
        });
      } else {
        setConnectionStatus({
          type: 'error',
          message: '✗ Connection test failed',
          details: message || 'Unknown error'
        });
      }
    } catch (err) {
      if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        setConnectionStatus({
          type: 'error',
          message: '✗ Connection timeout',
          details: 'Backend server is not responding. Please check if the server is running.'
        });
      } else if (err.response) {
        setConnectionStatus({
          type: 'error',
          message: '✗ Connection failed',
          details: err.response.data?.message || 'Backend server returned an error'
        });
      } else {
        setConnectionStatus({
          type: 'error',
          message: '✗ Cannot reach backend',
          details: 'Unable to connect to the server. Please check your network connection and server status.'
        });
      }
    } finally {
      setTestingConnection(false);
      // Clear status after 5 seconds
      setTimeout(() => {
        setConnectionStatus(null);
      }, 5000);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Login</h2>
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
        <div className="test-connection-container">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testingConnection}
            className="test-connection-btn"
            title="Test backend and database connection"
          >
            {testingConnection ? 'Testing...' : 'Test Connection'}
          </button>
          {connectionStatus && (
            <div className={`connection-status connection-status-${connectionStatus.type}`}>
              <div className="connection-status-message">{connectionStatus.message}</div>
              {connectionStatus.details && (
                <div className="connection-status-details">{connectionStatus.details}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoggedInLogin;

