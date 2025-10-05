export const galaxyVertexShader = `
  attribute float aBranchAngle;
  uniform float uSize;

  varying vec3 vColor;
  varying float vBranchAngle;

  void main() {
    vColor = color;
    vBranchAngle = aBranchAngle;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const galaxyFragmentShader = `
  varying vec3 vColor;
  varying float vBranchAngle;

  uniform int uHoveredSectorIndex;
  uniform float uTime;
  uniform int uNumBranches;

  void main() {
    float d = distance(gl_PointCoord, vec2(0.5, 0.5));
    if (d > 0.5) discard;

    // branchAngle is 0 to 2PI.
    // uNumBranches is an int, e.g. 5
    int currentSector = int(floor(vBranchAngle / (6.2831853 / float(uNumBranches))));
    
    vec3 finalColor = vColor;
    float alpha = 0.8;

    if (currentSector == uHoveredSectorIndex) {
        finalColor *= 1.8; // Make it brighter
        finalColor += vec3(0.2, 0.2, 0.2); // Add some white to make it pop
        alpha = 1.0;
        
        // Add a pulse
        finalColor *= (0.9 + sin(uTime * 8.0) * 0.1);
    }
    
    gl_FragColor = vec4(finalColor, alpha * (1.0 - d * 2.0));
  }
`;