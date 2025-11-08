import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Common/Sidebar';
import Navbar from './components/Common/Navbar';
import MobileMenuButton from './components/Common/MobileMenuButton';
// Guest pages (for non-logged-in users)
import GuestHome from './pages/guest/Home';
import GuestLogin from './pages/guest/Login';
import GuestRegister from './pages/guest/Register';
import GuestJoinQuiz from './pages/guest/JoinQuiz';
import GuestPlayQuiz from './pages/guest/PlayQuiz';

// Logged-in pages
import LoggedInHome from './pages/Home';
import LoggedInLogin from './pages/Login';
import LoggedInRegister from './pages/Register';
import LoggedInJoinQuiz from './pages/JoinQuiz';
import LoggedInPlayQuiz from './pages/PlayQuiz';

// Logged-in only pages
import Quiz from './pages/Quiz';
import CreateQuiz from './pages/CreateQuiz';
import EditQuiz from './pages/EditQuiz';
import HostQuiz from './pages/HostQuiz';
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
  const isJoinPage = location.pathname === '/join';
  const isPlayPage = location.pathname.startsWith('/play');
  
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
      {/* Show sidebar for all logged-in users, except on play pages (game screen) */}
      {user && !isPlayPage && (
        <>
          {isMobile && <MobileMenuButton onClick={() => setSidebarOpen(true)} />}
          <Sidebar isOpen={shouldShowSidebar} onClose={() => setSidebarOpen(false)} />
        </>
      )}
      {/* Show top navbar for public pages when not logged in, but hide it on home, login, register, join, and play pages */}
      {!user && location.pathname !== '/' && location.pathname !== '/login' && location.pathname !== '/register' && location.pathname !== '/join' && !isPlayPage && <Navbar />}
      <main className={`main-content ${user && !isPlayPage ? 'with-sidebar' : !user && (isPublicPage || isPlayPage) ? 'public-page' : ''}`}>
        <Routes>
          {/* Shared routes - different components for guest vs logged-in */}
          <Route path="/" element={user ? <LoggedInHome /> : <GuestHome />} />
          <Route path="/login" element={user ? <LoggedInLogin /> : <GuestLogin />} />
          <Route path="/register" element={user ? <LoggedInRegister /> : <GuestRegister />} />
          <Route path="/join" element={user ? <LoggedInJoinQuiz /> : <GuestJoinQuiz />} />
          <Route path="/play/:sessionId" element={user ? <LoggedInPlayQuiz /> : <GuestPlayQuiz />} />
          
          {/* Logged-in only routes */}
          <Route path="/quiz" element={<PrivateRoute><Quiz /></PrivateRoute>} />
          <Route path="/create-quiz" element={<PrivateRoute><CreateQuiz /></PrivateRoute>} />
          <Route path="/edit-quiz/:id" element={<PrivateRoute><EditQuiz /></PrivateRoute>} />
          <Route path="/host/:sessionId" element={<PrivateRoute><HostQuiz /></PrivateRoute>} />
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

