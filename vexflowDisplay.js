// vexflowDisplay.js - Static music notation display for patterns

class VexFlowDisplay {
  constructor(container) {
    this.container = container;
    this.renderer = null;
    this.context = null;
    this.stave = null;
    
    this.initializeVexFlow();
  }
  
  initializeVexFlow() {
    // Clear container
    this.container.innerHTML = '';
    
    // Create VexFlow renderer
    this.renderer = new Vex.Flow.Renderer(
      this.container,
      Vex.Flow.Renderer.Backends.SVG
    );
    
    // Size based on container
    const width = 600;
    const height = 150;
    this.renderer.resize(width, height);
    
    this.context = this.renderer.getContext();
  }
  
  // Display a pattern as sheet music
  displayPattern(pattern) {
    // Clear previous notation
    this.context.clear();
    
    // Create a stave (staff)
    this.stave = new Vex.Flow.Stave(10, 40, 500);
    this.stave.addClef('treble');
    this.stave.addTimeSignature('4/4');
    this.stave.setContext(this.context).draw();
    
    // Pad pattern to complete measure if needed
    const paddedPattern = this.padPatternToMeasure(pattern);
    
    // Convert pattern to VexFlow notes
    const notes = this.patternToVexNotes(paddedPattern);
    
    // Calculate total duration to determine time signature
    const totalDuration = this.calculateTotalDuration(paddedPattern);
    
    // Create voice with appropriate duration
    const voice = new Vex.Flow.Voice({
      num_beats: totalDuration,
      beat_value: 4
    });
    
    // Add notes to voice
    try {
      voice.addTickables(notes);
      
      // Generate beams before formatting
      const beams = Vex.Flow.Beam.generateBeams(notes);
      
      // Format and draw
      const formatter = new Vex.Flow.Formatter();
      formatter.joinVoices([voice]).format([voice], 450);
      
      // Draw voice
      voice.draw(this.context, this.stave);
      
      // Draw beams (they should override the individual stems)
      beams.forEach(beam => beam.setContext(this.context).draw());
      
    } catch (error) {
      console.error('VexFlow error:', error);
      console.log('Pattern causing error:', paddedPattern);
      console.log('Notes generated:', notes);
      
      // Draw a simple error message
      this.context.fillText(`Pattern error: ${error.message}`, 50, 100);
    }
  }
  
  // Convert our pattern format to VexFlow notes
  patternToVexNotes(pattern) {
    const notes = [];
    
    pattern.forEach((note, index) => {
      let vexNote;
      
      if (note.rest) {
        // Create rest
        vexNote = new Vex.Flow.StaveNote({
          clef: 'treble',
          keys: ['b/4'],  // Position doesn't matter for rests
          duration: this.getDuration(note.type) + 'r'  // 'r' for rest
        });
      } else {
        // Create note (using C5 for all notes for now)
        vexNote = new Vex.Flow.StaveNote({
          clef: 'treble',
          keys: ['c/5'],
          duration: this.getDuration(note.type)
        });
      }
      
      // Add dot if needed
      if (note.dotted) {
        vexNote.addDot(0);
      }
      
      notes.push(vexNote);
    });
    
    return notes;
  }
  
  // Calculate total duration of pattern in beats
  calculateTotalDuration(pattern) {
    let total = 0;
    pattern.forEach(note => {
      switch(note.type) {
        case 'whole': total += 4; break;
        case 'half': total += 2; break;
        case 'quarter': total += 1; break;
        case 'eighth': total += 0.5; break;
        case 'sixteenth': total += 0.25; break;
        default: total += 1; break;
      }
      if (note.dotted) {
        total *= 1.5;
      }
    });
    
    // Round to nearest 0.25 to handle sixteenth notes properly
    total = Math.round(total * 4) / 4;
    
    // Always use 4 beats for 4/4 time, pad with rests if needed
    return 4;
  }
  
  // Pad pattern to complete measure if needed
  padPatternToMeasure(pattern) {
    const totalDuration = this.calculateActualDuration(pattern);
    const targetDuration = 4; // 4/4 time
    
    if (totalDuration < targetDuration) {
      const paddedPattern = [...pattern];
      const remainingDuration = targetDuration - totalDuration;
      
      // Add quarter rests to fill the measure
      let remaining = remainingDuration;
      while (remaining > 0) {
        if (remaining >= 1) {
          paddedPattern.push({ type: 'quarter', rest: true });
          remaining -= 1;
        } else if (remaining >= 0.5) {
          paddedPattern.push({ type: 'eighth', rest: true });
          remaining -= 0.5;
        } else if (remaining >= 0.25) {
          paddedPattern.push({ type: 'sixteenth', rest: true });
          remaining -= 0.25;
        } else {
          break;
        }
      }
      return paddedPattern;
    }
    
    return pattern;
  }
  
  // Calculate actual duration (helper for padding)
  calculateActualDuration(pattern) {
    let total = 0;
    pattern.forEach(note => {
      switch(note.type) {
        case 'whole': total += 4; break;
        case 'half': total += 2; break;
        case 'quarter': total += 1; break;
        case 'eighth': total += 0.5; break;
        case 'sixteenth': total += 0.25; break;
        default: total += 1; break;
      }
      if (note.dotted) {
        total *= 1.5;
      }
    });
    return Math.round(total * 4) / 4;
  }
  
  // Convert our duration names to VexFlow format
  getDuration(type) {
    const durations = {
      'whole': 'w',
      'half': 'h',
      'quarter': 'q',
      'eighth': '8',
      'sixteenth': '16'
    };
    return durations[type] || 'q';
  }
  
  // Highlight a specific note (for future use)
  highlightNote(noteIndex) {
    // We'll implement this in Stage 2
    console.log(`Would highlight note ${noteIndex}`);
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VexFlowDisplay;
}