# Deployment Guide

Complete guide to deploy HomeMadeKahoot - both production and development versions simultaneously.

## 📋 Pre-Deployment Checklist

Before deploying, make sure you have:
- [ ] MongoDB Atlas account and cluster
- [ ] Unsplash API key ([Get it here](https://unsplash.com/developers))
- [ ] OpenRouter API key ([Get it here](https://openrouter.ai))
- [ ] GitHub account with repository pushed
- [ ] Render account ([Sign up here](https://render.com))

---

## 🗄️ MongoDB Atlas Setup (Do This First)

### Step 1: Create MongoDB Atlas Cluster

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign up/login
2. Click **"Create"** → **"Database"**
3. Choose **FREE** tier (M0)
4. Select your region (closest to your users)
5. Click **"Create"** and wait 3-5 minutes

### Step 2: Configure Network Access

1. Go to **"Network Access"** (left sidebar)
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** button
   - This adds `0.0.0.0/0` (allows all IPs)
   - Required because Render uses dynamic IPs
4. Click **"Confirm"**
5. Wait 1-2 minutes for changes to take effect

### Step 3: Create Database User

1. Go to **"Database Access"** (left sidebar)
2. Click **"Add New Database User"**
3. Choose **"Password"** authentication
4. Enter username (e.g., `homemadekahoot-user`)
5. Generate or enter a strong password → **Save it securely!**
6. Set privileges: **"Atlas admin"** or **"Read and write to any database"**
7. Click **"Add User"**

### Step 4: Get Connection String

1. Go back to **"Database"** → Click **"Connect"** on your cluster
2. Choose **"Connect your application"**
3. Copy the connection string (looks like: `mongodb+srv://username:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`)
4. Replace `<password>` with your database user password
5. Add database name: `homemadekahoot` (for production) or `homemadekahoot-dev` (for development)

**Example:**
```
mongodb+srv://homemadekahoot-user:YourPassword123@cluster0.xxxxx.mongodb.net/homemadekahoot?retryWrites=true&w=majority
```

**For Development:** Use a different database name:
```
mongodb+srv://homemadekahoot-user:YourPassword123@cluster0.xxxxx.mongodb.net/homemadekahoot-dev?retryWrites=true&w=majority
```

---

## 🚀 Deploy Both Production and Development

This guide will help you deploy both versions simultaneously on Render.

### Overview

**Production:**
- Branch: `master`
- Services: `homemadekahoot-backend` + `homemadekahoot-frontend`
- Database: `homemadekahoot`
- URL: `https://homemadekahoot-frontend.onrender.com`

**Development:**
- Branch: `dev`
- Services: `homemadekahoot-backend-dev` + `homemadekahoot-frontend-dev`
- Database: `homemadekahoot-dev`
- URL: `https://homemadekahoot-frontend-dev.onrender.com`

---

## Step 1: Deploy Production Backend

1. Go to [Render.com](https://render.com) and sign up/login
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account
4. Select repository: `HomeMadeKahoot`
5. Configure:
   - **Name:** `homemadekahoot-backend`
   - **Root Directory:** `backend`
   - **Branch:** `master`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free

6. **Environment Variables** (click "Add Environment Variable" for each):
   ```
   PORT=10000
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/homemadekahoot?retryWrites=true&w=majority
   JWT_SECRET=your_very_long_random_secret_key_here
   NODE_ENV=production
   UNSPLASH_ACCESS_KEY=your_unsplash_key
   OPENROUTER_API_KEY=your_openrouter_key
   FRONTEND_URL=https://homemadekahoot-frontend.onrender.com
   ```
   ⚠️ **Important:** 
   - Use your actual MongoDB connection string (with password)
   - Generate a strong `JWT_SECRET` (random string, 32+ characters)
   - `FRONTEND_URL` - we'll update this after frontend is deployed
   - **NO trailing slashes** in URLs

7. Click **"Create Web Service"**
8. Wait for deployment (5-10 minutes)
9. Copy your backend URL: `https://homemadekahoot-backend.onrender.com`

---

## Step 2: Deploy Production Frontend

1. In Render dashboard, click **"New +"** → **"Static Site"**
2. Connect GitHub repository (if not already connected)
3. Select repository: `HomeMadeKahoot`
4. Configure:
   - **Name:** `homemadekahoot-frontend`
   - **Root Directory:** `frontend`
   - **Branch:** `master`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `build`
   - **Plan:** Free

5. **Environment Variables:**
   ```
   REACT_APP_API_URL=https://homemadekahoot-backend.onrender.com/api
   REACT_APP_SOCKET_URL=https://homemadekahoot-backend.onrender.com
   ```
   ⚠️ **Important:** Use your actual backend URL (from Step 1)

6. Click **"Create Static Site"**
7. After creation, go to **Settings** → **Redirects and Rewrites**
8. Click **"Add Redirect"** or **"Add Rewrite"**
9. Configure:
   - **Source:** `/*`
   - **Destination:** `/index.html`
   - **Type:** **Rewrite** (not Redirect!)
   - **Status Code:** `200`
10. Wait for deployment (5-10 minutes)
11. Copy your frontend URL: `https://homemadekahoot-frontend.onrender.com`

---

## Step 3: Update Production Backend with Frontend URL

1. Go back to `homemadekahoot-backend` service
2. Go to **Environment** tab
3. Update `FRONTEND_URL`:
   ```
   FRONTEND_URL=https://homemadekahoot-frontend.onrender.com
   ```
4. Save changes (Render will auto-redeploy)

---

## Step 4: Deploy Development Backend

1. In Render dashboard, click **"New +"** → **"Web Service"**
2. Connect GitHub repository
3. Select repository: `HomeMadeKahoot`
4. Configure:
   - **Name:** `homemadekahoot-backend-dev`
   - **Root Directory:** `backend`
   - **Branch:** `dev` ⚠️ **Important: Change from master to dev**
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free

5. **Environment Variables:**
   ```
   PORT=10000
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/homemadekahoot-dev?retryWrites=true&w=majority
   JWT_SECRET=your_different_secret_key_for_dev
   NODE_ENV=development
   UNSPLASH_ACCESS_KEY=your_unsplash_key
   OPENROUTER_API_KEY=your_openrouter_key
   FRONTEND_URL=https://homemadekahoot-frontend-dev.onrender.com
   ```
   ⚠️ **Important:**
   - Use `homemadekahoot-dev` as database name (different from production)
   - Can use same or different JWT_SECRET
   - `FRONTEND_URL` - we'll update this after dev frontend is deployed

6. Click **"Create Web Service"**
7. Wait for deployment
8. Copy your dev backend URL: `https://homemadekahoot-backend-dev.onrender.com`

---

## Step 5: Deploy Development Frontend

1. In Render dashboard, click **"New +"** → **"Static Site"**
2. Connect GitHub repository
3. Select repository: `HomeMadeKahoot`
4. Configure:
   - **Name:** `homemadekahoot-frontend-dev`
   - **Root Directory:** `frontend`
   - **Branch:** `dev` ⚠️ **Important: Change from master to dev**
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `build`
   - **Plan:** Free

5. **Environment Variables:**
   ```
   REACT_APP_API_URL=https://homemadekahoot-backend-dev.onrender.com/api
   REACT_APP_SOCKET_URL=https://homemadekahoot-backend-dev.onrender.com
   ```
   ⚠️ **Important:** Use your dev backend URL (from Step 4)

6. Click **"Create Static Site"**
7. After creation, go to **Settings** → **Redirects and Rewrites**
8. Click **"Add Redirect"** or **"Add Rewrite"**
9. Configure:
   - **Source:** `/*`
   - **Destination:** `/index.html`
   - **Type:** **Rewrite** (not Redirect!)
   - **Status Code:** `200`
10. Wait for deployment
11. Copy your dev frontend URL: `https://homemadekahoot-frontend-dev.onrender.com`

---

## Step 6: Update Development Backend with Frontend URL

1. Go to `homemadekahoot-backend-dev` service
2. Go to **Environment** tab
3. Update `FRONTEND_URL`:
   ```
   FRONTEND_URL=https://homemadekahoot-frontend-dev.onrender.com
   ```
4. Save changes (Render will auto-redeploy)

---

## ✅ Final Setup Summary

After all deployments complete, you should have:

**Production:**
- Backend: `https://homemadekahoot-backend.onrender.com`
- Frontend: `https://homemadekahoot-frontend.onrender.com`
- Database: `homemadekahoot`
- Branch: `master`

**Development:**
- Backend: `https://homemadekahoot-backend-dev.onrender.com`
- Frontend: `https://homemadekahoot-frontend-dev.onrender.com`
- Database: `homemadekahoot-dev`
- Branch: `dev`

---

## 🔄 Automatic Deployments

Both services automatically deploy when you push to their respective branches:

- Push to `master` → Production deploys automatically
- Push to `dev` → Development deploys automatically

**Verify:** Settings → Build & Deploy → Auto-Deploy should be **Yes**

**Manual Deploy:** Click "Manual Deploy" button in dashboard

---

## 🐛 Troubleshooting

### CORS Errors
- Verify `FRONTEND_URL` has no trailing slash
- Check backend CORS includes exact frontend URL
- Wait 1-2 minutes after updating environment variables

### Empty Page on Refresh
- Ensure rewrite (not redirect) is configured: `/*` → `/index.html` (Status 200)
- Check `_redirects` file exists in `frontend/public/`

### MongoDB Connection Failed
- Verify Network Access allows `0.0.0.0/0`
- Check connection string has correct password
- Verify database name matches (`homemadekahoot` vs `homemadekahoot-dev`)
- Wait 1-2 minutes after IP changes

### Socket.io Connection Fails
- Verify `FRONTEND_URL` matches frontend URL exactly (no trailing slash)
- Check CORS settings in backend
- Ensure both services are running

### Wrong Branch Deploying
- Go to Settings → Build & Deploy
- Check "Branch" setting matches what you want
- Production should be `master`, Development should be `dev`

---

## 📝 Environment Variables Reference

### Production Backend
```env
PORT=10000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/homemadekahoot
JWT_SECRET=your_production_secret
NODE_ENV=production
UNSPLASH_ACCESS_KEY=your_key
OPENROUTER_API_KEY=your_key
FRONTEND_URL=https://homemadekahoot-frontend.onrender.com
```

### Production Frontend
```env
REACT_APP_API_URL=https://homemadekahoot-backend.onrender.com/api
REACT_APP_SOCKET_URL=https://homemadekahoot-backend.onrender.com
```

### Development Backend
```env
PORT=10000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/homemadekahoot-dev
JWT_SECRET=your_dev_secret
NODE_ENV=development
UNSPLASH_ACCESS_KEY=your_key
OPENROUTER_API_KEY=your_key
FRONTEND_URL=https://homemadekahoot-frontend-dev.onrender.com
```

### Development Frontend
```env
REACT_APP_API_URL=https://homemadekahoot-backend-dev.onrender.com/api
REACT_APP_SOCKET_URL=https://homemadekahoot-backend-dev.onrender.com
```

---

## 💡 Tips

- **Free Tier Spin-Down**: Services automatically spin down after 15 minutes of inactivity
- **Auto-Restart**: Services automatically restart when you make a request (no manual action needed)
- **Cold Start**: First request after spin-down takes 30-60 seconds (this is normal)
- **Separate Databases**: Using different database names keeps production and development data separate
- **Test Dev First**: Always test new features in development before merging to master
- **Branch Strategy**: 
  - Develop features in `dev` branch
  - Merge to `master` when ready for production
  - Both branches auto-deploy to their respective services

---

**Need Help?** Check platform docs:
- [Render Docs](https://render.com/docs)
- [MongoDB Atlas Docs](https://docs.atlas.mongodb.com)
