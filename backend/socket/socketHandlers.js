const Session = require('../models/Session');

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

        // Add participant
        const existingParticipant = session.participants.find(
          p => p.socketId === socket.id || (userId && p.userId?.toString() === userId)
        );

        if (!existingParticipant) {
          session.participants.push({
            userId: userId || null,
            username,
            socketId: socket.id,
            score: 0,
            answers: []
          });
        } else {
          existingParticipant.socketId = socket.id;
          if (username) existingParticipant.username = username;
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

          // Sort participants by score and filter out Host
          const students = session.participants.filter(p => p.username !== 'Host');
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

        // Sort participants by score and filter out Host
        const students = session.participants.filter(p => p.username !== 'Host');
        students.sort((a, b) => b.score - a.score);

        io.to(`session-${sessionId}`).emit('quiz-completed', {
          leaderboard: students.map(p => ({
            username: p.username,
            score: p.score
          }))
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Participant submits answer
    socket.on('submit-answer', async ({ sessionId, questionIndex, answer, timeTaken }) => {
      try {
        const session = await Session.findById(sessionId).populate('quizId');
        if (!session || session.status !== 'active') {
          return;
        }

        const question = session.quizId.questions[questionIndex];
        if (!question) {
          return;
        }

        const participant = session.participants.find(p => p.socketId === socket.id);
        if (!participant) {
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
        // Find and remove participant from sessions
        const sessions = await Session.find({
          'participants.socketId': socket.id,
          status: { $in: ['waiting', 'active'] }
        });

        for (const session of sessions) {
          session.participants = session.participants.filter(p => p.socketId !== socket.id);
          await session.save();
          
          io.to(`session-${session._id}`).emit('participant-left', {
            participants: session.participants,
            participantCount: session.participants.length
          });
        }
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
      console.log('User disconnected:', socket.id);
    });
  });
};

module.exports = initializeSocketHandlers;

