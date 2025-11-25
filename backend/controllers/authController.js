const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your_secret_jwt_key_change_this_in_production', {
    expiresIn: '7d'
  });
};

// Register user
exports.register = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Validate username length
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ message: 'Username must be between 3 and 20 characters' });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    console.log(`[AUTH] Registration attempt for username: ${username}`);

    // Check if user exists (case-insensitive search)
    const existingUser = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    });
    if (existingUser) {
      console.log(`[AUTH] User already exists: ${username}`);
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user
    const user = await User.create({ username, password });
    console.log(`[AUTH] Registration successful for user: ${username}`);
    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        profilePictureUrl: user.profilePictureUrl
      }
    });
  } catch (error) {
    console.error(`[AUTH] Registration error for ${req.body.username}:`, error.message);
    res.status(500).json({ message: error.message || 'Registration failed' });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    console.log(`[AUTH] Login attempt for username: ${username}`);

    // Find user (case-insensitive search)
    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    });
    if (!user) {
      console.log(`[AUTH] User not found: ${username}`);
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    console.log(`[AUTH] User found: ${username}, checking password...`);

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log(`[AUTH] Password mismatch for user: ${username}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log(`[AUTH] Login successful for user: ${username}`);
    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        profilePictureUrl: user.profilePictureUrl
      }
    });
  } catch (error) {
    console.error('[AUTH] Login error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get current user
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update profile
exports.updateProfile = async (req, res) => {
  try {
    const { username } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if username already exists (excluding current user)
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already taken' });
      }
      user.username = username;
    }

    await user.save();

    res.json({
      id: user._id,
      username: user.username,
      profilePictureUrl: user.profilePictureUrl
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update password
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update profile picture
exports.updateProfilePicture = async (req, res) => {
  try {
    const { profilePictureUrl } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.profilePictureUrl = profilePictureUrl || null;
    await user.save();

    res.json({
      id: user._id,
      username: user.username,
      profilePictureUrl: user.profilePictureUrl
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

