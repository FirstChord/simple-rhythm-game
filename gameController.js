// gameController.js - Centralized game logic controller
// Extracted from the original HTML file to organize code better

class GameController {
  constructor() {
    // Initialize all game state variables
    this.selectedLevel = 'beginner';
    this.mode = 'single';
    this.speed = 'medium';
    this.SPEEDS = { slow: 70, medium: 100, fast: 140 };
    this.BPM = this.SPEEDS[this.speed];
    this.BEAT_INTERVAL = 60000 / this.BPM;
    this.SCORING_WINDOWS = { perfect: 70, good: 170 };
    
    // Pattern and game state
    this.currentPatternIdx = 0;
    this.score = 0;
    this.score1 = 0;
    this.score2 = 0;
    this.beatCount = 0;
    this.gameStartTime = 0;
    this.pattern = [];
    this.expectedBeatTimes = [];
    this.tapTimestamps = [];
    this.patternActive = false;
    this.beatActiveIdx = -1;
    this.beatHitResults = [];
    this.beatHitResultsP1 = [];
    this.beatHitResultsP2 = [];
    this.keyIsDown = {};
    this.lastTapTime = { 'a': 0, 'Enter': 0, ' ': 0 };
    
    // Multiplayer state
    this.totalGames = 3;
    this.gamesPlayed = 0;
    this.cumulativeScore1 = 0;
    this.cumulativeScore2 = 0;
    this.accArray1 = [];
    this.accArray2 = [];
    
    // Hold tracking
    this.holdPeriods = [];
    this.currentlyHolding = false;
    this.holdPeriodsP1 = [];
    this.currentlyHoldingP1 = false;
    this.holdPeriodsP2 = [];
    this.currentlyHoldingP2 = false;
    
    // Metronome
    this.metronomeTimer = null;
    this.metronomeBeat = 0;
    
    // Count-in state
    this.isCountingIn = false;
    this.countInBeat = 0;
    this.countInTimer = null;
    
    // Hit tracking for summary
    this.hitCounts = {
      perfect: 0,
      good: 0,
      miss: 0
    };
    
    // Initialize audio system
    this.audio = new SimpleAudio();
    
    // Initialize after DOM is ready
    this.initializeElements();
    this.bindEvents();
  }
  
  initializeElements() {
    // Cache DOM elements - main controls
    this.startBtn = document.getElementById('startBtn');
    this.stopBtn = document.getElementById('stopBtn');
    this.tempoSlider = document.getElementById('tempoSlider');
    this.tempoValue = document.getElementById('tempoValue');
    this.patternSelect = document.getElementById('patternSelect');
    
    // Info panel elements
    this.gameStatus = document.getElementById('gameStatus');
    this.scoreDisplay = document.getElementById('scoreDisplay');
    this.lastHitDisplay = document.getElementById('lastHitDisplay');
    this.hitSummaryDisplay = document.getElementById('hitSummaryDisplay');
    this.patternInfo = document.getElementById('patternInfo');
    this.tempoInfo = document.getElementById('tempoInfo');
    
    // Component containers
    this.metronomeDisplay = document.getElementById('metronomeDisplay');
    this.patternDisplay = document.getElementById('patternDisplay');
    
    // Populate pattern dropdown with all available patterns
    this.populatePatternDropdown();
    
    // Set initial state - default to Simple Quarter Notes
    this.patternSelect.value = 'simple_quarter';
    this.selectedPattern = 'simple_quarter';
    this.currentTempo = parseInt(this.tempoSlider.value, 10) || 120;
    
    // Update pattern info display
    this.patternInfo.textContent = this.getPatternName(this.selectedPattern);
    
    // Initialize VexFlow display BEFORE loading pattern preview
    this.vexDisplay = new VexFlowDisplay(document.getElementById('notation-container'));
    
    // Load initial pattern preview
    this.loadPatternPreview();
  }
  
  bindEvents() {
    // Tempo slider
    this.tempoSlider.addEventListener('input', () => {
      this.currentTempo = parseInt(this.tempoSlider.value, 10);
      this.tempoValue.textContent = this.currentTempo;
      this.tempoInfo.textContent = `${this.currentTempo} BPM`;
      
      // Update metronome if running
      if (this.metronome && this.isPlaying) {
        const beatInterval = 60000 / this.currentTempo;
        this.metronome.start(beatInterval); // Restart with new tempo
      }
    });
    
    // Pattern selection
    this.patternSelect.addEventListener('change', () => {
      this.selectedPattern = this.patternSelect.value;
      this.patternInfo.textContent = this.getPatternName(this.selectedPattern);
      
      // Load and display the pattern immediately
      this.loadPatternPreview();
    });
    
    // Game controls
    this.startBtn.addEventListener('click', () => this.startGame());
    this.stopBtn.addEventListener('click', () => this.stopGame());
    
    // Audio toggle
    document.getElementById('toggle-audio').addEventListener('click', (e) => {
      const isOn = this.audio.toggle();
      e.target.textContent = isOn ? '🔊 Audio ON' : '🔇 Audio OFF';
    });
    
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyT' && this.isPlaying && !this.isCountingIn) {
        e.preventDefault();
        this.handleInput('player1');
      }
    });
  }
  
  // Helper methods
  populatePatternDropdown() {
    // Clear existing options
    this.patternSelect.innerHTML = '';
    
    // Add patterns from all difficulty levels
    for (const difficulty in PATTERNS) {
      const patterns = PATTERNS[difficulty];
      patterns.forEach(pattern => {
        const option = document.createElement('option');
        option.value = pattern.id;
        option.textContent = `${pattern.name} (${difficulty})`;
        this.patternSelect.appendChild(option);
      });
    }
  }
  
  getPatternName(patternId) {
    const pattern = getPatternById(patternId);
    return pattern ? pattern.name : 'Unknown Pattern';
  }
  
  // Update hit summary display
  updateHitSummary() {
    const summary = `Perfect: ${this.hitCounts.perfect}, Good: ${this.hitCounts.good}, Miss: ${this.hitCounts.miss}`;
    this.hitSummaryDisplay.textContent = summary;
  }
  
  // Convert pattern strings to VexFlow format
  convertPatternToVexFlow(pattern) {
    console.log('Converting pattern to VexFlow:', pattern);
    
    return pattern.map(note => {
      // Handle the pattern format from patterns.js
      if (typeof note === 'object' && note.type) {
        console.log('Object format note:', note);
        return note; // Already in VexFlow format
      }
      
      // Convert string notation to VexFlow format
      console.log('Converting string note:', note);
      switch(note) {
        case 'Q': return { type: 'quarter', rest: false };
        case 'H': return { type: 'half', rest: false };
        case 'E': return { type: 'eighth', rest: false };
        case 'S': return { type: 'sixteenth', rest: false };
        case 'R': return { type: 'quarter', rest: true };
        case 'RE': return { type: 'eighth', rest: true };
        case 'RS': return { type: 'sixteenth', rest: true };
        default: 
          console.log('Unknown note type, defaulting to quarter:', note);
          return { type: 'quarter', rest: false };
      }
    });
  }
  
  // Load pattern preview without starting the game
  loadPatternPreview() {
    const patternData = this.getCurrentPattern();
    if (!patternData) {
      console.error("No pattern found for:", this.selectedPattern);
      return;
    }
    
    // Initialize visualizer if not already done
    if (!this.visualizer) {
      this.visualizer = new PatternVisualizer(this.patternDisplay);
    }
    
    // Calculate timing for preview
    const beatInterval = 60000 / this.currentTempo;
    const expectedTimes = this.calculateExpectedTimes(patternData.pattern, beatInterval);
    
    // Load pattern into visualizer for preview (but don't start animation)
    this.visualizer.loadPattern(patternData.pattern, expectedTimes, beatInterval);
    
    // Convert pattern to VexFlow format and display
    if (this.vexDisplay) {
      const vexFlowPattern = this.convertPatternToVexFlow(patternData.pattern);
      this.vexDisplay.displayPattern(vexFlowPattern);
    }
    
    console.log("Pattern preview loaded:", patternData.name);
  }
  
  // Get current pattern from patterns.js
  getCurrentPattern() {
    return getPatternById(this.selectedPattern);
  }
  
  // Calculate when each note should occur
  calculateExpectedTimes(pattern, beatInterval) {
    const times = [];
    let currentTime = 0;
    
    for (const note of pattern) {
      times.push(currentTime);
      
      // Calculate note duration
      let duration = beatInterval; // quarter note default
      if (note.type === 'eighth') duration = beatInterval / 2;
      else if (note.type === 'sixteenth') duration = beatInterval / 4;
      else if (note.type === 'half') duration = beatInterval * 2;
      else if (note.type === 'whole') duration = beatInterval * 4;
      
      // Add dotted note extension
      if (note.dotted) duration *= 1.5;
      
      currentTime += duration;
    }
    
    return times;
  }
  
  // Calculate duration of a single note
  getNoteDuration(note, beatInterval) {
    let duration = beatInterval; // quarter note default
    if (note.type === 'eighth') duration = beatInterval / 2;
    else if (note.type === 'sixteenth') duration = beatInterval / 4;
    else if (note.type === 'half') duration = beatInterval * 2;
    else if (note.type === 'whole') duration = beatInterval * 4;
    
    // Add dotted note extension
    if (note.dotted) duration *= 1.5;
    
    return duration;
  }
  
  // Sleep utility function
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Metronome methods
  startMetronome() {
    this.stopMetronome();
    this.metronomeBeat = 0;
    this.metronomeTick();
    this.metronomeTimer = setInterval(() => this.metronomeTick(), this.BEAT_INTERVAL);
  }
  
  stopMetronome() {
    if (this.metronomeTimer !== null) {
      clearInterval(this.metronomeTimer);
      this.metronomeTimer = null;
    }
  }
  
  metronomeTick() {
    if (this.metronomeBeat === 0) {
      this.metronome.style.background = "#ff0";
      this.playTickSound(true);
    } else {
      this.metronome.style.background = "#ccc";
      this.playTickSound(false);
    }
    this.metronome.textContent = (this.metronomeBeat + 1);
    this.metronomeBeat = (this.metronomeBeat + 1) % 4;
  }
  
  playTickSound(accent = false) {
    if (!window.AudioContext && !window.webkitAudioContext) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.frequency.value = accent ? 1400 : 1000;
    gainNode.gain.value = accent ? 0.22 : 0.14;
    osc.connect(gainNode).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.055);
    osc.onended = () => ctx.close();
  }
  
  // Event handlers for input
  listenForTap() {
    document.addEventListener('keydown', (e) => this.keyTapHandler(e), { passive: false });
    document.addEventListener('keyup', (e) => this.keyTapUpHandler(e));
    document.addEventListener('touchstart', (e) => this.touchTapHandler(e), { passive: false });
    document.addEventListener('touchend', (e) => this.touchEndHandler(e), { passive: false });
  }
  
  stopListeningForTap() {
    document.removeEventListener('keydown', this.keyTapHandler);
    document.removeEventListener('keyup', this.keyTapUpHandler);
    document.removeEventListener('touchstart', this.touchTapHandler);
    document.removeEventListener('touchend', this.touchEndHandler);
  }
  
  keyTapHandler(e) {
    if (!this.patternActive) return;
    if (this.mode === 'single') {
      if ((e.code === "Space" || e.key === " ") && !this.keyIsDown[' ']) {
        const now = performance.now();
        if (!this.currentlyHolding) {
          this.currentlyHolding = true;
          this.holdPeriods.push({ down: now, up: null });
        }
        this.keyIsDown[' '] = true;
        this.tapIndicator1.style.background = '#0f0';
        setTimeout(() => { this.tapIndicator1.style.background = '#86e1f7'; }, 100);
        e.preventDefault();
      }
    } else {
      if ((e.key === "a" || e.key === "A") && !this.keyIsDown['a']) {
        const now = performance.now();
        if (!this.currentlyHoldingP1) {
          this.currentlyHoldingP1 = true;
          this.holdPeriodsP1.push({ down: now, up: null });
        }
        this.keyIsDown['a'] = true;
        this.tapIndicator1.style.background = '#0f0';
        setTimeout(() => { this.tapIndicator1.style.background = '#86e1f7'; }, 100);
        e.preventDefault();
      }
      if ((e.key === "Enter" || e.code === "Enter") && !this.keyIsDown['Enter']) {
        const now = performance.now();
        if (!this.currentlyHoldingP2) {
          this.currentlyHoldingP2 = true;
          this.holdPeriodsP2.push({ down: now, up: null });
        }
        this.keyIsDown['Enter'] = true;
        this.tapIndicator2.style.background = '#0f0';
        setTimeout(() => { this.tapIndicator2.style.background = '#f6b8e0'; }, 100);
        e.preventDefault();
      }
    }
  }
  
  keyTapUpHandler(e) {
    if (e.code === "Space" || e.key === " ") {
      this.keyIsDown[' '] = false;
      if (this.currentlyHolding) {
        this.currentlyHolding = false;
        let now = performance.now();
        let lastHold = this.holdPeriods[this.holdPeriods.length - 1];
        if (lastHold && lastHold.up === null) lastHold.up = now;
      }
    }
    if (e.key === "a" || e.key === "A") {
      this.keyIsDown['a'] = false;
      if (this.currentlyHoldingP1) {
        this.currentlyHoldingP1 = false;
        let now = performance.now();
        let lastHold = this.holdPeriodsP1[this.holdPeriodsP1.length - 1];
        if (lastHold && lastHold.up === null) lastHold.up = now;
      }
    }
    if (e.key === "Enter" || e.code === "Enter") {
      this.keyIsDown['Enter'] = false;
      if (this.currentlyHoldingP2) {
        this.currentlyHoldingP2 = false;
        let now = performance.now();
        let lastHold = this.holdPeriodsP2[this.holdPeriodsP2.length - 1];
        if (lastHold && lastHold.up === null) lastHold.up = now;
      }
    }
    // Add support for 'T' key release (for rhythm engine hold tracking)
    if (e.code === 'KeyT' && this.rhythmEngine && this.isPlaying && !this.isCountingIn) {
      this.rhythmEngine.registerHoldEnd();
    }
  }
  
  touchTapHandler(e) {
    if (!this.patternActive) return;
    const now = performance.now();
    if (this.mode === 'single') {
      if (!this.currentlyHolding) {
        this.currentlyHolding = true;
        this.holdPeriods.push({ down: now, up: null });
      }
      this.tapIndicator1.style.background = '#0f0';
      setTimeout(() => { this.tapIndicator1.style.background = '#86e1f7'; }, 100);
    } else {
      if (!this.currentlyHoldingP1) {
        this.currentlyHoldingP1 = true;
        this.holdPeriodsP1.push({ down: now, up: null });
      }
      if (!this.currentlyHoldingP2) {
        this.currentlyHoldingP2 = true;
        this.holdPeriodsP2.push({ down: now, up: null });
      }
      this.tapIndicator1.style.background = '#0f0';
      this.tapIndicator2.style.background = '#0f0';
      setTimeout(() => {
        this.tapIndicator1.style.background = '#86e1f7';
        this.tapIndicator2.style.background = '#f6b8e0';
      }, 100);
    }
  }
  
  touchEndHandler(e) {
    if (this.mode === 'single' && this.currentlyHolding) {
      this.currentlyHolding = false;
      let now = performance.now();
      let lastHold = this.holdPeriods[this.holdPeriods.length - 1];
      if (lastHold && lastHold.up === null) lastHold.up = now;
    } else if (this.mode === 'multi') {
      if (this.currentlyHoldingP1) {
        this.currentlyHoldingP1 = false;
        let now = performance.now();
        let lastHold = this.holdPeriodsP1[this.holdPeriodsP1.length - 1];
        if (lastHold && lastHold.up === null) lastHold.up = now;
      }
      if (this.currentlyHoldingP2) {
        this.currentlyHoldingP2 = false;
        let now = performance.now();
        let lastHold = this.holdPeriodsP2[this.holdPeriodsP2.length - 1];
        if (lastHold && lastHold.up === null) lastHold.up = now;
      }
    }
  }
  
  // This is where we'll add the main game logic methods
  // Game control methods
  async startGame() {
    console.log("Starting game with pattern:", this.selectedPattern, "at", this.currentTempo, "BPM");
    
    // Get pattern data
    const patternData = this.getCurrentPattern();
    if (!patternData) {
      console.error("No pattern found for:", this.selectedPattern);
      return;
    }
    
    // Update UI for count-in
    this.startBtn.disabled = true;
    this.stopBtn.disabled = false;
    this.isCountingIn = true;
    this.countInBeat = 1;
    
    // Initialize visual components for count-in
    if (!this.metronome) {
      this.metronome = new VisualMetronome(this.metronomeDisplay);
    }
    
    // Calculate timing
    const beatInterval = 60000 / this.currentTempo; // milliseconds per beat
    
    // Start metronome and count-in simultaneously
    this.metronome.start(beatInterval);
    
    // Play first count-in beat immediately
    if (this.audio) {
      this.audio.playClick(true); // First beat is accented
    }
    
    this.startCountIn(patternData, beatInterval);
  }
  
  startCountIn(patternData, beatInterval) {
    console.log("Starting count-in...");
    
    // Show initial count immediately
    this.gameStatus.textContent = "4";
    console.log(`Count-in: 4`);
    
    // Count-in timer - update every beat
    this.countInTimer = setInterval(() => {
      this.countInBeat++;
      
      if (this.countInBeat <= 4) {
        // Update status display - show countdown from 3 to 1
        const countdownNumber = 5 - this.countInBeat;
        this.gameStatus.textContent = countdownNumber.toString();
        console.log(`Count-in: ${countdownNumber}`);
      } else {
        // Count-in complete, start actual game
        this.completeCountIn(patternData, beatInterval);
      }
    }, beatInterval);
  }
  
  completeCountIn(patternData, beatInterval) {
    console.log("Count-in complete, starting game...");
    
    // Clean up count-in timer
    if (this.countInTimer) {
      clearInterval(this.countInTimer);
      this.countInTimer = null;
    }
    
    // Update state
    this.isCountingIn = false;
    this.isPlaying = true;
    this.gameStatus.textContent = "Playing...";
    
    // Initialize rhythm engine
    if (!this.rhythmEngine) {
      this.rhythmEngine = new RhythmEngine(this.currentTempo);
    } else {
      this.rhythmEngine.bpm = this.currentTempo;
      this.rhythmEngine.beatInterval = 60000 / this.currentTempo;
    }
    
    // Load pattern into rhythm engine
    this.rhythmEngine.loadPattern(patternData.pattern);
    this.rhythmEngine.start();
    
    // Initialize pattern visualizer
    if (!this.visualizer) {
      this.visualizer = new PatternVisualizer(this.patternDisplay);
    }
    
    // Load pattern into visualizer
    const expectedTimes = this.calculateExpectedTimes(patternData.pattern, beatInterval);
    this.visualizer.loadPattern(patternData.pattern, expectedTimes, beatInterval);
    
    // Reset score
    this.score = 0;
    this.scoreDisplay.textContent = this.score;
    this.lastHitDisplay.textContent = '-';
    this.lastHitDisplay.style.color = '#666';
    
    // Reset hit counts
    this.hitCounts = { perfect: 0, good: 0, miss: 0 };
    this.updateHitSummary();
    
    // Calculate total pattern duration
    const totalDuration = expectedTimes[expectedTimes.length - 1] + 
                          this.getNoteDuration(patternData.pattern[patternData.pattern.length - 1], beatInterval);
    
    // Start visualizer
    this.visualizer.start();
    
    // Store pattern end time for precise stopping
    this.patternEndTime = performance.now() + totalDuration;
    
    // Auto-stop after pattern completes (check more frequently)
    this.completionCheckInterval = setInterval(() => {
      if (this.isPlaying && performance.now() >= this.patternEndTime) {
        this.endGame();
      }
    }, 50); // Check every 50ms for precision
    
    console.log("Game started! Press 'T' key to tap along with the pattern.");
    console.log("Pattern:", patternData.name, "-", patternData.description);
    console.log("Duration:", Math.round(totalDuration/1000), "seconds");
    console.log("Beat interval:", beatInterval, "ms");
    console.log("Expected times:", expectedTimes);
  }

  stopGame() {
    console.log("Stopping game...");
    
    // Clean up count-in timer
    if (this.countInTimer) {
      clearInterval(this.countInTimer);
      this.countInTimer = null;
    }
    
    // Clean up completion check
    if (this.completionCheckInterval) {
      clearInterval(this.completionCheckInterval);
      this.completionCheckInterval = null;
    }
    
    // Stop rhythm engine
    if (this.rhythmEngine) {
      this.rhythmEngine.stop();
    }
    
    // Update UI
    this.gameStatus.textContent = "Ready to play";
    this.startBtn.disabled = false;
    this.stopBtn.disabled = true;
    this.isPlaying = false;
    this.isCountingIn = false;
    
    // Stop components
    if (this.metronome) {
      this.metronome.stop();
    }
    
    if (this.visualizer) {
      this.visualizer.stop();
    }
  }
  
  endGame() {
    // Calculate final score
    const results = this.rhythmEngine.scorePattern();
    this.calculateFinalScore(results);
    
    // Stop the game
    this.stopGame();
    
    // Show completion message with score
    const accuracy = this.calculateAccuracy(results);
    this.gameStatus.textContent = `Pattern complete! Score: ${this.score} (${accuracy}% accuracy)`;
    
    console.log("Game ended! Final results:", results);
  }
  
  calculateFinalScore(results) {
    let totalScore = 0;
    let perfectCount = 0;
    let goodCount = 0;
    let missCount = 0;
    
    results.forEach(result => {
      if (result) {
        switch(result.result) {
          case 'perfect':
            totalScore += 100;
            perfectCount++;
            break;
          case 'good':
            totalScore += 50;
            goodCount++;
            break;
          case 'miss':
            missCount++;
            break;
        }
      } else {
        missCount++;
      }
    });
    
    // Update the hit counts to reflect final results
    this.hitCounts = {
      perfect: perfectCount,
      good: goodCount,
      miss: missCount
    };
    
    this.score = totalScore;
    this.scoreDisplay.textContent = this.score;
    this.updateHitSummary();
    
    console.log(`Score breakdown: ${perfectCount} perfect, ${goodCount} good, ${missCount} missed`);
  }
  
  calculateAccuracy(results) {
    const totalNotes = results.length;
    const hitNotes = results.filter(r => r && r.result !== 'miss').length;
    return Math.round((hitNotes / totalNotes) * 100);
  }
  
  handleInput(player) {
    console.log("Input received from:", player);
    
    if (!this.rhythmEngine || !this.isPlaying) return;
    
    // Register the tap with the rhythm engine
    this.rhythmEngine.registerHoldStart();
    
    // Provide immediate visual feedback
    const currentTime = Date.now() - this.rhythmEngine.startTime;
    this.showTapFeedback(currentTime);
  }
  
  showTapFeedback(tapTime) {
    // Find the closest expected note
    let closestIndex = -1;
    let closestDiff = Infinity;
    
    this.rhythmEngine.expectedTimes.forEach((expectedTime, index) => {
      const diff = Math.abs(tapTime - expectedTime);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = index;
      }
    });
    
    if (closestIndex !== -1) {
      // Score this tap immediately for feedback
      const result = this.rhythmEngine.scoreNote(closestIndex, tapTime);
      
      // Update live feedback display
      let feedbackText = `${result.result.toUpperCase()} (${Math.round(result.timing)}ms off)`;
      let feedbackColor = '#666';
      
      switch(result.result) {
        case 'perfect':
          feedbackColor = '#4CAF50';
          this.score += 100;
          this.hitCounts.perfect++;
          break;
        case 'good':
          feedbackColor = '#FF9800';
          this.score += 50;
          this.hitCounts.good++;
          break;
        case 'miss':
          feedbackColor = '#f44336';
          this.hitCounts.miss++;
          break;
      }
      
      // Update displays
      this.lastHitDisplay.textContent = feedbackText;
      this.lastHitDisplay.style.color = feedbackColor;
      this.scoreDisplay.textContent = this.score;
      this.updateHitSummary();
      
      // Show feedback on the pattern visualizer
      if (this.visualizer) {
        this.visualizer.flashNoteFeedback(closestIndex, result.result);
      }
      
      console.log(`Tap feedback: ${result.result} (${Math.round(result.timing)}ms off)`);
    }
  }
}

// Initialize the game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.gameController = new GameController();
});

