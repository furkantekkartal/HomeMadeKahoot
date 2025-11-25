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
  const [showDebug, setShowDebug] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({ 
    backend: false, 
    database: false, 
    env: '',
    apiUrl: '',
    socketUrl: '',
    axiosBaseURL: '',
    envVars: {}
  });
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkConnection = async () => {
      // Get all debug info
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
      const axiosBaseURL = api.defaults.baseURL;
      
      const envVars = {
        'REACT_APP_API_URL': process.env.REACT_APP_API_URL || '(not set)',
        'REACT_APP_SOCKET_URL': process.env.REACT_APP_SOCKET_URL || '(not set)',
        'NODE_ENV': process.env.NODE_ENV || '(not set)',
        'PORT': process.env.PORT || '(not set)'
      };

      try {
        const response = await api.get('/health');
        if (response.data) {
          setConnectionStatus({
            backend: true,
            database: response.data.database?.connected || false,
            env: response.data.environment || 'unknown',
            apiUrl: apiUrl,
            socketUrl: socketUrl,
            axiosBaseURL: axiosBaseURL,
            envVars: envVars
          });
        }
      } catch (err) {
        // Extract error message from response or error object
        const errorMessage = err.response?.data?.error || 
                            err.response?.data?.message || 
                            err.message || 
                            'Connection failed';
        
        setConnectionStatus({
          backend: false,
          database: false,
          env: 'unknown',
          apiUrl: apiUrl,
          socketUrl: socketUrl,
          axiosBaseURL: axiosBaseURL,
          envVars: envVars,
          error: errorMessage
        });
        
        // If it's a mongoose error, set it as the main error too
        if (errorMessage.includes('mongoose')) {
          setError(errorMessage);
        }
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
        
        {/* Debug Panel Toggle */}
        <button 
          type="button"
          onClick={() => setShowDebug(!showDebug)}
          style={{
            marginBottom: '10px',
            padding: '5px 10px',
            fontSize: '0.8em',
            backgroundColor: '#f0f0f0',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {showDebug ? 'Hide' : 'Show'} Debug Info
        </button>

        {/* Debug Panel */}
        {showDebug && (
          <div style={{
            backgroundColor: '#f9f9f9',
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '15px',
            marginBottom: '15px',
            fontSize: '0.85em'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '1em' }}>🔍 Debug Information</h3>
            
            <div style={{ marginBottom: '10px' }}>
              <strong>Backend Connection:</strong>{' '}
              <span style={{ color: connectionStatus.backend ? 'green' : 'red' }}>
                {connectionStatus.backend ? '✅ Connected' : '❌ Failed'}
              </span>
              {connectionStatus.error && <span style={{ color: 'red' }}> - {connectionStatus.error}</span>}
            </div>

            <div style={{ marginBottom: '10px' }}>
              <strong>Database Connection:</strong>{' '}
              <span style={{ color: connectionStatus.database ? 'green' : 'red' }}>
                {connectionStatus.database ? '✅ Connected' : '❌ Failed'}
              </span>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <strong>Environment:</strong> {connectionStatus.env || 'unknown'}
            </div>

            <div style={{ marginBottom: '10px' }}>
              <strong>API URL (from env):</strong>
              <div style={{ 
                backgroundColor: '#fff', 
                padding: '5px', 
                borderRadius: '3px', 
                wordBreak: 'break-all',
                fontFamily: 'monospace',
                fontSize: '0.9em'
              }}>
                {connectionStatus.apiUrl || 'Not set'}
              </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <strong>Socket URL (from env):</strong>
              <div style={{ 
                backgroundColor: '#fff', 
                padding: '5px', 
                borderRadius: '3px', 
                wordBreak: 'break-all',
                fontFamily: 'monospace',
                fontSize: '0.9em'
              }}>
                {connectionStatus.socketUrl || 'Not set'}
              </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <strong>Axios Base URL (actual):</strong>
              <div style={{ 
                backgroundColor: '#fff', 
                padding: '5px', 
                borderRadius: '3px', 
                wordBreak: 'break-all',
                fontFamily: 'monospace',
                fontSize: '0.9em'
              }}>
                {connectionStatus.axiosBaseURL || 'Not set'}
              </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <strong>Environment Variables:</strong>
              <div style={{ 
                backgroundColor: '#fff', 
                padding: '5px', 
                borderRadius: '3px',
                fontFamily: 'monospace',
                fontSize: '0.85em'
              }}>
                {Object.entries(connectionStatus.envVars || {}).map(([key, value]) => (
                  <div key={key} style={{ marginBottom: '3px' }}>
                    <span style={{ color: '#666' }}>{key}:</span> {value}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

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

