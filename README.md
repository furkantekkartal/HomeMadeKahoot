# HomeMadeKahoot 🎮

A web-based English learning application inspired by Kahoot, designed to make language learning engaging through game-based quizzes.

## ✨ Features

- **Quiz Management**: Create, edit, and delete English learning quizzes
- **Question Images**: AI-powered image generation for quiz questions
- **Live Quiz Sessions**: Host real-time quiz sessions with PIN codes
- **Self-Paced Mode**: Practice quizzes at your own pace
- **Teacher Analytics**: Track student performance with detailed analytics
- **Categories**: Vocabulary, Grammar, Reading, Listening
- **Difficulty Levels**: Beginner, Intermediate, Advanced

## 🛠 Tech Stack

**Backend:** Node.js, Express, Socket.io, MongoDB, Mongoose, JWT  
**Frontend:** React 18, React Router, Socket.io-client, Axios

## 🚀 Quick Start

### Prerequisites
- Node.js (v14+)
- MongoDB (Atlas or local)
- npm

### Installation

1. **Clone and install**
   ```bash
   git clone <repository-url>
   cd HomeMadeKahoot
   
   # Backend
   cd backend && npm install
   
   # Frontend
   cd ../frontend && npm install
   ```

2. **Environment Variables**

   `backend/.env`:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/homemadekahoot
   JWT_SECRET=your_secret_jwt_key
   NODE_ENV=development
   UNSPLASH_ACCESS_KEY=your_unsplash_key
   OPENROUTER_API_KEY=your_openrouter_key
   APP_URL=http://localhost:3000
   FRONTEND_URL=http://localhost:3000
   ```

   `frontend/.env` (optional):
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_SOCKET_URL=http://localhost:5000
   ```

3. **Start the app**
   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev
   
   # Terminal 2 - Frontend
   cd frontend && npm start
   ```

4. Open `http://localhost:3000`

## 📖 Usage

### Teachers
1. Register/Login
2. Create Quiz → Add questions
3. Host Quiz → Share PIN with students
4. View Analytics → Track student performance

### Students
- Join Live Quiz: `/join` → Enter PIN → Enter username
- Self-Paced: Browse quizzes → Take at your own pace

## 🌐 Deployment

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for deployment instructions.

## 📝 API Keys

- **Unsplash**: [Get API key](https://unsplash.com/developers)
- **OpenRouter**: [Get API key](https://openrouter.ai)

---

**Happy Learning! 🎓✨**
