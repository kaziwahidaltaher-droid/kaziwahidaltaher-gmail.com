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
                uAudioHighs: { value: 0.0 },
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
        if (!visible) {
            (this.sun.material as THREE.ShaderMaterial).uniforms.uFade.value = 0.0;
        }
    }

    setFade(fade: number) {
        (this.sun.material as THREE.ShaderMaterial).uniforms.uFade.value = fade;
    }

    setColor(color: THREE.Color) {
        const material = this.sun.material as THREE.ShaderMaterial;
        material.uniforms.uColor.value = color;
    }

    update(time: number, audioAnalyser: Analyser | null, aiState: string) {
        if (!this.sun.visible || !audioAnalyser) return;
        const material = this.sun.material as THREE.ShaderMaterial;
        material.uniforms.time.value = time * 0.1; // Slower time for sun

        const state = aiState === 'thinking' ? 1.0 : (aiState === 'speaking' ? 2.0 : 0.0);
        material.uniforms.aiState.value = THREE.MathUtils.lerp(material.uniforms.aiState.value, state, 0.1);

        const data = audioAnalyser.data;
        const bufferLength = data.length;

        const getBandAverage = (band: { start: number, end: number }) => {
            const size = band.end - band.start + 1;
            if (size <= 0 || bufferLength === 0) return 0;
            let sum = 0;
            for (let i = band.start; i <= band.end; i++) {
                 if (i < bufferLength) sum += data[i];
            }
            return (sum / size) / 255.0; // normalize
        };

        const bassAvg = getBandAverage({ start: 1, end: 8 });
        const midAvg = getBandAverage({ start: 15, end: 50 });
        const highAvg = getBandAverage({ start: 60, end: 120 });
        
        // Use a faster lerp for more immediate audio response
        const lerpFactor = 0.2;
        material.uniforms.audioLevel.value = THREE.MathUtils.lerp(material.uniforms.audioLevel.value, bassAvg, lerpFactor);
        material.uniforms.uAudioMids.value = THREE.MathUtils.lerp(material.uniforms.uAudioMids.value, midAvg, lerpFactor);
        material.uniforms.uAudioHighs.value = THREE.MathUtils.lerp(material.uniforms.uAudioHighs.value, highAvg, lerpFactor);
    }

    onWindowResize() { /* No-op for now */ }
}