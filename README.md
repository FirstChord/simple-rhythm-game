# Simple Rhythm Game 🎵

A browser-based interactive rhythm game featuring visual metronome, pattern visualization, sheet music notation, and audio feedback.

## Features ✨

### Core Gameplay

- **Interactive rhythm patterns** - Practice various rhythmic exercises
- **Real-time scoring** - Get Perfect/Good/Miss feedback on your timing
- **Multiple difficulty patterns** - From simple quarter notes to complex syncopated rhythms
- **Tempo control** - Adjustable BPM from 60-180

### Visual & Audio Feedback

- **Visual metronome** - Animated circle with beat indicators
- **Pattern visualizer** - Color-coded rhythm blocks showing when to tap
- **VexFlow sheet music** - Traditional music notation display
- **Audio metronome** - Professional click track with accented downbeats
- **Audio toggle** - Turn sound on/off as needed

### User Experience

- **4-beat count-in** - Preparation time before each pattern starts
- **Responsive design** - Works on desktop and mobile devices
- **Single-screen layout** - No scrolling required, fits in 100vh
- **Keyboard controls** - Press 'T' key to tap along with the rhythm

## How to Play 🎮

1. **Choose your settings**: Adjust tempo and select a rhythm pattern
2. **Hit "Start Game"**: Listen/watch the 4-beat count-in
3. **Follow the pattern**: Tap 'T' key when you see rhythm blocks
4. **Skip the rests**: Don't tap during rest periods
5. **Get feedback**: See your score and timing accuracy

## Rhythm Patterns 🎼

- **Simple Quarter Notes** - Basic steady beat (perfect for beginners)
- **Quarter Notes with Rest** - Introduction to rest timing
- **Basic Mixed Rhythm** - Combination of quarter and eighth notes
- **Syncopated Pattern** - Off-beat rhythms for advanced practice
- **Sixteenth Note Pattern** - Fast subdivisions

## Technical Features 🔧

### Architecture

- **Modular JavaScript** - Clean separation of concerns
- **Web Audio API** - Professional audio synthesis
- **VexFlow integration** - Industry-standard music notation
- **Responsive CSS** - Modern flexbox layout

### Files Structure

```
├── index.html              # Main game interface
├── gameController.js       # Core game logic and coordination
├── rhythmEngine.js         # Timing and pattern playback engine
├── visualMetronome.js      # Animated metronome component
├── patternVisualizer.js    # Rhythm block visualization
├── vexflowDisplay.js       # Sheet music notation renderer
├── simpleAudio.js          # Audio system for metronome clicks
├── patterns.js             # Rhythm pattern definitions
└── README.md              # This file
```

## Getting Started 🚀

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd simple-rhythm
   ```

2. **Open in browser**:
   Simply open `index.html` in any modern web browser

3. **Start playing**:
   No build process or dependencies required!

## Browser Compatibility 🌐

- **Chrome** - Full support
- **Firefox** - Full support
- **Safari** - Full support
- **Edge** - Full support

_Note: Web Audio API requires user interaction before audio will play (browser security feature)_

## Development 💻

### Key Components

- **GameController**: Main orchestrator that coordinates all components
- **RhythmEngine**: Handles precise timing and pattern playback
- **VisualMetronome**: Animated metronome with beat dots
- **PatternVisualizer**: Shows rhythm blocks and handles user input
- **VexFlowDisplay**: Renders traditional sheet music notation
- **SimpleAudio**: Clean Web Audio API implementation for metronome clicks

### Adding New Patterns

Edit `patterns.js` to add new rhythm patterns:

```javascript
{
  name: "Your Pattern Name",
  pattern: [1, 0, 0.5, 1], // 1=quarter note, 0.5=eighth note, 0=rest
  vexflowNotes: [
    { keys: ['b/4'], duration: 'q' },
    { keys: ['b/4'], duration: 'qr' },
    // ... more VexFlow note definitions
  ]
}
```

## Contributing 🤝

This is a learning project, but contributions are welcome! Areas for improvement:

- Additional rhythm patterns
- Visual themes/customization
- Advanced scoring algorithms
- Multiplayer features
- MIDI input support

## License 📄

Open source - feel free to use, modify, and learn from this code!

## Acknowledgments 🙏

- **VexFlow** - Excellent music notation library
- **Web Audio API** - Modern browser audio capabilities
- **GitHub Copilot** - Development assistance

---

**Happy rhythm practicing! 🎵**
