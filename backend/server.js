// Load environment variables based on NODE_ENV
// Supports: local, development, production
// This allows running all three simultaneously on different ports
const env = process.env.NODE_ENV || 'local';
const fs = require('fs');
const path = require('path');

// Map environment to env file
let envFile;
if (env === 'production') {
  envFile = '.env.prod';
} else if (env === 'development') {
  envFile = '.env.dev';
} else {
  envFile = '.env.local'; // local environment
}

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
const mongoose = require('mongoose');
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

// Load Cloudflare config if available
const { getCloudflareConfig } = require('./utils/cloudflareConfig');
const cloudflareConfig = getCloudflareConfig();

// Determine frontend URL based on environment
let frontendUrl;
if (cloudflareConfig && cloudflareConfig.frontend) {
  // Use Cloudflare URL for development/production (when available)
  frontendUrl = cloudflareConfig.frontend;
} else {
  // Fallback: Use FRONTEND_URL environment variable first (for Render/production)
  // Then fall back to localhost based on environment
  if (process.env.FRONTEND_URL) {
    frontendUrl = process.env.FRONTEND_URL;
  } else {
    const env = process.env.NODE_ENV || 'local';
    if (env === 'local') {
      frontendUrl = 'http://localhost:3010';
    } else if (env === 'development') {
      frontendUrl = 'http://localhost:3020';
    } else if (env === 'production') {
      frontendUrl = 'http://localhost:3030';
    } else {
      frontendUrl = 'http://localhost:3000';
    }
  }
}
frontendUrl = frontendUrl.replace(/\/$/, ''); // Remove trailing slash

// Support multiple origins: configured frontend URL + all environment ports + Cloudflare tunnel
// This allows access from both Cloudflare tunnels and localhost
const allowedOrigins = [
  frontendUrl,
  'http://localhost:3010', // Local frontend
  'http://localhost:3020', // Development frontend
  'http://localhost:3030', // Production frontend
  'http://127.0.0.1:3010',
  'http://127.0.0.1:3020',
  'http://127.0.0.1:3030',
  // Legacy ports (for backward compatibility)
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001'
];

// Add Cloudflare frontend URL if configured
if (cloudflareConfig && cloudflareConfig.frontend) {
  allowedOrigins.push(cloudflareConfig.frontend);
}

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin matches any allowed origin (exact match)
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    
    // Check if origin matches when converting http to https (for Cloudflare/Render)
    const isAllowed = allowedOrigins.some(allowed => {
      // Direct match
      if (origin === allowed) return true;
      // Match when converting http to https
      if (origin === allowed.replace('http://', 'https://')) return true;
      // Match when converting https to http (for local testing)
      if (origin === allowed.replace('https://', 'http://')) return true;
      // Match subdomains (for Render URLs like *.onrender.com)
      if (origin.startsWith(allowed.replace('http://', 'https://'))) return true;
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
      return;
    }
    
    // Allow Render URLs (onrender.com domain)
    if (origin.includes('onrender.com')) {
      callback(null, true);
      return;
    }
    
    // For development, allow localhost origins
    const env = process.env.NODE_ENV || 'development';
    if (env === 'development' && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      callback(null, true);
      return;
    }
    
    // Reject all other origins
    callback(new Error('Not allowed by CORS'));
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
  try {
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
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Health check failed',
      error: error.message 
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

