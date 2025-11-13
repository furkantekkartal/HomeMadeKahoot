import React, { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  FaPlayCircle,
  FaHome,
  FaSearch,
  FaTrophy,
  FaCog,
  FaSignOutAlt,
  FaUser,
  FaTimes,
  FaBook,
  FaIdCard,
  FaKeyboard,
  FaPlus
} from 'react-icons/fa';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const prevLocationRef = useRef(location.pathname);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  useEffect(() => {
    // Close sidebar when route changes on mobile (only if pathname actually changed)
    if (window.innerWidth <= 768 && isOpen && location.pathname !== prevLocationRef.current) {
      onClose();
      prevLocationRef.current = location.pathname;
    } else if (location.pathname !== prevLocationRef.current) {
      prevLocationRef.current = location.pathname;
    }
  }, [location.pathname, isOpen, onClose]);

  if (!user) {
    return null; // Don't show sidebar for non-logged-in users
  }

  // Only show overlay on mobile when sidebar is open
  const showOverlay = isOpen;
  
  return (
    <>
      {showOverlay && <div className="sidebar-overlay" onClick={onClose}></div>}
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <button className="sidebar-close-button" onClick={onClose}>
          <FaTimes />
        </button>
      <div className="sidebar-top">
        <div className="sidebar-profile">
          <div className="profile-picture">
            {user.profilePictureUrl ? (
              <img 
                src={user.profilePictureUrl} 
                alt={user.username} 
                className="profile-picture-img"
              />
            ) : (
              <FaUser className="profile-picture-icon" />
            )}
          </div>
          <div className="profile-name">{user.username}</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <Link 
          to="/" 
          className={`nav-item ${isActive('/') && !isActive('/quiz') && !isActive('/join') && !isActive('/play') && !isActive('/new') ? 'active' : ''}`}
        >
          <FaHome className="nav-icon nav-icon-dashboard" />
          <span className="nav-text">Dashboard</span>
        </Link>
        <Link 
          to="/new" 
          className={`nav-item ${isActive('/new') ? 'active' : ''}`}
        >
          <FaPlus className="nav-icon nav-icon-create" />
          <span className="nav-text">New</span>
        </Link>
        <Link 
          to="/join" 
          className={`nav-item ${isActive('/join') || isActive('/play') ? 'active' : ''}`}
        >
          <FaPlayCircle className="nav-icon nav-icon-game" />
          <span className="nav-text">Game</span>
        </Link>
        <Link 
          to="/quiz" 
          className={`nav-item ${isActive('/quiz') ? 'active' : ''}`}
        >
          <FaHome className="nav-icon nav-icon-dashboard" />
          <span className="nav-text">Quiz</span>
        </Link>
        <Link 
          to="/browse" 
          className={`nav-item ${isActive('/browse') ? 'active' : ''}`}
        >
          <FaSearch className="nav-icon nav-icon-browse" />
          <span className="nav-text">Browse</span>
        </Link>
        <Link 
          to="/performance" 
          className={`nav-item ${isActive('/performance') ? 'active' : ''}`}
        >
          <FaTrophy className="nav-icon nav-icon-performance" />
          <span className="nav-text">Performance</span>
        </Link>
        <Link 
          to="/words" 
          className={`nav-item ${isActive('/words') ? 'active' : ''}`}
        >
          <FaBook className="nav-icon nav-icon-words" />
          <span className="nav-text">Words</span>
        </Link>
        <Link 
          to="/flashcards" 
          className={`nav-item ${isActive('/flashcards') ? 'active' : ''}`}
        >
          <FaIdCard className="nav-icon nav-icon-flashcards" />
          <span className="nav-text">Flashcards</span>
        </Link>
        <Link 
          to="/spelling" 
          className={`nav-item ${isActive('/spelling') ? 'active' : ''}`}
        >
          <FaKeyboard className="nav-icon nav-icon-spelling" />
          <span className="nav-text">Spelling</span>
        </Link>
      </nav>

      <div className="sidebar-bottom">
        <Link to="/profile" className="sidebar-bottom-item">
          <FaCog className="nav-icon" />
          <span className="nav-text">MY PROFILE</span>
        </Link>
        <button onClick={handleLogout} className="sidebar-bottom-item logout-btn">
          <FaSignOutAlt className="nav-icon" />
          <span className="nav-text">LOG OUT</span>
        </button>
      </div>
    </aside>
    </>
  );
};

export default Sidebar;

