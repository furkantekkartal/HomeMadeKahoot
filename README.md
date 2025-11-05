# HomeMadeKahoot 🎮

A web-based English learning application inspired by Kahoot, designed to make language learning engaging and interactive through game-based quizzes.

## 📋 Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Development](#development)
- [Future Enhancements](#future-enhancements)

## ✨ Features

### Core Features
- **User Authentication**: Register, login, and secure session management with JWT
- **Quiz Management**: Create, edit, and delete English learning quizzes
- **Live Quiz Sessions**: Host real-time quiz sessions with unique PIN codes
- **Participant Interface**: Join quizzes using PIN and answer questions in real-time
- **Self-Paced Mode**: Practice quizzes at your own pace without time pressure
- **Scoring System**: Points based on speed and accuracy with live leaderboards
- **Progress Tracking**: View your quiz history and performance statistics

### English Learning Features
- **Multiple Categories**: Vocabulary, Grammar, Reading Comprehension, Listening
- **Difficulty Levels**: Beginner, Intermediate, Advanced
- **Interactive Questions**: Multiple-choice questions with immediate feedback
- **Performance Analytics**: Track your learning progress over time

## 🛠 Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.io** - Real-time communication
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing

### Frontend
- **React 18** - UI framework
- **React Router** - Navigation
- **Socket.io-client** - Real-time client
- **Axios** - HTTP client
- **CSS3** - Styling with modern design

## 📁 Project Structure

```
HomeMadeKahoot/
├── backend/
│   ├── config/
│   │   └── database.js          # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js   # Authentication logic
│   │   ├── quizController.js   # Quiz CRUD operations
│   │   └── sessionController.js # Session management
│   ├── middleware/
│   │   ├── auth.js              # JWT authentication
│   │   └── errorHandler.js     # Error handling
│   ├── models/
│   │   ├── User.js              # User schema
│   │   ├── Quiz.js              # Quiz schema
│   │   ├── Session.js           # Session schema
│   │   └── Result.js            # Result schema
│   ├── routes/
│   │   ├── auth.js              # Auth routes
│   │   ├── quizzes.js           # Quiz routes
│   │   └── sessions.js          # Session routes
│   ├── socket/
│   │   └── socketHandlers.js    # Socket.io event handlers
│   ├── server.js                # Express server
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   └── Common/
│   │   │       └── Navbar.js    # Navigation component
│   │   ├── context/
│   │   │   └── AuthContext.js    # Authentication context
│   │   ├── pages/
│   │   │   ├── Home.js          # Landing page
│   │   │   ├── Login.js         # Login page
│   │   │   ├── Register.js     # Registration page
│   │   │   ├── Dashboard.js     # User dashboard
│   │   │   ├── CreateQuiz.js    # Quiz creation
│   │   │   ├── EditQuiz.js      # Quiz editing
│   │   │   ├── HostQuiz.js      # Host interface
│   │   │   ├── JoinQuiz.js      # Join quiz page
│   │   │   ├── PlayQuiz.js      # Participant interface
│   │   │   ├── SelfPacedQuiz.js # Self-paced mode
│   │   │   └── Results.js       # Results page
│   │   ├── services/
│   │   │   ├── api.js           # API client
│   │   │   └── socket.js        # Socket.io client
│   │   ├── App.js               # Main app component
│   │   └── index.js             # Entry point
│   └── package.json
│
├── PRD.md                       # Product Requirements Document
├── PROJECT_PLAN.md              # Development plan
└── README.md                    # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- npm or yarn

### Installation

1. **Clone the repository** (or navigate to the project directory)

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Set up environment variables**

   Create a `.env` file in the `backend` directory:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/homemadekahoot
   JWT_SECRET=your_secret_jwt_key_change_this_in_production
   NODE_ENV=development
   ```

   For frontend, create a `.env` file in the `frontend` directory (optional):
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_SOCKET_URL=http://localhost:5000
   ```

5. **Start MongoDB**
   - If using local MongoDB, make sure it's running on `mongodb://localhost:27017`
   - Or update `MONGODB_URI` in `.env` to point to your MongoDB instance

6. **Start the backend server**
   ```bash
   cd backend
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

7. **Start the frontend** (in a new terminal)
   ```bash
   cd frontend
   npm start
   ```

8. **Open your browser**
   - Navigate to `http://localhost:3000`

## 📖 Usage

### For Teachers/Hosts

1. **Register/Login**: Create an account or log in
2. **Create Quiz**: Go to Dashboard → Create Quiz
   - Add title, description, category, and difficulty
   - Add questions with 4 options each
   - Set points and time limit for each question
3. **Host Live Session**: 
   - Go to Dashboard → Select a quiz
   - Click "Host Quiz" (or create a session)
   - Share the PIN with participants
   - Start the quiz and control the flow
4. **View Results**: Check participant scores and leaderboard

### For Students/Participants

1. **Join Live Quiz**:
   - Go to "Join Quiz" page
   - Enter the PIN provided by the host
   - Enter your username
   - Answer questions as they appear
   - See your score and ranking in real-time

2. **Self-Paced Practice**:
   - Browse available quizzes
   - Take quizzes at your own pace
   - Review your answers and scores
   - Track your progress over time

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Quizzes
- `GET /api/quizzes` - Get all quizzes
- `GET /api/quizzes/my` - Get user's quizzes (protected)
- `GET /api/quizzes/:id` - Get single quiz
- `POST /api/quizzes` - Create quiz (protected)
- `PUT /api/quizzes/:id` - Update quiz (protected)
- `DELETE /api/quizzes/:id` - Delete quiz (protected)

### Sessions
- `POST /api/sessions` - Create session (protected)
- `GET /api/sessions/pin/:pin` - Get session by PIN
- `GET /api/sessions/:id` - Get session by ID
- `GET /api/sessions/my` - Get user's sessions (protected)
- `POST /api/sessions/results` - Save result (protected)
- `GET /api/sessions/results/my` - Get user's results (protected)

### WebSocket Events

**Client → Server:**
- `join-session` - Join a quiz session
- `start-quiz` - Start the quiz (host only)
- `next-question` - Move to next question (host only)
- `submit-answer` - Submit answer (participant)

**Server → Client:**
- `session-joined` - Confirmation of joining
- `participant-joined` - New participant joined
- `quiz-started` - Quiz has started
- `next-question` - New question available
- `answer-received` - Answer confirmation
- `answer-update` - Answer statistics update
- `quiz-completed` - Quiz finished with leaderboard

## 🛠 Development

### Running in Development Mode

**Backend:**
```bash
cd backend
npm run dev  # Uses nodemon for auto-reload
```

**Frontend:**
```bash
cd frontend
npm start  # React development server with hot reload
```

### Database Models

- **User**: Stores user credentials and profile
- **Quiz**: Contains quiz metadata and questions array
- **Session**: Tracks live quiz sessions with participants
- **Result**: Stores quiz completion results and scores

### Key Features Implementation

- **Real-time Communication**: Socket.io handles all live quiz interactions
- **Scoring Algorithm**: Points = base points + time bonus (faster = more points)
- **Session Management**: Unique PINs for each session, auto-cleanup on disconnect
- **Authentication**: JWT tokens stored in localStorage

## 🎯 Future Enhancements

- [ ] Image and video support in questions
- [ ] Audio questions for listening practice
- [ ] Team mode (collaborative quizzes)
- [ ] Social features (share quizzes, follow users)
- [ ] Gamification (badges, streaks, achievements)
- [ ] AI-powered question generation
- [ ] Multi-language support
- [ ] Mobile app (React Native)
- [ ] Advanced analytics and reporting
- [ ] Quiz templates and question bank

## 📝 Notes

- This is a learning project inspired by Kahoot
- The application is designed for educational purposes
- For production use, ensure proper security measures (HTTPS, secure JWT secrets, etc.)
- MongoDB connection string should be kept secure and not committed to version control

## 🤝 Contributing

This is a personal project, but suggestions and improvements are welcome!

## 📄 License

This project is open source and available for educational purposes.

---

**Happy Learning! 🎓✨**

