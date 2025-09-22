export const galaxyVertexShader = `
  uniform float time;
  attribute vec3 position;
  varying float vDistance;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vDistance = length(mvPosition.xyz);
    gl_PointSize = 1.5 + sin(time + position.x * 0.01) * 1.0;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const galaxyFragmentShader = `
  uniform float time;
  varying float vDistance;

  void main() {
    float pulse = sin(time * 0.5 + vDistance * 0.05);
    vec3 color = mix(vec3(0.1, 0.2, 0.5), vec3(0.8, 0.9, 1.0), pulse);
    float alpha = 0.6 + 0.4 * pulse;
    gl_FragColor = vec4(color, alpha);
  }
`;
