import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface BasicFaceProps {
  mood?: 'neutral' | 'happy' | 'sad' | 'curious' | 'sleepy';
  color?: THREE.ColorRepresentation;
}

const BasicFace: React.FC<BasicFaceProps> = ({ mood = 'neutral', color = '#ffffff' }) => {
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const mouthRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (mood === 'curious') {
      leftEyeRef.current!.position.y = Math.sin(t) * 0.05 + 0.2;
      rightEyeRef.current!.position.y = Math.cos(t) * 0.05 + 0.2;
    }
    if (mood === 'sleepy') {
      leftEyeRef.current!.scale.y = Math.abs(Math.sin(t * 0.5)) * 0.2;
      rightEyeRef.current!.scale.y = Math.abs(Math.sin(t * 0.5)) * 0.2;
    }
  });

  const getMouthGeometry = () => {
    switch (mood) {
      case 'happy':
        return <circleGeometry args={[0.2, 32]} />;
      case 'sad':
        return <ringGeometry args={[0.15, 0.2, 32]} />;
      case 'sleepy':
        return <planeGeometry args={[0.3, 0.02]} />;
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
        {getMouthGeometry()}
        <meshBasicMaterial color={color} />
      </mesh>
    </>
  );
};

export default BasicFace;