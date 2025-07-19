// simpleAudio.js - The simplest, most failsafe audio implementation possible

class SimpleAudio {
  constructor() {
    // Pre-create audio context to avoid delays
    this.audioContext = null;
    this.isEnabled = true;
    
    // Initialize on first user interaction (browser requirement)
    this.initializeOnInteraction();
  }
  
  initializeOnInteraction() {
    // Many browsers require user interaction before audio works
    const init = () => {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('Audio initialized');
      }
      // Remove listener after first interaction
      document.removeEventListener('click', init);
      document.removeEventListener('keydown', init);
    };
    
    document.addEventListener('click', init);
    document.addEventListener('keydown', init);
  }
  
  // The ONLY method we need - play a simple click
  playClick(isAccent = false) {
    // Failsafe checks
    if (!this.isEnabled) return;
    if (!this.audioContext) return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    try {
      // Create nodes
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      
      // Simple settings
      osc.frequency.value = isAccent ? 800 : 600;  // Higher pitch for downbeat
      
      // Smooth envelope to prevent clicks/pops
      const now = this.audioContext.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.01); // Quick attack
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05); // Quick decay
      
      // Connect
      osc.connect(gain);
      gain.connect(this.audioContext.destination);
      
      // Play a short click with proper timing
      osc.start(now);
      osc.stop(now + 0.05);  // 50ms click with envelope
      
      // Cleanup
      osc.onended = () => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch (e) {
          // Already disconnected
        }
      };
      
    } catch (e) {
      // If anything goes wrong, just skip this click
      console.warn('Audio click failed:', e);
    }
  }
  
  // Toggle audio on/off
  toggle() {
    this.isEnabled = !this.isEnabled;
    return this.isEnabled;
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SimpleAudio;
}