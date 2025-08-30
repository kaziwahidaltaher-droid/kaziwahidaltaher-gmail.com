/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';

type MinimapProps = {
    galaxyPoints: Float32Array;
    galaxyBounds: THREE.Box3;
    cameraData: {
        position: THREE.Vector3;
        direction: THREE.Vector3;
    };
    onNavigate: (target: THREE.Vector3) => void;
};

export const Minimap: React.FC<MinimapProps> = ({ galaxyPoints, galaxyBounds, cameraData, onNavigate }) => {
    const mapCanvasRef = useRef<HTMLCanvasElement>(null);
    const cameraCanvasRef = useRef<HTMLCanvasElement>(null);
    const size = 200; // a fixed size for the minimap canvas

    const galaxySize = useMemo(() => {
        if (!galaxyBounds) return 1;
        const sizeVec = new THREE.Vector3();
        galaxyBounds.getSize(sizeVec);
        // We use a top-down view, so we only care about the XZ plane size
        return Math.max(sizeVec.x, sizeVec.z);
    }, [galaxyBounds]);

    // Effect for drawing the static starfield
    useEffect(() => {
        const canvas = mapCanvasRef.current;
        if (!canvas || !galaxyPoints) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = 'rgba(0, 20, 40, 1)';
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = 'rgba(200, 220, 255, 0.7)';

        const halfSize = size / 2;
        const scale = size / galaxySize;

        for (let i = 0; i < galaxyPoints.length; i += 3) {
            // Projecting from 3D (x, z) to 2D (x, y)
            const x = galaxyPoints[i] * scale + halfSize;
            const z = galaxyPoints[i + 2] * scale + halfSize;
            if (x >= 0 && x < size && z >= 0 && z < size) {
                ctx.fillRect(x, z, 1, 1);
            }
        }
    }, [galaxyPoints, galaxySize]);

    // Effect for drawing the dynamic camera indicator
    useEffect(() => {
        const canvas = cameraCanvasRef.current;
        if (!canvas || !cameraData) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, size, size);

        const halfSize = size / 2;
        const scale = size / galaxySize;
        
        // --- Draw Camera Position and Direction ---
        const camX = cameraData.position.x * scale + halfSize;
        const camZ = cameraData.position.z * scale + halfSize;

        // Direction vector on the XZ plane
        const dirX = cameraData.direction.x;
        const dirZ = cameraData.direction.z;
        
        const arrowLength = 12;
        const arrowWidth = 8;

        ctx.save();
        ctx.translate(camX, camZ);
        // The rotation is based on the angle of the direction vector on the XZ plane
        ctx.rotate(Math.atan2(dirZ, dirX)); 
        
        // Draw a triangle pointing in the camera's direction
        ctx.beginPath();
        ctx.moveTo(arrowLength, 0);
        ctx.lineTo(-arrowLength / 2, arrowWidth / 2);
        ctx.lineTo(-arrowLength / 2, -arrowWidth / 2);
        ctx.closePath();
        
        ctx.fillStyle = 'rgba(0, 255, 255, 0.9)';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.fill();
        ctx.stroke();

        ctx.restore();

    }, [cameraData, galaxySize]);
    
    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top; // y on canvas corresponds to z in world

        const halfSize = size / 2;
        const scale = galaxySize / size;

        const worldX = (x - halfSize) * scale;
        const worldZ = (y - halfSize) * scale;
        
        // Keep the current camera Y position for navigation for a smoother transition
        const target = new THREE.Vector3(worldX, cameraData.position.y, worldZ);
        onNavigate(target);
    };


    return (
        <div className="minimap-container" onClick={handleClick} role="button" aria-label="Galaxy minimap. Click to navigate.">
            <canvas ref={mapCanvasRef} width={size} height={size} className="minimap-canvas" />
            <canvas ref={cameraCanvasRef} width={size} height={size} className="minimap-camera-canvas" />
        </div>
    );
};
