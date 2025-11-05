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

- **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** - Choose one:
  - **MongoDB Atlas** (Cloud - Recommended, no installation needed) - [Sign up free](https://www.mongodb.com/cloud/atlas/register)
  - **Local MongoDB** (requires installation on your computer)
- **npm** (comes with Node.js) or **yarn**

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
   
   **If using MongoDB Atlas (Cloud):**
   ```env
   PORT=5000
   MONGODB_URI=mongodb+srv://yourusername:yourpassword@cluster0.xxxxx.mongodb.net/homemadekahoot?retryWrites=true&w=majority
   JWT_SECRET=your_secret_jwt_key_change_this_in_production_use_a_long_random_string
   NODE_ENV=development
   ```
   
   **If using local MongoDB:**
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/homemadekahoot
   JWT_SECRET=your_secret_jwt_key_change_this_in_production_use_a_long_random_string
   NODE_ENV=development
   ```
   
   **Important Notes:**
   - Replace `yourusername` and `yourpassword` with your MongoDB Atlas credentials (if using Atlas)
   - For `JWT_SECRET`, use a long, random string. You can generate one at [randomkeygen.com](https://randomkeygen.com/)
   - Never share your `.env` file or commit it to git (it's already in `.gitignore`)

   For frontend, create a `.env` file in the `frontend` directory (optional):
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_SOCKET_URL=http://localhost:5000
   ```
   
   **Note:** If you change the backend PORT, make sure to update `REACT_APP_API_URL` and `REACT_APP_SOCKET_URL` accordingly.

5. **Set up MongoDB**

   MongoDB is a NoSQL database that stores all your application data (users, quizzes, sessions, results). You have two options:

   **Option A: MongoDB Atlas (Cloud - Recommended for Beginners)**
   
   This is the easiest option - no installation needed!
   
   1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
   2. Sign up for a free account (it's free forever for small projects)
   3. Create a new cluster (choose the FREE tier - M0)
   4. Wait for the cluster to be created (takes 3-5 minutes)
   5. Click "Connect" on your cluster
   6. Choose "Connect your application"
   7. Copy the connection string (it looks like: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`)
   8. Replace `<password>` with the password you set for your database user
   9. Replace `<dbname>` with `homemadekahoot` (or add it to the connection string)
   10. Update your `.env` file:
      ```env
      MONGODB_URI=mongodb+srv://yourusername:yourpassword@cluster0.xxxxx.mongodb.net/homemadekahoot?retryWrites=true&w=majority
      ```
   11. Click "Network Access" in the left menu and add your IP address (or click "Allow Access from Anywhere" for development)
   
   **Option B: Local MongoDB Installation**
   
   If you prefer to run MongoDB on your computer:
   
   **Windows:**
   1. Download MongoDB Community Server from [mongodb.com/download-center/community](https://www.mongodb.com/try/download/community)
   2. Run the installer (.msi file)
   3. Choose "Complete" installation
   4. Choose "Install MongoDB as a Service" and "Run service as Network Service user"
   5. Install MongoDB Compass (optional GUI tool)
   6. MongoDB will start automatically as a Windows service
   7. Verify it's running: Open Command Prompt and type `mongod --version`
   8. Your connection string should be: `mongodb://localhost:27017/homemadekahoot`
   
   **macOS:**
   1. Install using Homebrew:
      ```bash
      brew tap mongodb/brew
      brew install mongodb-community
      ```
   2. Start MongoDB:
      ```bash
      brew services start mongodb-community
      ```
   3. Verify it's running:
      ```bash
      mongod --version
      ```
   4. Your connection string: `mongodb://localhost:27017/homemadekahoot`
   
   **Linux (Ubuntu/Debian):**
   1. Import the public key:
      ```bash
      wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
      ```
   2. Create list file:
      ```bash
      echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
      ```
   3. Install MongoDB:
      ```bash
      sudo apt-get update
      sudo apt-get install -y mongodb-org
      ```
   4. Start MongoDB:
      ```bash
      sudo systemctl start mongod
      sudo systemctl enable mongod
      ```
   5. Verify it's running:
      ```bash
      sudo systemctl status mongod
      ```
   6. Your connection string: `mongodb://localhost:27017/homemadekahoot`
   
   **Verify MongoDB Connection:**
   
   After setting up MongoDB, test if your connection string works:
   
   - If using MongoDB Atlas: The connection string should work immediately after you allow network access
   - If using local MongoDB: Make sure the MongoDB service is running
   
   Update your `.env` file with the correct `MONGODB_URI` based on your choice above.

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

### ⚡ Quick Start - Join a Quiz (Students)

**Want to join a quiz right now?** No account needed!

1. Go to `http://localhost:3000/join` (or your deployed URL)
2. Enter the 4-digit PIN from your teacher/host
3. Enter any username you want
4. Click "Join Quiz"
5. Wait for the quiz to start and answer questions!

That's it! You're ready to play. See detailed instructions below.

---

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
   - Wait for participants to join (you'll see them appear on screen)
   - Click "Start Quiz" when ready
   - Control the flow by clicking "Next Question" after each question
   - **Note**: The host page is for controlling the quiz, not for playing. To play as a participant, open the quiz in a different browser/device using the PIN.
4. **View Results**: Check participant scores and leaderboard

### For Students/Participants

#### 🎯 Joining a Live Quiz (No Account Required!)

**Good news!** Students do NOT need to create an account to join and participate in live quizzes. You can join immediately using just a PIN code.

**Step-by-Step Process:**

1. **Get the Quiz PIN**
   - The teacher/host will provide you with a 4-digit PIN code
   - This PIN is displayed on the host's screen when they start a quiz session

2. **Open the Join Quiz Page**
   - Navigate to the HomeMadeKahoot website
   - Click on the **"Join Quiz"** link in the navigation menu (or go to `/join` page)
   - You can also access it directly by typing the URL: `http://localhost:3000/join` (or your deployed URL)

3. **Enter Quiz Information**
   - **Game PIN**: Enter the 4-digit PIN code provided by the host
   - **Your Name**: Enter any username you want (2-20 characters)
     - This can be your real name, nickname, or any identifier
     - No need to be unique - multiple people can use the same name
     - This name will be displayed on the leaderboard

4. **Join the Quiz**
   - Click the **"Join Quiz"** button
   - You'll be redirected to the quiz waiting room
   - Wait for the host to start the quiz

5. **Play the Quiz**
   - Once the host starts, questions will appear on your screen
   - Each question has 4 colored answer options (A, B, C, D)
   - Click on your answer choice
   - You'll see immediate feedback (correct/incorrect)
   - Points are awarded based on speed and accuracy
   - Your score updates in real-time

6. **View Results**
   - After all questions are answered, you'll see the final leaderboard
   - Your position and score will be displayed
   - You can see how you ranked compared to other participants

**Important Notes:**
- ✅ **No login required** - You can join immediately without creating an account
- ✅ **No email needed** - Just enter any username
- ✅ **Real-time updates** - See your score and ranking update live
- ✅ **Multiple devices** - You can join the same quiz from different devices with different usernames
- ⚠️ **PIN is case-sensitive** - Make sure you enter the exact PIN provided
- ⚠️ **Time limit** - Each question has a time limit (usually 20 seconds), so answer quickly!
- ⚠️ **One answer per question** - Once you submit an answer, you cannot change it

#### 📚 Self-Paced Practice (Account Optional)

**For Self-Paced Quizzes:**

1. **Browse Available Quizzes**
   - Go to the **"Browse"** page (accessible from the navigation menu)
   - You can browse all available quizzes without logging in
   - Filter by category (Vocabulary, Grammar, Reading, Listening) or difficulty level

2. **Take a Quiz**
   - Click **"Take Quiz"** on any quiz you want to practice
   - You'll be taken to the self-paced quiz interface
   - Answer questions at your own pace (no time pressure)
   - See immediate feedback after each question

3. **View Your Results**
   - After completing the quiz, see your score and accuracy
   - Review which answers were correct/incorrect
   - **Note**: To save your progress and view history, you'll need to create an account

4. **Track Progress (Requires Account)**
   - If you want to track your learning progress over time, create a free account
   - With an account, you can:
     - View your quiz history
     - See performance statistics
     - Track improvement over time
     - Access your results dashboard

**Account Requirements Summary:**
- ❌ **Not required** for joining live quizzes
- ❌ **Not required** for browsing quizzes
- ❌ **Not required** for taking self-paced quizzes
- ✅ **Required** for creating quizzes (hosting)
- ✅ **Required** for saving progress and viewing detailed statistics
- ✅ **Required** for accessing your results history

#### 🎮 Quick Access Links

**For Students (No Login):**
- Join Live Quiz: `/join` or click "Join Quiz" in navigation
- Browse Quizzes: `/browse` or click "Browse" in navigation
- Home Page: `/` - Overview and features

**For Teachers (Login Required):**
- Dashboard: `/dashboard` - Manage your quizzes
- Create Quiz: `/create-quiz` - Build new quizzes
- Results: `/results` - View student performance

#### 📱 Using on Mobile Devices

The application is fully responsive and works great on:
- Smartphones (iOS & Android)
- Tablets
- Desktop computers
- Laptops

Simply open the website on any device, enter the PIN, and start playing!

#### 📖 Example Scenario: Classroom Quiz

**Teacher's Side:**
1. Teacher logs in and creates a quiz about "English Vocabulary"
2. Teacher clicks "Host Quiz" on the quiz
3. A PIN appears on screen: **"4521"**
4. Teacher shares this PIN with students (writes on board, says out loud, or shares via chat)

**Student's Side:**
1. Student opens their phone/tablet/laptop
2. Goes to the website (e.g., `http://localhost:3000/join`)
3. Enters PIN: **4521**
4. Enters name: **"John"** (or any name they want)
5. Clicks "Join Quiz"
6. Sees: "Waiting for quiz to start..."
7. Teacher clicks "Start Quiz" on their screen
8. Questions appear on student's screen
9. Student answers questions as they appear
10. Sees score update in real-time
11. At the end, sees leaderboard with all participants' scores

**Result:** All students can participate without creating accounts, just using the PIN!

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

## 🔧 Troubleshooting

### MongoDB Connection Issues

**"MongoServerError: Authentication failed"**
- Double-check your MongoDB Atlas username and password
- Make sure you replaced `<password>` in the connection string with your actual password
- Verify your database user has the correct permissions

**"MongooseServerSelectionError: connect ECONNREFUSED"**
- **For local MongoDB**: Make sure MongoDB service is running
  - Windows: Check Services app, look for "MongoDB"
  - macOS: Run `brew services list` to check if mongodb-community is started
  - Linux: Run `sudo systemctl status mongod`
- **For MongoDB Atlas**: Check Network Access settings and allow your IP address

**"MongoNetworkError: connect ETIMEDOUT"**
- **For MongoDB Atlas**: Your IP address might not be whitelisted
  - Go to MongoDB Atlas → Network Access → Add IP Address
  - Click "Allow Access from Anywhere" (for development only)

**"MongoServerError: bad auth"**
- Verify your connection string format is correct
- Make sure there are no extra spaces or special characters
- For MongoDB Atlas, ensure you're using the correct username/password

### Backend Won't Start

**"Cannot find module" errors**
- Make sure you ran `npm install` in the `backend` directory
- Delete `node_modules` folder and `package-lock.json`, then run `npm install` again

**Port 5000 already in use**
- Change the PORT in your `.env` file to a different number (e.g., 5001)
- Or stop the process using port 5000

### Frontend Issues

**"Cannot connect to backend"**
- Make sure the backend server is running on port 5000 (or your custom port)
- Check the `REACT_APP_API_URL` in frontend `.env` matches your backend URL
- Verify CORS is enabled in the backend

**Socket.io connection errors**
- Ensure the backend server is running
- Check that `REACT_APP_SOCKET_URL` in frontend `.env` matches your backend URL

### Still Having Issues?

1. Check that all environment variables are set correctly in `.env` files
2. Verify MongoDB is running and accessible
3. Make sure both backend and frontend dependencies are installed
4. Check the console/terminal for specific error messages
5. Ensure your firewall isn't blocking connections

## 📝 Notes

- This is a learning project inspired by Kahoot
- The application is designed for educational purposes
- For production use, ensure proper security measures (HTTPS, secure JWT secrets, etc.)
- MongoDB connection string should be kept secure and not committed to version control
- **Important**: Never commit your `.env` file to git - it contains sensitive information

## 🤝 Contributing

This is a personal project, but suggestions and improvements are welcome!

## 📄 License

This project is open source and available for educational purposes.

---

**Happy Learning! 🎓✨**

