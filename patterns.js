// patterns.js - Rhythm pattern definitions
// Simple starter set with 2 patterns per difficulty level

const PATTERNS = {
  simple: [
    {
      id: 'simple_quarter',
      name: 'Simple Quarter Notes',
      description: 'Four steady quarter note beats',
      difficulty: 'simple',
      pattern: [
        { type: 'quarter', rest: false },
        { type: 'quarter', rest: false },
        { type: 'quarter', rest: false },
        { type: 'quarter', rest: false }
      ]
    },
    {
      id: 'simple_with_rest',
      name: 'Quarter Notes with Rest',
      description: 'Three quarter notes and one rest',
      difficulty: 'simple',
      pattern: [
        { type: 'quarter', rest: false },
        { type: 'quarter', rest: false },
        { type: 'quarter', rest: true },
        { type: 'quarter', rest: false }
      ]
    },
    {
      id: 'test_final_beat',
      name: 'Final Beat Test (3 notes)',
      description: 'Test pattern for final beat bonus - exactly 3 quarter notes',
      difficulty: 'simple',
      pattern: [
        { type: 'quarter', rest: false },
        { type: 'quarter', rest: false },
        { type: 'quarter', rest: false }
      ]
    },
    
    // NEW: Simple multi-bar pattern for beginners
    {
      id: 'simple_two_bar_basic',
      name: 'Two-Bar Beginner Pattern',
      description: 'Simple two-bar pattern for learning multi-bar rhythms',
      difficulty: 'simple',
      bars: 2,
      timeSignature: { numerator: 4, denominator: 4 },
      tags: ['multi-bar', 'beginner'],
      creator: 'system',
      pattern: [
        // Bar 1: Four quarter notes
        { type: 'quarter', rest: false },
        { type: 'quarter', rest: false },
        { type: 'quarter', rest: false },
        { type: 'quarter', rest: false },
        // Bar 2: Quarter, rest, quarter, quarter
        { type: 'quarter', rest: false },
        { type: 'quarter', rest: true },
        { type: 'quarter', rest: false },
        { type: 'quarter', rest: false }
      ]
    },
    {
      id: 'test_final_beat_4',
      name: 'Final Beat Test (4 notes)',
      description: 'Test pattern for final beat bonus - classic 4 quarter notes',
      difficulty: 'simple',
      pattern: [
        { type: 'quarter', rest: false },
        { type: 'quarter', rest: false },
        { type: 'quarter', rest: false },
        { type: 'quarter', rest: false }
      ]
    }
  ],

  mixed: [
    {
      id: 'mixed_basic',
      name: 'Basic Mixed Rhythm',
      description: 'Quarter and eighth note combination',
      difficulty: 'mixed',
      pattern: [
        { type: 'quarter', rest: false },    // 1 beat
        { type: 'eighth', rest: false },     // 0.5 beat
        { type: 'eighth', rest: false },     // 0.5 beat
        { type: 'quarter', rest: false },    // 1 beat
        { type: 'quarter', rest: false }     // 1 beat
        // Total: 4 beats
      ]
    },
    {
      id: 'mixed_syncopated',
      name: 'Syncopated Pattern',
      description: 'True syncopation: Quarter, Eighth-rest, Eighth, Quarter, Quarter',
      difficulty: 'mixed',
      pattern: [
        { type: 'quarter', rest: false },    // 1 beat
        { type: 'eighth', rest: true },      // 0.5 beat (rest)
        { type: 'eighth', rest: false },     // 0.5 beat (off-beat!)
        { type: 'quarter', rest: false },    // 1 beat
        { type: 'quarter', rest: false }     // 1 beat
        // Total: 4 beats - Q R(E) E Q Q
      ]
    }
  ],

  complex: [
    {
      id: 'complex_sixteenths',
      name: 'Sixteenth Note Pattern',
      description: 'Fast sixteenth notes mixed with quarters',
      difficulty: 'complex',
      pattern: [
        { type: 'quarter', rest: false },      // 1 beat
        { type: 'sixteenth', rest: false },    // 0.25 beat
        { type: 'sixteenth', rest: false },    // 0.25 beat
        { type: 'sixteenth', rest: false },    // 0.25 beat
        { type: 'sixteenth', rest: false },    // 0.25 beat
        { type: 'quarter', rest: false },      // 1 beat
        { type: 'quarter', rest: false }       // 1 beat
        // Total: 4 beats
      ]
    },
    
    // NEW: Multi-bar patterns demonstrating extended capabilities
    {
      id: 'complex_multibar_verse',
      name: 'Two-Bar Verse Pattern',
      description: 'Complex rhythm spanning two bars with tags',
      difficulty: 'complex',
      bars: 2,
      timeSignature: { numerator: 4, denominator: 4 },
      tags: ['multi-bar', 'verse', 'rock'],
      creator: 'system',
      pattern: [
        // Bar 1
        { type: 'quarter', rest: false },
        { type: 'eighth', rest: false },
        { type: 'eighth', rest: true },
        { type: 'quarter', rest: false },
        { type: 'quarter', rest: false },
        // Bar 2  
        { type: 'eighth', rest: false },
        { type: 'eighth', rest: false },
        { type: 'quarter', rest: true },
        { type: 'eighth', rest: false },
        { type: 'eighth', rest: false },
        { type: 'quarter', rest: false }
      ]
    }
  ]
};

// Helper function to get patterns by difficulty
function getPatternsByDifficulty(difficulty) {
  return PATTERNS[difficulty] || [];
}

// Helper function to get a specific pattern by ID
function getPatternById(patternId) {
  for (const difficulty in PATTERNS) {
    const found = PATTERNS[difficulty].find(p => p.id === patternId);
    if (found) return found;
  }
  return null;
}

// Helper function to get pattern by difficulty and name
function getPattern(difficulty, patternName) {
  const patterns = getPatternsByDifficulty(difficulty);
  return patterns.find(p => p.name === patternName) || patterns[0];
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PATTERNS, getPatternsByDifficulty, getPatternById, getPattern };
}
