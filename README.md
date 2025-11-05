# HomeMadeKahoot 🎮

A web-based English learning application inspired by Kahoot, designed to make language learning engaging and interactive through game-based quizzes.

## ✨ Features

- **User Authentication**: Register, login, and secure session management
- **Quiz Management**: Create, edit, and delete English learning quizzes
- **Live Quiz Sessions**: Host real-time quiz sessions with unique PIN codes
- **Participant Interface**: Join quizzes using PIN (no account required)
- **Self-Paced Mode**: Practice quizzes at your own pace
- **Scoring System**: Points based on speed and accuracy with live leaderboards
- **Teacher Analytics**: Track student performance with detailed analytics and filtering
- **Categories**: Vocabulary, Grammar, Reading Comprehension, Listening
- **Difficulty Levels**: Beginner, Intermediate, Advanced

## 🛠 Technology Stack

**Backend:** Node.js, Express.js, Socket.io, MongoDB, Mongoose, JWT  
**Frontend:** React 18, React Router, Socket.io-client, Axios, CSS3

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (Atlas or local installation)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd HomeMadeKahoot
   ```

2. **Install dependencies**
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

3. **Set up environment variables**

   Create `.env` in `backend/`:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/homemadekahoot
   # OR for MongoDB Atlas:
   # MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/homemadekahoot
   JWT_SECRET=your_secret_jwt_key_here
   NODE_ENV=development
   ```

   Create `.env` in `frontend/` (optional):
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_SOCKET_URL=http://localhost:5000
   ```

4. **Set up MongoDB**

   **Option A: MongoDB Atlas (Cloud)**
   - Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
   - Create a free cluster (M0)
   - Get connection string and add to `.env`
   - Add your IP to Network Access

   **Option B: Local MongoDB**
   - Install MongoDB Community Server
   - Start MongoDB service
   - Connection string: `mongodb://localhost:27017/homemadekahoot`

5. **Start the application**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev
   
   # Terminal 2 - Frontend
   cd frontend
   npm start
   ```

6. **Open browser**
   - Navigate to `http://localhost:3000`

## 📖 Usage

### For Teachers

1. **Register/Login** - Create an account
2. **Create Quiz** - Dashboard → Create Quiz
   - Add title, description, category, difficulty
   - Add questions with 4 options each
3. **Host Quiz** - Dashboard → Select quiz → Host Quiz
   - Share the 4-digit PIN with students
   - Click "Start Quiz" when ready
   - View student progress and leaderboard
4. **View Analytics** - Results page shows student performance with filtering options

### For Students

**Joining a Live Quiz (No Account Required!)**

1. Go to `/join` or click "Join Quiz" in navigation
2. Enter the 4-digit PIN from your teacher
3. Enter any username (2-20 characters)
4. Click "Join Quiz"
5. Wait for quiz to start and answer questions
6. View your score and the leaderboard

**Self-Paced Practice**
- Browse quizzes without logging in
- Take quizzes at your own pace
- Account required only to save progress and view history

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Quizzes
- `GET /api/quizzes` - Get all quizzes
- `GET /api/quizzes/my` - Get user's quizzes
- `GET /api/quizzes/:id` - Get single quiz
- `POST /api/quizzes` - Create quiz
- `PUT /api/quizzes/:id` - Update quiz
- `DELETE /api/quizzes/:id` - Delete quiz

### Sessions
- `POST /api/sessions` - Create session
- `GET /api/sessions/pin/:pin` - Get session by PIN
- `GET /api/sessions/:id` - Get session by ID
- `GET /api/sessions/analytics` - Get teacher analytics

### WebSocket Events

**Client → Server:**
- `join-session` - Join a quiz session
- `start-quiz` - Start the quiz (host only)
- `next-question` - Move to next question (host only)
- `submit-answer` - Submit answer (participant)
- `finish-quiz` - Finish quiz (host only)

**Server → Client:**
- `session-joined` - Confirmation of joining
- `participant-joined` - New participant joined
- `quiz-started` - Quiz has started
- `next-question` - New question available
- `answer-received` - Answer confirmation
- `answer-update` - Answer statistics update
- `quiz-completed` - Quiz finished with leaderboard

## 🔧 Troubleshooting

**MongoDB Connection Issues**
- Verify connection string in `.env` is correct
- For Atlas: Check Network Access and whitelist your IP
- For local: Ensure MongoDB service is running

**Backend Won't Start**
- Check that port 5000 is available
- Verify all environment variables are set
- Run `npm install` in backend directory

**Frontend Issues**
- Ensure backend is running on port 5000
- Check `REACT_APP_API_URL` matches backend URL
- Verify CORS is enabled in backend

## 📝 Notes

- This is a learning project inspired by Kahoot
- Never commit `.env` files to git
- For production, use HTTPS and secure JWT secrets

---

**Happy Learning! 🎓✨**
