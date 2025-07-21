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
    
    // Size based on container - optimized for underneath gameplay
    const containerWidth = this.container.offsetWidth || 700;
    this.width = Math.max(600, Math.min(containerWidth - 40, 1000)); // Between 600-1000px
    this.height = 180; // Good height for readability without taking too much space
    this.renderer.resize(this.width, this.height);
    
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
    // Create a stave (staff) with responsive width
    const staveWidth = this.width - 80; // Leave margins
    this.stave = new Vex.Flow.Stave(40, 40, staveWidth);
    this.stave.addClef('treble');
    this.stave.addTimeSignature(`${timeSignature.numerator}/${timeSignature.denominator}`);
    this.stave.setContext(this.context).draw();
    
    // Pad pattern to complete measure if needed
    const paddedPattern = this.padPatternToMeasure(pattern, timeSignature);
    
    // Convert pattern to VexFlow notes
    const notes = this.patternToVexNotes(paddedPattern);
    
    this.drawNotesOnStave(notes, this.stave, timeSignature.numerator, false);
  }
  
  // Display multi-bar pattern
  displayMultiBar(pattern, bars, timeSignature) {
    const beatsPerBar = timeSignature.numerator;
    
    // Calculate stave dimensions using responsive width
    const totalWidth = this.width - 80; // Leave margins
    const staveWidth = Math.floor(totalWidth / bars) - 10; // Space for connections
    
    // Split pattern into bars
    const patternBars = this.splitPatternIntoBars(pattern, bars, timeSignature);
    
    const staves = [];
    
    for (let barIndex = 0; barIndex < bars; barIndex++) {
      const x = 40 + (barIndex * (staveWidth + 10)); // Spacing between bars
      const y = 40;
      
      // Create stave for this bar
      const stave = new Vex.Flow.Stave(x, y, staveWidth);
      
      // Add clef and time signature only to first bar
      if (barIndex === 0) {
        stave.addClef('treble');
        stave.addTimeSignature(`${timeSignature.numerator}/${timeSignature.denominator}`);
      }
      
      // Connect bars with bar lines (except the last one)
      if (barIndex < bars - 1) {
        stave.setEndBarType(Vex.Flow.Barline.type.SINGLE);
      } else {
        stave.setEndBarType(Vex.Flow.Barline.type.END);
      }
      
      stave.setContext(this.context).draw();
      staves.push(stave);
      
      // Get notes for this bar
      const barPattern = patternBars[barIndex] || [];
      const paddedBarPattern = this.padPatternToMeasure(barPattern, timeSignature);
      const notes = this.patternToVexNotes(paddedBarPattern);
      
      // Draw notes on this stave with better spacing
      this.drawNotesOnStave(notes, stave, timeSignature.numerator, true);
    }
    
    // Connect the staves visually (draw connecting lines if needed)
    this.connectStaves(staves);
  }
  
  // Connect multiple staves visually
  connectStaves(staves) {
    if (staves.length < 2) return;
    
    // Draw connecting lines between staves
    for (let i = 0; i < staves.length - 1; i++) {
      const currentStave = staves[i];
      const nextStave = staves[i + 1];
      
      // Get the end x of current stave and start x of next stave
      const currentEnd = currentStave.getX() + currentStave.getWidth();
      const nextStart = nextStave.getX();
      
      // Draw a thin connecting line
      if (nextStart - currentEnd < 10) {
        const y1 = currentStave.getY();
        const y2 = currentStave.getY() + currentStave.getHeight();
        
        this.context.beginPath();
        this.context.moveTo(currentEnd, y1);
        this.context.lineTo(nextStart, y1);
        this.context.moveTo(currentEnd, y2);
        this.context.lineTo(nextStart, y2);
        this.context.strokeStyle = '#000';
        this.context.lineWidth = 1;
        this.context.stroke();
      }
    }
  }
  
  // Helper to draw notes on a stave
  drawNotesOnStave(notes, stave, numBeats, isMultiBar = false) {
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
      
      // Format and draw with better spacing
      const formatter = new Vex.Flow.Formatter();
      
      // Calculate available width, leaving more space at the end to avoid crowding
      const availableWidth = stave.getWidth() - (isMultiBar ? 80 : 60); // More padding for multi-bar
      const startX = stave.getX() + (isMultiBar ? 40 : 30); // Start further from the beginning
      
      formatter.joinVoices([voice]).format([voice], availableWidth);
      
      // Manually adjust note positions if they're too close to the end
      const notePositions = voice.getTickables().map(note => note.getAbsoluteX());
      const lastNoteX = notePositions[notePositions.length - 1];
      const staveEndX = stave.getX() + stave.getWidth() - 20; // 20px from end
      
      if (lastNoteX > staveEndX) {
        // Compress the spacing slightly
        const compressionRatio = staveEndX / lastNoteX;
        formatter.format([voice], availableWidth * compressionRatio);
      }
      
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