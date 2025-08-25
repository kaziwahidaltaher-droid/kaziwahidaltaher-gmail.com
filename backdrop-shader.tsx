/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
const vs = `precision highp float;

in vec3 position;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;const fs = `precision highp float;

out vec4 fragmentColor;

uniform vec2 resolution;
uniform float rand;
uniform vec4 emotionData;   // x: mood intensity, y: breath phase, z: species type, w: poetic frequency
uniform float ambientSync;  // global sync signal from studio

void main() {
  vec2 vUv = gl_FragCoord.xy / resolution;
  float aspectRatio = resolution.x / resolution.y;

  // 🌀 Center and aspect correction
  vUv -= 0.5;
  vUv.x *= aspectRatio;

  // 🌬️ Organic shimmer
  float noise = fract(sin(dot(vUv, vec2(12.9898 + rand, 78.233) * 2.0)) * 43758.5453);

  // 🌈 Emotional gradient modulation
  float d = length(vUv);
  float moodPulse = sin(emotionData.w * vUv.x + ambientSync + emotionData.y);
  float speciesShift = cos(emotionData.z * vUv.y + rand * 0.01);

  float intensity = smoothstep(0.0, 1.0, d * (1.0 + emotionData.x * 0.5));
  float shimmer = 0.01 * noise + 0.02 * moodPulse;

  // 🎨 Color blend from deep to soft based on mood/species
  vec3 from = mix(vec3(0.01, 0.02, 0.03), vec3(0.2, 0.1, 0.3), emotionData.x);
  vec3 to = mix(vec3(0.05, 0.04, 0.08), vec3(0.8, 0.6, 0.9), speciesShift);

  vec3 color = mix(from, to, intensity) + shimmer;

  fragmentColor = vec4(color, 1.0);
}`;export { vs, fs };