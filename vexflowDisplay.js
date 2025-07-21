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
    
    // Size based on container - larger for multi-bar patterns
    const width = 700;
    const height = 180;
    this.renderer.resize(width, height);
    
    this.context = this.renderer.getContext();
  }
  
  // Display a pattern as sheet music
  displayPattern(pattern, patternData = null) {
    // Clear previous notation
    this.context.clear();
    
    // Get pattern metadata (bars, time signature)
    const bars = patternData?.bars || 1;
    const timeSignature = patternData?.timeSignature || { numerator: 4, denominator: 4 };
    const timeSignatureString = `${timeSignature.numerator}/${timeSignature.denominator}`;
    
    // Calculate beats per bar and total beats
    const beatsPerBar = timeSignature.numerator;
    const totalExpectedBeats = bars * beatsPerBar;
    
    console.log(`Displaying pattern: ${bars} bars, ${timeSignatureString} time, expecting ${totalExpectedBeats} beats`);
    
    if (bars === 1) {
      // Single bar - existing logic but with correct time signature
      this.displaySingleBar(pattern, timeSignature);
    } else {
      // Multi-bar - split pattern across multiple staves
      this.displayMultiBar(pattern, bars, timeSignature);
    }
  }
  
  // Display single bar pattern
  displaySingleBar(pattern, timeSignature) {
    // Create a stave (staff)
    this.stave = new Vex.Flow.Stave(10, 40, 500);
    this.stave.addClef('treble');
    this.stave.addTimeSignature(`${timeSignature.numerator}/${timeSignature.denominator}`);
    this.stave.setContext(this.context).draw();
    
    // Pad pattern to complete measure if needed
    const paddedPattern = this.padPatternToMeasure(pattern, timeSignature);
    
    // Convert pattern to VexFlow notes
    const notes = this.patternToVexNotes(paddedPattern);
    
    this.drawNotesOnStave(notes, this.stave, timeSignature.numerator);
  }
  
  // Display multi-bar pattern
  displayMultiBar(pattern, bars, timeSignature) {
    const beatsPerBar = timeSignature.numerator;
    const staveWidth = Math.min(450, Math.floor(580 / bars)); // Adjust width based on number of bars
    const staveSpacing = staveWidth + 20;
    
    // Split pattern into bars
    const patternBars = this.splitPatternIntoBars(pattern, bars, timeSignature);
    
    for (let barIndex = 0; barIndex < bars; barIndex++) {
      const x = 10 + (barIndex * staveSpacing);
      const y = 40;
      
      // Create stave for this bar
      const stave = new Vex.Flow.Stave(x, y, staveWidth);
      
      // Add clef and time signature only to first bar
      if (barIndex === 0) {
        stave.addClef('treble');
        stave.addTimeSignature(`${timeSignature.numerator}/${timeSignature.denominator}`);
      }
      
      stave.setContext(this.context).draw();
      
      // Get notes for this bar
      const barPattern = patternBars[barIndex] || [];
      const paddedBarPattern = this.padPatternToMeasure(barPattern, timeSignature);
      const notes = this.patternToVexNotes(paddedBarPattern);
      
      // Draw notes on this stave
      this.drawNotesOnStave(notes, stave, timeSignature.numerator);
    }
  }
  
  // Helper to draw notes on a stave
  drawNotesOnStave(notes, stave, numBeats) {
    if (notes.length === 0) return;
    
    // Create voice with appropriate duration
    const voice = new Vex.Flow.Voice({
      num_beats: numBeats,
      beat_value: 4
    });
    
    // Add notes to voice
    try {
      voice.addTickables(notes);
      
      // Generate beams before formatting
      const beams = Vex.Flow.Beam.generateBeams(notes);
      
      // Format and draw
      const formatter = new Vex.Flow.Formatter();
      formatter.joinVoices([voice]).format([voice], stave.getWidth() - 50);
      
      // Draw voice
      voice.draw(this.context, stave);
      
      // Draw beams
      beams.forEach(beam => beam.setContext(this.context).draw());
      
    } catch (error) {
      console.error('VexFlow error drawing notes:', error);
      console.log('Notes causing error:', notes);
      // Draw error text on the stave
      this.context.fillText(`Error: ${error.message}`, stave.getX() + 10, stave.getY() + 80);
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
    return Math.round(total * 4) / 4;
  }
  
  // Split a multi-bar pattern into separate bars
  splitPatternIntoBars(pattern, bars, timeSignature) {
    const beatsPerBar = timeSignature.numerator;
    const patternBars = [];
    
    let currentBar = [];
    let currentBarBeats = 0;
    let barIndex = 0;
    
    for (const note of pattern) {
      const noteDuration = this.getNoteDurationInBeats(note);
      
      // If adding this note would exceed the bar, start a new bar
      if (currentBarBeats + noteDuration > beatsPerBar && currentBar.length > 0) {
        patternBars[barIndex] = currentBar;
        currentBar = [];
        currentBarBeats = 0;
        barIndex++;
      }
      
      currentBar.push(note);
      currentBarBeats += noteDuration;
      
      // If we've filled this bar exactly, start a new bar
      if (currentBarBeats >= beatsPerBar) {
        patternBars[barIndex] = currentBar;
        currentBar = [];
        currentBarBeats = 0;
        barIndex++;
      }
    }
    
    // Add any remaining notes to the last bar
    if (currentBar.length > 0) {
      patternBars[barIndex] = currentBar;
    }
    
    // Ensure we have exactly the right number of bars
    while (patternBars.length < bars) {
      patternBars.push([]);
    }
    
    return patternBars.slice(0, bars);
  }
  
  // Get note duration in beats
  getNoteDurationInBeats(note) {
    let duration;
    switch(note.type) {
      case 'whole': duration = 4; break;
      case 'half': duration = 2; break;
      case 'quarter': duration = 1; break;
      case 'eighth': duration = 0.5; break;
      case 'sixteenth': duration = 0.25; break;
      default: duration = 1; break;
    }
    if (note.dotted) {
      duration *= 1.5;
    }
    return duration;
  }
  
  // Pad pattern to complete measure if needed
  padPatternToMeasure(pattern, timeSignature = { numerator: 4, denominator: 4 }) {
    const totalDuration = this.calculateActualDuration(pattern);
    const targetDuration = timeSignature.numerator; // beats per bar
    
    if (totalDuration < targetDuration) {
      const paddedPattern = [...pattern];
      const remainingDuration = targetDuration - totalDuration;
      
      // Add rests to fill the measure
      let remaining = remainingDuration;
      while (remaining > 0) {
        if (remaining >= 4) {
          paddedPattern.push({ type: 'whole', rest: true });
          remaining -= 4;
        } else if (remaining >= 2) {
          paddedPattern.push({ type: 'half', rest: true });
          remaining -= 2;
        } else if (remaining >= 1) {
          paddedPattern.push({ type: 'quarter', rest: true });
          remaining -= 1;
        } else if (remaining >= 0.5) {
          paddedPattern.push({ type: 'eighth', rest: true });
          remaining -= 0.5;
        } else if (remaining >= 0.25) {
          paddedPattern.push({ type: 'sixteenth', rest: true });
          remaining -= 0.25;
        } else {
          break; // Very small remainder, ignore
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