require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth');
const quizRoutes = require('./routes/quizzes');
const sessionRoutes = require('./routes/sessions');
const studySessionRoutes = require('./routes/studySessions');
const wordRoutes = require('./routes/words');
const flashcardRoutes = require('./routes/flashcards');
const pronunciationRoutes = require('./routes/pronunciation');
const statisticsRoutes = require('./routes/statistics');

// Socket handlers
const initializeSocketHandlers = require('./socket/socketHandlers');

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// Normalize FRONTEND_URL - remove trailing slash to avoid CORS issues
const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, '');

const io = socketIo(server, {
  cors: {
    origin: frontendUrl,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['polling', 'websocket'], // Allow polling as fallback
  allowEIO3: true // Support older clients
});

// Middleware - configure CORS to match Socket.io
app.use(cors({
  origin: frontendUrl,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/study-sessions', studySessionRoutes);
app.use('/api/words', wordRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/pronunciation', pronunciationRoutes);
app.use('/api/statistics', statisticsRoutes);

// Health check - basic
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'HomeMadeKahoot API is running' });
});

// Health check with database connection test
app.get('/api/health/check', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const dbState = mongoose.connection.readyState;
    
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const isDbConnected = dbState === 1;
    
    const healthStatus = {
      backend: 'ok',
      database: isDbConnected ? 'ok' : 'error',
      databaseState: dbState,
      timestamp: new Date().toISOString()
    };
    
    if (isDbConnected) {
      // Try a simple database operation to verify connection
      try {
        await mongoose.connection.db.admin().ping();
        healthStatus.database = 'ok';
        healthStatus.message = 'Backend and database are connected';
      } catch (dbError) {
        healthStatus.database = 'error';
        healthStatus.databaseError = dbError.message;
        healthStatus.message = 'Backend is running but database ping failed';
      }
    } else {
      healthStatus.message = 'Backend is running but database is not connected';
    }
    
    const statusCode = isDbConnected ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    res.status(503).json({
      backend: 'error',
      database: 'unknown',
      error: error.message,
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Initialize socket handlers
initializeSocketHandlers(io);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

