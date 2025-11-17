# Image Generation Script

This standalone script generates images for all words in your database that don't have images yet.

## Features

- ✅ Connects to your MongoDB database
- ✅ Finds all words without images (null, empty, or default placeholder)
- ✅ Uses 5 Unsplash API keys in parallel for faster processing
- ✅ Automatically distributes words across keys based on wordId
- ✅ Logs progress to console and text file
- ✅ Respects API rate limits (2 second delay between requests)

## Setup

1. **Add your Unsplash API keys to `.env` file:**

```env
# Primary key (used as fallback)
UNSPLASH_ACCESS_KEY=your_first_key_here

# Additional keys for parallel processing
UNSPLASH_ACCESS_KEY_1=your_first_key_here
UNSPLASH_ACCESS_KEY_2=your_second_key_here
UNSPLASH_ACCESS_KEY_3=your_third_key_here
UNSPLASH_ACCESS_KEY_4=your_fourth_key_here
UNSPLASH_ACCESS_KEY_5=your_fifth_key_here
```

2. **Make sure your MongoDB connection is configured in `.env`:**

```env
MONGODB_URI=mongodb://localhost:27017/homemadekahoot
# OR for remote:
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
```

## Usage

Run the script from the backend directory:

```bash
cd backend
npm run generate-all-images
```

Or directly:

```bash
node scripts/generateAllWordImages.js
```

## Log Format

The script outputs logs in this format:

```
Key1 | 1/2600 | (word) | Image Added
Key1 | 2/2600 | (another) | Image Added
Key2 | 1/2600 | (word) | Image Added
```

- **Key1-5**: Which Unsplash API key is being used
- **1/2600**: Position within that key's range (1-2600 for each key)
- **(word)**: The English word being processed
- **Image Added**: Success message (or ERROR message if failed)

## Log File

All logs are saved to: `backend/logs/image-generation.log`

The log file includes timestamps for each entry.

## Key Distribution

Words are automatically distributed across keys based on their `wordId`:

- **Key 1**: Words 1-2600 (wordId 1-2600)
- **Key 2**: Words 2601-5200 (wordId 2601-5200)
- **Key 3**: Words 5201-7800 (wordId 5201-7800)
- **Key 4**: Words 7801-10400 (wordId 7801-10400)
- **Key 5**: Words 10401+ (wordId 10401+)

## Rate Limits

- **Unsplash Free Tier**: 50 requests/hour per key
- **With 5 keys**: ~250 requests/hour total
- **Script delay**: 2 seconds between requests (safe margin)
- **Estimated time for 13,000 words**: ~7-8 hours

## Notes

- The script processes words sequentially to respect rate limits
- If a word already has an image (not null, not empty, not default), it's skipped
- Errors are logged but don't stop the script
- You can stop and restart the script - it will skip words that already have images

## Troubleshooting

**"No Unsplash API keys configured"**
- Make sure at least `UNSPLASH_ACCESS_KEY` is set in your `.env` file

**"Failed to connect to MongoDB"**
- Check your `MONGODB_URI` in `.env`
- Make sure MongoDB is running (if local) or accessible (if remote)

**Rate limit errors**
- The script includes delays, but if you see rate limit errors, increase the delay in the script (line 128)

