import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { sessionAPI, quizAPI } from '../services/api';
import { connectSocket, getSocket } from '../services/socket';
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
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [timeLeft, setTimeLeft] = useState(20);
  const username = location.state?.username || 'Participant';

  useEffect(() => {
    const socketInstance = connectSocket();
    setSocket(socketInstance);

    socketInstance.on('session-joined', () => {
      console.log('Joined session');
    });

    socketInstance.on('quiz-started', (data) => {
      setQuizStarted(true);
      setCurrentQuestion(data.question);
      setCurrentQuestionIndex(data.questionIndex);
      setTimeLeft(data.question.timeLimit || 20);
    });

    socketInstance.on('next-question', (data) => {
      setCurrentQuestion(data.question);
      setCurrentQuestionIndex(data.questionIndex);
      setSelectedAnswer(null);
      setAnswered(false);
      setTimeLeft(data.question.timeLimit || 20);
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
      alert(data.message || 'An error occurred');
    });

    loadSession(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [sessionId]);

  const loadSession = async (socketInstance) => {
    try {
      const sessionRes = await sessionAPI.getSession(sessionId);
      const sessionData = sessionRes.data;
      setSession(sessionData);
      setQuizStarted(sessionData.status === 'active');

      const quizRes = await quizAPI.getQuiz(sessionData.quizId._id);
      setQuiz(quizRes.data);

      // Join session after loading
      const username = location.state?.username || `User${Math.floor(Math.random() * 1000)}`;
      socketInstance.emit('join-session', {
        pin: sessionData.pin,
        userId: null,
        username
      });
    } catch (error) {
      console.error('Error loading session:', error);
      alert('Error loading quiz session');
    }
  };

  useEffect(() => {
    if (timeLeft > 0 && quizStarted && !answered && !quizCompleted) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !answered) {
      // Time's up, auto-submit no answer
      handleSubmitAnswer(null);
    }
  }, [timeLeft, quizStarted, answered, quizCompleted]);


  const handleSubmitAnswer = (answerIndex) => {
    if (answered || !currentQuestion) return;

    const timeTaken = (currentQuestion.timeLimit || 20) - timeLeft;
    setSelectedAnswer(answerIndex);
    setAnswered(true);

    if (socket) {
      socket.emit('submit-answer', {
        sessionId,
        questionIndex: currentQuestionIndex,
        answer: answerIndex,
        timeTaken
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
              {leaderboard.map((entry, idx) => (
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
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayQuiz;

