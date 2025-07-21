// gameController.js - Centralized game logic controller
// Extracted from the original HTML file to organize code better

// Configuration Constants
const TIMING_CONSTANTS = {
  DEBOUNCE_TIME: 50,           // Minimum time between inputs (ms)
  MISS_CHECK_INTERVAL: 50,     // How often to check for missed notes (ms)
  REACTION_TIME_BUFFER: 300,   // Buffer for first beat reaction time (ms)
  COMPLETION_CHECK_INTERVAL: 50 // How often to check game completion (ms)
};

const PLAYERS = {
  ONE: 'player1',
  TWO: 'player2'
};

const ANIMATION_CONSTANTS = {
  BONUS_DURATION: 2000,        // How long bonus points float (ms)
  BONUS_FONT_SIZE: 20,         // Font size for bonus points (px)
  FEEDBACK_DELAY: 100          // Delay for visual feedback (ms)
};

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
    
    // Page visibility handling for timing accuracy
    this.wasHidden = false;
    this.pausedTime = 0;
    this.totalPausedDuration = 0;
    
    // Per-player duplicate prevention tracking
    this.lastTapTimeByPlayer = {};
    
    // Phase 3.1: Duration tracking for hold detection
    this.holdStartTimes = {}; // Track when each player started holding
    this.holdDurations = {};  // Track calculated hold durations
    
    // Debug configuration
    this.debugMode = false; // Set to true to see detailed console logs
    
    // Phase 3.4: Duration scoring configuration
    this.DURATION_CONFIG = {
      // Which notes count for duration
      durationNotes: ['quarter', 'half'],  // Maybe add 'whole' later
      
      // How forgiving is "good" duration
      goodWindow: { min: 0.5, max: 2.0 },  // 50% to 200% of ideal
      
      // How tight is "perfect" duration  
      perfectWindow: { min: 0.7, max: 1.3 },  // 70% to 130% of ideal
      
      // Bonus points
      goodBonus: { perfect: 5, good: 3 },
      perfectBonus: { perfect: 10, good: 5 },
      
      // Visual feedback
      showBonusText: true,
      showHoldIndicator: true,
      
    // Easy on/off switch
    isEnabled: true
  };

  // Ensure pattern compatibility across all existing patterns
  this.ensurePatternCompatibility();

  // Initialize audio system
  this.audio = new SimpleAudio();    // Initialize after DOM is ready
    this.initializeElements();
    this.bindEvents();
  }

  // Ensures all patterns have required properties with sensible defaults
  ensurePatternCompatibility() {
    let patternsProcessed = 0;
    
    // Iterate through all difficulty levels
    for (const difficulty in PATTERNS) {
      const patterns = PATTERNS[difficulty];
      patterns.forEach(pattern => {
        // Add bars property (default to 1 for single-bar patterns)
        if (!pattern.bars) {
          pattern.bars = 1;
        }
        
        // Ensure difficulty is set (should match the category, but just in case)
        if (!pattern.difficulty) {
          pattern.difficulty = difficulty;
        }
        
        // Add timeSignature property (default to 4/4)
        if (!pattern.timeSignature) {
          pattern.timeSignature = { numerator: 4, denominator: 4 };
        }
        
        // Add tags array for filtering (default to empty)
        if (!pattern.tags) {
          pattern.tags = [];
        }
        
        // Add creator property for attribution (default to 'system')
        if (!pattern.creator) {
          pattern.creator = 'system';
        }
        
        patternsProcessed++;
      });
    }
    
    console.log(`Pattern compatibility layer: processed ${patternsProcessed} patterns`);
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
    this.patternInfo.textContent = this.getPatternDisplayText(this.selectedPattern);
    
    // Initialize VexFlow display BEFORE loading pattern preview
    this.vexDisplay = new VexFlowDisplay(document.getElementById('notation-container'));
    
    // Balance testing elements
    this.balancePanel = document.getElementById('balance-testing');
    this.toggleBalanceBtn = document.getElementById('toggle-balance-panel');
    this.durationEnabledCheck = document.getElementById('duration-enabled');
    this.bonusTextCheck = document.getElementById('bonus-text');
    this.holdIndicatorCheck = document.getElementById('hold-indicator');
    this.goodMinSlider = document.getElementById('good-min');
    this.goodMaxSlider = document.getElementById('good-max');
    this.perfectMinSlider = document.getElementById('perfect-min');
    this.perfectMaxSlider = document.getElementById('perfect-max');
    this.goodBonusInput = document.getElementById('good-bonus');
    this.perfectBonusInput = document.getElementById('perfect-bonus');
    this.applyConfigBtn = document.getElementById('apply-config');
    this.resetConfigBtn = document.getElementById('reset-config');
    this.testScenarioBtn = document.getElementById('test-scenario');
    
    // Initialize balance testing controls
    this.initializeBalanceTestingControls();
    
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
      this.patternInfo.textContent = this.getPatternDisplayText(this.selectedPattern);
      
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
          this.handleInput(PLAYERS.ONE);
        }
        // Multiplayer mode - 'A' and 'K' keys
        else if (this.isMultiplayer && e.code === 'KeyA') {
          e.preventDefault();
          this.handleInput(PLAYERS.ONE);
        }
        else if (this.isMultiplayer && e.code === 'KeyK') {
          e.preventDefault();
          this.handleInput(PLAYERS.TWO);
        }
      }
    });
    
    // Phase 3.1: Add keyup handler for hold duration detection
    document.addEventListener('keyup', (e) => {
      if (this.isPlaying && !this.isCountingIn) {
        let player = null;
        
        // Determine which player released their key
        if (!this.isMultiplayer && e.code === 'KeyT') {
          player = PLAYERS.ONE;
        } else if (this.isMultiplayer && e.code === 'KeyA') {
          player = PLAYERS.ONE;
        } else if (this.isMultiplayer && e.code === 'KeyK') {
          player = PLAYERS.TWO;
        }
        
        if (player) {
          this.handleRelease(player);
        }
      }
    });
    
    // Page visibility handling to prevent timing drift
    document.addEventListener('visibilitychange', () => {
      this.handleVisibilityChange();
    });
    
    // Balance testing event handlers
    this.bindBalanceTestingEvents();
  }
  
  // Phase 3.4: Initialize balance testing controls
  initializeBalanceTestingControls() {
    // Set initial values from config
    this.durationEnabledCheck.checked = this.DURATION_CONFIG.isEnabled;
    this.bonusTextCheck.checked = this.DURATION_CONFIG.showBonusText;
    this.holdIndicatorCheck.checked = this.DURATION_CONFIG.showHoldIndicator;
    
    this.goodMinSlider.value = this.DURATION_CONFIG.goodWindow.min;
    this.goodMaxSlider.value = this.DURATION_CONFIG.goodWindow.max;
    this.perfectMinSlider.value = this.DURATION_CONFIG.perfectWindow.min;
    this.perfectMaxSlider.value = this.DURATION_CONFIG.perfectWindow.max;
    
    this.goodBonusInput.value = this.DURATION_CONFIG.goodBonus.perfect;
    this.perfectBonusInput.value = this.DURATION_CONFIG.perfectBonus.perfect;
    
    // Update display values
    this.updateBalanceDisplayValues();
  }
  
  // Phase 3.4: Bind balance testing event handlers
  bindBalanceTestingEvents() {
    // Toggle panel visibility
    this.toggleBalanceBtn.addEventListener('click', () => {
      const isVisible = this.balancePanel.style.display !== 'none';
      this.balancePanel.style.display = isVisible ? 'none' : 'block';
      this.toggleBalanceBtn.textContent = isVisible ? 'Show' : 'Hide';
    });
    
    // Real-time slider updates
    this.goodMinSlider.addEventListener('input', () => this.updateBalanceDisplayValues());
    this.goodMaxSlider.addEventListener('input', () => this.updateBalanceDisplayValues());
    this.perfectMinSlider.addEventListener('input', () => this.updateBalanceDisplayValues());
    this.perfectMaxSlider.addEventListener('input', () => this.updateBalanceDisplayValues());
    
    // Apply configuration changes
    this.applyConfigBtn.addEventListener('click', () => this.applyBalanceConfig());
    
    // Reset to defaults
    this.resetConfigBtn.addEventListener('click', () => this.resetBalanceConfig());
    
    // Quick test scenario
    this.testScenarioBtn.addEventListener('click', () => this.runQuickTest());
  }
  
  // Phase 3.4: Update display values for sliders
  updateBalanceDisplayValues() {
    document.getElementById('good-min-value').textContent = this.goodMinSlider.value;
    document.getElementById('good-max-value').textContent = this.goodMaxSlider.value;
    document.getElementById('perfect-min-value').textContent = this.perfectMinSlider.value;
    document.getElementById('perfect-max-value').textContent = this.perfectMaxSlider.value;
  }
  
  // Phase 3.4: Apply balance configuration
  applyBalanceConfig() {
    this.DURATION_CONFIG.isEnabled = this.durationEnabledCheck.checked;
    this.DURATION_CONFIG.showBonusText = this.bonusTextCheck.checked;
    this.DURATION_CONFIG.showHoldIndicator = this.holdIndicatorCheck.checked;
    
    this.DURATION_CONFIG.goodWindow.min = parseFloat(this.goodMinSlider.value);
    this.DURATION_CONFIG.goodWindow.max = parseFloat(this.goodMaxSlider.value);
    this.DURATION_CONFIG.perfectWindow.min = parseFloat(this.perfectMinSlider.value);
    this.DURATION_CONFIG.perfectWindow.max = parseFloat(this.perfectMaxSlider.value);
    
    this.DURATION_CONFIG.goodBonus.perfect = parseInt(this.goodBonusInput.value);
    this.DURATION_CONFIG.perfectBonus.perfect = parseInt(this.perfectBonusInput.value);
    
    console.log('🔧 Duration scoring config updated:', this.DURATION_CONFIG);
    alert('Configuration applied! New settings will take effect for the next notes.');
  }
  
  // Phase 3.4: Reset to default configuration
  resetBalanceConfig() {
    // Reset to original defaults
    this.DURATION_CONFIG = {
      isEnabled: true,
      showBonusText: true,
      showHoldIndicator: true,
      defaultDuration: 400,
      goodWindow: { min: 0.5, max: 2.0 },
      perfectWindow: { min: 0.7, max: 1.3 },
      goodBonus: { perfect: 5 },
      perfectBonus: { perfect: 10 }
    };
    
    // Update UI controls
    this.initializeBalanceTestingControls();
    
    console.log('🔧 Duration scoring config reset to defaults');
    alert('Configuration reset to defaults!');
  }
  
  // Phase 3.4: Run a quick test scenario
  runQuickTest() {
    if (this.isPlaying) {
      alert('Stop the current game first!');
      return;
    }
    
    // Set a simple test pattern and medium tempo
    this.patternSelect.value = 'basic-1';
    this.tempoSlider.value = '100';
    this.currentTempo = 100;
    this.tempoValue.textContent = '100';
    
    // Start the game
    this.startGame();
    
    console.log('🧪 Quick test started! Try holding notes for different durations to test the scoring.');
    alert('Quick test started! Try holding notes (T key) for different durations to see how the duration bonuses work.');
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
  
  // Get detailed pattern display text for UI
  getPatternDisplayText(patternId) {
    const pattern = getPatternById(patternId);
    if (!pattern) return 'Unknown Pattern';
    
    const info = this.getPatternInfo(pattern);
    let displayText = pattern.name;
    
    // Add multi-bar indicator
    if (info.isMultiBar) {
      displayText += ` (${info.bars} bars)`;
    }
    
    // Add time signature if not 4/4
    if (info.timeSignature !== '4/4') {
      displayText += ` [${info.timeSignature}]`;
    }
    
    // Add difficulty badge
    displayText += ` - ${pattern.difficulty}`;
    
    return displayText;
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
    
    // Reset per-player tap times for debounce
    this.lastTapTimeByPlayer = {};
    
    // Phase 3.1: Reset hold tracking
    this.holdStartTimes = {};
    this.holdDurations = {};
    
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
  checkForMisses() {
    if (!this.rhythmEngine || !this.rhythmEngine.isPlaying) return;
    
    const currentTime = performance.now() - this.rhythmEngine.startTime;
    // console.log(`DEBUG: Miss check at time ${currentTime}ms, lastCheckedNoteIndex=${this.lastCheckedNoteIndex}`);
    
    for (let index = this.lastCheckedNoteIndex + 1; index < this.rhythmEngine.pattern.length; index++) {
      const expectedTime = this.rhythmEngine.expectedTimes[index];
      const note = this.rhythmEngine.pattern[index];
      
      if (note && note.rest) {
        // console.log(`DEBUG: Skipping rest note ${index} at ${expectedTime}ms`);
        continue;
      }
      
      // console.log(`DEBUG: Checking note ${index}: expectedTime=${expectedTime}ms, currentTime=${currentTime}ms, missWindow=${missWindow}ms`);
      
      const missWindow = this.rhythmEngine.missWindow;
      
      if (currentTime > expectedTime + missWindow) {
        // Note timing window has expired
        if (this.debugMode) {
          console.log(`DEBUG: Note ${index} timing window expired (${currentTime}ms > ${expectedTime + missWindow}ms)`);
        }
        
        // Check if note was scored
        if (this.isMultiplayer) {
          // In multiplayer, check both players
          const player1Key = `player1-${index}`;
          const player2Key = `player2-${index}`;
          const player1Scored = this.scoredNotes.has(player1Key);
          const player2Scored = this.scoredNotes.has(player2Key);
          
          if (!player1Scored) {
            this.hitCountsMP.player1.miss++;
            setTimeout(() => {
              if (this.visualizer) {
                this.visualizer.flashNoteFeedback(index, 'miss');
              }
            }, 50);
          }
          
          if (!player2Scored) {
            this.hitCountsMP.player2.miss++;
          }
        } else {
          // Single player check
          const playerKey = `player1-${index}`;
          if (this.debugMode) {
            console.log(`DEBUG: Single player check - note ${index}, playerKey=${playerKey}, scored=${this.scoredNotes.has(playerKey)}`);
          }
          
          if (!this.scoredNotes.has(playerKey)) {
            this.hitCounts.miss++;
            this.updateHitSummary();
            
            if (this.debugMode) {
              console.log(`DEBUG: Scheduling visual feedback for missed note ${index}`);
            }
            setTimeout(() => {
              if (this.debugMode) {
                console.log(`DEBUG: Executing visual feedback for missed note ${index}`);
              }
              if (this.visualizer) {
                this.visualizer.flashNoteFeedback(index, 'miss');
              }
            }, 50);
          } else {
            if (this.debugMode) {
              console.log(`DEBUG: Note ${index} already scored, skipping miss detection`);
            }
          }
        }
        
        this.lastCheckedNoteIndex = index;
      } else {
        // Haven't reached this note's miss window yet, stop checking
        break;
      }
    }
  }
  
  // Start miss detection timer for all game modes
  startMissDetection() {
    if (this.missCheckTimer) {
      clearInterval(this.missCheckTimer);
    }
    
    this.lastCheckedNoteIndex = -1;
    this.missCheckTimer = setInterval(() => {
      this.checkForMisses();
    }, TIMING_CONSTANTS.MISS_CHECK_INTERVAL);
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
    // Add reaction time buffer to first beat (300ms seems reasonable)
    let currentTime = TIMING_CONSTANTS.REACTION_TIME_BUFFER; // Start first beat at 300ms instead of 0ms
    
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
  
  // Calculate total duration of a pattern (supports multi-bar patterns)
  getTotalPatternDuration(patternData, beatInterval) {
    const bars = patternData.bars || 1;
    const timeSignature = patternData.timeSignature || { numerator: 4, denominator: 4 };
    
    // Calculate beats per bar based on time signature
    const beatsPerBar = timeSignature.numerator;
    const totalBeats = bars * beatsPerBar;
    
    // Total duration in milliseconds
    return totalBeats * beatInterval;
  }
  
  // Get information about pattern structure for display
  getPatternInfo(patternData) {
    const bars = patternData.bars || 1;
    const timeSignature = patternData.timeSignature || { numerator: 4, denominator: 4 };
    const tags = patternData.tags || [];
    const creator = patternData.creator || 'system';
    
    return {
      bars,
      timeSignature: `${timeSignature.numerator}/${timeSignature.denominator}`,
      tags,
      creator,
      isMultiBar: bars > 1,
      patternLength: patternData.pattern.length
    };
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
    
    // Reset page visibility tracking for new game
    this.wasHidden = false;
    this.pausedTime = 0;
    this.totalPausedDuration = 0;
    
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
    }, TIMING_CONSTANTS.COMPLETION_CHECK_INTERVAL);
    
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
    
    // Phase 3 Enhancement: Apply final beat bonus before stopping
    if (this.DURATION_CONFIG.isEnabled) {
      // Apply any pending hold bonuses for both players
      if (!this.isMultiplayer) {
        if (this.holdDurations[PLAYERS.ONE]) {
          this.applyPreviousHoldBonus(PLAYERS.ONE);
          console.log('🏁 Applied final beat bonus for single player');
        }
      } else {
        if (this.holdDurations[PLAYERS.ONE]) {
          this.applyPreviousHoldBonus(PLAYERS.ONE);
          console.log('🏁 Applied final beat bonus for player 1');
        }
        if (this.holdDurations[PLAYERS.TWO]) {
          this.applyPreviousHoldBonus(PLAYERS.TWO);
          console.log('🏁 Applied final beat bonus for player 2');
        }
      }
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
    
    // Prevent duplicate processing with per-player debounce
    const currentTime = performance.now() - this.rhythmEngine.startTime;
    const lastTapTimeForPlayer = this.lastTapTimeByPlayer[player] || 0;
    if (lastTapTimeForPlayer && Math.abs(currentTime - lastTapTimeForPlayer) < TIMING_CONSTANTS.DEBOUNCE_TIME) {
      if (this.debugMode) {
        console.log("DEBUG: Ignoring duplicate tap from", player, "(too close to previous)");
      }
      return;
    }
    this.lastTapTimeByPlayer[player] = currentTime;
    
    // Phase 3.1: Track hold start time for duration calculation
    this.holdStartTimes[player] = currentTime;
    
    // Phase 3.4: Apply duration bonus to previous note if available
    this.applyPreviousHoldBonus(player);
    
    // Register the tap with the rhythm engine
    this.rhythmEngine.registerHoldStart();
    
    // Provide immediate visual feedback
    this.showTapFeedback(currentTime, player);
  }
  
  // Phase 3.1: Handle key release for duration detection
  handleRelease(player) {
    if (!this.isPlaying || !this.holdStartTimes[player]) return;
    
    const releaseTime = performance.now() - this.rhythmEngine.startTime;
    const holdDuration = releaseTime - this.holdStartTimes[player];
    
    // Store the calculated duration
    this.holdDurations[player] = holdDuration;
    
    // Clear the hold start time
    this.holdStartTimes[player] = null;
  }
  
  // Phase 3.2.1: Duration bonus helper functions
  isDurationNote(note) {
    // Only quarter notes and half notes count for duration
    return note && this.DURATION_CONFIG.durationNotes.includes(note.type);
  }
  
  getIdealDuration(note) {
    if (!note || !this.rhythmEngine) return this.DURATION_CONFIG.defaultDuration;
    
    if (note.type === 'quarter') return this.rhythmEngine.beatInterval;
    if (note.type === 'half') return this.rhythmEngine.beatInterval * 2;
    return this.DURATION_CONFIG.defaultDuration;
  }
  
  // Phase 3.4: Apply duration bonus to the previous note when new note is pressed
  applyPreviousHoldBonus(player) {
    if (!this.DURATION_CONFIG.isEnabled || !this.holdDurations[player]) return;
    
    // Find the most recent note this player scored
    let lastScoredNoteIndex = -1;
    for (let i = this.rhythmEngine.pattern.length - 1; i >= 0; i--) {
      const playerKey = `${player}-${i}`;
      if (this.scoredNotes.has(playerKey)) {
        lastScoredNoteIndex = i;
        break;
      }
    }
    
    if (lastScoredNoteIndex === -1) return;
    
    const previousNote = this.rhythmEngine.pattern[lastScoredNoteIndex];
    if (!this.isDurationNote(previousNote)) return;
    
    const idealDuration = this.getIdealDuration(previousNote);
    const holdDuration = this.holdDurations[player];
    const durationRatio = holdDuration / idealDuration;
    
    if (this.debugMode) {
      console.log(`🔄 Retroactive bonus check for beat ${lastScoredNoteIndex + 1}: held ${holdDuration.toFixed(0)}ms (ideal ${idealDuration.toFixed(0)}ms)`);
    }
    
    let extraPoints = 0;
    const config = this.DURATION_CONFIG;
    
    if (durationRatio >= config.goodWindow.min && durationRatio <= config.goodWindow.max) {
      extraPoints = config.goodBonus.perfect; // Basic bonus for decent hold
      
      if (durationRatio >= config.perfectWindow.min && durationRatio <= config.perfectWindow.max) {
        extraPoints = config.perfectBonus.perfect; // Excellent bonus
        
        if (config.showBonusText) {
          console.log(`🌟 Excellent hold! Beat ${lastScoredNoteIndex + 1} +${extraPoints} bonus`);
        }
        
        // Update visual feedback for the previous note with a small delay
        if (config.showHoldIndicator) {
          setTimeout(() => {
            if (this.visualizer) {
              this.visualizer.flashNoteFeedback(lastScoredNoteIndex, 'perfect-hold');
            }
          }, ANIMATION_CONSTANTS.FEEDBACK_DELAY);
        }
      } else {
        if (config.showBonusText) {
          console.log(`✨ Good hold! Beat ${lastScoredNoteIndex + 1} +${extraPoints} bonus`);
        }
      }
      
      // Add points to score
      if (this.isMultiplayer) {
        this.scores[player] += extraPoints;
        this.updateMultiplayerDisplays();
      } else {
        this.score += extraPoints;
        this.scoreDisplay.textContent = this.score;
      }
      
      // Show floating bonus points
      if (config.showBonusText) {
        this.showBonusPoints(player, extraPoints);
      }
    }
    
    // Clear the hold duration after using it
    this.holdDurations[player] = null;
  }
  
  // Phase 3.3.1: Show bonus points floating animation - Enhanced visibility
  showBonusPoints(player, extraPoints) {
    // Create floating bonus text element
    const bonusElement = document.createElement('div');
    bonusElement.className = 'bonus-points';
    bonusElement.textContent = `+${extraPoints}`;
    bonusElement.style.cssText = `
      position: absolute;
      color: gold;
      font-weight: bold;
      font-size: ${ANIMATION_CONSTANTS.BONUS_FONT_SIZE}px;
      pointer-events: none;
      z-index: 1000;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
      animation: float-up ${ANIMATION_CONSTANTS.BONUS_DURATION}ms ease-out forwards;
    `;
    
    // Position near the appropriate player's score display
    let targetElement;
    if (this.isMultiplayer) {
      targetElement = player === PLAYERS.ONE ? 
        document.getElementById('score-p1') : 
        document.getElementById('score-p2');
    } else {
      targetElement = document.getElementById('scoreDisplay');
    }
    
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      bonusElement.style.left = (rect.left + rect.width / 2) + 'px';
      bonusElement.style.top = (rect.top - 10) + 'px';
      
      document.body.appendChild(bonusElement);
      
      // Remove element after animation
      setTimeout(() => {
        if (bonusElement.parentNode) {
          bonusElement.parentNode.removeChild(bonusElement);
        }
      }, 1500);
    }
  }
  
  // Check if a tap occurs during a rest timing window
  checkForRestViolation(tapTime) {
    if (!this.rhythmEngine || !this.rhythmEngine.isPlaying) return null;
    
    if (this.debugMode) {
      console.log(`DEBUG: checkForRestViolation tapTime=${tapTime}`);
      console.log(`DEBUG: pattern length=${this.rhythmEngine.pattern.length}`);
      console.log(`DEBUG: expectedTimes=`, this.rhythmEngine.expectedTimes);
    }
    
    const toleranceWindow = 85; // Same as note detection tolerance
    
    // Check each rest in the pattern
    for (let index = 0; index < this.rhythmEngine.pattern.length; index++) {
      const note = this.rhythmEngine.pattern[index];
      const expectedTime = this.rhythmEngine.expectedTimes[index];
      const isRest = note && note.rest;
      
      if (this.debugMode) {
        console.log(`DEBUG: Beat ${index} (Musical Beat ${index + 1}): expectedTime=${expectedTime}, isRest=${isRest}, noteType=${note ? note.type : 'undefined'}`);
      }
      
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
        
        if (this.debugMode) {
          console.log(`DEBUG: Rest ${index} - Limited by next note at ${nextNoteTime}ms, restWindowEnd capped at ${restWindowEnd}ms`);
        }
      }
      
      const timeDiff = Math.abs(tapTime - expectedTime);
      
      if (this.debugMode) {
        console.log(`DEBUG: Rest ${index} - expectedTime=${expectedTime}, restDuration=${restDuration}, restWindowEnd=${restWindowEnd}, timeDiff=${timeDiff}, toleranceWindow=${toleranceWindow}`);
      }
      
      // Check if tap is within this rest's timing window (with proper boundaries)
      if (tapTime >= expectedTime - toleranceWindow && 
          tapTime <= restWindowEnd) {
        if (this.debugMode) {
          console.log(`DEBUG: REST VIOLATION DETECTED at index ${index} (Musical Beat ${index + 1})`);
        }
        return {
          restIndex: index,
          musicalBeat: index + 1, // Convert to musical beat number
          expectedTime: expectedTime,
          restDuration: restDuration,
          timing: tapTime - expectedTime
        };
      }
    }
    
    if (this.debugMode) {
      console.log(`DEBUG: No rest violation detected for tapTime=${tapTime}`);
    }
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
      
      // Add bonus to total points (duration bonuses are now handled retroactively)
      // No extra points added here anymore
      
      // Phase 3.3: Visual result is just the normal result now
      let visualResult = result.result;
      
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
        this.visualizer.flashNoteFeedback(closestIndex, visualResult);
      }
    }
  }

  // Handle page visibility changes to prevent timing drift
  handleVisibilityChange() {
    if (document.hidden) {
      // Page became hidden - pause if playing
      if (this.isPlaying && !this.wasHidden) {
        console.log('Page hidden - pausing game to prevent timing drift');
        this.pauseForVisibility();
      }
    } else {
      // Page became visible - resume if was paused
      if (this.isPlaying && this.wasHidden) {
        console.log('Page visible - resuming game');
        this.resumeFromVisibility();
      }
    }
  }
  
  // Pause game components when page becomes hidden
  pauseForVisibility() {
    this.wasHidden = true;
    this.pausedTime = performance.now();
    
    // Pause all timing-dependent components
    if (this.rhythmEngine && this.rhythmEngine.isPlaying) {
      // Don't stop the engine, just mark the pause time
      console.log('Recording pause time for timing adjustment');
    }
    
    // Pause visual components
    if (this.visualizer) {
      this.visualizer.pause();
    }
    
    if (this.metronome) {
      this.metronome.pause();
    }
    
    // Update UI to show paused state
    if (this.gameStatus && this.isPlaying) {
      this.gameStatus.textContent = "Game paused (tab hidden)";
    }
  }
  
  // Resume game components when page becomes visible
  resumeFromVisibility() {
    if (!this.wasHidden) return;
    
    const now = performance.now();
    const pauseDuration = now - this.pausedTime;
    this.totalPausedDuration += pauseDuration;
    
    console.log(`Resuming after ${Math.round(pauseDuration)}ms pause (total paused: ${Math.round(this.totalPausedDuration)}ms)`);
    
    // Adjust timing in all components to account for pause
    if (this.rhythmEngine && this.rhythmEngine.isPlaying) {
      // Adjust the rhythm engine's start time to account for pause
      this.rhythmEngine.startTime += pauseDuration;
      console.log('Adjusted rhythm engine start time by', Math.round(pauseDuration), 'ms');
    }
    
    // Adjust pattern end time
    if (this.patternEndTime) {
      this.patternEndTime += pauseDuration;
      console.log('Adjusted pattern end time by', Math.round(pauseDuration), 'ms');
    }
    
    // Resume visual components with adjusted timing
    if (this.visualizer) {
      this.visualizer.resume(pauseDuration);
    }
    
    if (this.metronome) {
      this.metronome.resume(pauseDuration);
    }
    
    // Update UI
    if (this.gameStatus && this.isPlaying) {
      this.gameStatus.textContent = "Playing...";
    }
    
    this.wasHidden = false;
  }
}

// Initialize the game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.gameController = new GameController();
});

