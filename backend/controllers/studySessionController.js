const StudySession = require('../models/StudySession');
const auth = require('../middleware/auth');

/**
 * Start a new study session
 */
exports.startSession = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { module } = req.body;

    if (!module) {
      return res.status(400).json({
        success: false,
        error: 'Module name is required'
      });
    }

    // Check if there's an active session for this user and module
    const activeSession = await StudySession.findOne({
      userId,
      module,
      isActive: true
    });

    if (activeSession) {
      // Return existing active session - resume from saved duration
      // Don't add time that passed while user was away on other pages
      const now = new Date();
      
      // Update lastActivity to mark that user is back on this page
      activeSession.lastActivity = now;
      await activeSession.save();
      
      // Return the saved duration (time actually spent on this page)
      // Frontend will continue counting from this point
      return res.json({
        success: true,
        data: {
          sessionId: activeSession._id,
          startTime: activeSession.startTime,
          durationMinutes: activeSession.durationMinutes || 0,
          durationSeconds: activeSession.durationSeconds || 0
        }
      });
    }

    // Create new session
    const today = new Date().toISOString().split('T')[0];
    const newSession = new StudySession({
      userId,
      module,
      startTime: new Date(),
      lastActivity: new Date(),
      date: today,
      isActive: true,
      durationMinutes: 0
    });

    await newSession.save();

    res.json({
      success: true,
      data: {
        sessionId: newSession._id,
        startTime: newSession.startTime
      }
    });
  } catch (error) {
    console.error('Error starting study session:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Update session duration (called periodically from frontend)
 */
exports.updateSession = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { durationMinutes, durationSeconds } = req.body;

    const session = await StudySession.findOne({
      _id: id,
      userId,
      isActive: true
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found or not active'
      });
    }

    // Save both minutes and seconds for precision
    if (durationSeconds !== undefined) {
      session.durationSeconds = durationSeconds || 0;
      session.durationMinutes = Math.floor(durationSeconds / 60);
    } else if (durationMinutes !== undefined) {
      session.durationMinutes = durationMinutes || 0;
      // Preserve existing seconds if only minutes provided
      if (!session.durationSeconds) {
        session.durationSeconds = session.durationMinutes * 60;
      }
    }
    
    session.lastActivity = new Date();
    await session.save();

    res.json({
      success: true,
      message: 'Session updated',
      data: {
        durationMinutes: session.durationMinutes,
        durationSeconds: session.durationSeconds,
        startTime: session.startTime
      }
    });
  } catch (error) {
    console.error('Error updating study session:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * End session and save to database
 */
exports.endSession = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const session = await StudySession.findOne({
      _id: id,
      userId,
      isActive: true
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found or not active'
      });
    }

    const endTime = new Date();
    // Use saved durationSeconds if available
    // IMPORTANT: Do NOT fallback to calculating from startTime to endTime
    // This would count time when the page was in background, minimized, or user was idle
    // Only use the tracked durationSeconds (which respects page visibility and idle detection)
    const finalDurationSeconds = session.durationSeconds > 0 
      ? session.durationSeconds 
      : 0; // If no tracked time, use 0 (don't count time that wasn't actually studied)
    const finalDurationMinutes = Math.floor(finalDurationSeconds / 60);

    session.endTime = endTime;
    session.durationSeconds = finalDurationSeconds;
    session.durationMinutes = finalDurationMinutes;
    session.isActive = false;
    await session.save();

    res.json({
      success: true,
      data: {
        totalDuration: session.durationMinutes,
        totalDurationSeconds: session.durationSeconds,
        session: session
      },
      message: 'Session ended and saved'
    });
  } catch (error) {
    console.error('Error ending study session:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get session history
 */
exports.getHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 50, offset = 0, module, startDate, endDate } = req.query;

    const query = { userId, isActive: false };

    if (module) {
      query.module = module;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    const sessions = await StudySession.find(query)
      .sort({ date: -1, startTime: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await StudySession.countDocuments(query);

    res.json({
      success: true,
      data: sessions,
      pagination: {
        total,
        returned: sessions.length,
        offset: parseInt(offset),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error getting session history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get study time statistics
 */
exports.getStatistics = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { module, startDate, endDate } = req.query;

    const query = { userId, isActive: false };

    if (module) {
      query.module = module;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    // Get total study time
    const sessions = await StudySession.find(query);
    const totalMinutes = sessions.reduce((sum, session) => sum + (session.durationMinutes || 0), 0);

    // Get study time by module
    const byModule = await StudySession.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$module',
          totalMinutes: { $sum: '$durationMinutes' },
          sessionCount: { $sum: 1 }
        }
      }
    ]);

    // Get study time by date
    const byDate = await StudySession.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$date',
          totalMinutes: { $sum: '$durationMinutes' },
          sessionCount: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 30 } // Last 30 days
    ]);

    res.json({
      success: true,
      data: {
        totalMinutes,
        totalHours: Math.floor(totalMinutes / 60),
        byModule: byModule.reduce((acc, item) => {
          acc[item._id] = {
            totalMinutes: item.totalMinutes,
            totalHours: Math.floor(item.totalMinutes / 60),
            sessionCount: item.sessionCount
          };
          return acc;
        }, {}),
        byDate: byDate.map(item => ({
          date: item._id,
          totalMinutes: item.totalMinutes,
          sessionCount: item.sessionCount
        }))
      }
    });
  } catch (error) {
    console.error('Error getting study statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

