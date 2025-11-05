import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sessionAPI, quizAPI } from '../services/api';
import { connectSocket } from '../services/socket';
import './HostQuiz.css';

const HostQuiz = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [participants, setParticipants] = useState([]);
  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [answerStats, setAnswerStats] = useState({});
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false);
  const sessionLoadedRef = useRef(false);
  const hostJoinedRef = useRef(false);

  useEffect(() => {
    const socketInstance = connectSocket();
    setSocket(socketInstance);

    // Define loadSession handler first
    const handleLoadSession = (isRefresh = false) => {
      if (loadingRef.current && !isRefresh) {
        return;
      }

      loadingRef.current = true;
      if (!isRefresh) {
        setError(null);
      }

      sessionAPI.getSession(sessionId)
        .then(sessionRes => {
          const sessionData = sessionRes.data;
          setSession(sessionData);
          if (sessionData.participants && Array.isArray(sessionData.participants)) {
            setParticipants(sessionData.participants);
          } else {
            setParticipants([]);
          }
          setCurrentQuestionIndex(sessionData.currentQuestionIndex || 0);

          return quizAPI.getQuiz(sessionData.quizId._id);
        })
        .then(quizRes => {
          setQuiz(quizRes.data);
          setLoading(false);
          sessionLoadedRef.current = true;
          loadingRef.current = false;
        })
        .catch(error => {
          console.error('Error loading session:', error);
          loadingRef.current = false;
          
          if (!isRefresh) {
            setLoading(false);
            if (error.response) {
              setError(`Server error: ${error.response.data?.message || error.message}`);
            } else if (error.request) {
              setError('Cannot connect to server. Please make sure the backend is running on port 5000.');
            } else {
              setError(`Error: ${error.message}`);
            }
          }
        });
    };

    // Set up event listeners (only once)
    const handleParticipantJoined = (data) => {
      if (data && data.participants && Array.isArray(data.participants)) {
        setParticipants(data.participants);
      }
      // Refresh from server to ensure we have latest data
      setTimeout(() => {
        sessionAPI.getSession(sessionId)
          .then(sessionRes => {
            const sessionData = sessionRes.data;
            if (sessionData.participants && Array.isArray(sessionData.participants)) {
              setParticipants(sessionData.participants);
            }
          })
          .catch(err => console.error('Error refreshing participants:', err));
      }, 300);
    };

    const handleQuizStarted = () => {
      setCurrentQuestionIndex(0);
      handleLoadSession(true);
    };

    const handleNextQuestion = (data) => {
      // Update current question index for highlighting
      setCurrentQuestionIndex(data.questionIndex);
      setAnswerStats({});
      // Refresh session to get updated participant stats
      handleLoadSession(true);
    };

    const handleQuizCompleted = (data) => {
      setQuizCompleted(true);
      setLeaderboard(data.leaderboard || []);
    };

    const handleAnswerUpdate = (data) => {
      setAnswerStats({
        questionIndex: data.questionIndex,
        answeredCount: data.answeredCount,
        participantCount: data.participantCount
      });
    };

    const handleConnect = () => {
      setSocketConnected(true);
      if (!sessionLoadedRef.current) {
        handleLoadSession();
      }
    };

    const handleDisconnect = () => {
      setSocketConnected(false);
    };

    const handleError = (error) => {
      console.error('Socket error:', error);
    };

    // Register event listeners
    socketInstance.on('participant-joined', handleParticipantJoined);
    socketInstance.on('quiz-started', handleQuizStarted);
    socketInstance.on('next-question', handleNextQuestion);
    socketInstance.on('quiz-completed', handleQuizCompleted);
    socketInstance.on('answer-update', handleAnswerUpdate);
    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);
    socketInstance.on('error', handleError);

    // Check if already connected
    if (socketInstance.connected) {
      handleConnect();
    }

    // Load session initially
    handleLoadSession();

    return () => {
      // Remove event listeners on cleanup
      socketInstance.off('participant-joined', handleParticipantJoined);
      socketInstance.off('quiz-started', handleQuizStarted);
      socketInstance.off('next-question', handleNextQuestion);
      socketInstance.off('quiz-completed', handleQuizCompleted);
      socketInstance.off('answer-update', handleAnswerUpdate);
      socketInstance.off('connect', handleConnect);
      socketInstance.off('disconnect', handleDisconnect);
      socketInstance.off('error', handleError);
    };
  }, [sessionId]);

  // Join session when session is loaded and socket is connected
  useEffect(() => {
    if (session && socket && socketConnected && !hostJoinedRef.current) {
      hostJoinedRef.current = true;
      
      socket.emit('join-session', {
        pin: session.pin,
        userId: null,
        username: 'Host'
      });
      
      // Load participants after joining
      setTimeout(() => {
        sessionAPI.getSession(sessionId)
          .then(sessionRes => {
            const sessionData = sessionRes.data;
            if (sessionData.participants && Array.isArray(sessionData.participants)) {
              setParticipants(sessionData.participants);
            }
          })
          .catch(err => console.error('Error loading participants:', err));
      }, 800);
    }
  }, [session, socket, socketConnected, sessionId]);

  // Periodically refresh participants list and stats (only if no error)
  useEffect(() => {
    if (session && !error) {
      const interval = setInterval(() => {
        if (!loadingRef.current) {
          loadingRef.current = true;
          sessionAPI.getSession(sessionId)
            .then(sessionRes => {
              const sessionData = sessionRes.data;
              if (sessionData.participants && Array.isArray(sessionData.participants)) {
                setParticipants(sessionData.participants);
              }
              setSession(sessionData);
              loadingRef.current = false;
            })
            .catch(err => {
              console.error('Error refreshing participants:', err);
              loadingRef.current = false;
            });
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [session, error, sessionId]);


  const startQuiz = async () => {
    if (!socket) {
      alert('Socket not initialized. Please refresh the page.');
      return;
    }

    if (!socket.connected) {
      alert('Please wait for connection. The button will be enabled when connected.');
      return;
    }

    if (sessionId) {
      socket.emit('start-quiz', { sessionId });
      // Reload session to get updated status after a delay
      setTimeout(() => {
        sessionAPI.getSession(sessionId)
          .then(sessionRes => {
            const sessionData = sessionRes.data;
            setSession(sessionData);
            setParticipants(sessionData.participants || []);
            setCurrentQuestionIndex(sessionData.currentQuestionIndex || 0);
          })
          .catch(err => console.error('Error reloading session:', err));
      }, 1000);
    } else {
      alert('Session ID not found. Please refresh the page.');
    }
  };

  // Removed nextQuestion function - students navigate independently now

  if (loading) {
    return <div className="loading">Loading session...</div>;
  }

  if (error) {
    return (
      <div className="host-quiz">
        <div className="error-screen card">
          <h2>❌ Error Loading Session</h2>
          <p>{error}</p>
          <div className="error-help">
            <h3>Please check:</h3>
            <ul>
              <li>Backend server is running on port 5000</li>
              <li>Run: <code>cd backend && npm start</code></li>
              <li>Check browser console for more details</li>
            </ul>
            <button onClick={() => window.location.reload()} className="btn btn-primary">
              Reload Page
            </button>
            <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session || !quiz) {
    return <div className="loading">Loading session data...</div>;
  }

  const isWaiting = session.status === 'waiting';
  const isActive = session.status === 'active';

  return (
    <div className="host-quiz">
      <div className="host-header">
        <div>
          <h1>{quiz.title}</h1>
          <p>PIN: <strong>{session.pin}</strong></p>
          <p>Participants: {participants.filter(p => p.username !== 'Host').length} {participants.filter(p => p.username !== 'Host').length === 1 ? 'student' : 'students'}</p>
          <p>Connection: {socketConnected ? '✅ Connected' : '❌ Disconnected'}</p>
        </div>
        {isWaiting && (
          <button 
            onClick={startQuiz} 
            className="btn btn-success btn-large"
            disabled={!socketConnected}
          >
            {socketConnected ? 'Start Quiz' : 'Connecting...'}
          </button>
        )}
      </div>

      {isWaiting && (
        <div className="waiting-screen card">
          <h2>Waiting for participants...</h2>
          <p>Share this PIN: <strong className="pin-display">{session.pin}</strong></p>
          <div className="participants-list">
            <h3>Participants ({participants.filter(p => p && p.username !== 'Host').length})</h3>
            {participants.filter(p => p && p.username !== 'Host').length === 0 ? (
              <p>No participants yet. Students can join using the PIN above.</p>
            ) : (
              <ul>
                {participants.filter(p => p && p.username !== 'Host').map((p, idx) => (
                  <li key={p.socketId || p.userId || `p-${idx}`}>
                    {p.username || `Participant ${idx + 1}`}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {isActive && !quizCompleted && quiz && quiz.questions && (
        <div className="all-questions-display">
          <div className="questions-header card">
            <h2>All Questions</h2>
            <p>Participants: {participants.filter(p => p && p.username !== 'Host').length} students</p>
          </div>
          <div className="questions-list">
            {quiz.questions.map((question, idx) => (
              <div key={idx} className={`question-card card ${idx === currentQuestionIndex ? 'active-question' : ''}`}>
                <div className="question-number">Question {idx + 1} of {quiz.questions.length}</div>
                <h3 className="question-text">{question.questionText}</h3>
                <div className="options-display">
                  {question.options.map((option, optIdx) => (
                    <div key={optIdx} className={`option-box option-${optIdx + 1}`}>
                      <div className="option-letter">{String.fromCharCode(65 + optIdx)}</div>
                      <div className="option-text">{option}</div>
                      {optIdx === question.correctAnswer && (
                        <span className="correct-mark">✓ Correct</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="students-stats card">
            <h3>Student Progress</h3>
            <div className="stats-list">
              {participants.filter(p => p && p.username !== 'Host').map((participant, idx) => {
                const totalQuestions = quiz.questions.length;
                const answeredCount = participant.answers ? participant.answers.length : 0;
                const correctCount = participant.answers ? participant.answers.filter(a => a.isCorrect).length : 0;
                const wrongCount = answeredCount - correctCount;
                
                return (
                  <div key={participant.socketId || participant.userId || idx} className="student-stat">
                    <span className="student-name">{participant.username || `Participant ${idx + 1}`}</span>
                    <span className="stat-separator">|</span>
                    <span className="stat-item">{answeredCount}/{totalQuestions}</span>
                    <span className="stat-separator">|</span>
                    <span className="stat-correct">{correctCount} Correct</span>
                    <span className="stat-separator">-</span>
                    <span className="stat-wrong">{wrongCount} Wrong</span>
                  </div>
                );
              })}
              {participants.filter(p => p && p.username !== 'Host').length === 0 && (
                <p style={{ color: '#718096', textAlign: 'center', padding: '1rem' }}>
                  No students have joined yet
                </p>
              )}
            </div>
          </div>
          <div className="question-actions card">
            <button 
              onClick={async () => {
                if (socket && sessionId) {
                  socket.emit('finish-quiz', { sessionId });
                  // Reload to get updated status
                  setTimeout(() => {
                    sessionAPI.getSession(sessionId)
                      .then(sessionRes => {
                        const sessionData = sessionRes.data;
                        setSession(sessionData);
                        if (sessionData.status === 'completed') {
                          setQuizCompleted(true);
                        }
                      })
                      .catch(err => console.error('Error:', err));
                  }, 500);
                }
              }}
              className="btn btn-success btn-large"
            >
              Finish Quiz
            </button>
          </div>
        </div>
      )}

      {quizCompleted && (
        <div className="results-screen card">
          <h2>Quiz Completed! 🎉</h2>
          <div className="leaderboard">
            <h3>Leaderboard</h3>
            <ol>
              {leaderboard.filter(entry => entry.username !== 'Host').map((entry, idx) => (
                <li key={idx} className={idx === 0 ? 'winner' : ''}>
                  <span className="rank">{idx + 1}</span>
                  <span className="name">{entry.username}</span>
                  <span className="score">{entry.score} pts</span>
                </li>
              ))}
            </ol>
          </div>
          <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
            Back to Dashboard
          </button>
        </div>
      )}
    </div>
  );
};

export default HostQuiz;

