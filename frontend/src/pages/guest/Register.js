import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import '../Auth.css';
import '../Home.css';

const GuestRegister = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
  const { register } = useAuth();
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

      console.log('Registration page - API URL:', apiUrl);
      console.log('Registration page - Socket URL:', socketUrl);
      console.log('Registration page - Axios Base URL:', axiosBaseURL);
      console.log('Registration page - Environment Variables:', envVars);
      
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
        console.error('Registration page - Connection check failed:', err);
        setConnectionStatus({
          backend: false,
          database: false,
          env: 'unknown',
          apiUrl: apiUrl,
          socketUrl: socketUrl,
          axiosBaseURL: axiosBaseURL,
          envVars: envVars,
          error: err.message || 'Connection failed'
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
      <div className="home-header">
        <Link to="/" className="home-logo">
          <span className="brand-icon">🎮</span>
          HomeMadeKahoot
        </Link>
        <div className="home-auth">
          <Link to="/login" className="home-login-link">Login</Link>
          <Link to="/register" className="btn btn-primary btn-sm">Sign Up</Link>
        </div>
      </div>
      <div className="auth-card">
        <h2 className="auth-title">Sign Up</h2>
        
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

export default GuestRegister;

