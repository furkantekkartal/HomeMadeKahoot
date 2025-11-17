const mongoose = require('mongoose');
const StudySession = require('../models/StudySession');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/homemadekahoot';
    await mongoose.connect(mongoURI);
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const analyzeSessions = async () => {
  try {
    await connectDB();

    console.log('\n=== STUDY SESSION ANALYSIS ===\n');

    // 1. Check active sessions
    const activeSessions = await StudySession.find({ isActive: true });
    console.log(`📊 Active Sessions: ${activeSessions.length}`);
    
    if (activeSessions.length > 0) {
      console.log('\n⚠️  WARNING: Found active sessions that should be ended!');
      activeSessions.forEach(session => {
        const ageHours = (Date.now() - session.startTime) / (1000 * 60 * 60);
        console.log(`  - Session ${session._id}: ${session.module}, Started: ${session.startTime.toISOString()}, Age: ${ageHours.toFixed(2)} hours`);
      });
    }

    // 2. Check Flashcards and Spelling sessions
    const gameSessions = await StudySession.find({
      module: { $in: ['Flashcards', 'Spelling'] },
      isActive: false
    }).populate('userId', 'username').sort({ createdAt: -1 });

    console.log(`\n📚 Total Completed Game Sessions: ${gameSessions.length}`);

    // 3. Group by user and module
    const userStats = {};
    gameSessions.forEach(session => {
      const username = session.userId?.username || 'Unknown';
      const module = session.module;
      
      if (!userStats[username]) {
        userStats[username] = {
          flashcards: { sessions: [], totalSeconds: 0 },
          spelling: { sessions: [], totalSeconds: 0 }
        };
      }

      const sessionSeconds = session.durationSeconds || (session.durationMinutes || 0) * 60;
      const sessionHours = sessionSeconds / 3600;
      
      if (module === 'Flashcards') {
        userStats[username].flashcards.sessions.push({
          id: session._id,
          seconds: sessionSeconds,
          hours: sessionHours,
          startTime: session.startTime,
          endTime: session.endTime,
          durationMinutes: session.durationMinutes,
          durationSeconds: session.durationSeconds
        });
        userStats[username].flashcards.totalSeconds += sessionSeconds;
      } else if (module === 'Spelling') {
        userStats[username].spelling.sessions.push({
          id: session._id,
          seconds: sessionSeconds,
          hours: sessionHours,
          startTime: session.startTime,
          endTime: session.endTime,
          durationMinutes: session.durationMinutes,
          durationSeconds: session.durationSeconds
        });
        userStats[username].spelling.totalSeconds += sessionSeconds;
      }
    });

    // 4. Display statistics for each user
    console.log('\n=== USER STATISTICS ===\n');
    Object.keys(userStats).forEach(username => {
      const stats = userStats[username];
      const flashcardsHours = stats.flashcards.totalSeconds / 3600;
      const spellingHours = stats.spelling.totalSeconds / 3600;
      const totalHours = (stats.flashcards.totalSeconds + stats.spelling.totalSeconds) / 3600;

      console.log(`👤 ${username}:`);
      console.log(`   Flashcards: ${stats.flashcards.sessions.length} sessions, ${flashcardsHours.toFixed(2)} hours`);
      console.log(`   Spelling: ${stats.spelling.sessions.length} sessions, ${spellingHours.toFixed(2)} hours`);
      console.log(`   Total: ${totalHours.toFixed(2)} hours`);

      // Check for suspicious sessions (more than 2 hours)
      const suspiciousFlashcards = stats.flashcards.sessions.filter(s => s.hours > 2);
      const suspiciousSpelling = stats.spelling.sessions.filter(s => s.hours > 2);

      if (suspiciousFlashcards.length > 0) {
        console.log(`   ⚠️  ${suspiciousFlashcards.length} suspicious Flashcards sessions (>2 hours):`);
        suspiciousFlashcards.forEach(s => {
          console.log(`      - ${s.hours.toFixed(2)}h (${s.seconds}s) - Started: ${s.startTime.toISOString()}, Ended: ${s.endTime?.toISOString() || 'N/A'}`);
        });
      }

      if (suspiciousSpelling.length > 0) {
        console.log(`   ⚠️  ${suspiciousSpelling.length} suspicious Spelling sessions (>2 hours):`);
        suspiciousSpelling.forEach(s => {
          console.log(`      - ${s.hours.toFixed(2)}h (${s.seconds}s) - Started: ${s.startTime.toISOString()}, Ended: ${s.endTime?.toISOString() || 'N/A'}`);
        });
      }

      // Check for sessions with durationSeconds = 0 but durationMinutes > 0
      const zeroSecondsFlashcards = stats.flashcards.sessions.filter(s => s.durationSeconds === 0 && s.durationMinutes > 0);
      const zeroSecondsSpelling = stats.spelling.sessions.filter(s => s.durationSeconds === 0 && s.durationMinutes > 0);

      if (zeroSecondsFlashcards.length > 0) {
        console.log(`   ⚠️  ${zeroSecondsFlashcards.length} Flashcards sessions with durationSeconds=0 but durationMinutes>0`);
      }

      if (zeroSecondsSpelling.length > 0) {
        console.log(`   ⚠️  ${zeroSecondsSpelling.length} Spelling sessions with durationSeconds=0 but durationMinutes>0`);
      }

      console.log('');
    });

    // 5. Check for sessions that might have been calculated incorrectly
    console.log('\n=== POTENTIAL ISSUES ===\n');
    
    const issues = [];
    gameSessions.forEach(session => {
      const sessionSeconds = session.durationSeconds || (session.durationMinutes || 0) * 60;
      const sessionHours = sessionSeconds / 3600;
      
      // Check if duration seems too long
      if (sessionHours > 2) {
        issues.push({
          type: 'Long Duration',
          session: session._id,
          username: session.userId?.username || 'Unknown',
          module: session.module,
          hours: sessionHours,
          seconds: sessionSeconds,
          startTime: session.startTime,
          endTime: session.endTime
        });
      }

      // Check if durationSeconds is 0 but durationMinutes is not
      if (session.durationSeconds === 0 && session.durationMinutes > 0) {
        issues.push({
          type: 'Missing durationSeconds',
          session: session._id,
          username: session.userId?.username || 'Unknown',
          module: session.module,
          durationMinutes: session.durationMinutes,
          durationSeconds: session.durationSeconds
        });
      }

      // Check if endTime is way after startTime (potential issue with fallback calculation)
      if (session.endTime && session.durationSeconds > 0) {
        const calculatedSeconds = Math.floor((session.endTime - session.startTime) / 1000);
        const difference = Math.abs(calculatedSeconds - session.durationSeconds);
        // If difference is more than 5 minutes, there might be an issue
        if (difference > 300) {
          issues.push({
            type: 'Duration Mismatch',
            session: session._id,
            username: session.userId?.username || 'Unknown',
            module: session.module,
            storedSeconds: session.durationSeconds,
            calculatedSeconds: calculatedSeconds,
            difference: difference
          });
        }
      }
    });

    if (issues.length > 0) {
      console.log(`Found ${issues.length} potential issues:\n`);
      issues.forEach(issue => {
        console.log(`  ${issue.type}:`);
        console.log(`    Session: ${issue.session}`);
        console.log(`    User: ${issue.username}, Module: ${issue.module}`);
        if (issue.hours) console.log(`    Duration: ${issue.hours.toFixed(2)} hours (${issue.seconds}s)`);
        if (issue.durationMinutes) console.log(`    durationMinutes: ${issue.durationMinutes}, durationSeconds: ${issue.durationSeconds}`);
        if (issue.difference) console.log(`    Difference: ${issue.difference}s between stored and calculated`);
        console.log('');
      });
    } else {
      console.log('✅ No obvious issues found!\n');
    }

    // 6. Summary
    const totalSeconds = gameSessions.reduce((sum, s) => {
      return sum + (s.durationSeconds || (s.durationMinutes || 0) * 60);
    }, 0);
    const totalHours = totalSeconds / 3600;

    console.log('\n=== SUMMARY ===\n');
    console.log(`Total Game Sessions: ${gameSessions.length}`);
    console.log(`Total Time: ${totalHours.toFixed(2)} hours (${totalSeconds} seconds)`);
    console.log(`Active Sessions: ${activeSessions.length}`);
    console.log(`Potential Issues: ${issues.length}`);

    await mongoose.connection.close();
    console.log('\n✅ Analysis complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error analyzing sessions:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

analyzeSessions();

