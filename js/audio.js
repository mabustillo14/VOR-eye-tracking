// Audio system for enhanced UX
class AudioManager {
  constructor() {
    this.audioContext = null;
    this.backgroundMusic = null;
    this.soundEffects = {};
    this.musicEnabled = true;
  }

  async initialize() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.createBackgroundMusic();
      this.createSoundEffects();
    } catch (error) {
      console.log('Audio not supported');
    }
  }

  createBackgroundMusic() {
    // Background music removed
  }

  createSoundEffects() {
    // Sound effects using oscillators
    this.soundEffects = {
      levelComplete: () => this.playTone(523.25, 0.2, 0.5), // C5
      buttonClick: () => this.playTone(440, 0.1, 0.3), // A4
      calibrationPoint: () => this.playTone(659.25, 0.1, 0.2), // E5
      sessionStart: () => this.playTone(392, 0.3, 0.4) // G4
    };
  }

  playTone(frequency, duration, volume) {
    if (!this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  startBackgroundMusic() {
    // Background music removed
  }

  stopBackgroundMusic() {
    // Background music removed
  }

  playSound(soundName) {
    if (this.soundEffects[soundName]) {
      this.soundEffects[soundName]();
    }
  }


}

// Global audio manager instance
const audioManager = new AudioManager();