import * as THREE from 'three';
import { GameOfLife } from './Conway.GameOfLife.ts';

export class GameOfLifeVisualizer {
    public mesh: THREE.Mesh;
    private canvas: HTMLCanvasElement;
    private texture: THREE.CanvasTexture;
    private game: GameOfLife;

    constructor(scene: THREE.Scene) {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 600;
        this.canvas.height = 600;
        
        this.game = new GameOfLife(this.canvas);

        this.texture = new THREE.CanvasTexture(this.canvas);
        const geometry = new THREE.PlaneGeometry(500, 500);
        const material = new THREE.MeshBasicMaterial({ 
            map: this.texture, 
            transparent: true, 
            blending: THREE.AdditiveBlending // Gives a cool "hologram" look
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.visible = false;
        scene.add(this.mesh);
    }

    setVisible(visible: boolean) {
        this.mesh.visible = visible;
        if (visible) {
            this.game.start();
        } else {
            this.game.stop();
        }
    }

    update() {
        if (this.mesh.visible) {
            this.texture.needsUpdate = true;
        }
    }

    onWindowResize() {
        // No-op for now.
    }
}