const sdk = require('microsoft-cognitiveservices-speech-sdk');
const fs = require('fs');

// Pronunciation assessment endpoint
exports.assessPronunciation = async (req, res) => {
  let audioFilePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    audioFilePath = req.file.path;
    const referenceText = req.body.referenceText || '';

    if (!referenceText) {
      return res.status(400).json({ error: 'Reference text is required' });
    }

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

      // Format the response
      const response = {
        recognizedText: result.text,
        referenceText: referenceText,
        // PTE scores (0-90 scale)
        pteScore: pteScore,
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

