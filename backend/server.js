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
const wordRoutes = require('./routes/words');
const flashcardRoutes = require('./routes/flashcards');

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
app.use('/api/words', wordRoutes);
app.use('/api/flashcards', flashcardRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'HomeMadeKahoot API is running' });
});

// Initialize socket handlers
initializeSocketHandlers(io);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

