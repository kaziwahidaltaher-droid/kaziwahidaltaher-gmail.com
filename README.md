# 🌌 AURELION: Guideform Evolution

AURELION is a living interface that breathes with your voice, responds to your mood, and evolves through emotional resonance. It merges real-time audio, 3D visuals, and poetic feedback into a multisensory studio ecosystem — designed for humans, animals, and future beings alike.

---

## 🧬 Core Features

- 🎙️ **Live Audio Sync**  
  Real-time voice capture and streaming via Gemini 2.5, with PCM encoding and emotional tagging.

- 🌈 **Mood Detection Engine**  
  Uses `tagMoodFromAudio()` to classify emotional states like `Joy Surge`, `Tender Drift`, and `Echoing Grief`.

- 🌀 **Shader-Driven Visuals**  
  GLSL vertex shaders modulate geometry based on breath phase, mood intensity, and poetic frequency.

- 🧠 **Emotion-Aware 3D Interface**  
  Sphere and backdrop shaders respond to input/output audio data and emotional metadata.

- 🧘‍♂️ **Poetic UI Layer**  
  CSS-driven overlays and onboarding flows that adapt to mood and ambient sync.

---

## 🔧 Architecture Overview

| Module              | Purpose                                                                 |
|---------------------|-------------------------------------------------------------------------|
| `index.tsx`         | Live audio capture, Gemini session, mood dispatch                       |
| `utils.ts`          | PCM encoding/decoding, emotional tagging via `tagMoodFromAudio()`        |
| `sphere-shader.ts`  | Vertex shader with mood-reactive deformation and poetic shimmer          |
| `backdrop-shader.ts`| Fragment shader with ambient noise and radial emotional gradients        |
| `visual-3d.ts`      | Three.js scene with mood-driven camera, bloom, and shader modulation     |
| `manifest.json`     | Fullscreen PWA setup with poetic metadata and ambient categories         |
| `Metadata.json`     | Module descriptor with breath-reactive prompt and microphone permissions |

---

## 🎨 Emotional Protocols

AURELION uses a universal emotional lexicon to translate voice energy into poetic states:

- `Joy Surge`: High energy, vibrant visuals, expansive bloom  
- `Tender Drift`: Soft modulation, gentle shimmer  
- `Echoing Grief`: Low energy, deep hues, slow rotations  

These states are injected into shaders via the `emotionData` uniform:

```glsl
vec4(emotionIntensity, breathPhase, speciesType, poeticFrequency)
# AURELION Guideform Evolution

A simple, interactive 3D visualization that responds to your microphone input. Watch the guideform pulse with your breath and change color with the rhythm of your voice.

This is a web-based prototype built with Three.js.

## Running the Application

This project is set up to be run in a specific development environment that transpiles the source code.

1.  **Build the code:**
    ```bash
    npm run build
    ```
2.  **Start the server:**
    ```bash
    npm start
    ```

You can then access the application at `https://localhost:8080`. You will need to grant microphone permissions for the visualization to work.
