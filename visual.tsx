import * as THREE from 'three';
import { vs } from './shaders/vertexShader';
import { fs } from './shaders/fragmentShader'; // optional if you have one
import { emotionData, ambientSync, inputData, outputData } from './emotionState';

export function createVisualScene(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x000000, 5, 15);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 5;

  const geometry = new THREE.SphereGeometry(1.5, 128, 128);

  const material = new THREE.ShaderMaterial({
    vertexShader: vs,
    fragmentShader: fs,
    uniforms: {
      time: { value: 0 },
      emotionData: { value: new THREE.Vector4(...emotionData) },
      ambientSync: { value: ambientSync },
      inputData: { value: new THREE.Vector4(...inputData) },
      outputData: { value: new THREE.Vector4(...outputData) },
    },
    fog: true,
    transparent: true,
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // 🌬️ Animate with poetic breath and mood
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const t = clock.getElapsedTime();
    material.uniforms.time.value = t;

    // Optional: mood-reactive camera pulse
    const moodIntensity = emotionData[0];
    camera.position.z = 5 + 0.3 * Math.sin(t + moodIntensity);

    renderer.render(scene, camera);
  }

  animate();
  return renderer;
}