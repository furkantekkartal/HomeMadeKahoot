# HomeMadeKahoot

English learning quiz platform inspired by Kahoot.

## Quick Start

1. **Install dependencies**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Environment Variables**

   `backend/.env`:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/homemadekahoot
   JWT_SECRET=your_secret_jwt_key
   UNSPLASH_ACCESS_KEY=your_unsplash_key
   OPENROUTER_API_KEY=your_openrouter_key
   FRONTEND_URL=http://localhost:3000
   ```

3. **Run**
   ```bash
   # Use start-dev.bat or run manually:
   cd backend && npm run dev
   cd frontend && npm start
   ```

## Features

- Create quizzes with AI-generated questions and images
- Host live quiz sessions with PIN codes
- Track student performance analytics
- Profile management with picture upload

## Tech Stack

Backend: Node.js, Express, Socket.io, MongoDB  
Frontend: React, React Router, Socket.io-client

## Deployment

See DEPLOYMENT.md for instructions.
