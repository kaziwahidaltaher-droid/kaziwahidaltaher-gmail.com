import * as THREE from 'three';
import { Analyser } from './analyser.ts';
import { vs as nebulaVS, fs as nebulaFS } from './nebula-shader.tsx';

export class NebulaVisualizer {
    public container: THREE.Group;
    private scene: THREE.Scene;
    private nebulae: THREE.Mesh[] = [];

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.container = new THREE.Group();
        this.container.visible = false;

        const planeGeom = new THREE.PlaneGeometry(1, 1);

        for (let i = 0; i < 5; i++) {
            const material = new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: Math.random() * 100 },
                    color1: { value: new THREE.Color().setHSL(Math.random(), 0.7, 0.5) },
                    color2: { value: new THREE.Color().setHSL(Math.random(), 0.7, 0.5) },
                    uAudioMids: { value: 0.0 },
                    uAudioHighs: { value: 0.0 },
                    uAudioBass: { value: 0.0 },
                    uFade: { value: 1.0 },
                },
                vertexShader: nebulaVS,
                fragmentShader: nebulaFS,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });
            const nebula = new THREE.Mesh(planeGeom, material);
            nebula.position.set(
                (Math.random() - 0.5) * 500,
                (Math.random() - 0.5) * 500,
                -1000 + i * 200 + (Math.random() - 0.5) * 100
            );
            nebula.scale.setScalar(1000 + Math.random() * 500);
            nebula.rotation.z = Math.random() * Math.PI * 2;
            this.nebulae.push(nebula);
            this.container.add(nebula);
        }
        scene.add(this.container);
    }

    setVisible(visible: boolean) {
        this.container.visible = visible;
    }

    setFade(fade: number) {
        this.nebulae.forEach(nebula => {
            (nebula.material as THREE.ShaderMaterial).uniforms.uFade.value = fade;
        });
    }

    update(time: number, audioAnalyser: Analyser | null) {
        if (!this.container.visible || !audioAnalyser) return;

        const data = audioAnalyser.data;
        const bassAvg = (data[1] + data[2]) / 2 / 255;
        const midAvg = (data[20] + data[21]) / 2 / 255;
        const highAvg = (data[80] + data[81]) / 2 / 255;

        this.nebulae.forEach(nebula => {
            const material = nebula.material as THREE.ShaderMaterial;
            material.uniforms.time.value += 0.001; // Each nebula has its own internal time
            material.uniforms.uAudioBass.value = THREE.MathUtils.lerp(material.uniforms.uAudioBass.value, bassAvg, 0.1);
            material.uniforms.uAudioMids.value = THREE.MathUtils.lerp(material.uniforms.uAudioMids.value, midAvg, 0.1);
            material.uniforms.uAudioHighs.value = THREE.MathUtils.lerp(material.uniforms.uAudioHighs.value, highAvg, 0.1);
        });
    }

    onWindowResize() { /* No-op */ }
}