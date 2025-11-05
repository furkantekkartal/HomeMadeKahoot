import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Common/Navbar';
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
import './App.css';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <main className="main-content">
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
              <Route path="/browse" element={<BrowseQuizzes />} />
              <Route path="/results" element={<PrivateRoute><Results /></PrivateRoute>} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

