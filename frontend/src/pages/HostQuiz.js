import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sessionAPI, quizAPI } from '../services/api';
import { connectSocket, getSocket } from '../services/socket';
import './HostQuiz.css';

const HostQuiz = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [participants, setParticipants] = useState([]);
  const [socket, setSocket] = useState(null);
  const [answerStats, setAnswerStats] = useState({});
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    loadSession();
    const socketInstance = connectSocket();
    setSocket(socketInstance);

    socketInstance.on('participant-joined', (data) => {
      setParticipants(data.participants || []);
    });

    socketInstance.on('answer-update', (data) => {
      setAnswerStats({
        questionIndex: data.questionIndex,
        answeredCount: data.answeredCount,
        participantCount: data.participantCount
      });
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [sessionId]);

  const loadSession = async () => {
    try {
      const sessionRes = await sessionAPI.getSession(sessionId);
      const sessionData = sessionRes.data;
      setSession(sessionData);
      setParticipants(sessionData.participants || []);
      setCurrentQuestionIndex(sessionData.currentQuestionIndex || 0);

      const quizRes = await quizAPI.getQuiz(sessionData.quizId._id);
      setQuiz(quizRes.data);
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const startQuiz = () => {
    if (socket) {
      socket.emit('start-quiz', { sessionId });
      socket.on('quiz-started', () => {
        setCurrentQuestionIndex(0);
      });
    }
  };

  const nextQuestion = () => {
    if (socket) {
      socket.emit('next-question', { sessionId });
      socket.on('next-question', (data) => {
        setCurrentQuestionIndex(data.questionIndex);
        setAnswerStats({});
      });
      socket.on('quiz-completed', (data) => {
        setQuizCompleted(true);
        setLeaderboard(data.leaderboard || []);
      });
    }
  };

  if (!session || !quiz) {
    return <div className="loading">Loading...</div>;
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const isWaiting = session.status === 'waiting';
  const isActive = session.status === 'active';

  return (
    <div className="host-quiz">
      <div className="host-header">
        <div>
          <h1>{quiz.title}</h1>
          <p>PIN: <strong>{session.pin}</strong></p>
          <p>Participants: {participants.length}</p>
        </div>
        {isWaiting && (
          <button onClick={startQuiz} className="btn btn-success btn-large">
            Start Quiz
          </button>
        )}
      </div>

      {isWaiting && (
        <div className="waiting-screen card">
          <h2>Waiting for participants...</h2>
          <p>Share this PIN: <strong className="pin-display">{session.pin}</strong></p>
          <div className="participants-list">
            <h3>Participants ({participants.length})</h3>
            {participants.length === 0 ? (
              <p>No participants yet</p>
            ) : (
              <ul>
                {participants.map((p, idx) => (
                  <li key={idx}>{p.username || `Participant ${idx + 1}`}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {isActive && !quizCompleted && currentQuestion && (
        <div className="question-display card">
          <div className="question-header">
            <span>Question {currentQuestionIndex + 1} of {quiz.questions.length}</span>
            <span>
              {answerStats.answeredCount || 0} / {answerStats.participantCount || participants.length} answered
            </span>
          </div>
          <h2 className="question-text">{currentQuestion.questionText}</h2>
          <div className="options-display">
            {currentQuestion.options.map((option, idx) => (
              <div key={idx} className={`option-box option-${idx + 1}`}>
                <div className="option-letter">{String.fromCharCode(65 + idx)}</div>
                <div className="option-text">{option}</div>
              </div>
            ))}
          </div>
          <div className="question-actions">
            <button onClick={nextQuestion} className="btn btn-primary btn-large">
              {currentQuestionIndex === quiz.questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
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
              {leaderboard.map((entry, idx) => (
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

