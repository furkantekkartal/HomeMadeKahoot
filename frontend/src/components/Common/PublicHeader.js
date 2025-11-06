import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './PublicHeader.css';

const PublicHeader = () => {
  const { user } = useAuth();

  // Only show for non-logged-in users
  if (user) {
    return null;
  }

  return (
    <div className="public-header">
      <Link to="/" className="public-header-logo">
        <span className="brand-icon">🎮</span>
        HomeMadeKahoot
      </Link>
      <div className="public-header-auth">
        <Link to="/login" className="public-header-login-link">Login</Link>
        <Link to="/register" className="btn btn-primary btn-sm">Sign Up</Link>
      </div>
    </div>
  );
};

export default PublicHeader;

