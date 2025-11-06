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
  const isPublicPage = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/join';
  const isGamePage = location.pathname.startsWith('/play') || location.pathname.startsWith('/host');
  
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // On desktop, sidebar should always be open (visible)
  // On mobile, it's controlled by sidebarOpen state
  const shouldShowSidebar = isMobile ? sidebarOpen : true;
  
  return (
    <>
      {user && !isGamePage && (
        <>
          {isMobile && <MobileMenuButton onClick={() => setSidebarOpen(true)} />}
          <Sidebar isOpen={shouldShowSidebar} onClose={() => setSidebarOpen(false)} />
        </>
      )}
      {/* Show top navbar for all public pages when not logged in (including home) */}
      {!user && <Navbar />}
      <main className={`main-content ${user && !isGamePage ? 'with-sidebar' : isPublicPage || isGamePage ? 'public-page' : ''}`}>
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

