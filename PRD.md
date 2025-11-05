# Product Requirements Document (PRD)
## HomeMadeKahoot - English Learning Game Platform

### 1. Project Overview
HomeMadeKahoot is a web-based English learning application inspired by Kahoot, designed to make language learning engaging and interactive through game-based quizzes.

### 2. Core Features

#### 2.1 User Authentication
- User registration (email, username, password)
- User login with JWT tokens
- User profile management
- Password reset functionality (future enhancement)

#### 2.2 Quiz Management
- Create quizzes with multiple-choice questions
- Edit existing quizzes
- Delete quizzes
- Support for images and videos in questions (future enhancement)
- Question bank with English learning categories:
  - Vocabulary
  - Grammar
  - Reading Comprehension
  - Listening Comprehension (future)
  - Pronunciation (future)

#### 2.3 Game Modes

**Live Host Mode:**
- Host creates a quiz session
- Generates a unique game PIN
- Questions displayed on host screen
- Participants join using PIN
- Real-time answer submission
- Timer for each question
- Live leaderboard updates
- Final results display

**Self-Paced Challenge Mode:**
- Users can take quizzes at their own pace
- No time limit (or optional timer)
- Immediate feedback on answers
- Score tracking
- Progress saved

#### 2.4 Real-Time Features
- WebSocket connection for live sessions
- Synchronized question display
- Real-time answer collection
- Live leaderboard updates
- Session management

#### 2.5 Scoring System
- Points based on speed and accuracy
- Correct answer: base points
- Faster answers: bonus points
- Leaderboard ranking
- Historical performance tracking

#### 2.6 English Learning Features
- Vocabulary quizzes (word definitions, synonyms, antonyms)
- Grammar quizzes (tenses, sentence structure, parts of speech)
- Reading comprehension (passages with questions)
- Difficulty levels (Beginner, Intermediate, Advanced)
- Progress tracking per category

#### 2.7 User Dashboard
- View created quizzes
- View quiz history
- Performance statistics
- Progress tracking
- Badges/achievements (future)

### 3. Technical Requirements

#### 3.1 Frontend
- React.js for UI framework
- Socket.io-client for real-time communication
- Modern, responsive design
- Kahoot-inspired colorful UI
- Mobile-friendly interface

#### 3.2 Backend
- Node.js with Express.js
- Socket.io for WebSocket connections
- MongoDB for database
- JWT for authentication
- RESTful API endpoints

#### 3.3 Database Schema
- Users: id, email, username, password (hashed), createdAt
- Quizzes: id, title, description, creatorId, category, difficulty, createdAt
- Questions: id, quizId, questionText, options[], correctAnswer, points, timeLimit
- Sessions: id, quizId, hostId, pin, status, participants[], createdAt
- Results: id, sessionId, userId, score, answers[], completedAt

### 4. User Stories

**As a Teacher/Host:**
- I want to create English learning quizzes
- I want to host live quiz sessions
- I want to see participants' answers in real-time
- I want to view quiz results and statistics

**As a Student/Participant:**
- I want to join quizzes using a PIN
- I want to answer questions on my device
- I want to see my score and ranking
- I want to practice English at my own pace
- I want to track my learning progress

### 5. Success Metrics
- User engagement (sessions per user)
- Quiz completion rate
- Average session duration
- User retention rate
- Learning progress indicators

### 6. Future Enhancements
- Team mode (collaborative quizzes)
- Image and video support in questions
- Audio questions for listening practice
- Social features (share quizzes, follow users)
- Gamification (badges, streaks, achievements)
- AI-powered question generation
- Multi-language support

