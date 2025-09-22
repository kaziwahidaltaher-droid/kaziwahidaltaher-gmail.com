import React, { useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';

interface FaceProps {
  mood?: 'neutral' | 'happy' | 'sad' | 'curious';
  color?: string;
}

const Face: React.FC<FaceProps> = ({ mood = 'neutral', color = '#ffffff' }) => {
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const mouthRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (mood === 'curious') {
      leftEyeRef.current!.position.y = Math.sin(t) * 0.05;
      rightEyeRef.current!.position.y = Math.cos(t) * 0.05;
    }
  });

  const mouthShape = () => {
    switch (mood) {
      case 'happy':
        return <circleGeometry args={[0.2, 32]} />;
      case 'sad':
        return <ringGeometry args={[0.15, 0.2, 32]} />;
      default:
        return <planeGeometry args={[0.4, 0.05]} />;
    }
  };

  return (
    <>
      {/* Eyes */}
      <mesh ref={leftEyeRef} position={[-0.3, 0.2, 0]}>
        <circleGeometry args={[0.05, 32]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh ref={rightEyeRef} position={[0.3, 0.2, 0]}>
        <circleGeometry args={[0.05, 32]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Mouth */}
      <mesh ref={mouthRef} position={[0, -0.2, 0]}>
        {mouthShape()}
        <meshBasicMaterial color={color} />
      </mesh>
    </>
  );
};

const BasicFaceRender: React.FC = () => {
  return (
    <Canvas>
      <ambientLight intensity={0.5} />
      <Face mood="neutral" color="#ffccaa" />
    </Canvas>
  );
};

export default BasicFaceRender;
