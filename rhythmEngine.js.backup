// rhythmEngine.js - Core timing and scoring logic with zero DOM dependencies

class RhythmEngine {
  constructor(bpm = 100) {
    this.bpm = bpm;
    this.beatInterval = 60000 / bpm; // milliseconds per beat
    this.pattern = [];
    this.expectedTimes = [];
    this.holdPeriods = [];
    this.startTime = 0;
    this.isPlaying = false;
    
    // Scoring windows (in milliseconds)
    this.scoringWindows = {
      perfect: 70,
      good: 170
    };
  }
  
  // Load a pattern and calculate expected hit times
  loadPattern(notes) {
    this.pattern = notes;
    this.expectedTimes = [];
    this.calculateExpectedTimes();
  }
  
  // Calculate when each note should be hit
  calculateExpectedTimes() {
    let currentTime = 0;
    
    this.pattern.forEach((note, index) => {
      // Store the expected time for this note
      this.expectedTimes[index] = currentTime;
      
      // Calculate duration and advance time
      const duration = this.getNoteDuration(note);
      currentTime += duration;
    });
  }
  
  // Get duration of a note in milliseconds
  getNoteDuration(note) {
    let duration;
    
    switch(note.type) {
      case 'whole':
        duration = this.beatInterval * 4;
        break;
      case 'half':
        duration = this.beatInterval * 2;
        break;
      case 'quarter':
        duration = this.beatInterval;
        break;
      case 'eighth':
        duration = this.beatInterval / 2;
        break;
      case 'sixteenth':
        duration = this.beatInterval / 4;
        break;
      default:
        duration = this.beatInterval;
    }
    
    // Apply dot modifier (adds 50% duration)
    if (note.dotted) {
      duration *= 1.5;
    }
    
    return duration;
  }
  
  // Start playback tracking
  start() {
    this.startTime = Date.now();
    this.isPlaying = true;
    this.holdPeriods = [];
  }
  
  // Stop playback
  stop() {
    this.isPlaying = false;
  }
  
  // Register a key/tap down event
  registerHoldStart() {
    if (!this.isPlaying) return;
    
    const now = Date.now() - this.startTime;
    this.holdPeriods.push({
      down: now,
      up: null
    });
  }
  
  // Register a key/tap release event
  registerHoldEnd() {
    if (!this.isPlaying) return;
    
    const now = Date.now() - this.startTime;
    const lastHold = this.holdPeriods[this.holdPeriods.length - 1];
    
    if (lastHold && lastHold.up === null) {
      lastHold.up = now;
    }
  }
  
  // Score a single note hit (with optional duration checking)
  scoreNote(noteIndex, hitTime, holdDuration = null) {
    const expectedTime = this.expectedTimes[noteIndex];
    const timingDiff = Math.abs(hitTime - expectedTime);
    
    // First check timing (existing logic)
    let timingResult;
    if (timingDiff <= this.scoringWindows.perfect) {
      timingResult = 'perfect';
    } else if (timingDiff <= this.scoringWindows.good) {
      timingResult = 'good';
    } else {
      timingResult = 'miss';
    }
    
    // If no hold duration provided (just a tap), return timing-based score
    if (holdDuration === null) {
      return { result: timingResult, timing: timingDiff, durationType: 'tap' };
    }
    
    // Duration-based scoring (PHASE 1 - OPTIONAL)
    const expectedDuration = this.getNoteDuration(this.pattern[noteIndex]);
    const durationRatio = holdDuration / expectedDuration;
    
    let durationResult;
    if (durationRatio >= 0.6 && durationRatio <= 1.4) {
      // Good duration - keep timing result or upgrade
      durationResult = timingResult;
      if (timingResult === 'good' && durationRatio >= 0.8 && durationRatio <= 1.2) {
        durationResult = 'perfect'; // Upgrade good timing + good duration to perfect
      }
    } else if (durationRatio >= 0.4 && durationRatio <= 1.6) {
      // OK duration - might downgrade perfect to good
      durationResult = timingResult === 'perfect' ? 'good' : timingResult;
    } else {
      // Bad duration - downgrade significantly
      durationResult = timingResult === 'miss' ? 'miss' : 'good';
    }
    
    return { 
      result: durationResult, 
      timing: timingDiff, 
      durationType: 'hold',
      durationRatio: durationRatio,
      expectedDuration: expectedDuration,
      actualDuration: holdDuration
    };
  }
  
  // Score all notes based on hold periods
  scorePattern() {
    const results = new Array(this.pattern.length).fill(null);
    
    // First, find groups of tied notes
    const holdGroups = this.getHoldGroups();
    
    // Score each hold group
    holdGroups.forEach(group => {
      const scored = this.scoreHoldGroup(group);
      
      // Apply scores to all notes in the group
      for (let i = group.start; i <= group.end; i++) {
        results[i] = scored;
      }
    });
    
    // Score individual notes that aren't in hold groups
    this.pattern.forEach((note, index) => {
      if (results[index] === null && !note.rest) {
        // Find best matching tap/hold for this note
        const noteTime = this.expectedTimes[index];
        let bestScore = { result: 'miss', timing: Infinity };
        
        this.holdPeriods.forEach(hold => {
          let score;
          if (hold.up !== null) {
            // Complete hold - use duration scoring
            const holdDuration = hold.up - hold.down;
            score = this.scoreNote(index, hold.down, holdDuration);
          } else {
            // Just a tap (no release) - use tap scoring
            score = this.scoreNote(index, hold.down, null);
          }
          
          if (score.timing < bestScore.timing) {
            bestScore = score;
          }
        });
        
        results[index] = bestScore;
      } else if (note.rest) {
        results[index] = { result: 'rest', timing: 0 };
      }
    });
    
    return results;
  }
  
  // Get groups of notes that should be held together
  getHoldGroups() {
    const groups = [];
    let i = 0;
    
    while (i < this.pattern.length) {
      const note = this.pattern[i];
      
      if (note.rest) {
        i++;
        continue;
      }
      
      let start = i;
      
      // Find consecutive tied notes
      while (i < this.pattern.length && this.pattern[i].tieToNext && !this.pattern[i].rest) {
        i++;
      }
      
      let end = i;
      groups.push({ start, end });
      i++;
    }
    
    return groups;
  }
  
  // Score a group of tied notes (with duration checking)
  scoreHoldGroup(group) {
    const startTime = this.expectedTimes[group.start];
    const endNote = this.pattern[group.end];
    const endDuration = this.getNoteDuration(endNote);
    const endTime = this.expectedTimes[group.end] + endDuration;
    const expectedGroupDuration = endTime - startTime;
    
    // Find a hold period that covers this group
    for (const hold of this.holdPeriods) {
      const holdEnd = hold.up === null ? Date.now() - this.startTime : hold.up;
      
      // Check if hold covers the full group (with tolerance)
      if (hold.down <= startTime + this.scoringWindows.good &&
          holdEnd >= endTime - this.scoringWindows.good) {
        
        // Score based on start accuracy (timing)
        const startDiff = Math.abs(hold.down - startTime);
        let timingResult;
        
        if (startDiff <= this.scoringWindows.perfect) {
          timingResult = 'perfect';
        } else if (startDiff <= this.scoringWindows.good) {
          timingResult = 'good';
        } else {
          timingResult = 'miss';
        }
        
        // Duration scoring for the hold group
        if (hold.up !== null) {
          const actualDuration = hold.up - hold.down;
          const durationRatio = actualDuration / expectedGroupDuration;
          
          let finalResult;
          if (durationRatio >= 0.6 && durationRatio <= 1.4) {
            // Good duration - keep timing result or upgrade
            finalResult = timingResult;
            if (timingResult === 'good' && durationRatio >= 0.8 && durationRatio <= 1.2) {
              finalResult = 'perfect';
            }
          } else if (durationRatio >= 0.4 && durationRatio <= 1.6) {
            // OK duration - might downgrade
            finalResult = timingResult === 'perfect' ? 'good' : timingResult;
          } else {
            // Bad duration - downgrade
            finalResult = timingResult === 'miss' ? 'miss' : 'good';
          }
          
          return { 
            result: finalResult, 
            timing: startDiff, 
            durationType: 'holdGroup',
            durationRatio: durationRatio,
            expectedDuration: expectedGroupDuration,
            actualDuration: actualDuration
          };
        } else {
          // No release detected - just timing based
          return { 
            result: timingResult, 
            timing: startDiff, 
            durationType: 'tap'
          };
        }
      }
    }
    
    return { result: 'miss', timing: Infinity, durationType: 'missed' };
  }
  
  // Calculate statistics from results
  getStats(results) {
    const stats = {
      perfect: 0,
      good: 0,
      miss: 0,
      rest: 0,
      total: 0,
      accuracy: 0,
      score: 0
    };
    
    results.forEach(result => {
      if (result.result === 'rest') {
        stats.rest++;
      } else {
        stats.total++;
        stats[result.result]++;
        
        if (result.result === 'perfect') {
          stats.score += 10;
        } else if (result.result === 'good') {
          stats.score += 5;
        }
      }
    });
    
    if (stats.total > 0) {
      stats.accuracy = Math.round(100 * (stats.perfect + stats.good) / stats.total);
    }
    
    return stats;
  }
  
  // Get current beat number (for metronome display)
  getCurrentBeat() {
    if (!this.isPlaying) return -1;
    
    const elapsed = Date.now() - this.startTime;
    const beat = Math.floor(elapsed / this.beatInterval) % 4;
    return beat;
  }
  
  // Check if we're within the timing window for a note
  isInTimingWindow(noteIndex) {
    if (!this.isPlaying || noteIndex >= this.expectedTimes.length) return false;
    
    const now = Date.now() - this.startTime;
    const expected = this.expectedTimes[noteIndex];
    const diff = Math.abs(now - expected);
    
    return diff <= this.scoringWindows.good;
  }
}

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RhythmEngine;
}