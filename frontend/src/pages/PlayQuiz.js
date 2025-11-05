import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { sessionAPI, quizAPI } from '../services/api';
import { connectSocket } from '../services/socket';
import './PlayQuiz.css';

const PlayQuiz = () => {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [timeLeft, setTimeLeft] = useState(20);
  const [username, setUsername] = useState(location.state?.username || null);
  const studentJoinedRef = useRef(false);
  const initialLoadRef = useRef(false);

  useEffect(() => {
    const socketInstance = connectSocket();
    setSocket(socketInstance);

    // Check if already connected
    if (socketInstance.connected) {
      setSocketConnected(true);
    }

    const handleConnect = () => {
      setSocketConnected(true);
    };

    const handleDisconnect = () => {
      setSocketConnected(false);
    };

    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);
    
    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socketInstance.on('session-joined', () => {
      // Session joined successfully
    });

    socketInstance.on('quiz-started', (data) => {
      setQuizStarted(true);
      setCurrentQuestion(data.question);
      setCurrentQuestionIndex(data.questionIndex);
      setTimeLeft(data.question.timeLimit || 20);
    });

    socketInstance.on('next-question', (data) => {
      // Only update if teacher is ahead or if student hasn't manually navigated
      if (data.questionIndex >= currentQuestionIndex) {
        setCurrentQuestion(data.question);
        setCurrentQuestionIndex(data.questionIndex);
        setSelectedAnswer(null);
        setAnswered(false);
        setTimeLeft(data.question.timeLimit || 20);
        setScore(0);
      }
    });

    socketInstance.on('quiz-completed', (data) => {
      setQuizCompleted(true);
      setLeaderboard(data.leaderboard || []);
    });

    socketInstance.on('answer-received', (data) => {
      setScore(data.points);
      setTotalScore(data.totalScore);
      setAnswered(true);
    });

    socketInstance.on('error', (data) => {
      console.error('Socket error:', data);
      alert(data.message || 'An error occurred');
    });

    // Load session data first (doesn't require socket)
    loadSession();

    return () => {
      socketInstance.off('connect', handleConnect);
      socketInstance.off('disconnect', handleDisconnect);
      // Don't disconnect - let the socket service manage it
      // socketInstance.disconnect();
    };
  }, [sessionId]);

  const loadSession = async () => {
    try {
      const sessionRes = await sessionAPI.getSession(sessionId);
      const sessionData = sessionRes.data;
      setSession(sessionData);
      setQuizStarted(sessionData.status === 'active');

      const quizRes = await quizAPI.getQuiz(sessionData.quizId._id);
      const quizData = quizRes.data;
      setQuiz(quizData);

      // If quiz is already active, load the current question
      if (sessionData.status === 'active' && quizData.questions && quizData.questions.length > 0) {
        const currentIndex = sessionData.currentQuestionIndex || 0;
        if (quizData.questions[currentIndex]) {
          setCurrentQuestion(quizData.questions[currentIndex]);
          setCurrentQuestionIndex(currentIndex);
          setTimeLeft(quizData.questions[currentIndex].timeLimit || 20);
        }
      }
    } catch (error) {
      console.error('Error loading session:', error);
      alert('Error loading quiz session');
    }
  };

  // Join session when socket is connected and session is loaded
  useEffect(() => {
    if (!socket || !session || !session.pin || studentJoinedRef.current) {
      return;
    }

    const studentUsername = location.state?.username || username || `User${Math.floor(Math.random() * 1000)}`;
    
    // Store username in state for later use
    if (!username) {
      setUsername(studentUsername);
    }
    
    const joinSession = () => {
      if (studentJoinedRef.current) return;
      studentJoinedRef.current = true;
      
      socket.emit('join-session', {
        pin: session.pin,
        userId: null,
        username: studentUsername
      });
    };

    if (socket.connected || socketConnected) {
      joinSession();
    } else {
      const connectHandler = () => joinSession();
      socket.once('connect', connectHandler);
      
      setTimeout(() => {
        if (!studentJoinedRef.current && socket.connected) {
          socket.off('connect', connectHandler);
          joinSession();
        }
      }, 1000);
    }
  }, [socket, socketConnected, session]);

  // Load current question if quiz is already active (only on initial load)
  useEffect(() => {
    if (quizStarted && session && session.status === 'active' && quiz && quiz.questions && !initialLoadRef.current) {
      const sessionIndex = session.currentQuestionIndex !== undefined ? session.currentQuestionIndex : 0;
      if (quiz.questions[sessionIndex]) {
        setCurrentQuestion(quiz.questions[sessionIndex]);
        setCurrentQuestionIndex(sessionIndex);
        setTimeLeft(quiz.questions[sessionIndex].timeLimit || 20);
        initialLoadRef.current = true;
      }
    }
  }, [quizStarted, session?.status, quiz?.questions?.length]);

  useEffect(() => {
    if (timeLeft > 0 && quizStarted && !answered && !quizCompleted && currentQuestion) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !answered && currentQuestion) {
      // Time's up, auto-submit no answer
      handleSubmitAnswer(null);
    }
  }, [timeLeft, quizStarted, answered, quizCompleted, currentQuestion]);


  const handleSubmitAnswer = (answerIndex) => {
    if (answered || !currentQuestion) return;

    const timeTaken = (currentQuestion.timeLimit || 20) - timeLeft;
    setSelectedAnswer(answerIndex);
    setAnswered(true);

    if (socket) {
      const studentUsername = location.state?.username || username || `User${Math.floor(Math.random() * 1000)}`;
      socket.emit('submit-answer', {
        sessionId,
        questionIndex: currentQuestionIndex,
        answer: answerIndex,
        timeTaken,
        username: studentUsername
      });
    }
  };

  if (!session || !quiz) {
    return <div className="loading">Loading...</div>;
  }

  if (!quizStarted && session.status === 'waiting') {
    return (
      <div className="play-quiz">
        <div className="waiting-screen card">
          <h2>Waiting for quiz to start...</h2>
          <p>You're all set! The host will start the quiz soon.</p>
          <div className="quiz-info">
            <h3>{quiz.title}</h3>
            <p>Category: {quiz.category}</p>
            <p>Difficulty: {quiz.difficulty}</p>
          </div>
        </div>
      </div>
    );
  }

  if (quizCompleted) {
    return (
      <div className="play-quiz">
        <div className="results-screen card">
          <h2>Quiz Completed! 🎉</h2>
          <div className="your-score">
            <h3>Your Score</h3>
            <div className="score-display">{totalScore} points</div>
          </div>
          <div className="leaderboard">
            <h3>Leaderboard</h3>
            <ol>
              {leaderboard.filter(entry => entry.username !== 'Host').map((entry, idx) => (
                <li key={idx} className={entry.username === username ? 'you' : ''}>
                  <span className="rank">{idx + 1}</span>
                  <span className="name">{entry.username}</span>
                  <span className="score">{entry.score} pts</span>
                </li>
              ))}
            </ol>
          </div>
          <button onClick={() => navigate('/join')} className="btn btn-primary">
            Join Another Quiz
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return <div className="loading">Waiting for question...</div>;
  }

  const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

  return (
    <div className="play-quiz">
      <div className="play-header">
        <div className="score-display-small">Score: {totalScore}</div>
        <div className="question-counter">
          Question {currentQuestionIndex + 1} of {quiz.questions.length}
        </div>
        <div className="timer">{timeLeft}s</div>
      </div>

      <div className="question-display card">
        <h2 className="question-text">{currentQuestion.questionText}</h2>
        {currentQuestion.imageUrl && (
          <div className="question-image-container">
            <img src={currentQuestion.imageUrl} alt="Question" className="question-image" />
          </div>
        )}
        <div className="options-grid">
          {currentQuestion.options.map((option, idx) => {
            let optionClass = 'option-button';
            if (answered) {
              if (idx === currentQuestion.correctAnswer) {
                optionClass += ' correct';
              } else if (idx === selectedAnswer && !isCorrect) {
                optionClass += ' incorrect';
              }
            } else if (selectedAnswer === idx) {
              optionClass += ' selected';
            }

            return (
              <button
                key={idx}
                className={optionClass}
                onClick={() => !answered && handleSubmitAnswer(idx)}
                disabled={answered}
              >
                <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
                <span className="option-text">{option}</span>
              </button>
            );
          })}
        </div>
        {answered && (
          <div className={`answer-feedback ${isCorrect ? 'correct' : 'incorrect'}`}>
            {isCorrect ? '✓ Correct!' : '✗ Wrong Answer'}
            {score > 0 && <div className="points-earned">+{score} points</div>}
            {currentQuestionIndex < quiz.questions.length - 1 ? (
              <button
                onClick={() => {
                  // Move to next question
                  const nextIndex = currentQuestionIndex + 1;
                  setCurrentQuestionIndex(nextIndex);
                  setCurrentQuestion(quiz.questions[nextIndex]);
                  setSelectedAnswer(null);
                  setAnswered(false);
                  setTimeLeft(quiz.questions[nextIndex].timeLimit || 20);
                  setScore(0); // Reset score for next question
                }}
                className="btn btn-primary"
                style={{ marginTop: '1rem' }}
              >
                Next Question →
              </button>
            ) : (
              <button
                onClick={() => {
                  if (window.opener || window.history.length <= 1) {
                    window.close();
                    setTimeout(() => {
                      if (!document.hidden) {
                        navigate('/');
                      }
                    }, 100);
                  } else {
                    navigate('/');
                  }
                }}
                className="btn btn-success"
                style={{ marginTop: '1rem', fontSize: '1.2rem', padding: '1rem 2rem', fontWeight: 'bold' }}
              >
                ✓ Finish Quiz
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayQuiz;

