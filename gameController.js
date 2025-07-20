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
    
    // Rest violations tracking
    this.restViolations = 0;
    
    // Multiplayer state
    this.isMultiplayer = false;
    this.scores = { player1: 0, player2: 0 };
    this.hitCountsMP = { 
      player1: { perfect: 0, good: 0, miss: 0 },
      player2: { perfect: 0, good: 0, miss: 0 }
    };
    
    // Rest violations for multiplayer
    this.restViolationsMP = {
      player1: 0,
      player2: 0
    };
    
    // Track which notes have been scored to prevent double-scoring
    this.scoredNotes = new Set();
    
    // Miss detection for multiplayer
    this.missCheckTimer = null;
    this.lastCheckedNoteIndex = -1;
    
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
    
    // Multiplayer toggle
    document.getElementById('toggle-multiplayer').addEventListener('click', (e) => {
      this.toggleMultiplayer();
      e.target.textContent = this.isMultiplayer ? '👤 Single Player' : '👥 Multiplayer';
    });
    
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
      if (this.isPlaying && !this.isCountingIn) {
        // Single player mode - only 'T' key
        if (!this.isMultiplayer && e.code === 'KeyT') {
          e.preventDefault();
          this.handleInput('player1');
        }
        // Multiplayer mode - 'A' and 'K' keys
        else if (this.isMultiplayer && e.code === 'KeyA') {
          e.preventDefault();
          this.handleInput('player1');
        }
        else if (this.isMultiplayer && e.code === 'KeyK') {
          e.preventDefault();
          this.handleInput('player2');
        }
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
    const summary = `Perfect: ${this.hitCounts.perfect}, Good: ${this.hitCounts.good}, Miss: ${this.hitCounts.miss}${this.restViolations > 0 ? `, Rest Taps: ${this.restViolations}` : ''}`;
    this.hitSummaryDisplay.textContent = summary;
  }
  
  // Toggle between single player and multiplayer modes
  toggleMultiplayer() {
    this.isMultiplayer = !this.isMultiplayer;
    
    // Show/hide appropriate UI elements
    const singlePlayerPanel = document.querySelector('.info-panel:not(#multiplayer-scores)');
    const multiplayerPanel = document.getElementById('multiplayer-scores');
    
    if (this.isMultiplayer) {
      singlePlayerPanel.style.display = 'none';
      multiplayerPanel.style.display = 'block';
      console.log('Switched to multiplayer mode');
    } else {
      singlePlayerPanel.style.display = 'block';
      multiplayerPanel.style.display = 'none';
      console.log('Switched to single player mode');
    }
    
    // Reset scores when switching modes
    this.resetScores();
  }
  
  // Reset all scoring data
  resetScores() {
    this.score = 0;
    this.scores.player1 = 0;
    this.scores.player2 = 0;
    this.hitCounts = { perfect: 0, good: 0, miss: 0 };
    this.hitCountsMP.player1 = { perfect: 0, good: 0, miss: 0 };
    this.hitCountsMP.player2 = { perfect: 0, good: 0, miss: 0 };
    
    // Reset rest violations
    this.restViolations = 0;
    this.restViolationsMP.player1 = 0;
    this.restViolationsMP.player2 = 0;
    
    // Clear scored notes tracking
    this.scoredNotes.clear();
    
    // Reset miss detection
    this.lastCheckedNoteIndex = -1;
    this.stopMissDetection();
    
    // Clear winning highlights
    const player1Element = document.querySelector('.player-score:first-child');
    const player2Element = document.querySelector('.player-score:last-child');
    if (player1Element) player1Element.classList.remove('winning');
    if (player2Element) player2Element.classList.remove('winning');
    
    // Update displays
    this.scoreDisplay.textContent = this.score;
    this.updateHitSummary();
    this.updateMultiplayerDisplays();
  }
  
  // Update multiplayer score displays
  updateMultiplayerDisplays() {
    if (!this.isMultiplayer) return;
    
    // Update scores
    document.getElementById('score-p1').textContent = this.scores.player1;
    document.getElementById('score-p2').textContent = this.scores.player2;
    
    // Update hit summaries
    const hits1 = this.hitCountsMP.player1;
    const hits2 = this.hitCountsMP.player2;
    const rests1 = this.restViolationsMP.player1;
    const rests2 = this.restViolationsMP.player2;
    
    document.getElementById('hits-p1').textContent = `Perfect: ${hits1.perfect}, Good: ${hits1.good}, Miss: ${hits1.miss}${rests1 > 0 ? `, Rest Taps: ${rests1}` : ''}`;
    document.getElementById('hits-p2').textContent = `Perfect: ${hits2.perfect}, Good: ${hits2.good}, Miss: ${hits2.miss}${rests2 > 0 ? `, Rest Taps: ${rests2}` : ''}`;
    
    // Update winning indicator
    const player1Element = document.querySelector('.player-score:first-child');
    const player2Element = document.querySelector('.player-score:last-child');
    
    if (this.scores.player1 > this.scores.player2) {
      player1Element.classList.add('winning');
      player2Element.classList.remove('winning');
    } else if (this.scores.player2 > this.scores.player1) {
      player2Element.classList.add('winning');
      player1Element.classList.remove('winning');
    } else {
      player1Element.classList.remove('winning');
      player2Element.classList.remove('winning');
    }
  }
  
  // Check for missed notes (notes that passed their timing window)
  checkForMissedNotes() {
    if (!this.rhythmEngine || !this.rhythmEngine.isPlaying) return;
    
    const currentTime = Date.now() - this.rhythmEngine.startTime;
    const missWindow = 170; // Same as "good" timing window
    
    console.log(`DEBUG: Miss check at time ${currentTime}ms, lastCheckedNoteIndex=${this.lastCheckedNoteIndex}`);
    
    // Check each note to see if its timing window has passed
    this.rhythmEngine.expectedTimes.forEach((expectedTime, index) => {
      // Only check notes we haven't processed yet
      if (index <= this.lastCheckedNoteIndex) return;
      
      // Skip rest notes - they can't be missed since you shouldn't tap them
      if (this.rhythmEngine.pattern[index] && this.rhythmEngine.pattern[index].rest) {
        console.log(`DEBUG: Skipping rest note ${index} at ${expectedTime}ms`);
        // DON'T update lastCheckedNoteIndex here - let it continue checking subsequent notes
        return;
      }
      
      console.log(`DEBUG: Checking note ${index}: expectedTime=${expectedTime}ms, currentTime=${currentTime}ms, missWindow=${missWindow}ms`);
      
      // Check if this note's timing window has passed
      if (currentTime > expectedTime + missWindow) {
        console.log(`DEBUG: Note ${index} timing window expired (${currentTime}ms > ${expectedTime + missWindow}ms)`);
        
        if (this.isMultiplayer) {
          // Multiplayer mode: check each player separately
          const player1Key = `player1-${index}`;
          const player2Key = `player2-${index}`;
          
          if (!this.scoredNotes.has(player1Key)) {
            // Player 1 missed this note
            this.scoredNotes.add(player1Key);
            this.hitCountsMP.player1.miss++;
            console.log(`Player 1 missed note ${index} (expected at ${expectedTime}ms, now ${currentTime}ms)`);
            
            // Show visual feedback for misses
            if (this.visualizer) {
              this.visualizer.flashNoteFeedback(index, 'miss');
            }
          }
          
          if (!this.scoredNotes.has(player2Key)) {
            // Player 2 missed this note
            this.scoredNotes.add(player2Key);
            this.hitCountsMP.player2.miss++;
            console.log(`Player 2 missed note ${index} (expected at ${expectedTime}ms, now ${currentTime}ms)`);
            
            // Show visual feedback for misses (only once)
            if (this.visualizer && !this.scoredNotes.has(player1Key)) {
              this.visualizer.flashNoteFeedback(index, 'miss');
            }
          }
          
          // Update multiplayer display
          this.updateMultiplayerDisplays();
        } else {
          // Single player mode: check if player hit this note
          const playerKey = `player1-${index}`;
          
          console.log(`DEBUG: Single player check - note ${index}, playerKey=${playerKey}, scored=${this.scoredNotes.has(playerKey)}`);
          
          if (!this.scoredNotes.has(playerKey)) {
            // Player missed this note
            this.scoredNotes.add(playerKey);
            this.hitCounts.miss++;
            console.log(`Single player missed note ${index} (expected at ${expectedTime}ms, now ${currentTime}ms)`);
            console.log(`Calling visual feedback for missed note ${index}`);
            
            // Update single player display
            this.updateHitSummary();
            
            // Show visual feedback for misses (with small delay to avoid confusion with rest violations)
            if (this.visualizer) {
              console.log(`DEBUG: Scheduling visual feedback for missed note ${index}`);
              setTimeout(() => {
                console.log(`DEBUG: Executing visual feedback for missed note ${index}`);
                this.visualizer.flashNoteFeedback(index, 'miss');
              }, 200);
            }
          } else {
            console.log(`DEBUG: Note ${index} already scored, skipping miss detection`);
          }
        }
        
        this.lastCheckedNoteIndex = index;
      }
    });
  }
  
  // Start miss detection timer for all game modes
  startMissDetection() {
    if (this.missCheckTimer) {
      clearInterval(this.missCheckTimer);
    }
    
    this.lastCheckedNoteIndex = -1;
    this.missCheckTimer = setInterval(() => {
      this.checkForMissedNotes();
    }, 50); // Check every 50ms
  }
  
  // Stop miss detection timer
  stopMissDetection() {
    if (this.missCheckTimer) {
      clearInterval(this.missCheckTimer);
      this.missCheckTimer = null;
    }
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

  // This is where we'll add the main game logic methods
  // Game control methods
  async startGame() {
    console.log("Starting game with pattern:", this.selectedPattern, "at", this.currentTempo, "BPM");
    
    // Reset scores and clear highlights from previous game
    this.resetScores();
    
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
    
    // Reset hit counts
    this.hitCounts = { perfect: 0, good: 0, miss: 0 };
    this.updateHitSummary();
    
    // Calculate total pattern duration
    const totalDuration = expectedTimes[expectedTimes.length - 1] + 
                          this.getNoteDuration(patternData.pattern[patternData.pattern.length - 1], beatInterval);
    
    // Start visualizer
    this.visualizer.start();
    
    // Start miss detection for all game modes
    this.startMissDetection();
    
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
    
    // Stop miss detection
    this.stopMissDetection();
    
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
    // Stop the game
    this.stopGame();
    
    // Show completion message with score (using real-time data)
    const totalNotes = this.hitCounts.perfect + this.hitCounts.good + this.hitCounts.miss;
    const hitNotes = this.hitCounts.perfect + this.hitCounts.good;
    const accuracy = totalNotes > 0 ? Math.round((hitNotes / totalNotes) * 100) : 0;
    this.gameStatus.textContent = `Pattern complete! Score: ${this.score} (${accuracy}% accuracy)`;
    
    console.log("Game ended! Real-time results:", this.hitCounts);
  }
  
  handleInput(player) {
    console.log("Input received from:", player);
    
    if (!this.rhythmEngine || !this.isPlaying) return;
    
    // Prevent duplicate processing with a small debounce
    const currentTime = Date.now() - this.rhythmEngine.startTime;
    if (this.lastTapTime && Math.abs(currentTime - this.lastTapTime) < 50) {
      console.log("DEBUG: Ignoring duplicate tap (too close to previous)");
      return;
    }
    this.lastTapTime = currentTime;
    
    // Register the tap with the rhythm engine
    this.rhythmEngine.registerHoldStart();
    
    // Provide immediate visual feedback
    this.showTapFeedback(currentTime, player);
  }
  
  // Check if a tap occurs during a rest timing window
  checkForRestViolation(tapTime) {
    if (!this.rhythmEngine || !this.rhythmEngine.isPlaying) return null;
    
    console.log(`DEBUG: checkForRestViolation tapTime=${tapTime}`);
    console.log(`DEBUG: pattern length=${this.rhythmEngine.pattern.length}`);
    console.log(`DEBUG: expectedTimes=`, this.rhythmEngine.expectedTimes);
    
    const toleranceWindow = 85; // Same as note detection tolerance
    
    // Check each rest in the pattern
    for (let index = 0; index < this.rhythmEngine.pattern.length; index++) {
      const note = this.rhythmEngine.pattern[index];
      const expectedTime = this.rhythmEngine.expectedTimes[index];
      const isRest = note && note.rest;
      
      console.log(`DEBUG: Beat ${index} (Musical Beat ${index + 1}): expectedTime=${expectedTime}, isRest=${isRest}, noteType=${note ? note.type : 'undefined'}`);
      
      // Only check rest notes
      if (!isRest) continue;
      
      const restDuration = this.rhythmEngine.getNoteDuration(note);
      
      // Calculate rest window end time, but don't let it overlap with next note
      let restWindowEnd = expectedTime + restDuration + toleranceWindow;
      
      // Check if there's a next note and limit rest window to avoid overlap
      if (index + 1 < this.rhythmEngine.expectedTimes.length) {
        const nextNoteTime = this.rhythmEngine.expectedTimes[index + 1];
        const nextNoteEarlyWindow = nextNoteTime - toleranceWindow;
        
        // Rest window should end before next note's early timing window
        restWindowEnd = Math.min(restWindowEnd, nextNoteEarlyWindow);
        
        console.log(`DEBUG: Rest ${index} - Limited by next note at ${nextNoteTime}ms, restWindowEnd capped at ${restWindowEnd}ms`);
      }
      
      const timeDiff = Math.abs(tapTime - expectedTime);
      
      console.log(`DEBUG: Rest ${index} - expectedTime=${expectedTime}, restDuration=${restDuration}, restWindowEnd=${restWindowEnd}, timeDiff=${timeDiff}, toleranceWindow=${toleranceWindow}`);
      
      // Check if tap is within this rest's timing window (with proper boundaries)
      if (tapTime >= expectedTime - toleranceWindow && 
          tapTime <= restWindowEnd) {
        console.log(`DEBUG: REST VIOLATION DETECTED at index ${index} (Musical Beat ${index + 1})`);
        return {
          restIndex: index,
          musicalBeat: index + 1, // Convert to musical beat number
          expectedTime: expectedTime,
          restDuration: restDuration,
          timing: tapTime - expectedTime
        };
      }
    }
    
    console.log(`DEBUG: No rest violation detected for tapTime=${tapTime}`);
    return null; // No rest violation
  }
  
  // Handle rest violation with educational feedback
  handleRestViolation(restInfo, player = 'player1') {
    const penalty = 15; // Small educational penalty
    
    console.log(`${player} tapped during rest ${restInfo.restIndex} (timing: ${Math.round(restInfo.timing)}ms off)`);
    
    if (this.isMultiplayer) {
      // Multiplayer rest violation
      this.scores[player] -= penalty;
      this.restViolationsMP[player]++;
      this.updateMultiplayerDisplays();
      console.log(`${player} rest violation! Score: ${this.scores[player]}`);
    } else {
      // Single player rest violation
      this.score -= penalty;
      this.restViolations++;
      this.scoreDisplay.textContent = this.score;
      
      console.log(`Single player rest violation! Score: ${this.score}`);
    }
    
    // Visual feedback: briefly flash rest area with warning color
    if (this.visualizer) {
      this.visualizer.flashRestWarning(restInfo.restIndex);
    }
  }
  
  showTapFeedback(tapTime, player = 'player1') {
    // First check if this tap is during a rest
    const restViolation = this.checkForRestViolation(tapTime);
    if (restViolation) {
      this.handleRestViolation(restViolation, player);
      return; // Don't process as normal hit/miss
    }
    
    // Find the closest expected note (only non-rest notes)
    let closestIndex = -1;
    let closestDiff = Infinity;
    
    this.rhythmEngine.expectedTimes.forEach((expectedTime, index) => {
      // Skip rest notes when finding closest note
      if (this.rhythmEngine.pattern[index] && this.rhythmEngine.pattern[index].rest) {
        return;
      }
      
      const diff = Math.abs(tapTime - expectedTime);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = index;
      }
    });
    
    console.log(`showTapFeedback: tapTime=${tapTime}, closestIndex=${closestIndex}, closestDiff=${closestDiff}`);
    
    if (closestIndex !== -1) {
      // Create unique identifier for this player-note combination
      const noteKey = `${player}-${closestIndex}`;
      
      // Check if this player has already scored this note
      if (this.scoredNotes.has(noteKey)) {
        console.log(`${player} already scored note ${closestIndex}, ignoring duplicate`);
        return;
      }
      
      // Mark this note as scored by this player
      this.scoredNotes.add(noteKey);
      console.log(`${player} scored note ${closestIndex} with key ${noteKey}`);
      
      // Score this tap - but don't let it affect the rhythm engine state for other players
      let result;
      if (this.isMultiplayer) {
        // In multiplayer, manually calculate timing without affecting rhythm engine
        const timing = tapTime - this.rhythmEngine.expectedTimes[closestIndex];
        const absTimingError = Math.abs(timing);
        
        if (absTimingError <= 70) {
          result = { result: 'perfect', timing: timing };
        } else if (absTimingError <= 170) {
          result = { result: 'good', timing: timing };
        } else {
          result = { result: 'miss', timing: timing };
        }
      } else {
        // Single player uses rhythm engine normally
        result = this.rhythmEngine.scoreNote(closestIndex, tapTime);
      }
      
      // Calculate score points
      let points = 0;
      switch(result.result) {
        case 'perfect':
          points = 100;
          break;
        case 'good':
          points = 50;
          break;
        case 'miss':
          points = 0;
          break;
      }
      
      // Update appropriate scoring system
      if (this.isMultiplayer) {
        // Update multiplayer scores
        this.scores[player] += points;
        this.hitCountsMP[player][result.result]++;
        this.updateMultiplayerDisplays();
        console.log(`${player}: ${result.result} (${Math.round(result.timing)}ms off) - Score: ${this.scores[player]}`);
      } else {
        // Update single player scores
        this.score += points;
        this.hitCounts[result.result]++;
        
        this.scoreDisplay.textContent = this.score;
        this.updateHitSummary();
        
        console.log(`Single player: ${result.result} (${Math.round(result.timing)}ms off) - Score: ${this.score}`);
      }
      
      // Show feedback on the pattern visualizer (same for both modes)
      if (this.visualizer) {
        this.visualizer.flashNoteFeedback(closestIndex, result.result);
      }
    }
  }
}

// Initialize the game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.gameController = new GameController();
});

