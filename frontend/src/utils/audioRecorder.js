// Utility to record audio and convert to WAV format for Azure Speech Service

export class AudioRecorder {
  constructor() {
    this.audioContext = null;
    this.mediaStream = null;
    this.mediaStreamSource = null;
    this.processor = null;
    this.audioChunks = [];
    this.isRecording = false;
  }

  async start() {
    try {
      // Request microphone access with specific constraints
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
      });

      // Create source from stream
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Create script processor for capturing audio data
      const bufferSize = 4096;
      this.processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

      this.audioChunks = [];
      this.isRecording = true;

      // Capture audio data
      this.processor.onaudioprocess = (e) => {
        if (!this.isRecording) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        // Convert Float32Array to Int16Array for WAV
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          // Clamp to [-1, 1] and convert to 16-bit PCM
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        this.audioChunks.push(int16Data);
      };

      // Connect the audio graph
      this.mediaStreamSource.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      return true;
    } catch (error) {
      console.error('Error starting audio recording:', error);
      throw error;
    }
  }

  stop() {
    this.isRecording = false;

    // Disconnect audio nodes
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect();
      this.mediaStreamSource = null;
    }

    // Stop all tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Create WAV blob from recorded chunks
    return this.createWavBlob();
  }

  createWavBlob() {
    if (this.audioChunks.length === 0) {
      return null;
    }

    // Calculate total length
    let totalLength = 0;
    this.audioChunks.forEach(chunk => {
      totalLength += chunk.length;
    });

    // Merge all chunks into single array
    const audioData = new Int16Array(totalLength);
    let offset = 0;
    this.audioChunks.forEach(chunk => {
      audioData.set(chunk, offset);
      offset += chunk.length;
    });

    // Create WAV file
    const sampleRate = 16000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;

    const buffer = new ArrayBuffer(44 + audioData.length * 2);
    const view = new DataView(buffer);

    // Write WAV header
    // "RIFF" chunk descriptor
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + audioData.length * 2, true);
    this.writeString(view, 8, 'WAVE');

    // "fmt " sub-chunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    // "data" sub-chunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, audioData.length * 2, true);

    // Write audio data
    const dataView = new Int16Array(buffer, 44);
    dataView.set(audioData);

    return new Blob([buffer], { type: 'audio/wav' });
  }

  writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}

