// patternVisualizer.js - Visualizes the actual pattern notes, not just steady beats

class PatternVisualizer {
  constructor(container) {
    this.container = container;
    this.pattern = [];
    this.expectedTimes = [];
    this.startTime = 0;
    this.isPlaying = false;
    this.animationId = null;
    this.currentNoteIndex = -1;
    
    this.createElements();
  }
  
  createElements() {
    this.container.innerHTML = '';
    
    // Create main visualizer
    this.visualizer = document.createElement('div');
    this.visualizer.className = 'pattern-visualizer';
    this.visualizer.innerHTML = `
      <div class="beat-display">
        <div class="current-beat">Ready</div>
        <div class="beat-type"></div>
      </div>
      <div class="pattern-timeline"></div>
      <div class="progress-bar">
        <div class="progress-fill"></div>
      </div>
    `;
    
    this.container.appendChild(this.visualizer);
    
    // Cache elements
    this.currentBeatEl = this.visualizer.querySelector('.current-beat');
    this.beatTypeEl = this.visualizer.querySelector('.beat-type');
    this.timelineEl = this.visualizer.querySelector('.pattern-timeline');
    this.progressFill = this.visualizer.querySelector('.progress-fill');
    
    this.addStyles();
  }
  
  addStyles() {
    if (document.getElementById('pattern-visualizer-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'pattern-visualizer-styles';
    style.textContent = `
      .pattern-visualizer {
        padding: 20px;
        background: #f9f9f9;
        border-radius: 8px;
      }
      
      .beat-display {
        text-align: center;
        margin-bottom: 30px;
      }
      
      .current-beat {
        font-size: 72px;
        font-weight: bold;
        line-height: 1;
        transition: all 0.1s;
      }
      
      .current-beat.pulse {
        transform: scale(1.2);
        color: #4CAF50;
      }
      
      .current-beat.rest {
        color: #999;
        transform: scale(0.9);
      }
      
      .beat-type {
        font-size: 18px;
        color: #666;
        margin-top: 10px;
      }
      
      .pattern-timeline {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        margin: 20px 0;
        padding: 20px;
        background: white;
        border-radius: 8px;
        overflow-x: auto;
      }
      
      .note-block {
        flex-shrink: 0;
        background: #ddd;
        border-radius: 4px;
        padding: 10px;
        text-align: center;
        transition: all 0.2s;
        cursor: default;
        position: relative;
        border: 2px solid transparent;
      }
      
      .note-block.quarter { width: 60px; }
      .note-block.eighth { width: 30px; }
      .note-block.sixteenth { width: 15px; }
      
      .note-block.rest {
        background: #f5f5f5;
        border: 2px dashed #999;
      }
      
      .note-block.active {
        background: #4CAF50;
        color: white;
        transform: scale(1.15);
        z-index: 1;
        box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
      }
      

      
      .note-block.passed {
        background: #e0e0e0;
        opacity: 0.6;
      }
      
      .note-label {
        font-size: 12px;
        font-weight: bold;
      }
      
      .note-number {
        font-size: 10px;
        color: #666;
        margin-top: 4px;
      }
      
      .barline {
        width: 3px;
        height: 60px;
        background: #333;
        margin: 0 10px;
        flex-shrink: 0;
      }
      
      .progress-bar {
        height: 8px;
        background: #e0e0e0;
        border-radius: 4px;
        overflow: hidden;
        margin-top: 20px;
      }
      
      .progress-fill {
        height: 100%;
        background: #4CAF50;
        width: 0%;
        transition: width 0.1s linear;
      }
      
      /* Pulse animation */
      @keyframes notePulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
      }
      
      .note-block.hit-feedback {
        animation: notePulse 0.3s ease-out;
      }
    `;
    
    document.head.appendChild(style);
  }
  
  // Load a pattern for visualization
  loadPattern(pattern, expectedTimes, beatInterval) {
    this.pattern = pattern;
    this.expectedTimes = expectedTimes;
    this.beatInterval = beatInterval;
    
    // Build timeline
    this.buildTimeline();
  }
  
  buildTimeline() {
    this.timelineEl.innerHTML = '';
    
    let currentBeat = 0;
    
    this.pattern.forEach((note, index) => {
      // Add barline at start of each measure (except first)
      if (currentBeat >= 4) {
        const barline = document.createElement('div');
        barline.className = 'barline';
        this.timelineEl.appendChild(barline);
        currentBeat = currentBeat % 4;
      }
      
      // Create note block
      const block = document.createElement('div');
      block.className = `note-block ${note.type}`;
      if (note.rest) block.classList.add('rest');
      
      // Add label
      let label = note.type.charAt(0).toUpperCase();
      if (note.rest) label = 'R';
      
      block.innerHTML = `
        <div class="note-label">${label}</div>
        <div class="note-number">${index + 1}</div>
      `;
      
      block.dataset.index = index;
      this.timelineEl.appendChild(block);
      
      // Update beat counter
      if (note.type === 'quarter') currentBeat += 1;
      else if (note.type === 'eighth') currentBeat += 0.5;
      else if (note.type === 'sixteenth') currentBeat += 0.25;
    });
  }
  
  // Start visualization
  start() {
    this.startTime = performance.now();
    this.isPlaying = true;
    this.currentNoteIndex = -1;
    this.progressFill.style.width = '0%';
    
    // Reset all note states
    this.timelineEl.querySelectorAll('.note-block').forEach(block => {
      block.classList.remove('active', 'passed');
    });
    
    this.animate();
  }
  
  // Animation loop
  animate() {
    if (!this.isPlaying) return;
    
    const elapsed = performance.now() - this.startTime;
    
    // Find current note
    let currentNote = -1;
    for (let i = 0; i < this.expectedTimes.length; i++) {
      if (elapsed >= this.expectedTimes[i]) {
        currentNote = i;
      }
    }
    
    // Update if note changed
    if (currentNote !== this.currentNoteIndex) {
      this.currentNoteIndex = currentNote;
      this.updateDisplay();
    }
    
    // Update progress bar
    if (this.expectedTimes.length > 0) {
      const totalDuration = this.expectedTimes[this.expectedTimes.length - 1] + 
                           this.getNoteDuration(this.pattern[this.pattern.length - 1]);
      const progress = Math.min(100, (elapsed / totalDuration) * 100);
      this.progressFill.style.width = progress + '%';
    }
    
    this.animationId = requestAnimationFrame(() => this.animate());
  }
  
  // Update display for current note
  updateDisplay() {
    const blocks = this.timelineEl.querySelectorAll('.note-block');
    
    blocks.forEach((block, i) => {
      block.classList.remove('active', 'passed');
      
      if (i < this.currentNoteIndex) {
        block.classList.add('passed');
      } else if (i === this.currentNoteIndex) {
        block.classList.add('active');
        
        // Update beat display
        const note = this.pattern[i];
        if (note.rest) {
          this.currentBeatEl.textContent = 'Rest';
          this.currentBeatEl.classList.add('rest');
          this.currentBeatEl.classList.remove('pulse');
          this.beatTypeEl.textContent = `${note.type} rest`;
        } else {
          this.currentBeatEl.textContent = i + 1;
          this.currentBeatEl.classList.remove('rest');
          this.currentBeatEl.classList.add('pulse');
          this.beatTypeEl.textContent = `${note.type} note`;
          
          // Remove pulse after short time
          setTimeout(() => {
            this.currentBeatEl.classList.remove('pulse');
          }, 100);
        }
      }
    });
  }
  
  // Stop visualization
  stop() {
    this.isPlaying = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    this.currentBeatEl.textContent = 'Complete';
    this.currentBeatEl.classList.remove('pulse', 'rest');
    this.beatTypeEl.textContent = '';
  }
  
  // Flash feedback on a specific note
  flashNoteFeedback(noteIndex, result) {
    console.log(`flashNoteFeedback called: noteIndex=${noteIndex}, result=${result}`);
    const block = this.timelineEl.querySelector(`[data-index="${noteIndex}"]`);
    if (!block) {
      console.log(`No block found for noteIndex ${noteIndex}`);
      return;
    }
    
    block.classList.add('hit-feedback');
    
    // Add persistent color based on result (don't revert back)
    if (result === 'perfect') {
      block.style.background = '#4CAF50'; // Green
      block.classList.add('perfect');
    } else if (result === 'good') {
      block.style.background = '#FF9800'; // Yellow
      block.classList.add('good');
    } else if (result === 'miss') {
      block.style.background = '#f44336'; // Red
      block.classList.add('miss');
    }
    
    // Keep the feedback visible (don't remove it after timeout)
    setTimeout(() => {
      block.classList.remove('hit-feedback');
      // Don't revert background - keep the color
    }, 300);
  }
  
  // Flash warning for rest violations
  flashRestWarning(restIndex) {
    console.log(`flashRestWarning called: restIndex=${restIndex}`);
    
    const block = this.timelineEl.querySelector(`[data-index="${restIndex}"]`);
    
    if (!block) {
      console.log(`No block found for rest index ${restIndex}`);
      return;
    }
    
    // Briefly flash orange/yellow warning color
    const originalBg = block.style.background;
    block.style.background = '#FF6B35'; // Orange warning
    block.classList.add('rest-warning');
    
    // Revert after brief warning flash
    setTimeout(() => {
      block.style.background = originalBg;
      block.classList.remove('rest-warning');
    }, 500);
  }
  
  // Helper to get note duration
  getNoteDuration(note) {
    const durations = {
      'whole': this.beatInterval * 4,
      'half': this.beatInterval * 2,
      'quarter': this.beatInterval,
      'eighth': this.beatInterval / 2,
      'sixteenth': this.beatInterval / 4
    };
    
    let duration = durations[note.type] || this.beatInterval;
    if (note.dotted) duration *= 1.5;
    
    return duration;
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PatternVisualizer;
}