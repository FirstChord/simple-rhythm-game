// test-rhythm-engine.js - Test the rhythm engine without any DOM

// For Node.js: const RhythmEngine = require('./rhythmEngine.js');

// Test 1: Basic pattern timing
console.log('=== Test 1: Basic Pattern Timing ===');
const engine = new RhythmEngine(120); // 120 BPM = 500ms per beat

engine.loadPattern([
  { type: 'quarter', rest: false },
  { type: 'quarter', rest: false },
  { type: 'eighth', rest: false },
  { type: 'eighth', rest: false },
  { type: 'quarter', rest: false }
]);

console.log('Expected times (ms):', engine.expectedTimes);
// Should output: [0, 500, 1000, 1250, 1500]

// Test 2: Simulate perfect timing
console.log('\n=== Test 2: Perfect Timing Simulation ===');
engine.start();

// Simulate taps at perfect times
setTimeout(() => {
  engine.registerHoldStart();
  setTimeout(() => engine.registerHoldEnd(), 50);
}, 0);

setTimeout(() => {
  engine.registerHoldStart();
  setTimeout(() => engine.registerHoldEnd(), 50);
}, 500);

setTimeout(() => {
  engine.registerHoldStart();
  setTimeout(() => engine.registerHoldEnd(), 50);
}, 1000);

setTimeout(() => {
  engine.registerHoldStart();
  setTimeout(() => engine.registerHoldEnd(), 50);
}, 1250);

setTimeout(() => {
  engine.registerHoldStart();
  setTimeout(() => engine.registerHoldEnd(), 50);
}, 1500);

// Check results after pattern completes
setTimeout(() => {
  engine.stop();
  const results = engine.scorePattern();
  const stats = engine.getStats(results);
  
  console.log('Results:', results.map(r => r.result));
  console.log('Stats:', stats);
}, 2500);

// Test 3: Pattern with rests
setTimeout(() => {
  console.log('\n=== Test 3: Pattern with Rests ===');
  const engine2 = new RhythmEngine(120);
  
  engine2.loadPattern([
    { type: 'quarter', rest: false },
    { type: 'quarter', rest: true },  // rest
    { type: 'quarter', rest: false },
    { type: 'quarter', rest: false }
  ]);
  
  console.log('Pattern has rest at index 1');
  console.log('Expected times:', engine2.expectedTimes);
  
  // Simulate playing
  engine2.start();
  
  // Only tap on non-rest beats
  setTimeout(() => {
    engine2.registerHoldStart();
    setTimeout(() => engine2.registerHoldEnd(), 50);
  }, 10); // Slightly late
  
  setTimeout(() => {
    engine2.registerHoldStart();
    setTimeout(() => engine2.registerHoldEnd(), 50);
  }, 1010); // Note at 1000ms
  
  setTimeout(() => {
    engine2.registerHoldStart();
    setTimeout(() => engine2.registerHoldEnd(), 50);
  }, 1490); // Note at 1500ms
  
  setTimeout(() => {
    engine2.stop();
    const results = engine2.scorePattern();
    console.log('Results:', results.map((r, i) => `Note ${i}: ${r.result}`));
  }, 2500);
}, 3000);

// Test 4: Tied notes (hold groups)
setTimeout(() => {
  console.log('\n=== Test 4: Tied Notes ===');
  const engine3 = new RhythmEngine(120);
  
  engine3.loadPattern([
    { type: 'quarter', rest: false, tieToNext: true },
    { type: 'quarter', rest: false }, // This completes a half note hold
    { type: 'quarter', rest: false },
    { type: 'quarter', rest: false }
  ]);
  
  console.log('First two notes are tied (should be held together)');
  
  engine3.start();
  
  // Hold for the full duration of tied notes
  setTimeout(() => {
    engine3.registerHoldStart();
    // Hold for full half note duration
    setTimeout(() => engine3.registerHoldEnd(), 1000);
  }, 0);
  
  // Regular taps for other notes
  setTimeout(() => {
    engine3.registerHoldStart();
    setTimeout(() => engine3.registerHoldEnd(), 50);
  }, 1000);
  
  setTimeout(() => {
    engine3.registerHoldStart();
    setTimeout(() => engine3.registerHoldEnd(), 50);
  }, 1500);
  
  setTimeout(() => {
    engine3.stop();
    const results = engine3.scorePattern();
    console.log('Results:', results.map((r, i) => `Note ${i}: ${r.result}`));
    console.log('Notes 0 and 1 should both be "perfect" from single hold');
  }, 2500);
}, 6000);