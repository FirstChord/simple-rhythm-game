// visualMetronome.js - Minimal visual metronome that works with RhythmEngine

class VisualMetronome {
  constructor(container) {
    this.container = container;
    this.beatInterval = 500; // Will be set from engine
    this.animationId = null;
    this.startTime = 0;
    this.currentBeat = 0;
    
    this.createElements();
  }
  
  createElements() {
    // Clear container
    this.container.innerHTML = '';
    
    // Create metronome display
    this.metronomeEl = document.createElement('div');
    this.metronomeEl.className = 'visual-metronome';
    this.metronomeEl.innerHTML = `
      <div class="beat-counter">-</div>
      <div class="beat-indicator"></div>
      <div class="beat-dots">
        <span class="beat-dot" data-beat="0"></span>
        <span class="beat-dot" data-beat="1"></span>
        <span class="beat-dot" data-beat="2"></span>
        <span class="beat-dot" data-beat="3"></span>
      </div>
    `;
    
    this.container.appendChild(this.metronomeEl);
    
    // Cache elements
    this.counterEl = this.metronomeEl.querySelector('.beat-counter');
    this.indicatorEl = this.metronomeEl.querySelector('.beat-indicator');
    this.dots = this.metronomeEl.querySelectorAll('.beat-dot');
    
    // Add default styles
    this.addStyles();
  }
  
  addStyles() {
    if (document.getElementById('visual-metronome-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'visual-metronome-styles';
    style.textContent = `
      .visual-metronome {
        text-align: center;
        padding: 20px;
        user-select: none;
      }
      
      .beat-counter {
        font-size: 48px;
        font-weight: bold;
        margin-bottom: 20px;
        height: 60px;
        line-height: 60px;
      }
      
      .beat-indicator {
        width: 120px;
        height: 120px;
        margin: 0 auto 20px;
        border-radius: 50%;
        background: #ddd;
        transition: transform 0.1s ease-out, background-color 0.1s ease-out;
      }
      
      .beat-indicator.pulse {
        transform: scale(1.2);
        background: #4CAF50;
      }
      
      .beat-indicator.downbeat {
        background: #FF9800;
      }
      
      .beat-dots {
        display: flex;
        justify-content: center;
        gap: 15px;
      }
      
      .beat-dot {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #ddd;
        transition: all 0.1s ease-out;
      }
      
      .beat-dot.active {
        background: #2196F3;
        transform: scale(1.3);
      }
      
      .beat-dot.downbeat {
        background: #FF9800;
      }
    `;
    
    document.head.appendChild(style);
  }
  
  // Start the visual metronome
  start(beatInterval) {
    this.stop(); // Clean up any existing animation
    
    this.beatInterval = beatInterval;
    this.startTime = performance.now();
    this.currentBeat = 0;
    
    // Start animation loop
    this.animate();
  }
  
  // Animation loop
  animate() {
    const now = performance.now();
    const elapsed = now - this.startTime;
    const beatProgress = (elapsed % this.beatInterval) / this.beatInterval;
    const beatNumber = Math.floor(elapsed / this.beatInterval);
    
    // Update beat number if changed
    if (beatNumber !== this.currentBeat) {
      this.currentBeat = beatNumber;
      this.onBeat(this.currentBeat);
    }
    
    // Pulse effect based on beat progress
    if (beatProgress < 0.1) {
      this.indicatorEl.classList.add('pulse');
    } else if (beatProgress > 0.3) {
      this.indicatorEl.classList.remove('pulse');
    }
    
    // Continue animation
    this.animationId = requestAnimationFrame(() => this.animate());
  }
  
  // Called on each beat
  onBeat(beatNumber) {
    const beatInBar = beatNumber % 4;
    
    // Play audio click if available (with small delay to prevent glitches)
    if (window.gameController && window.gameController.audio) {
      // Use setTimeout to ensure audio doesn't overlap/glitch
      setTimeout(() => {
        window.gameController.audio.playClick(beatInBar === 0);
      }, 10);
    }
    
    // Update counter
    this.counterEl.textContent = beatInBar + 1;
    
    // Update indicator for downbeat
    if (beatInBar === 0) {
      this.indicatorEl.classList.add('downbeat');
    } else {
      this.indicatorEl.classList.remove('downbeat');
    }
    
    // Update dots
    this.dots.forEach((dot, i) => {
      if (i === beatInBar) {
        dot.classList.add('active');
        if (beatInBar === 0) {
          dot.classList.add('downbeat');
        }
      } else {
        dot.classList.remove('active', 'downbeat');
      }
    });
  }
  
  // Stop the metronome
  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    // Reset visual state
    this.counterEl.textContent = '-';
    this.indicatorEl.classList.remove('pulse', 'downbeat');
    this.dots.forEach(dot => dot.classList.remove('active', 'downbeat'));
  }
  
  // Flash feedback for user input
  flashFeedback(result) {
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 24px;
      font-weight: bold;
      pointer-events: none;
      z-index: 1000;
    `;
    
    if (result === 'perfect') {
      flash.textContent = 'Perfect!';
      flash.style.color = '#4CAF50';
    } else if (result === 'good') {
      flash.textContent = 'Good';
      flash.style.color = '#FF9800';
    } else {
      flash.textContent = 'Miss';
      flash.style.color = '#f44336';
    }
    
    this.container.style.position = 'relative';
    this.container.appendChild(flash);
    
    // Animate out
    flash.animate([
      { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
      { opacity: 0, transform: 'translate(-50%, -80%) scale(1.5)' }
    ], {
      duration: 800,
      easing: 'ease-out'
    }).onfinish = () => flash.remove();
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VisualMetronome;
}