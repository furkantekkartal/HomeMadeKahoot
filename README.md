# HomeMadeKahoot

English learning quiz platform inspired by Kahoot, designed to make language learning engaging and interactive through game-based quizzes.

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Quick Start](#quick-start)
- [Tech Stack](#tech-stack)
- [Database Management](#database-management)
- [Deployment](#deployment)
- [Project Structure](#project-structure)

---

## Project Overview

HomeMadeKahoot is a web-based English learning application that combines the interactive gameplay of Kahoot with English language learning. Teachers can create and host live quiz sessions, while students can join using PIN codes or practice at their own pace.

### Core Features

- **User Authentication**: Registration, login, and profile management
- **Quiz Management**: Create, edit, and delete quizzes with multiple-choice questions
- **Live Host Mode**: Host real-time quiz sessions with PIN codes
- **Self-Paced Mode**: Practice quizzes at your own pace
- **Real-Time Communication**: WebSocket-based live synchronization
- **Scoring System**: Points based on speed and accuracy
- **English Learning**: Vocabulary, grammar, reading comprehension quizzes
- **Progress Tracking**: Monitor performance and learning progress

---

## Features

### User Features
- Create and manage quizzes
- Host live quiz sessions with PIN codes
- Join quizzes as a participant
- Track performance and results
- Profile management with picture upload
- Mobile-responsive design

### Quiz Features
- AI-generated questions and images
- Multiple categories (vocabulary, grammar, reading, listening)
- Difficulty levels (beginner, intermediate, advanced)
- Real-time leaderboard
- Timer-based questions
- Self-paced practice mode

### Technical Features
- Separate production and development databases
- Automatic database schema management
- Real-time synchronization via Socket.io
- JWT-based authentication
- RESTful API architecture

---

## Quick Start

### 1. Install Dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Environment Variables

Create `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/homemadekahoot
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/homemadekahoot?appName=homemadekahoot
NODE_ENV=development
JWT_SECRET=your_secret_jwt_key
UNSPLASH_ACCESS_KEY=your_unsplash_key
OPENROUTER_API_KEY=your_openrouter_key
FRONTEND_URL=http://localhost:3000
```

**Note:** The app automatically uses `homemadekahoot_dev` for development and `homemadekahoot_prod` for production based on `NODE_ENV`.

### 3. Run the Application

**Option 1: Use the batch script (Windows)**
```bash
start-dev.bat
```

**Option 2: Manual start**
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm start
```

The app will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

---

## Tech Stack

### Backend
- **Node.js** 18+
- **Express.js** 4.x - RESTful API
- **Socket.io** 4.x - Real-time communication
- **MongoDB** with Mongoose - Database
- **JWT** (jsonwebtoken) - Authentication
- **bcryptjs** - Password hashing

### Frontend
- **React** 18+ - UI framework
- **React Router** 6.x - Client-side routing
- **Socket.io-client** - Real-time communication
- **Axios** - HTTP requests
- **CSS** - Styling with responsive design

### Database
- **MongoDB** (local or MongoDB Atlas)
- Automatic environment-based database separation

---

## Database Management

The application uses **separate databases** for production and development:
- **Production**: `homemadekahoot_prod` (when `NODE_ENV=production`)
- **Development**: `homemadekahoot_dev` (when `NODE_ENV=development` or unset)

### Current Collections

| Collection | Model | Required | Description |
|------------|-------|----------|-------------|
| `users` | User | ✅ Yes | User accounts and authentication |
| `quizzes` | Quiz | ✅ Yes | Quiz definitions and questions |
| `sessions` | Session | ❌ No | Live quiz sessions (temporary) |
| `results` | Result | ❌ No | Quiz results for logged-in users |
| `studentresults` | StudentResult | ❌ No | Student quiz results with analytics |

### Database Commands

**Check database status:**
```bash
cd backend
npm run db-status
```
Shows expected vs existing collections, orphaned collections, and document counts.

**Safely remove orphaned collections:**
```bash
npm run db-cleanup
```
Removes only collections not in models registry (with confirmation).

**Reset database (⚠️ DANGEROUS):**
```bash
npm run reset-db
```
Drops ALL collections in current environment. Use only in development!

### Adding New Collections

1. Create a new model in `backend/models/YourModel.js`
2. Register it in `backend/config/modelsRegistry.js`
3. Restart the server - Mongoose will create the collection automatically

### Modifying Existing Schemas

**Safe changes:**
- ✅ Adding new fields (with defaults)
- ✅ Making required fields optional
- ✅ Adding indexes
- ✅ Adding virtual fields or methods

**Potentially breaking changes:**
- ⚠️ Removing fields (data remains but won't be accessible)
- ⚠️ Making optional fields required (existing documents may fail validation)
- ⚠️ Changing field types (may cause type errors)
- ⚠️ Renaming collections (requires migration)

**Best Practice:**
1. Test changes in **development** first
2. Use `npm run db-status` to check for issues
3. For breaking changes, create a migration script

### Removing Collections

1. Check if collection is safe to remove: `npm run db-status`
2. Remove the model file from `backend/models/`
3. Remove from registry in `backend/config/modelsRegistry.js`
4. Clean up orphaned collection: `npm run db-cleanup`

⚠️ **WARNING:** 
- Required collections (`users`, `quizzes`) cannot be safely removed
- Always backup data before removing collections
- Test in development first

---

## Deployment

### 🚀 Render Deployment (Recommended)

#### Backend Deployment

1. Go to [Render.com](https://render.com) → **New +** → **Web Service**
2. Connect GitHub repository
3. Configure:
   - **Name:** `homemadekahoot-backend`
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free

4. **Environment Variables:**
   ```env
   PORT=10000
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/homemadekahoot?appName=homemadekahoot
   JWT_SECRET=your_production_secret
   NODE_ENV=production
   UNSPLASH_ACCESS_KEY=your_key
   OPENROUTER_API_KEY=your_key
   FRONTEND_URL=https://your-frontend-url.onrender.com
   ```
   ⚠️ **No trailing slashes** in URLs

5. Wait for deployment (5-10 min)

#### Frontend Deployment

1. **New +** → **Static Site**
2. Connect GitHub repository
3. Configure:
   - **Name:** `homemadekahoot-frontend`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `build`

4. **Environment Variables:**
   ```env
   REACT_APP_API_URL=https://your-backend-url.onrender.com/api
   REACT_APP_SOCKET_URL=https://your-backend-url.onrender.com
   ```

5. **Configure Rewrites** (Settings → Redirects and Rewrites):
   - Source: `/*`
   - Destination: `/index.html`
   - Type: **Rewrite** (not Redirect)
   - Status: `200`

6. Wait for deployment

### 🔀 Deploy Both Production and Development

You can deploy both production and development versions simultaneously on Render.

**Production (Main App):**
- Service name: `homemadekahoot-backend` and `homemadekahoot-frontend`
- Branch: `master` (or `main`)
- URL: `homemadekahoot-frontend.onrender.com`
- Environment: `NODE_ENV=production`

**Development (Testing):**
- Service name: `homemadekahoot-backend-dev` and `homemadekahoot-frontend-dev`
- Branch: `dev`
- URL: `homemadekahoot-frontend-dev.onrender.com`
- Environment: `NODE_ENV=development`

**Steps:**
1. The `dev` branch is already created in the repository
2. In Render, create new services (same steps as production)
3. Set branch to `dev` in Render settings (Settings → Build & Deploy → Branch)
4. Set `NODE_ENV=development` in dev services

**Note:** Free tier allows multiple services, so you can have both running!

### 🗄️ MongoDB Atlas Setup

1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create free cluster (M0)
3. **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`)
4. **Database Access** → Create user → Save password
5. **Connect** → Get connection string → Replace `<password>` with your actual password

### 🔄 Separate Production & Development Databases

The application **automatically** uses different databases based on `NODE_ENV`:

- **Production** (`NODE_ENV=production`): Uses `homemadekahoot_prod`
- **Development** (`NODE_ENV=development` or not set): Uses `homemadekahoot_dev`

**How it works:**
- Use the **same MongoDB connection string** for both environments
- The app automatically appends `_prod` or `_dev` to the database name
- You don't need to create the databases manually - MongoDB Atlas will create them automatically when the app first connects

**Example connection string:**
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/homemadekahoot?appName=homemadekahoot
```

This will automatically become:
- Production: `mongodb+srv://...@cluster.mongodb.net/homemadekahoot_prod?...`
- Development: `mongodb+srv://...@cluster.mongodb.net/homemadekahoot_dev?...`

### 🔄 Automatic Deployments

When GitHub is connected, Render automatically deploys on every `git push`.

**Verify:** Settings → Build & Deploy → Auto-Deploy should be **Yes**

**Manual Deploy:** Click "Manual Deploy" button in dashboard

### 🐛 Troubleshooting

**CORS Errors**
- Verify `FRONTEND_URL` has no trailing slash
- Check backend CORS includes frontend URL

**Empty Page on Refresh**
- Ensure rewrite (not redirect) is configured in Render
- Check `_redirects` file exists in `frontend/public/`

**MongoDB Connection Failed**
- Verify Network Access allows `0.0.0.0/0`
- Check connection string has correct password
- Wait 1-2 minutes after IP changes
- Verify `NODE_ENV` is set correctly (production vs development)
- Check that the database name in connection string doesn't already have `_prod` or `_dev` suffix (the app adds it automatically)

**Socket.io Connection Fails**
- Verify `FRONTEND_URL` matches frontend URL exactly
- Check CORS settings in backend

### 💡 Tips

- **Free Tier Spin-Down**: Services automatically spin down after 15 minutes of inactivity
- **Auto-Restart**: Services automatically restart when you make a request (no manual action needed)
- **Cold Start**: First request after spin-down takes 30-60 seconds (this is normal)
- Test locally before deploying
- Check deployment logs if something fails
- Keep `master`/`main` branch stable for auto-deploy

---

## Project Structure

```
HomeMadeKahoot/
├── backend/
│   ├── config/
│   │   ├── database.js
│   │   └── modelsRegistry.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── quizController.js
│   │   └── sessionController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── errorHandler.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Quiz.js
│   │   ├── Session.js
│   │   ├── Result.js
│   │   └── StudentResult.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── quizzes.js
│   │   └── sessions.js
│   ├── scripts/
│   │   ├── resetDatabase.js
│   │   ├── databaseStatus.js
│   │   └── safeCleanup.js
│   ├── socket/
│   │   └── socketHandlers.js
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Common/
│   │   │   │   ├── Navbar.js
│   │   │   │   ├── Sidebar.js
│   │   │   │   └── MobileMenuButton.js
│   │   ├── pages/
│   │   │   ├── Home.js
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   ├── Dashboard.js
│   │   │   ├── CreateQuiz.js
│   │   │   ├── BrowseQuizzes.js
│   │   │   ├── HostQuiz.js
│   │   │   ├── PlayQuiz.js
│   │   │   ├── Results.js
│   │   │   └── Profile.js
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   └── socket.js
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── start-dev.bat
└── README.md
```

---

## Development Workflow

### Branch Strategy

- **`master`** / **`main`**: Production branch (stable, deployed to production)
- **`dev`**: Development branch (testing, deployed to development environment)

**Important:** All changes should be committed to the `dev` branch. Only merge to `master` when ready for production.

### Commands

**Backend:**
```bash
cd backend
npm run dev          # Start development server
npm run db-status    # Check database status
npm run db-cleanup   # Clean up orphaned collections
npm run reset-db     # Reset database (⚠️ dangerous)
```

**Frontend:**
```bash
cd frontend
npm start            # Start development server
```

**Both (Windows):**
```bash
start-dev.bat        # Start both backend and frontend
```

---

## Future Enhancements

- Team mode (collaborative quizzes)
- Enhanced image and video support in questions
- Audio questions for listening practice
- Social features (share quizzes, follow users)
- Gamification (badges, streaks, achievements)
- AI-powered question generation improvements
- Multi-language support

---

## License

ISC

---

## Need Help?

- Check deployment logs if something fails
- Review database status: `npm run db-status`
- Check platform docs:
  - [Render Docs](https://render.com/docs)
  - [Railway Docs](https://docs.railway.app)
  - [MongoDB Atlas Docs](https://docs.atlas.mongodb.com/)

---

**Remember:** 
- Development database (`_dev`) is safe to experiment with
- Production database (`_prod`) should be treated carefully
- Always test in development first!
