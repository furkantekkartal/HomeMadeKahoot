const Session = require('../models/Session');
const StudentResult = require('../models/StudentResult');

const initializeSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join session
    socket.on('join-session', async ({ pin, userId, username }) => {
      try {
        const session = await Session.findOne({ 
          pin,
          status: { $in: ['waiting', 'active'] }
        });

        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        socket.join(`session-${session._id}`);

        // Try to find existing participant by socketId, userId, or username
        let existingParticipant = session.participants.find(p => p.socketId === socket.id);
        
        if (!existingParticipant && userId) {
          existingParticipant = session.participants.find(p => p.userId?.toString() === userId);
        }
        
        if (!existingParticipant && username && username !== 'Host') {
          // Try to find by username (for reconnections)
          existingParticipant = session.participants.find(p => p.username === username);
        }

        if (!existingParticipant) {
          // New participant
          session.participants.push({
            userId: userId || null,
            username,
            socketId: socket.id,
            score: 0,
            answers: []
          });
        } else {
          // Update existing participant (reconnection or socket change)
          existingParticipant.socketId = socket.id;
          if (username && username !== 'Host') {
            existingParticipant.username = username;
          }
          // Preserve existing score and answers
        }

        await session.save();

        // Reload session to get fresh data
        const updatedSession = await Session.findById(session._id);

        // Notify all in the session room
        io.to(`session-${session._id}`).emit('participant-joined', {
          participants: updatedSession.participants,
          participantCount: updatedSession.participants.length
        });

        socket.emit('session-joined', { sessionId: session._id });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Host starts quiz
    socket.on('start-quiz', async ({ sessionId }) => {
      try {
        const session = await Session.findById(sessionId).populate('quizId');
        if (!session || session.status !== 'waiting') {
          socket.emit('error', { message: 'Cannot start quiz' });
          return;
        }

        session.status = 'active';
        session.currentQuestionIndex = 0;
        session.startedAt = new Date();
        await session.save();

        io.to(`session-${sessionId}`).emit('quiz-started', {
          questionIndex: 0,
          question: session.quizId.questions[0]
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Host moves to next question
    socket.on('next-question', async ({ sessionId }) => {
      try {
        const session = await Session.findById(sessionId).populate('quizId');
        if (!session || session.status !== 'active') {
          return;
        }

        session.currentQuestionIndex++;
        const questions = session.quizId.questions;

        if (session.currentQuestionIndex >= questions.length) {
          // Quiz completed
          session.status = 'completed';
          session.completedAt = new Date();
          await session.save();

          // Save student results to database
          const students = session.participants.filter(p => p.username !== 'Host');
          for (const participant of students) {
            if (session.quizId) {
              const correctCount = participant.answers?.filter(a => a.isCorrect).length || 0;
              const wrongCount = (participant.answers?.length || 0) - correctCount;
              const totalQuestions = session.quizId.questions?.length || 0;
              const successPercentage = totalQuestions > 0 
                ? Math.round((correctCount / totalQuestions) * 100) 
                : 0;

              const studentResult = await StudentResult.create({
                username: participant.username,
                userId: participant.userId || null,
                sessionId: session._id,
                quizId: session.quizId._id,
                quizName: session.quizId.title,
                category: session.quizId.category,
                difficulty: session.quizId.difficulty,
                hostId: session.hostId,
                questionCount: totalQuestions,
                totalPoints: participant.score || 0,
                correctAnswers: correctCount,
                wrongAnswers: wrongCount,
                successPercentage: successPercentage,
                answers: participant.answers || [],
                completedAt: session.completedAt
              });
              
              console.log('Saved StudentResult:', {
                username: studentResult.username,
                hostId: studentResult.hostId,
                quizName: studentResult.quizName,
                totalPoints: studentResult.totalPoints
              });
            }
          }

          // Sort participants by score
          students.sort((a, b) => b.score - a.score);

          io.to(`session-${sessionId}`).emit('quiz-completed', {
            leaderboard: students.map(p => ({
              username: p.username,
              score: p.score
            }))
          });
        } else {
          await session.save();
          io.to(`session-${sessionId}`).emit('next-question', {
            questionIndex: session.currentQuestionIndex,
            question: questions[session.currentQuestionIndex]
          });
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Host finishes quiz
    socket.on('finish-quiz', async ({ sessionId }) => {
      try {
        const session = await Session.findById(sessionId).populate('quizId');
        if (!session || session.status !== 'active') {
          socket.emit('error', { message: 'Cannot finish quiz' });
          return;
        }

        session.status = 'completed';
        session.completedAt = new Date();
        await session.save();

        // Save student results to database
        const students = session.participants.filter(p => p.username !== 'Host');
        for (const participant of students) {
          if (session.quizId) {
            const correctCount = participant.answers?.filter(a => a.isCorrect).length || 0;
            const wrongCount = (participant.answers?.length || 0) - correctCount;
            const totalQuestions = session.quizId.questions?.length || 0;
            const successPercentage = totalQuestions > 0 
              ? Math.round((correctCount / totalQuestions) * 100) 
              : 0;

              const studentResult = await StudentResult.create({
                username: participant.username,
                userId: participant.userId || null,
                sessionId: session._id,
                quizId: session.quizId._id,
                quizName: session.quizId.title,
                category: session.quizId.category,
                difficulty: session.quizId.difficulty,
                hostId: session.hostId,
                questionCount: totalQuestions,
                totalPoints: participant.score || 0,
                correctAnswers: correctCount,
                wrongAnswers: wrongCount,
                successPercentage: successPercentage,
                answers: participant.answers || [],
                completedAt: session.completedAt
              });
              
              console.log('Saved StudentResult (auto-complete):', {
                username: studentResult.username,
                hostId: studentResult.hostId,
                quizName: studentResult.quizName,
                totalPoints: studentResult.totalPoints
              });
            }
          }

        // Sort participants by score
        students.sort((a, b) => b.score - a.score);

        io.to(`session-${sessionId}`).emit('quiz-completed', {
          leaderboard: students.map(p => ({
            username: p.username,
            score: p.score
          }))
        });
      } catch (error) {
        console.error('Error finishing quiz:', error);
        socket.emit('error', { message: error.message });
      }
    });

    // Participant submits answer
    socket.on('submit-answer', async ({ sessionId, questionIndex, answer, timeTaken, username }) => {
      try {
        const session = await Session.findById(sessionId).populate('quizId');
        if (!session || session.status !== 'active') {
          console.error('Cannot submit answer: session not found or not active', { sessionId, status: session?.status });
          return;
        }

        const question = session.quizId.questions[questionIndex];
        if (!question) {
          console.error('Question not found', { questionIndex, totalQuestions: session.quizId.questions.length });
          return;
        }

        // Try to find participant by socketId first
        let participant = session.participants.find(p => p.socketId === socket.id);
        
        // If not found by socketId, try to find by username (socket might have reconnected)
        if (!participant && username) {
          participant = session.participants.find(p => p.username === username && p.username !== 'Host');
          if (participant) {
            // Update socketId for reconnected participant
            participant.socketId = socket.id;
          }
        }

        if (!participant) {
          console.error('Participant not found', { socketId: socket.id, username, participants: session.participants.map(p => ({ username: p.username, socketId: p.socketId })) });
          return;
        }

        // Check if already answered
        const existingAnswer = participant.answers.find(a => a.questionIndex === questionIndex);
        if (existingAnswer) {
          return; // Already answered
        }

        const isCorrect = answer === question.correctAnswer;
        const timeBonus = Math.max(0, question.timeLimit - timeTaken);
        const points = isCorrect ? question.points + Math.floor(timeBonus * 2) : 0;

        participant.answers.push({
          questionIndex,
          answer,
          timeTaken,
          isCorrect,
          points
        });

        participant.score += points;

        await session.save();

        // Send answer confirmation
        socket.emit('answer-received', {
          isCorrect,
          points,
          totalScore: participant.score
        });

        // Update host with answer stats
        io.to(`session-${sessionId}`).emit('answer-update', {
          questionIndex,
          participantCount: session.participants.length,
          answeredCount: session.participants.filter(p => 
            p.answers.some(a => a.questionIndex === questionIndex)
          ).length
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Disconnect
    socket.on('disconnect', async () => {
      try {
        // Don't remove participants on disconnect - just clear their socketId
        // This preserves their data if they reconnect
        const sessions = await Session.find({
          'participants.socketId': socket.id,
          status: { $in: ['waiting', 'active'] }
        });

        for (const session of sessions) {
          const participant = session.participants.find(p => p.socketId === socket.id);
          if (participant && participant.username !== 'Host') {
            // Clear socketId but keep participant data
            participant.socketId = null;
            await session.save();
            
            io.to(`session-${session._id}`).emit('participant-left', {
              participants: session.participants,
              participantCount: session.participants.length
            });
          }
        }
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
      console.log('User disconnected:', socket.id);
    });
  });
};

module.exports = initializeSocketHandlers;

