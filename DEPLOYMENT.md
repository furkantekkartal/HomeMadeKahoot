# Deployment Guide for HomeMadeKahoot

This guide will help you deploy your HomeMadeKahoot application so you can share it with others.

## 🚀 Recommended Deployment Options

### Option 1: Render (Easiest - Recommended)
**Best for:** Full-stack apps, free tier available, easy setup
- **Backend:** Free tier (spins down after inactivity)
- **Frontend:** Free tier
- **Database:** MongoDB Atlas (free tier)

### Option 2: Railway
**Best for:** Full-stack apps, good free credits
- **Backend + Frontend:** $5/month after free credits
- **Database:** MongoDB Atlas (free tier)

### Option 3: Vercel (Frontend) + Render (Backend)
**Best for:** Best performance for frontend
- **Frontend:** Vercel (free, excellent CDN)
- **Backend:** Render (free tier)
- **Database:** MongoDB Atlas (free tier)

---

## 📋 Pre-Deployment Checklist

Before deploying, make sure you have:

- [ ] MongoDB Atlas account and cluster (if not already set up)
- [ ] Unsplash API key
- [ ] OpenRouter API key
- [ ] GitHub account (for connecting repositories)
- [ ] All environment variables ready

---

## 🎯 Option 1: Deploy with Render (Recommended)

### Step 1: Prepare Your Code

1. **Ensure all environment variables are documented**
   - Backend: `PORT`, `MONGODB_URI`, `JWT_SECRET`, `UNSPLASH_ACCESS_KEY`, `OPENROUTER_API_KEY`, `APP_URL`, `FRONTEND_URL`
   - Frontend: `REACT_APP_API_URL`, `REACT_APP_SOCKET_URL`

2. **Update backend CORS settings** (already done in server.js)
   - Make sure `FRONTEND_URL` is set to your deployed frontend URL

### Step 2: Deploy Backend on Render

1. Go to [Render.com](https://render.com) and sign up/login
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select the repository: `HomeMadeKahoot`
5. Configure:
   - **Name:** `homemadekahoot-backend`
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free (or paid for better performance)

6. **Add Environment Variables:**
   ```
   PORT=10000
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/homemadekahoot?retryWrites=true&w=majority
   JWT_SECRET=your_very_long_random_secret_key
   NODE_ENV=production
   UNSPLASH_ACCESS_KEY=your_unsplash_key
   OPENROUTER_API_KEY=your_openrouter_key
   APP_URL=https://your-frontend-url.onrender.com
   FRONTEND_URL=https://your-frontend-url.onrender.com
   ```
   
   **⚠️ CRITICAL - No Trailing Slashes:**
   - `FRONTEND_URL` and `APP_URL` must NOT have trailing slashes
   - Use: `https://homemadekahoot-frontend.onrender.com` ✅
   - NOT: `https://homemadekahoot-frontend.onrender.com/` ❌
   - Trailing slashes cause CORS errors (the backend code now normalizes this, but it's better to set it correctly)
   
   **⚠️ Important for MongoDB Atlas:**
   - Before deploying, make sure MongoDB Atlas Network Access allows connections
   - Go to MongoDB Atlas → Network Access → Add IP Address
   - Click **"Allow Access from Anywhere"** (adds `0.0.0.0/0`)
   - This is required because Render uses dynamic IPs that change
   - Wait 1-2 minutes after adding for changes to take effect

7. Click **"Create Web Service"**
8. Wait for deployment (5-10 minutes)
9. Copy your backend URL (e.g., `https://homemadekahoot-backend.onrender.com`)

### Step 3: Deploy Frontend on Render

1. **IMPORTANT: Configure Render for SPA Routing:**
   - In Render dashboard, click **"New +"** → **"Static Site"**
   - Connect your GitHub repository
   - Configure:
     - **Name:** `homemadekahoot-frontend`
     - **Root Directory:** `frontend`
     - **Build Command:** `npm install && npm run build`
     - **Publish Directory:** `build`
     - **Plan:** Free
    
   **⚠️ CRITICAL: Configure Rewrites (NOT Redirects) in Render Dashboard:**
   
   After creating the static site:
   1. Go to your static site in Render dashboard
   2. Go to **Settings** → Scroll down to find **"Redirects and Rewrites"** section
   3. Click **"Add Redirect"** or **"Add Rewrite"**
   4. Configure as a **REWRITE** (not redirect):
      - **Source Path:** `/*`
      - **Destination Path:** `/index.html`
      - **Type:** `Rewrite` (this is important - it should be a rewrite, not a redirect)
      - **Status Code:** `200` (if asked)
   
   **Why Rewrite instead of Redirect?**
   - A **redirect** (301/302) changes the URL from `/host/sessionId` to `/index.html` ❌
   - A **rewrite** (200) serves `index.html` but keeps the URL as `/host/sessionId` ✅
   - React Router needs the original URL to work correctly
   
   **Alternative: If Render doesn't have Rewrite option:**
   - The `_redirects` file in `frontend/public/` should work (it's automatically copied to `build/` during build)
   - Make sure it contains: `/*    /index.html   200`
   - If it still redirects to `/index.html`, you may need to configure it manually in Render dashboard

3. **Add Environment Variables:**
   ```
   REACT_APP_API_URL=https://your-backend-url.onrender.com/api
   REACT_APP_SOCKET_URL=https://your-backend-url.onrender.com
   ```
   
   **⚠️ CRITICAL:** 
   - Make sure there are **NO trailing slashes** in the URLs
   - Use `https://` (not `http://`)
   - The URLs should match your actual backend URL exactly

4. Click **"Create Static Site"**
5. Wait for deployment (can take 5-10 minutes)
6. Copy your frontend URL (e.g., `https://homemadekahoot-frontend.onrender.com`)

**⚠️ Troubleshooting React Router on Render:**
- If routes like `/host/sessionId` show empty page or redirect to `/index.html`, the redirects aren't configured correctly
- Try accessing `https://your-frontend-url.onrender.com/host/test` - it should load the React app (even if it errors, it should show the React app, not a blank page)
- If you see a blank page, check browser console for errors
- Verify environment variables are set correctly - undefined values can cause routing issues

### Step 4: Update Backend with Frontend URL

1. Go back to your backend service in Render
2. Go to **Environment** tab
3. Update:
   ```
   APP_URL=https://your-frontend-url.onrender.com
   FRONTEND_URL=https://your-frontend-url.onrender.com
   ```
4. Save and redeploy

### Step 5: Update Frontend with Backend URL

1. Go to your frontend service in Render
2. Go to **Environment** tab
3. Update:
   ```
   REACT_APP_API_URL=https://your-backend-url.onrender.com/api
   REACT_APP_SOCKET_URL=https://your-backend-url.onrender.com
   ```
4. Save and redeploy

---

## 🔄 Automatic Deployments (Auto-Deploy on Git Push)

**Good news!** If you connected your GitHub repository when creating the services, Render automatically deploys whenever you push changes to your repository.

### How It Works

1. **When you push to GitHub:**
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin master
   ```

2. **Render automatically detects the push** and starts a new deployment
3. Both frontend and backend will redeploy automatically
4. You'll see the deployment status in your Render dashboard

### Verify Auto-Deploy is Enabled

1. Go to your Render dashboard
2. Select your backend service (`homemadekahoot-backend`)
3. Go to **Settings** → **Build & Deploy**
4. Check **"Auto-Deploy"** section:
   - Should show: **"Auto-Deploy: Yes"**
   - **Branch:** Should be `master` (or `main` - your default branch)
   - If it says "No", click **"Edit"** and enable it

5. Repeat for frontend service (`homemadekahoot-frontend`)

### Configure Branch Selection

By default, Render deploys from your default branch (`master` or `main`). To deploy from a different branch:

1. Go to your service in Render dashboard
2. **Settings** → **Build & Deploy**
3. Under **"Auto-Deploy"**, change the branch name
4. Save changes

### Manual Deployment

If you need to manually trigger a deployment:

1. Go to your service in Render dashboard
2. Click **"Manual Deploy"** button (top right)
3. Select:
   - **"Deploy latest commit"** - deploys latest code from GitHub
   - Or **"Clear build cache & deploy"** - clean rebuild (if you have caching issues)

### Deployment Status

You can monitor deployments in Render dashboard:
- **Logs tab** - see real-time build and deployment logs
- **Events tab** - see deployment history
- **Metrics tab** - see deployment metrics

### Tips for Automatic Deployments

1. **Always test locally first:**
   ```bash
   # Backend
   cd backend && npm run dev
   
   # Frontend (in another terminal)
   cd frontend && npm start
   ```

2. **Use meaningful commit messages:**
   ```bash
   git commit -m "Fix: Fix CORS issue in Socket.io"
   git commit -m "Feature: Add image generation to quiz questions"
   ```

3. **Check deployment logs** if something goes wrong:
   - Go to Render dashboard → Your service → **Logs** tab
   - Look for errors in build or runtime logs

4. **Deploy only from main branch:**
   - Keep `master`/`main` branch stable
   - Use feature branches for development
   - Merge to `master`/`main` when ready to deploy

5. **Free tier note:**
   - Render free tier services spin down after 15 minutes of inactivity
   - First request after spin-down takes 30-60 seconds to start
   - This is normal and doesn't affect deployment

---

## 🎯 Option 2: Deploy with Railway

### Step 1: Deploy Backend

1. Go to [Railway.app](https://railway.app) and sign up/login
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your repository
4. Add service → Select `backend` folder
5. Add environment variables (same as Render)
6. Railway auto-detects Node.js and deploys

### Step 2: Deploy Frontend

1. In same project, click **"New"** → **"GitHub Repo"**
2. Select same repository
3. Add service → Select `frontend` folder
4. Set root directory: `frontend`
5. Add environment variables
6. Railway auto-detects and builds

---

## 🎯 Option 3: Vercel (Frontend) + Render (Backend)

### Frontend on Vercel

1. **First, create Vercel configuration** (for React Router):
   - Create file: `frontend/vercel.json`
   - Add this content:
   ```json
   {
     "rewrites": [
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```
   - This ensures all routes serve `index.html` (required for React Router)

2. Go to [Vercel.com](https://vercel.com) and sign up/login
3. Click **"Add New Project"**
4. Import your GitHub repository
5. Configure:
   - **Framework Preset:** Create React App
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`

6. **Add Environment Variables:**
   ```
   REACT_APP_API_URL=https://your-backend-url.onrender.com/api
   REACT_APP_SOCKET_URL=https://your-backend-url.onrender.com
   ```

7. Click **"Deploy"**
8. Vercel gives you a URL like `homemadekahoot.vercel.app`

### Backend on Render

Follow Step 2 from Option 1 above, using your Vercel frontend URL in the environment variables.

---

## 🔧 Important Configuration

### MongoDB Atlas Setup

#### Step 1: Create MongoDB Atlas Cluster (if not already done)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up or log in
3. Create a new cluster (choose FREE tier - M0)
4. Wait for cluster to be created (3-5 minutes)

#### Step 2: Get Connection String

1. Click **"Connect"** on your cluster
2. Choose **"Connect your application"**
3. Copy the connection string (looks like: `mongodb+srv://username:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`)
4. Replace `<password>` with your database user password
5. Replace `<dbname>` with `homemadekahoot` or add it: `mongodb+srv://...@cluster0.xxxxx.mongodb.net/homemadekahoot?retryWrites=true&w=majority`

#### Step 3: Configure Network Access (IP Whitelist)

**Important:** MongoDB Atlas blocks connections from IPs that aren't whitelisted. You need to add your deployment server's IP addresses.

##### Option A: Allow All IPs (Easiest for Development/Production)

**⚠️ Security Note:** This allows connections from anywhere. Safe for small projects, but for production with sensitive data, consider Option B.

1. In MongoDB Atlas dashboard, go to **"Network Access"** (left sidebar)
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** button
4. This adds `0.0.0.0/0` to your whitelist
5. Click **"Confirm"**
6. Wait 1-2 minutes for changes to take effect

##### Option B: Add Specific IPs (More Secure)

**For Render:**
- Render uses dynamic IPs that change frequently
- **Best approach:** Use Option A (allow all) OR contact Render support for their IP ranges
- Alternatively: Check Render logs for outbound IPs (not always visible)

**For Railway:**
- Railway also uses dynamic IPs
- **Best approach:** Use Option A (allow all)

**For Other Platforms:**
- Some platforms provide static IPs or IP ranges
- Check your platform's documentation for outbound IP addresses
- Add each IP to MongoDB Atlas Network Access

##### Option C: MongoDB Atlas VPC Peering (Advanced)

- For production: Set up VPC peering between your cloud provider and MongoDB Atlas
- More complex but most secure
- See [MongoDB Atlas VPC Peering docs](https://www.mongodb.com/docs/atlas/security-vpc-peering/)

#### Step 4: Create Database User

1. In MongoDB Atlas, go to **"Database Access"** (left sidebar)
2. Click **"Add New Database User"**
3. Choose **"Password"** authentication
4. Enter username and strong password
5. Set privileges: **"Atlas admin"** or **"Read and write to any database"**
6. Click **"Add User"**
7. **Save the password securely** - you'll need it for the connection string

#### Step 5: Test Connection

1. Use the connection string in your backend's `MONGODB_URI` environment variable
2. Deploy your backend
3. Check backend logs - should see "MongoDB Connected"
4. If you see IP whitelist errors, go back to Network Access and ensure `0.0.0.0/0` is added

#### Troubleshooting MongoDB Atlas Connection

**Error: "IP not whitelisted"**
- ✅ Solution: Go to Network Access → Add `0.0.0.0/0` (allow all)
- Wait 1-2 minutes after adding IPs
- Double-check connection string has correct password and database name

**Error: "Authentication failed"**
- ✅ Solution: Verify database username and password in connection string
- Make sure you created a database user in Database Access

**Error: "Connection timeout"**
- ✅ Solution: Check Network Access includes `0.0.0.0/0`
- Verify connection string is correct
- Check if cluster is running (not paused)

**Still having issues?**
- Check MongoDB Atlas cluster status (should be green/running)
- Verify connection string format: `mongodb+srv://username:password@cluster.mongodb.net/homemadekahoot?retryWrites=true&w=majority`
- Try connecting from MongoDB Compass (desktop app) to test connection

### Socket.io Configuration

The backend already has CORS configured, but make sure:
- `FRONTEND_URL` environment variable matches your deployed frontend URL
- Socket.io transports are set to `['polling', 'websocket']` (already done)

### SSL/HTTPS

All recommended platforms (Render, Railway, Vercel) provide HTTPS automatically. No additional setup needed.

---

## 🧪 Testing Your Deployment

After deployment:

1. **Test Backend:**
   - Visit: `https://your-backend-url.onrender.com/api/health`
   - Should return: `{"status":"ok","message":"HomeMadeKahoot API is running"}`

2. **Test Frontend:**
   - Visit your frontend URL
   - Try registering a new account
   - Create a quiz
   - Test the live quiz feature

3. **Test Socket.io:**
   - Host a quiz session
   - Join from another device/browser
   - Verify real-time updates work

---

## 🐛 Troubleshooting

### Backend won't start
- Check environment variables are set correctly
- Check MongoDB connection string is correct
- **MongoDB IP Whitelist Error:** Add `0.0.0.0/0` to MongoDB Atlas Network Access (see MongoDB Atlas Setup section above)
- Look at Render/Railway logs for errors

### Frontend can't connect to backend
- Verify `REACT_APP_API_URL` and `REACT_APP_SOCKET_URL` are correct
- Check backend CORS settings include frontend URL
- Ensure backend is deployed and running

### Empty page when clicking "Host Quiz" (shows header but no content)

**This usually means the API calls are failing silently.**

**✅ Solution:**

1. **Check Environment Variables in Render:**
   - Go to your frontend static site in Render
   - Go to **Settings** → **Environment**
   - Verify these are set correctly:
     ```
     REACT_APP_API_URL=https://your-backend-url.onrender.com/api
     REACT_APP_SOCKET_URL=https://your-backend-url.onrender.com
     ```
   - **Important:** Make sure there are no trailing slashes and the URLs are correct
   - After updating, redeploy the frontend

2. **Check Backend CORS Settings:**
   - Go to your backend service in Render
   - Go to **Settings** → **Environment**
   - Verify `FRONTEND_URL` matches your frontend URL exactly:
     ```
     FRONTEND_URL=https://your-frontend-url.onrender.com
     ```
   - No trailing slash!
   - After updating, redeploy the backend

3. **Check Browser Console:**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Look for errors like:
     - "Failed to fetch"
     - "CORS error"
     - "Network error"
   - Go to Network tab and check if API calls are failing

4. **Test Backend API:**
   - Visit: `https://your-backend-url.onrender.com/api/health`
   - Should return: `{"status":"ok","message":"HomeMadeKahoot API is running"}`
   - If this doesn't work, backend has issues

5. **Verify Session Creation:**
   - Check browser console when clicking "Host Quiz"
   - Look for any errors in the Network tab
   - The session should be created successfully before navigation

### "Not Found" error on routes like `/host/sessionId` or `/play/sessionId`

**This is a React Router client-side routing issue on static hosting.**

**✅ Solution for Render:**

1. **Add the redirects file** (already created):
   - File: `frontend/public/_redirects`
   - Content: `/*    /index.html   200`
   - Commit and push this file to GitHub

2. **In Render Dashboard:**
   - Go to your frontend static site
   - Go to **Settings** → **Redirects/Rewrites**
   - Add a redirect rule:
     - **Source:** `/*`
     - **Destination:** `/index.html`
     - **Status Code:** `200`
   - Or if Render doesn't have that setting, the `_redirects` file should work after redeploy

3. **Redeploy your frontend:**
   - Render will automatically redeploy when you push to GitHub
   - Or manually trigger a redeploy in Render dashboard

**Alternative Solution (if above doesn't work):**

If Render doesn't support `_redirects`, you can:
- Switch to Vercel for frontend (better SPA support)
- Or use Railway which handles SPAs automatically
- Or configure a custom server (more complex)

**For Vercel:** Use `vercel.json` (already created in `frontend/vercel.json`)

### Socket.io connection fails
- Verify `FRONTEND_URL` in backend matches frontend URL
- Check CORS settings in backend
- Try different transports (already set to polling + websocket)

### Rate limiting issues
- Unsplash free tier: 50 requests/hour
- OpenRouter: Check your plan limits
- Consider implementing caching for images

---

## 📝 Quick Reference: Environment Variables

### Backend (.env)
```env
PORT=10000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/homemadekahoot
JWT_SECRET=your_long_random_secret_key_here
NODE_ENV=production
UNSPLASH_ACCESS_KEY=your_unsplash_key
OPENROUTER_API_KEY=your_openrouter_key
APP_URL=https://your-frontend-url.onrender.com
FRONTEND_URL=https://your-frontend-url.onrender.com
```

### Frontend (.env)
```env
REACT_APP_API_URL=https://your-backend-url.onrender.com/api
REACT_APP_SOCKET_URL=https://your-backend-url.onrender.com
```

---

## 🎉 You're Done!

Once deployed, share your frontend URL with others. They can:
- Register accounts
- Create quizzes
- Host live quiz sessions
- Join quizzes using PIN codes

---

## 💡 Tips

1. **Free Tier Limitations:**
   - Render free tier spins down after 15 minutes of inactivity
   - First request after spin-down may take 30-60 seconds
   - Consider paid tier ($7/month) for always-on service

2. **Custom Domain:**
   - Both Render and Vercel support custom domains
   - Add your domain in the service settings

3. **Monitoring:**
   - Use Render/Railway logs to monitor errors
   - Set up error tracking (optional): Sentry, LogRocket

4. **Backups:**
   - MongoDB Atlas provides automatic backups
   - Consider exporting your database regularly

---

**Need Help?** Check the platform documentation:
- [Render Docs](https://render.com/docs)
- [Railway Docs](https://docs.railway.app)
- [Vercel Docs](https://vercel.com/docs)

