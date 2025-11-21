// Load environment variables based on NODE_ENV
// This allows running both dev and prod simultaneously
const env = process.env.NODE_ENV || 'development';
const envFile = env === 'production' ? '.env.prod' : '.env.dev';
const fs = require('fs');
const path = require('path');

// Try to load the environment-specific file, fallback to .env if not found
const envPath = path.join(__dirname, envFile);
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
  console.log(`Loaded environment file: ${envFile} (${env})`);
} else {
  // Fallback to default .env
  require('dotenv').config();
  console.log(`Warning: ${envFile} not found, using default .env`);
}

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

// Support multiple origins: configured frontend URL + localhost variants
// This allows access from both Cloudflare tunnels and localhost
const allowedOrigins = [
  frontendUrl,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin matches any allowed origin
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Also allow if origin starts with any allowed origin (for subdomains)
      const isAllowed = allowedOrigins.some(allowed => origin.startsWith(allowed.replace('http://', 'https://')));
      if (isAllowed) {
        callback(null, true);
      } else {
        // For development, allow localhost origins
        const env = process.env.NODE_ENV || 'development';
        if (env === 'development' && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    }
  },
  credentials: true
};

const io = socketIo(server, {
  cors: {
    origin: corsOptions.origin,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['polling', 'websocket'], // Allow polling as fallback
  allowEIO3: true // Support older clients
});

// Middleware - configure CORS to match Socket.io
app.use(cors(corsOptions));
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

// Health check
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  const dbStatus = mongoose.connection.readyState;
  const dbConnected = dbStatus === 1; // 1 = connected
  const dbName = mongoose.connection.name || 'unknown';
  const env = process.env.NODE_ENV || 'development';
  
  res.json({ 
    status: 'ok', 
    message: 'HomeMadeKahoot API is running',
    environment: env,
    database: {
      connected: dbConnected,
      name: dbName,
      status: dbConnected ? 'connected' : 'disconnected'
    }
  });
});

// Initialize socket handlers
initializeSocketHandlers(io);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

