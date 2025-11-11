# Create New Deck - Feature Documentation

## Overview

The "Create New Deck" feature allows users to create flashcard decks by selecting words from their word database. The feature includes AI-powered word extraction from various file formats (PDF, SRT, Excel).

## Table of Contents

1. [User Flow](#user-flow)
2. [Frontend Implementation](#frontend-implementation)
3. [Backend Implementation](#backend-implementation)
4. [AI Features](#ai-features)
5. [File Processing](#file-processing)
6. [Data Model](#data-model)
7. [API Endpoints](#api-endpoints)
8. [Key Features](#key-features)

---

## User Flow

### 1. Accessing Create Deck Page
- User navigates to `/create-deck` route from the Decks page (clicking "+ New Deck" button)
- Route is protected by `PrivateRoute` component (requires authentication)

### 2. Deck Creation Process

#### Option A: Manual Word Selection
1. **Fill Deck Information**:
   - Enter deck title (required)
   - Enter deck description (optional)
   - Select Level (A1-C2) - required
   - Select Skill (Speaking, Reading, Writing, Listening) - required
   - Select Task (Vocabulary, Grammar, Spelling, Essay, Repeat, Read Aloud) - required
   - Set card quantity (1-50, default: 20)

2. **Select Words**:
   - Browse word list with pagination (50 words per page)
   - Use filters to narrow down words:
     - Search by text
     - Filter by English Level
     - Filter by Word Type
     - Filter by Category 1, 2, 3
     - Toggle Show Known/Unknown words
   - Select individual words or use "Select All" checkbox
   - Selected word count is displayed

3. **Create Deck**:
   - Click "Create Deck" button
   - Validates: deck name and at least one word selected
   - Creates deck and navigates back to previous page

#### Option B: AI Deck Maker (File Upload)
1. **Upload File**:
   - Select file (PDF, SRT, or Excel)
   - Click "✨ Generate from File" button

2. **AI Processing**:
   - File is uploaded to server
   - AI extracts all words, phrases, idioms, and phrasal verbs
   - New words are added to database
   - Existing words are identified
   - Processing logs are displayed in real-time

3. **Auto-Fill Deck Information**:
   - Deck title auto-filled from file name/category
   - Description auto-generated based on file type
   - Skill guessed based on file type (SRT → Listening, PDF → Reading)
   - Task set to "Vocabulary" by default
   - Level guessed from highest level in selected words
   - First 50 words automatically selected

4. **Review and Create**:
   - Review selected words
   - Adjust deck information if needed
   - Click "Create Deck" to finalize

---

## Frontend Implementation

### Component: `CreateDeck.js`

**Location**: `frontend/src/pages/CreateDeck.js`

#### State Management

```javascript
// Word selection
const [words, setWords] = useState([]);
const [selectedWords, setSelectedWords] = useState(new Set());

// Pagination
const [page, setPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);

// Deck information
const [deckName, setDeckName] = useState('');
const [deckDescription, setDeckDescription] = useState('');
const [level, setLevel] = useState('');
const [skill, setSkill] = useState('');
const [task, setTask] = useState('');
const [questionNumber, setQuestionNumber] = useState(20);

// Filters
const [filters, setFilters] = useState({...});
const [appliedFilters, setAppliedFilters] = useState({...});

// AI generation states
const [generatingTitle, setGeneratingTitle] = useState(false);
const [generatingDescription, setGeneratingDescription] = useState(false);
const [enhancingText, setEnhancingText] = useState(false);

// File upload states
const [uploadedFile, setUploadedFile] = useState(null);
const [generatingFromSource, setGeneratingFromSource] = useState(false);
const [processingLogs, setProcessingLogs] = useState([]);
const [processingSummary, setProcessingSummary] = useState(null);
```

#### Key Functions

1. **`loadData()`**: Fetches words from API with pagination and filters
2. **`handleSelectWord(wordId)`**: Toggles word selection
3. **`handleSelectAll()`**: Selects/deselects all words on current page
4. **`handleGenerateFromFile()`**: Processes uploaded file and extracts words
5. **`handleCreateDeck()`**: Creates the deck via API

#### UI Sections

1. **AI Deck Maker Section**: File upload and processing
2. **Deck Information Section**: Title, description, level, skill, task inputs
3. **Word List Section**: Filterable table of words with selection checkboxes

---

## Backend Implementation

### Controller: `flashcardController.js`

**Location**: `backend/controllers/flashcardController.js`

#### Main Function: `createDeck`

```javascript
exports.createDeck = async (req, res) => {
  // 1. Extract user ID from JWT token
  const userId = req.user.userId;
  
  // 2. Validate input
  const { name, description, level, skill, task, wordIds } = req.body;
  if (!name || !wordIds || !Array.isArray(wordIds) || wordIds.length === 0) {
    return res.status(400).json({ message: 'Deck name and word IDs are required' });
  }
  
  // 3. Verify all words exist in database
  const words = await Word.find({ _id: { $in: wordIds } });
  if (words.length !== wordIds.length) {
    return res.status(400).json({ message: 'Some words not found' });
  }
  
  // 4. Create deck in database
  const deck = await FlashcardDeck.create({
    userId,
    name,
    description: description || '',
    level: level || null,
    skill: skill || null,
    task: task || null,
    wordIds,
    totalCards: wordIds.length
  });
  
  // 5. Return created deck
  res.status(201).json(deck);
};
```

### Routes

**Location**: `backend/routes/flashcards.js`

```javascript
// Create deck
router.post('/decks', auth, flashcardController.createDeck);

// File processing
router.post('/generate-from-file', auth, flashcardController.uploadFile, flashcardController.generateDeckFromFile);
```

---

## File Processing

### Supported File Types

1. **PDF** (`.pdf`)
2. **SRT Subtitle** (`.srt`)
3. **Excel** (`.xlsx`, `.xls`)

### Processing Flow

**Service**: `aiDeckWordExtractionService.js` → `processFileAndExtractWords()`

#### Step 1: File Conversion
- **PDF**: Extracts text using `pdf-parse` library
- **SRT**: Parses subtitle timestamps and extracts dialogue text
- **Excel**: Converts cells to CSV format (commas replaced with semicolons)

#### Step 2: Word Extraction
- Content sent to AI (OpenRouter/Gemini)
- AI extracts all words, phrases, idioms, and phrasal verbs
- Returns JSON array of extracted terms
- Handles large files (up to 50,000 characters per batch)

#### Step 3: Duplicate Checking
- Compares extracted words against existing database
- Identifies existing words (by `englishWord` field)
- Separates new words that need to be added

#### Step 4: New Word Processing
- For each new word, AI fills missing columns:
  - Turkish meaning
  - Word type (noun, verb, adjective, etc.)
  - English level (A1-C2)
  - Categories (category1, category2, category3)
  - Sample sentences (English and Turkish)
- Category tag generated from file name (e.g., "VideoName-Part1")

#### Step 5: Database Updates
- New words saved to `Word` collection
- Existing word IDs collected
- Returns summary with:
  - Total words extracted
  - Existing words count
  - New words added
  - All columns filled status
  - Category tag
  - Processing time

### Processing Logs

Real-time logs displayed to user:
- File upload status
- Conversion progress
- AI extraction progress
- Database operations
- Error messages

---

## Data Model

### FlashcardDeck Schema

**Location**: `backend/models/FlashcardDeck.js`

```javascript
{
  userId: ObjectId (ref: 'User'),        // Required, indexed
  name: String,                          // Required
  description: String,                   // Optional, default: ''
  level: String,                         // Enum: ['A1','A2','B1','B2','C1','C2']
  skill: String,                         // Enum: ['Speaking','Reading','Writing','Listening']
  task: String,                          // Enum: ['Vocabulary','Grammar','Spelling','Essay','Repeat','Read Aloud']
  wordIds: [ObjectId],                   // Array of Word references
  totalCards: Number,                    // Default: 0
  masteredCards: Number,                 // Default: 0
  lastStudied: Date,                     // Default: null
  isVisible: Boolean,                    // Default: true
  createdAt: Date,                       // Auto-set
  updatedAt: Date                        // Auto-updated on save
}
```

### Word Schema (Referenced)

Words are stored in separate `Word` collection with fields:
- `englishWord`: String (unique)
- `turkishMeaning`: String
- `wordType`: String
- `englishLevel`: String (A1-C2)
- `category1`, `category2`, `category3`: String
- `sampleSentenceEn`, `sampleSentenceTr`: String
- `imageUrl`: String

---

## API Endpoints

### Create Deck

**POST** `/api/flashcards/decks`

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "A1 Vocabulary Basics",
  "description": "Basic vocabulary for beginners",
  "level": "A1",
  "skill": "Reading",
  "task": "Vocabulary",
  "wordIds": ["wordId1", "wordId2", "wordId3"]
}
```

**Response** (201 Created):
```json
{
  "_id": "deckId",
  "userId": "userId",
  "name": "A1 Vocabulary Basics",
  "description": "Basic vocabulary for beginners",
  "level": "A1",
  "skill": "Reading",
  "task": "Vocabulary",
  "wordIds": ["wordId1", "wordId2", "wordId3"],
  "totalCards": 3,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Generate from File

**POST** `/api/flashcards/generate-from-file`

**Headers**:
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data**:
- `file`: File (PDF, SRT, or Excel)

**Response**:
```json
{
  "totalWords": 150,
  "existingWords": 50,
  "newWords": 100,
  "allColumnsFilled": true,
  "categoryTag": "VideoName-Part1",
  "wordIds": ["wordId1", "wordId2", ...],
  "processingTime": 45.23,
  "logs": ["✅ File received...", "⏳ Processing...", ...]
}
```

---

## Key Features

### 1. Word Selection
- ✅ Individual word selection via checkboxes
- ✅ Select all/deselect all on current page
- ✅ Visual indication of selected words
- ✅ Selected word count display
- ✅ Selection persists across pagination

### 2. Filtering System
- ✅ Text search across word fields
- ✅ Filter by English Level (A1-C2)
- ✅ Filter by Word Type
- ✅ Filter by Category 1, 2, 3
- ✅ Toggle known/unknown words
- ✅ Apply filters button (doesn't auto-apply)

### 3. Pagination
- ✅ 50 words per page
- ✅ Previous/Next navigation
- ✅ Page number display
- ✅ Total pages calculation

### 4. File Processing
- ✅ Support for PDF, SRT, Excel files
- ✅ Real-time processing logs
- ✅ Automatic word extraction
- ✅ Duplicate detection
- ✅ Auto-fill deck information
- ✅ Auto-select extracted words

### 6. Validation
- ✅ Deck name required
- ✅ At least one word must be selected
- ✅ Level, Skill, Task required for creation
- ✅ Word existence verification on backend
- ✅ File type validation

### 7. User Experience
- ✅ Loading states for all async operations
- ✅ Error messages with details
- ✅ Success notifications
- ✅ Cancel button to go back
- ✅ Responsive design

---

## Constants

**Location**: `frontend/src/constants/deckConstants.js`

```javascript
DECK_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
DECK_SKILLS = ['Speaking', 'Reading', 'Writing', 'Listening']
DECK_TASKS = ['Vocabulary', 'Grammar', 'Spelling', 'Essay', 'Repeat', 'Read Aloud']
```

---

## Error Handling

### Frontend
- Try-catch blocks around all API calls
- User-friendly error messages via `alert()`
- Loading states prevent duplicate submissions
- Validation before API calls

### Backend
- Input validation (required fields, array types)
- Word existence verification
- Database error handling
- File processing error handling with cleanup
- AI API error handling with fallbacks

---

## Future Enhancements

Potential improvements:
- [ ] Bulk word selection across pages
- [ ] Save draft decks
- [ ] Import deck from JSON/CSV
- [ ] Duplicate deck functionality
- [ ] Deck templates
- [ ] Word preview modal
- [ ] Advanced filtering (date ranges, multiple categories)
- [ ] Export selected words to CSV
- [ ] YouTube video processing (already implemented in backend)

---

## Related Files

### Frontend
- `frontend/src/pages/CreateDeck.js` - Main component
- `frontend/src/pages/CreateDeck.css` - Styling
- `frontend/src/services/api.js` - API service layer
- `frontend/src/constants/deckConstants.js` - Constants

### Backend
- `backend/controllers/flashcardController.js` - Controller logic
- `backend/routes/flashcards.js` - Route definitions
- `backend/models/FlashcardDeck.js` - Data model
- `backend/services/aiDeckWordExtractionService.js` - File processing

---

## Notes

- All routes require authentication via JWT token
- File uploads are stored temporarily in OS temp directory
- AI processing may take 30-60 seconds for large files
- Maximum file size: 50MB
- Word extraction limited to first 50,000 characters per file
- Category tags help organize words by source material

