import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Common/Sidebar';
import Navbar from './components/Common/Navbar';
import MobileMenuButton from './components/Common/MobileMenuButton';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateQuiz from './pages/CreateQuiz';
import EditQuiz from './pages/EditQuiz';
import HostQuiz from './pages/HostQuiz';
import JoinQuiz from './pages/JoinQuiz';
import PlayQuiz from './pages/PlayQuiz';
import SelfPacedQuiz from './pages/SelfPacedQuiz';
import Results from './pages/Results';
import BrowseQuizzes from './pages/BrowseQuizzes';
import Profile from './pages/Profile';
import './App.css';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  return user ? children : <Navigate to="/login" />;
};

function AppContent() {
  const { user } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Navigation visibility rules:
  // 1. If user is not logged in: Always hide left pane, always show top pane
  // 2. If user is logged in: Always show left pane, always hide top pane
  // 3. Mobile: Hide left pane but show icon to open it
  
  // Pages where sidebar should never show for non-logged-in users
  const publicPagesWithoutSidebar = ['/', '/login', '/register', '/join'];
  const isPublicPageWithoutSidebar = publicPagesWithoutSidebar.includes(location.pathname);
  const isPlayPage = location.pathname.startsWith('/play');
  
  /**
   * Determines if sidebar should be visible
   * Rules: Only show for logged-in users. On mobile, controlled by sidebarOpen state.
   * Never show on public pages (/, /login, /register, /join) or /play pages for non-logged-in users.
   */
  const shouldShowSidebar = () => {
    // Rule 1: Not logged in = hide left pane (especially on public pages and play pages)
    if (!user) return false;
    
    // Additional check: Even if logged in, hide on play pages (game mode)
    if (isPlayPage) return false;
    
    // Rule 3: Mobile = controlled by state, Desktop = always visible
    return isMobile ? sidebarOpen : true;
  };

  /**
   * Determines if navbar should be visible
   * Rules: Only show for non-logged-in users
   */
  const shouldShowNavbar = () => {
    return !user; // Rule 1: Not logged in = show top pane
  };

  /**
   * Determines if mobile menu button should be visible
   * Rules: Show on mobile when user is logged in and sidebar is closed, but not on play pages
   */
  const shouldShowMobileMenuButton = () => {
    if (!user) return false; // Not logged in = no button
    if (isPlayPage) return false; // No button on play pages
    return isMobile && !sidebarOpen;
  };

  /**
   * Determines main content CSS classes
   */
  const getMainContentClasses = () => {
    const classes = [];
    // Only add sidebar margin if user is logged in, not on mobile, and not on play pages
    if (user && !isMobile && !isPlayPage) {
      classes.push('with-sidebar'); // Desktop logged-in: add sidebar margin
    }
    // Add public-page class for non-logged-in users or play pages
    if (!user || isPlayPage || isPublicPageWithoutSidebar) {
      classes.push('public-page'); // Full width for public pages and play pages
    }
    return classes.join(' ');
  };

  const showSidebar = shouldShowSidebar();
  const showNavbar = shouldShowNavbar();
  const showMobileButton = shouldShowMobileMenuButton();
  
  return (
    <>
      {/* Left Pane (Sidebar) - Rule 2: Always show for logged-in users, except on play pages and public pages */}
      {user && !isPlayPage && !isPublicPageWithoutSidebar && (
        <>
          {showMobileButton && <MobileMenuButton onClick={() => setSidebarOpen(true)} />}
          <Sidebar isOpen={showSidebar} onClose={() => setSidebarOpen(false)} />
        </>
      )}
      
      {/* Top Pane (Navbar) - Rule 1: Always show for non-logged-in users */}
      {showNavbar && <Navbar />}
      
      <main className={`main-content ${getMainContentClasses()}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/create-quiz" element={<PrivateRoute><CreateQuiz /></PrivateRoute>} />
          <Route path="/edit-quiz/:id" element={<PrivateRoute><EditQuiz /></PrivateRoute>} />
          <Route path="/host/:sessionId" element={<PrivateRoute><HostQuiz /></PrivateRoute>} />
          <Route path="/join" element={<JoinQuiz />} />
          <Route path="/play/:sessionId" element={<PlayQuiz />} />
          <Route path="/quiz/:id/self-paced" element={<SelfPacedQuiz />} />
          <Route path="/browse" element={<PrivateRoute><BrowseQuizzes /></PrivateRoute>} />
          <Route path="/results" element={<PrivateRoute><Results /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        </Routes>
      </main>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AppContent />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

