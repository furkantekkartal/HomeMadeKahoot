import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { quizAPI, sessionAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useStudyTimer } from '../hooks/useStudyTimer';
import './SelfPacedQuiz.css';

const SelfPacedQuiz = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  
  // Study timer for tracking quiz time
  const { durationFormatted, endSession } = useStudyTimer('Quiz', true);

  useEffect(() => {
    loadQuiz();
  }, [id]);

  const loadQuiz = async () => {
    try {
      const response = await quizAPI.getQuiz(id);
      setQuiz(response.data);
    } catch (error) {
      console.error('Error loading quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = () => {
    if (!selectedAnswer !== null && selectedAnswer !== undefined) {
      const currentQuestion = quiz.questions[currentQuestionIndex];
      const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
      const points = isCorrect ? currentQuestion.points : 0;

      const answerData = {
        questionIndex: currentQuestionIndex,
        answer: selectedAnswer,
        correctAnswer: currentQuestion.correctAnswer,
        isCorrect,
        points,
        timeTaken: 0
      };

      setAnswers([...answers, answerData]);
      setScore(score + points);

      if (currentQuestionIndex === quiz.questions.length - 1) {
        completeQuiz([...answers, answerData]);
      } else {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedAnswer(null);
      }
    }
  };

  const completeQuiz = async (finalAnswers) => {
    setQuizCompleted(true);
    
    // End the study session to save quiz time
    if (endSession) {
      try {
        await endSession();
      } catch (error) {
        console.error('Error ending study session:', error);
      }
    }
    
    if (user) {
      try {
        const correctAnswers = finalAnswers.filter(a => a.isCorrect).length;
        await sessionAPI.saveResult({
          sessionId: null,
          quizId: quiz._id,
          score,
          totalQuestions: quiz.questions.length,
          correctAnswers,
          answers: finalAnswers,
          mode: 'self-paced'
        });
      } catch (error) {
        console.error('Error saving result:', error);
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!quiz) {
    return <div className="error-message">Quiz not found</div>;
  }

  if (quizCompleted) {
    const correctCount = answers.filter(a => a.isCorrect).length;
    const percentage = Math.round((correctCount / quiz.questions.length) * 100);

    return (
      <div className="self-paced-quiz">
        <div className="results-screen card">
          <h2>Quiz Completed! 🎉</h2>
          <div className="results-summary">
            <div className="stat">
              <div className="stat-value">{correctCount}</div>
              <div className="stat-label">Correct</div>
            </div>
            <div className="stat">
              <div className="stat-value">{quiz.questions.length - correctCount}</div>
              <div className="stat-label">Incorrect</div>
            </div>
            <div className="stat">
              <div className="stat-value">{score}</div>
              <div className="stat-label">Total Score</div>
            </div>
            <div className="stat">
              <div className="stat-value">{percentage}%</div>
              <div className="stat-label">Accuracy</div>
            </div>
          </div>
          <div className="results-actions">
            <button onClick={() => navigate('/')} className="btn btn-primary">
              Go Home
            </button>
            {user && (
              <button onClick={() => navigate('/results')} className="btn btn-secondary">
                View All Results
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];

  return (
    <div className="self-paced-quiz">
      <div className="quiz-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h1>{quiz.title}</h1>
          <div style={{ fontSize: '1rem', color: '#666', fontWeight: '500' }}>
            ⏱️ {durationFormatted}
          </div>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
          ></div>
        </div>
        <p>Question {currentQuestionIndex + 1} of {quiz.questions.length}</p>
      </div>

      <div className="question-display card">
        <h2 className="question-text">{currentQuestion.questionText}</h2>
        <div className="options-list">
          {currentQuestion.options.map((option, idx) => (
            <button
              key={idx}
              className={`option-button ${selectedAnswer === idx ? 'selected' : ''}`}
              onClick={() => setSelectedAnswer(idx)}
            >
              <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
              <span className="option-text">{option}</span>
            </button>
          ))}
        </div>
        <div className="question-actions">
          <button
            onClick={handleSubmitAnswer}
            className="btn btn-primary btn-large"
            disabled={selectedAnswer === null}
          >
            {currentQuestionIndex === quiz.questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelfPacedQuiz;

