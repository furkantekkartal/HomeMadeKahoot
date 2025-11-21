# HomeMadeKahoot

English learning quiz platform inspired by Kahoot, designed to make language learning engaging and interactive through game-based quizzes.

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Quick Start](#quick-start)
- [API Setup](#api-setup)
- [Tech Stack](#tech-stack)
- [Database Management](#database-management)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Pages & Features](#pages--features)
- [Key Features Summary](#key-features-summary)
- [Development Workflow](#development-workflow)
- [Future Enhancements](#future-enhancements)

---

## Project Overview

HomeMadeKahoot is a comprehensive English learning platform that combines interactive quiz gameplay with advanced vocabulary and flashcard study tools. The platform supports both live multiplayer quiz sessions and individual self-paced learning, making it suitable for both classroom and personal study.

### Core Features

- **Interactive Quizzes**: Create, host, and join live quiz sessions with real-time synchronization
- **Flashcard System**: Build custom decks and study with interactive flashcards
- **Word Database**: Manage vocabulary with advanced filtering and import/export capabilities
- **Spelling Practice**: Practice spelling words with audio pronunciation
- **Pronunciation Assessment**: Get AI-powered pronunciation feedback using Azure Speech Service
- **Progress Tracking**: Monitor learning progress with statistics, badges, and study time tracking
- **AI-Powered Content**: Automatically generate quizzes and extract words from PDFs, SRT files, and YouTube videos

---

## Features

### Quiz System
- **Live Quizzes**: Host real-time quiz sessions with PIN codes for participants to join
- **Self-Paced Mode**: Practice quizzes individually at your own pace
- **AI Quiz Generation**: Upload PDF/SRT files or YouTube videos to automatically generate quizzes
- **Quiz Management**: Create, edit, browse, and manage your quiz collection
- **Real-Time Leaderboard**: Live scoring and rankings during quiz sessions
- **Multiple Question Types**: Multiple-choice questions with timer-based answering
- **Categories & Levels**: Organize quizzes by category and difficulty level

### Flashcard System
- **Deck Creation**: Build custom flashcard decks by selecting words from your database
- **AI Deck Maker**: Upload PDF, SRT, or Excel files to automatically extract words and create decks
- **Interactive Study**: Study flashcards with swipe gestures, keyboard shortcuts, and audio pronunciation
- **Spelling Practice**: Practice spelling words with audio prompts and instant feedback
- **Pronunciation Assessment**: Record and get AI-powered pronunciation feedback (requires Azure Speech Service)
- **Deck Organization**: Organize decks by CEFR level (A1-C2), skill (Speaking, Reading, Writing, Listening), and task type
- **Progress Tracking**: Track known/unknown words and study progress per deck

### Word Database
- **Word Management**: Comprehensive word database with English-Turkish translations
- **Advanced Filtering**: Filter by level, word type, category, known/unknown status, and source
- **Import/Export**: Import words from Excel files and export your word collection
- **Word Editing**: Edit word details including meanings, categories, sample sentences, and images
- **Bulk Operations**: Select and manage multiple words at once
- **Source Tracking**: Track where words came from (videos, documents, etc.)

### Dashboard & Analytics
- **Statistics Overview**: View comprehensive learning statistics including:
  - Total words known/unknown by level (A1-C2)
  - Category breakdown with visual charts
  - Study time tracking per module
  - Progress metrics and trends
- **Badge System**: Earn badges based on vocabulary milestones (A1 to C2 proficiency levels)
- **Study Time Tracking**: Automatic tracking of study sessions across all modules
- **Visual Analytics**: Interactive charts and graphs for progress visualization

### Technical Features
- **Separate Databases**: Automatic separation of production and development databases
- **Real-Time Sync**: WebSocket-based live synchronization for quiz sessions
- **JWT Authentication**: Secure user authentication and authorization
- **RESTful API**: Clean API architecture with organized routes and controllers
- **Mobile Responsive**: Fully responsive design for desktop, tablet, and mobile devices
- **Study Session Tracking**: Automatic time tracking for Flashcards, Words, Quiz, Spelling, and Writing modules

---

## Quick Start

### 1. Install Dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Environment Variables

The app supports running both development and production simultaneously. Create these files:

**Backend `.env.dev` (Development):**
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/homemadekahoot
JWT_SECRET=your_dev_secret_key
FRONTEND_URL=http://localhost:3000

# API Keys
OPENROUTER_API_KEY=your_key
GEMINI_API_KEY=your_key
UNSPLASH_ACCESS_KEY=your_key
```

**Backend `.env.prod` (Production):**
```env
PORT=5001
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/homemadekahoot
JWT_SECRET=your_prod_secret_key
FRONTEND_URL=http://localhost:3001

# API Keys (same as dev)
OPENROUTER_API_KEY=your_key
GEMINI_API_KEY=your_key
UNSPLASH_ACCESS_KEY=your_key
```

**Frontend `.env.development`:**
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
PORT=3000
```

**Frontend `.env.production`:**
```env
REACT_APP_API_URL=http://localhost:5001/api
REACT_APP_SOCKET_URL=http://localhost:5001
PORT=3001
```

**Note:** The app automatically uses `homemadekahoot_dev` for development and `homemadekahoot_prod` for production based on `NODE_ENV`.

### 3. Run the Application

**Single Environment (Development):**
```bash
# Terminal 1 - Backend
cd backend && npm run dev:dev

# Terminal 2 - Frontend
cd frontend && npm run start:dev
```

**Both Environments (Development + Production):**
```bash
# Terminal 1 - Dev Backend
cd backend && npm run dev:dev

# Terminal 2 - Prod Backend
cd backend && npm run dev:prod

# Terminal 3 - Dev Frontend
cd frontend && npm run start:dev

# Terminal 4 - Prod Frontend
cd frontend && npm run start:prod
```

Access:
- Development: http://localhost:3000 (frontend) + http://localhost:5000 (backend)
- Production: http://localhost:3001 (frontend) + http://localhost:5001 (backend)

---

## Exposing to Internet (Cloudflare)

To access your app from outside your network using Cloudflare tunnels:

### 1. Install cloudflared
Download from: https://github.com/cloudflare/cloudflared/releases

### 2. Start Cloudflare Tunnels
Open 4 terminals and run:
```bash
# Terminal 1 - Dev Backend
cloudflared tunnel --url http://localhost:5000

# Terminal 2 - Prod Backend
cloudflared tunnel --url http://localhost:5001

# Terminal 3 - Dev Frontend
cloudflared tunnel --url http://localhost:3000

# Terminal 4 - Prod Frontend
cloudflared tunnel --url http://localhost:3001
```

Copy the HTTPS URLs from each terminal.

### 3. Update Environment Files

**Backend `.env.dev`:**
```env
FRONTEND_URL=https://your-dev-frontend-cloudflare-url.trycloudflare.com
```

**Backend `.env.prod`:**
```env
FRONTEND_URL=https://your-prod-frontend-cloudflare-url.trycloudflare.com
```

**Frontend `.env.development`:**
```env
REACT_APP_API_URL=https://your-dev-backend-cloudflare-url.trycloudflare.com/api
REACT_APP_SOCKET_URL=https://your-dev-backend-cloudflare-url.trycloudflare.com
```

**Frontend `.env.production`:**
```env
REACT_APP_API_URL=https://your-prod-backend-cloudflare-url.trycloudflare.com/api
REACT_APP_SOCKET_URL=https://your-prod-backend-cloudflare-url.trycloudflare.com
```

**Important:**
- Use HTTPS URLs (Cloudflare provides HTTPS)
- NO trailing slashes
- Access frontend via Cloudflare URL, not localhost
- Restart all servers after updating `.env` files

---

## API Setup

### Image Search APIs

The app supports two options for image search:

#### Option 1: Unsplash (Recommended for simplicity)
- Get your API key from [Unsplash Developers](https://unsplash.com/developers)
- Add `UNSPLASH_ACCESS_KEY` to your `.env` file

#### Option 2: Google Custom Search API (Alternative)

The app supports Google Custom Search API as an alternative to Unsplash for image searches.

**Setup Steps:**

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project

2. **Enable Custom Search API**
   - Go to "APIs & Services" → "Library"
   - Search for "Custom Search API" and enable it

3. **Create API Key**
   - Go to "APIs & Services" → "Credentials"
   - Create API Key and optionally restrict it to Custom Search API

4. **Create Custom Search Engine**
   - Go to [Programmable Search Engine Control Panel](https://programmablesearchengine.google.com/controlpanel/all)
   - Create new search engine with `*` (asterisk) in "Sites to search" to search entire web
   - Enable "Search the entire web" and "Image search"
   - Copy your Search Engine ID (CX)

5. **Add to Environment Variables**
   ```env
   GOOGLE_API_KEY=your_api_key_here
   GOOGLE_CX=your_search_engine_id_here
   GOOGLE_DAILY_LIMIT=100
   ```

**Important Notes:**
- Free tier: 100 searches per day (configurable via `GOOGLE_DAILY_LIMIT`)
- Daily limit tracking prevents exceeding free tier
- Usage tracked in `backend/data/google_search_usage.json`
- Counter resets at midnight automatically

### Azure Speech Service (Optional - For Pronunciation Assessment)

The pronunciation assessment feature uses Azure Speech Service to provide detailed pronunciation feedback.

**Setup Steps:**

1. **Create Azure Account**
   - Go to [Azure Portal](https://portal.azure.com/)
   - Create a new Speech resource

2. **Get Credentials**
   - Copy your Speech Service key
   - Copy your Speech Service region (e.g., `eastus`, `westus`)

3. **Add to Environment Variables**
   ```env
   AZURE_SPEECH_KEY=your_azure_speech_key
   AZURE_SPEECH_REGION=your_azure_region
   ```

**Note:** Pronunciation assessment is available in the Flashcards page when studying words. Without Azure credentials, the feature will be disabled.

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
- If using Cloudflare, access frontend via Cloudflare URL (not localhost)
- Backend `FRONTEND_URL` must match where you access the frontend

**Can't Login in Production**
- Check backend `.env.prod` has correct `FRONTEND_URL`
- Check frontend `.env.production` points to correct backend URL
- Access frontend via Cloudflare URL if using Cloudflare tunnels
- Restart servers after changing `.env` files

**Wrong Environment Loading**
- Backend: Use `.env.dev` and `.env.prod` (not `.env.production`)
- Frontend: Use `.env.development` and `.env.production` (not `.env.prod`)
- Check console: Backend should show "Loaded environment file: .env.prod (production)"

**MongoDB Connection Failed**
- Verify Network Access allows `0.0.0.0/0` (if MongoDB Atlas)
- Check connection string has correct password
- Verify `NODE_ENV` is set correctly
- Database name automatically gets `_dev` or `_prod` suffix

**Empty Page on Refresh**
- Ensure rewrite (not redirect) is configured in Render
- Check `_redirects` file exists in `frontend/public/`

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

**Both Environments:**
```bash
# Development
cd backend && npm run dev:dev
cd frontend && npm run start:dev

# Production
cd backend && npm run dev:prod
cd frontend && npm run start:prod
```

---

## Pages & Features

### Main Pages

- **Home** (`/`) - Landing page with quick access to main features
- **Dashboard** (`/dashboard`) - Statistics, badges, and progress overview
- **New** (`/new`) - Quick access to create new quizzes or decks

### Quiz Pages

- **Create Quiz** (`/create-quiz`) - Create new quizzes with AI assistance
- **Edit Quiz** (`/edit-quiz/:id`) - Modify existing quizzes
- **Browse Quizzes** (`/browse`) - Browse and discover quizzes
- **Host Quiz** (`/host/:sessionId`) - Host live quiz sessions
- **Join Quiz** (`/join`) - Join quiz sessions with PIN code
- **Play Quiz** (`/play/:sessionId`) - Participate in live or self-paced quizzes
- **Self-Paced Quiz** (`/quiz/:id/self-paced`) - Practice quizzes individually
- **Results** (`/results`) - View quiz results and performance history

### Flashcard Pages

- **Decks** (`/decks`) - View and manage all your flashcard decks
- **Create Deck** (`/create-deck`) - Create new flashcard decks manually or from files
- **Edit Deck** (`/edit-deck/:id`) - Modify existing decks
- **Flashcards** (`/flashcards`) - Study flashcards with interactive features
- **Spelling** (`/spelling`) - Practice spelling words with audio

### Word Management

- **Word Database** (`/words`) - Comprehensive word management interface
  - View, edit, and filter words
  - Import/export functionality
  - Bulk operations
  - Source tracking

### User Pages

- **Profile** (`/profile`) - Manage your profile, picture, and account settings
- **Login/Register** - User authentication

### Study Features

**Flashcards Study Mode:**
- Swipe gestures (up/down for known/unknown)
- Keyboard shortcuts (Arrow keys, Space, Enter)
- Audio pronunciation (word and sentence)
- Pronunciation assessment with Azure Speech Service
- Card flip animation
- Progress tracking (known/unknown counts)
- Study timer integration

**Spelling Practice:**
- Audio prompts for words
- Text input for spelling
- Instant feedback
- Progress tracking
- Study timer integration

**Study Session Tracking:**
- Automatic time tracking for:
  - Flashcards module
  - Words module
  - Quiz module
  - Spelling module
  - Writing module
- Session persistence across page refreshes
- Daily study time aggregation

---

## Key Features Summary

### For Students/Learners
- Join live quiz sessions with PIN codes
- Practice with self-paced quizzes
- Study vocabulary with interactive flashcards
- Practice spelling with audio prompts
- Track learning progress with statistics and badges
- Manage personal word database
- Get pronunciation feedback

### For Teachers/Content Creators
- Create and host live quiz sessions
- Generate quizzes from PDFs, SRT files, or YouTube videos
- Build flashcard decks from uploaded files
- Manage word database with import/export
- Track student performance and results

### AI-Powered Features
- **Quiz Generation**: Automatically create quizzes from documents
- **Word Extraction**: Extract vocabulary from PDFs, SRT files, Excel files
- **Auto-Fill**: Automatically fill deck information from file content
- **Image Generation**: AI-generated images for quiz questions
- **Pronunciation Assessment**: AI-powered pronunciation feedback

---

## Future Enhancements

- Team mode (collaborative quizzes)
- Enhanced image and video support in questions
- Audio questions for listening practice
- Social features (share quizzes, follow users)
- Enhanced gamification (streaks, achievements)
- AI-powered question generation improvements
- Multi-language support
- Bulk word selection across pages
- Save draft decks
- Import/export deck functionality

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
