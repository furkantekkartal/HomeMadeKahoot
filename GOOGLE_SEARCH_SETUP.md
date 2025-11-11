# Google Custom Search API Setup Guide

This guide will help you set up Google Custom Search API to replace Unsplash for image searches.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter a project name (e.g., "HomeMadeKahoot Images")
4. Click "Create"

## Step 2: Enable Custom Search API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Custom Search API"
3. Click on it and click "Enable"

## Step 3: Create API Key

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "API Key"
3. Copy your API key
4. (Optional but recommended) Click "Restrict Key" to:
   - Restrict to "Custom Search API"
   - Add HTTP referrer restrictions if needed

## Step 4: Create a Custom Search Engine

1. Go to [Programmable Search Engine Control Panel](https://programmablesearchengine.google.com/controlpanel/all)
2. Click "Add" to create a new search engine
3. **Important**: In "Sites to search", enter: `*` (asterisk) to search the entire web
4. Click "Create"
5. After creation, click "Control Panel" for your search engine
6. Go to "Setup" → "Basics"
7. Under "Search the entire web", make sure it's enabled
8. Go to "Setup" → "Advanced" → "Image search" and enable it
9. Copy your **Search Engine ID (CX)** - it looks like: `017576662512468239146:omuauf_lfve`

## Step 5: Add Environment Variables

Add these to your `.env` file in the backend:

```env
GOOGLE_API_KEY=your_api_key_here
GOOGLE_CX=your_search_engine_id_here
GOOGLE_DAILY_LIMIT=100
```

**Note**: `GOOGLE_DAILY_LIMIT` is optional and defaults to 100. You can set it lower if you want a stricter limit (e.g., `GOOGLE_DAILY_LIMIT=50`).

## Step 6: Restart Your Backend

Restart your Node.js backend server to load the new environment variables.

## Important Notes:

- **Free Tier**: Google provides 100 free searches per day. After that, it's $5 per 1,000 queries.
- **Daily Limit Protection**: The system automatically tracks daily usage and prevents exceeding the limit. The counter resets at midnight.
- **Usage Tracking**: Daily usage is stored in `backend/data/google_search_usage.json` and automatically resets each day.
- **Rate Limits**: Be mindful of API quotas to avoid unexpected charges.
- **Image Search**: Make sure you've enabled image search in your Custom Search Engine settings.

## Daily Limit Feature

The system includes automatic daily limit tracking to prevent exceeding the free tier:
- Default limit: 100 searches per day (configurable via `GOOGLE_DAILY_LIMIT`)
- Counter automatically resets at midnight
- Usage is tracked in `backend/data/google_search_usage.json`
- If limit is reached, you'll get an error message: "Daily Google Search API limit reached"
- The counter only increments on successful API calls (failed calls don't count)

## Testing

After setup, try generating an image for a word. The system will now use Google Custom Search API instead of Unsplash.

