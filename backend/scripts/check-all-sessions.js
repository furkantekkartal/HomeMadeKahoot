const mongoose = require('mongoose');
const StudySession = require('../models/StudySession');
require('dotenv').config();

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

const checkAllSessions = async () => {
  try {
    await connectDB();

    console.log('\n=== ALL STUDY SESSIONS (Active and Inactive) ===\n');

    // Get ALL sessions (both active and inactive)
    const allSessions = await StudySession.find({
      module: { $in: ['Flashcards', 'Spelling'] }
    }).populate('userId', 'username').sort({ createdAt: -1 });

    console.log(`Total Sessions (Active + Inactive): ${allSessions.length}\n`);

    // Separate active and inactive
    const activeSessions = allSessions.filter(s => s.isActive === true);
    const inactiveSessions = allSessions.filter(s => s.isActive === false);

    console.log(`Active Sessions: ${activeSessions.length}`);
    console.log(`Inactive Sessions: ${inactiveSessions.length}\n`);

    if (activeSessions.length > 0) {
      console.log('=== ACTIVE SESSIONS ===\n');
      activeSessions.forEach(session => {
        const ageHours = (Date.now() - session.startTime) / (1000 * 60 * 60);
        const sessionSeconds = session.durationSeconds || (session.durationMinutes || 0) * 60;
        console.log(`Session ID: ${session._id}`);
        console.log(`  User: ${session.userId?.username || 'Unknown'}`);
        console.log(`  Module: ${session.module}`);
        console.log(`  Started: ${session.startTime.toISOString()}`);
        console.log(`  Age: ${ageHours.toFixed(2)} hours`);
        console.log(`  Current Duration: ${sessionSeconds}s (${(sessionSeconds/60).toFixed(2)} min)`);
        console.log(`  durationMinutes: ${session.durationMinutes}, durationSeconds: ${session.durationSeconds}`);
        console.log('');
      });
    }

    if (inactiveSessions.length > 0) {
      console.log('=== INACTIVE SESSIONS (First 20) ===\n');
      inactiveSessions.slice(0, 20).forEach(session => {
        const sessionSeconds = session.durationSeconds || (session.durationMinutes || 0) * 60;
        const sessionHours = sessionSeconds / 3600;
        const calculatedSeconds = session.endTime ? Math.floor((session.endTime - session.startTime) / 1000) : 0;
        
        console.log(`Session ID: ${session._id}`);
        console.log(`  User: ${session.userId?.username || 'Unknown'}`);
        console.log(`  Module: ${session.module}`);
        console.log(`  Started: ${session.startTime.toISOString()}`);
        console.log(`  Ended: ${session.endTime?.toISOString() || 'N/A'}`);
        console.log(`  Duration: ${sessionSeconds}s (${sessionHours.toFixed(2)} hours)`);
        console.log(`  durationMinutes: ${session.durationMinutes}, durationSeconds: ${session.durationSeconds}`);
        if (session.endTime) {
          console.log(`  Calculated from start-end: ${calculatedSeconds}s (${(calculatedSeconds/3600).toFixed(2)} hours)`);
          if (Math.abs(calculatedSeconds - sessionSeconds) > 300) {
            console.log(`  ⚠️  WARNING: Large difference between stored and calculated duration!`);
          }
        }
        console.log('');
      });
    }

    // Check for potential issues
    console.log('\n=== POTENTIAL ISSUES ===\n');
    
    let issuesFound = 0;
    
    // Check inactive sessions for suspicious durations
    inactiveSessions.forEach(session => {
      const sessionSeconds = session.durationSeconds || (session.durationMinutes || 0) * 60;
      const sessionHours = sessionSeconds / 3600;
      
      // If session is longer than 2 hours, it's suspicious
      if (sessionHours > 2) {
        issuesFound++;
        if (issuesFound <= 10) { // Show first 10 issues
          console.log(`⚠️  Long session detected:`);
          console.log(`   Session: ${session._id}`);
          console.log(`   User: ${session.userId?.username || 'Unknown'}, Module: ${session.module}`);
          console.log(`   Duration: ${sessionHours.toFixed(2)} hours (${sessionSeconds}s)`);
          console.log(`   Started: ${session.startTime.toISOString()}`);
          console.log(`   Ended: ${session.endTime?.toISOString() || 'N/A'}`);
          
          // Check if this might be from the fallback calculation
          if (session.endTime) {
            const calculatedSeconds = Math.floor((session.endTime - session.startTime) / 1000);
            if (Math.abs(calculatedSeconds - sessionSeconds) < 60) {
              console.log(`   ⚠️  This appears to be calculated from start-end time (fallback), not actual study time!`);
            }
          }
          console.log('');
        }
      }
    });

    if (issuesFound > 10) {
      console.log(`... and ${issuesFound - 10} more long sessions\n`);
    }

    if (issuesFound === 0) {
      console.log('✅ No obvious issues found!\n');
    }

    // Summary
    const totalSeconds = inactiveSessions.reduce((sum, s) => {
      return sum + (s.durationSeconds || (s.durationMinutes || 0) * 60);
    }, 0);
    const totalHours = totalSeconds / 3600;

    console.log('\n=== SUMMARY ===\n');
    console.log(`Total Sessions: ${allSessions.length}`);
    console.log(`Active Sessions: ${activeSessions.length}`);
    console.log(`Inactive Sessions: ${inactiveSessions.length}`);
    console.log(`Total Time (Inactive Only): ${totalHours.toFixed(2)} hours`);
    console.log(`Potential Issues: ${issuesFound}`);

    await mongoose.connection.close();
    console.log('\n✅ Analysis complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

checkAllSessions();

