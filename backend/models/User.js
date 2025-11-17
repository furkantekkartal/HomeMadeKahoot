const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  profilePictureUrl: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

// Remove email index if it exists (one-time migration)
// This runs automatically when the model is first loaded and connection is ready
let indexRemovalAttempted = false;

async function removeEmailIndex() {
  if (indexRemovalAttempted) return;
  indexRemovalAttempted = true;
  
  try {
    // Wait a bit to ensure connection is fully ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (!mongoose.connection.db) {
      console.warn('Database not ready, skipping email index removal');
      return;
    }
    
    const collection = mongoose.connection.db.collection('users');
    const indexes = await collection.indexes();
    
    // Check if email index exists
    const emailIndex = indexes.find(idx => 
      idx.name === 'email_1' || (idx.key && idx.key.email !== undefined)
    );
    
    if (emailIndex) {
      console.log(`Removing email index: ${emailIndex.name}`);
      await collection.dropIndex(emailIndex.name);
      console.log('✅ Email index removed successfully');
    }
  } catch (error) {
    // Ignore errors (index might not exist or already removed)
    if (error.code !== 27 && error.codeName !== 'IndexNotFound') {
      console.warn('Warning: Could not remove email index:', error.message);
    }
    indexRemovalAttempted = false; // Allow retry on next connection
  }
}

// Try to remove index when connection is ready
if (mongoose.connection.readyState === 1) {
  // Connection is already open
  removeEmailIndex();
} else {
  // Wait for connection
  mongoose.connection.once('open', () => {
    removeEmailIndex();
  });
}

module.exports = User;

