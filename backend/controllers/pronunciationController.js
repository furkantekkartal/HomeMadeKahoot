const sdk = require('microsoft-cognitiveservices-speech-sdk');
const fs = require('fs');
const PronunciationResult = require('../models/PronunciationResult');
const User = require('../models/User');

// Pronunciation assessment endpoint
exports.assessPronunciation = async (req, res) => {
  let audioFilePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    audioFilePath = req.file.path;
    const referenceText = req.body.referenceText || '';
    const type = req.body.type || 'word'; // 'word' or 'sentence', default to 'word'
    const userId = req.user?.userId || null;
    
    // Get student name from User model if userId exists
    let studentName = 'Guest';
    if (userId) {
      try {
        const user = await User.findById(userId);
        if (user) {
          studentName = user.username;
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    }

    if (!referenceText) {
      return res.status(400).json({ error: 'Reference text is required' });
    }

    // Determine if it's a word or sentence based on word count
    const wordCount = referenceText.trim().split(/\s+/).length;
    const isSentence = wordCount > 1 || type === 'sentence';
    const finalType = isSentence ? 'sentence' : 'word';

    // Azure Speech Service configuration
    const speechConfig = sdk.SpeechConfig.fromSubscription(
      process.env.AZURE_SPEECH_KEY,
      process.env.AZURE_SPEECH_REGION
    );

    // Set recognition language
    speechConfig.speechRecognitionLanguage = 'en-US';

    // Configure pronunciation assessment
    const pronunciationAssessmentConfig = new sdk.PronunciationAssessmentConfig(
      referenceText,
      sdk.PronunciationAssessmentGradingSystem.HundredMark,
      sdk.PronunciationAssessmentGranularity.Phoneme,
      true // Enable miscue calculation
    );

    pronunciationAssessmentConfig.enableProsodyAssessment = true;

    // Read audio file as buffer
    const audioBuffer = fs.readFileSync(audioFilePath);
    
    // Create audio config from WAV file
    const audioConfig = sdk.AudioConfig.fromWavFileInput(audioBuffer);

    // Create speech recognizer
    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

    // Apply pronunciation assessment config
    pronunciationAssessmentConfig.applyTo(recognizer);

    // Perform recognition
    const result = await new Promise((resolve, reject) => {
      recognizer.recognizeOnceAsync(
        (result) => {
          recognizer.close();
          resolve(result);
        },
        (error) => {
          recognizer.close();
          reject(error);
        }
      );
    });

    // Check if recognition was successful
    if (result.reason === sdk.ResultReason.RecognizedSpeech) {
      const pronunciationResult = sdk.PronunciationAssessmentResult.fromResult(result);

      // Parse detailed results
      const detailedResult = JSON.parse(result.properties.getProperty(
        sdk.PropertyId.SpeechServiceResponse_JsonResult
      ));

      // Convert to PTE 0-90 scale
      const overallScore = Math.round(pronunciationResult.pronunciationScore || 0);
      const accuracyScore = Math.round(pronunciationResult.accuracyScore || 0);
      const fluencyScore = Math.round(pronunciationResult.fluencyScore || 0);
      const completenessScore = Math.round(pronunciationResult.completenessScore || 0);
      const prosodyScore = Math.round(pronunciationResult.prosodyScore || 0);
      
      // PTE Read Aloud scoring: Content + Pronunciation + Oral Fluency
      const pronunciationScore90 = Math.round(accuracyScore * 0.9);
      const fluencyScore90 = Math.round(fluencyScore * 0.9);
      
      // Content score based on completeness (how much of the text was read)
      const contentScore = Math.round(completenessScore * 0.9);
      
      // Overall PTE score (average of 3 enabling skills)
      const pteScore = Math.round((contentScore + pronunciationScore90 + fluencyScore90) / 3);
      const generalScore = pteScore; // General score is the same as PTE score

      // Extract word-by-word analysis
      const wordAnalysis = [];
      if (detailedResult.NBest && detailedResult.NBest[0] && detailedResult.NBest[0].Words) {
        const referenceWords = referenceText.trim().split(/\s+/);
        const recognizedWords = result.text ? result.text.trim().split(/\s+/).map(w => w.toLowerCase()) : [];
        const detailedWords = detailedResult.NBest[0].Words;
        
        // Create a map of recognized words with their status
        const wordMap = new Map();
        detailedWords.forEach(word => {
          const wordLower = word.Word.toLowerCase();
          const errorType = word.PronunciationAssessment?.ErrorType || 'None';
          const accuracy = word.PronunciationAssessment?.AccuracyScore || 0;
          
          let status = 'matched';
          if (errorType === 'Mispronunciation' || accuracy < 60) {
            status = 'wrong';
          }
          
          wordMap.set(wordLower, {
            word: word.Word,
            status: status,
            accuracyScore: accuracy,
            errorType: errorType
          });
        });
        
        // Match reference words with recognized words
        referenceWords.forEach((refWord, index) => {
          const refWordLower = refWord.toLowerCase();
          if (wordMap.has(refWordLower)) {
            wordAnalysis.push(wordMap.get(refWordLower));
          } else {
            // Word is missing
            wordAnalysis.push({
              word: refWord,
              status: 'missing',
              accuracyScore: 0,
              errorType: 'Missing'
            });
          }
        });
      }

      // Save to database (always save, even for guest users)
      try {
        const today = new Date().toISOString().split('T')[0];
        
        await PronunciationResult.create({
          userId: userId || null,
          studentName,
          type: finalType,
          referenceText,
          recognizedText: result.text || '',
          wordCount: finalType === 'word' ? 1 : wordCount,
          sentenceCount: finalType === 'sentence' ? 1 : 0,
          overallScore: pteScore,
          pronunciationScore: pronunciationScore90,
          oralFluencyScore: fluencyScore90,
          contentScore: contentScore,
          generalScore: generalScore,
          accuracyScore: accuracyScore,
          completenessScore: completenessScore,
          prosodyScore: prosodyScore,
          wordAnalysis: wordAnalysis,
          date: today
        });
      } catch (dbError) {
        console.error('Error saving pronunciation result to database:', dbError);
        // Don't fail the request if DB save fails
      }

      // Format the response
      const response = {
        recognizedText: result.text,
        referenceText: referenceText,
        type: finalType,
        // PTE scores (0-90 scale)
        pteScore: pteScore,
        generalScore: generalScore,
        contentScore: contentScore,
        pronunciationScore: pronunciationScore90,
        fluencyScore: fluencyScore90,
        // Original Azure scores (0-100 scale) for reference
        overallScore: overallScore,
        accuracyScore: accuracyScore,
        completenessScore: completenessScore,
        prosodyScore: prosodyScore,
        words: detailedResult.NBest[0].Words.map(word => ({
          word: word.Word,
          accuracyScore: word.PronunciationAssessment.AccuracyScore,
          errorType: word.PronunciationAssessment.ErrorType,
          phonemes: word.Phonemes || []
        })),
        wordAnalysis: wordAnalysis,
        detailedResult: detailedResult
      };

      res.json(response);
    } else if (result.reason === sdk.ResultReason.NoMatch) {
      res.status(400).json({
        error: 'No speech could be recognized',
        details: result.errorDetails
      });
    } else {
      res.status(500).json({
        error: 'Speech recognition failed',
        details: result.errorDetails
      });
    }
  } catch (error) {
    console.error('Error during pronunciation assessment:', error);
    res.status(500).json({
      error: 'Internal server error during pronunciation assessment',
      details: error.message
    });
  } finally {
    // Clean up uploaded file
    if (audioFilePath && fs.existsSync(audioFilePath)) {
      fs.unlinkSync(audioFilePath);
    }
  }
};

// Get pronunciation stats aggregated by student
exports.getPronunciationStats = async (req, res) => {
  try {
    const { studentName, type, dateFrom, dateTo } = req.query;

    // Build query
    const query = {};

    // Apply date filters if provided
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = dateFrom;
      if (dateTo) query.date.$lte = dateTo;
    }

    // Apply type filter if provided
    if (type && (type === 'word' || type === 'sentence')) {
      query.type = type;
    }

    // Get all pronunciation results
    const results = await PronunciationResult.find(query);

    // Group by student
    const statsMap = new Map();

    results.forEach(result => {
      const username = result.studentName;
      
      // Apply student name filter if provided
      if (studentName && !username.toLowerCase().includes(studentName.toLowerCase())) {
        return;
      }

      if (!statsMap.has(username)) {
        statsMap.set(username, {
          studentName: username,
          word: {
            totalWords: 0,
            totalGeneralScore: 0,
            totalPronunciationScore: 0,
            totalOralFluencyScore: 0,
            totalContentScore: 0,
            totalOverallScore: 0,
            itemsList: []
          },
          sentence: {
            totalSentences: 0,
            totalGeneralScore: 0,
            totalPronunciationScore: 0,
            totalOralFluencyScore: 0,
            totalContentScore: 0,
            totalOverallScore: 0,
            itemsList: []
          }
        });
      }

      const studentStats = statsMap.get(username);
      const typeKey = result.type;
      
      if (studentStats[typeKey]) {
        // Count each word/sentence (not sessions)
        studentStats[typeKey].totalWords += result.wordCount || 0;
        studentStats[typeKey].totalSentences += result.sentenceCount || 0;
        studentStats[typeKey].totalGeneralScore += result.generalScore || 0;
        studentStats[typeKey].totalPronunciationScore += result.pronunciationScore || 0;
        studentStats[typeKey].totalOralFluencyScore += result.oralFluencyScore || 0;
        studentStats[typeKey].totalContentScore += result.contentScore || 0;
        studentStats[typeKey].totalOverallScore += result.overallScore || 0;
        
        // Add item details (each word/sentence is a separate item)
        studentStats[typeKey].itemsList.push({
          date: result.date,
          referenceText: result.referenceText,
          recognizedText: result.recognizedText,
          wordCount: result.wordCount || 0,
          sentenceCount: result.sentenceCount || 0,
          generalScore: result.generalScore || 0,
          pronunciationScore: result.pronunciationScore || 0,
          oralFluencyScore: result.oralFluencyScore || 0,
          contentScore: result.contentScore || 0,
          overallScore: result.overallScore || 0,
          wordAnalysis: result.wordAnalysis || []
        });
      }
    });

    // Convert map to array and calculate averages
    const stats = Array.from(statsMap.values()).map(student => {
      // Calculate averages for words (based on word count, not sessions)
      const wordCount = student.word.totalWords;
      const wordAvg = wordCount > 0 ? {
        generalScore: Math.round(student.word.totalGeneralScore / wordCount),
        pronunciationScore: Math.round(student.word.totalPronunciationScore / wordCount),
        oralFluencyScore: Math.round(student.word.totalOralFluencyScore / wordCount),
        contentScore: Math.round(student.word.totalContentScore / wordCount),
        overallScore: Math.round(student.word.totalOverallScore / wordCount)
      } : {
        generalScore: 0,
        pronunciationScore: 0,
        oralFluencyScore: 0,
        contentScore: 0,
        overallScore: 0
      };

      // Calculate averages for sentences (based on sentence count, not sessions)
      const sentenceCount = student.sentence.totalSentences;
      const sentenceAvg = sentenceCount > 0 ? {
        generalScore: Math.round(student.sentence.totalGeneralScore / sentenceCount),
        pronunciationScore: Math.round(student.sentence.totalPronunciationScore / sentenceCount),
        oralFluencyScore: Math.round(student.sentence.totalOralFluencyScore / sentenceCount),
        contentScore: Math.round(student.sentence.totalContentScore / sentenceCount),
        overallScore: Math.round(student.sentence.totalOverallScore / sentenceCount)
      } : {
        generalScore: 0,
        pronunciationScore: 0,
        oralFluencyScore: 0,
        contentScore: 0,
        overallScore: 0
      };

      // Calculate overall averages (across all words and sentences)
      const totalItems = wordCount + sentenceCount;
      const totalGeneralScore = student.word.totalGeneralScore + student.sentence.totalGeneralScore;
      const totalPronunciationScore = student.word.totalPronunciationScore + student.sentence.totalPronunciationScore;
      const totalOralFluencyScore = student.word.totalOralFluencyScore + student.sentence.totalOralFluencyScore;
      const totalContentScore = student.word.totalContentScore + student.sentence.totalContentScore;
      const totalOverallScore = student.word.totalOverallScore + student.sentence.totalOverallScore;

      const overallAvg = totalItems > 0 ? {
        generalScore: Math.round(totalGeneralScore / totalItems),
        pronunciationScore: Math.round(totalPronunciationScore / totalItems),
        oralFluencyScore: Math.round(totalOralFluencyScore / totalItems),
        contentScore: Math.round(totalContentScore / totalItems),
        overallScore: Math.round(totalOverallScore / totalItems)
      } : {
        generalScore: 0,
        pronunciationScore: 0,
        oralFluencyScore: 0,
        contentScore: 0,
        overallScore: 0
      };

      return {
        studentName: student.studentName,
        word: {
          totalWords: student.word.totalWords,
          averageScores: wordAvg,
          itemsList: student.word.itemsList.sort((a, b) => new Date(b.date) - new Date(a.date))
        },
        sentence: {
          totalSentences: student.sentence.totalSentences,
          averageScores: sentenceAvg,
          itemsList: student.sentence.itemsList.sort((a, b) => new Date(b.date) - new Date(a.date))
        },
        overall: {
          totalWords: student.word.totalWords,
          totalSentences: student.sentence.totalSentences,
          averageScores: overallAvg
        }
      };
    });

    // Sort by overall general score (highest first)
    stats.sort((a, b) => b.overall.averageScores.generalScore - a.overall.averageScores.generalScore);

    // Calculate totals
    const totals = {
      totalStudents: stats.length,
      totalWords: stats.reduce((sum, s) => sum + s.word.totalWords, 0),
      totalSentences: stats.reduce((sum, s) => sum + s.sentence.totalSentences, 0)
    };

    res.json({
      success: true,
      stats,
      totals
    });
  } catch (error) {
    console.error('Error getting pronunciation stats:', error);
    res.status(500).json({ message: error.message });
  }
};

