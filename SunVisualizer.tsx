import * as THREE from 'three';
import { Analyser } from './analyser.ts';
import { vs as sunVS, fs as sunFS } from './sun-shader.tsx';

export class SunVisualizer {
    public sun: THREE.Mesh;
    private scene: THREE.Scene;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        const geometry = new THREE.SphereGeometry(150, 64, 64);
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                aiState: { value: 0.0 },
                audioLevel: { value: 0.0 },
                uAudioMids: { value: 0.0 },
                uColor: { value: new THREE.Color(0xffcc88) },
                uFade: { value: 0.0 },
            },
            vertexShader: sunVS,
            fragmentShader: sunFS,
            transparent: true,
        });

        this.sun = new THREE.Mesh(geometry, material);
        this.sun.visible = false;
        scene.add(this.sun);
    }

    setVisible(visible: boolean) {
        this.sun.visible = visible;
        (this.sun.material as THREE.ShaderMaterial).uniforms.uFade.value = visible ? 1.0 : 0.0;
    }

    update(time: number, audioAnalyser: Analyser | null, aiState: string) {
        if (!this.sun.visible || !audioAnalyser) return;
        const material = this.sun.material as THREE.ShaderMaterial;
        material.uniforms.time.value = time * 0.1; // Slower time for sun

        const state = aiState === 'thinking' ? 1.0 : (aiState === 'speaking' ? 2.0 : 0.0);
        material.uniforms.aiState.value = THREE.MathUtils.lerp(material.uniforms.aiState.value, state, 0.1);

        const data = audioAnalyser.data;
        const bassAvg = (data[1] + data[2] + data[3]) / 3 / 255;
        const midAvg = (data[20] + data[21] + data[22]) / 3 / 255;
        material.uniforms.audioLevel.value = THREE.MathUtils.lerp(material.uniforms.audioLevel.value, bassAvg, 0.1);
        material.uniforms.uAudioMids.value = THREE.MathUtils.lerp(material.uniforms.uAudioMids.value, midAvg, 0.1);
    }

    onWindowResize() { /* No-op for now */ }
}
