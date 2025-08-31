/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

type PlanetData = {
    designation: string;
    planetType: string;
    orbitalPeriod: number;
    radius: number;
    habitabilityIndex: number;
    summary: string;
};

type PanelProps = {
    isOpen: boolean;
    onClose: () => void;
    planetData: PlanetData | null;
};

// A simple, single-value progress bar for the habitability index
const StatBar: React.FC<{ label: string, value: number, max?: number, color?: string }> = ({ label, value, max = 1.0, color = '#4ade80' }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    const barColor = `hsl(${(percentage * 1.2)}, 80%, 50%)`; // Color shifts from red to green

    return (
        <div className="stat-bar-container">
            <span className="stat-bar-label">{label}</span>
            <div className="stat-bar-track">
                <div className="stat-bar-fill" style={{ width: `${percentage}%`, backgroundColor: barColor }} />
            </div>
            <span className="stat-bar-value">{value.toFixed(2)}</span>
        </div>
    );
};


const ExoplanetDiscoveryPanel: React.FC<PanelProps> = ({ isOpen, onClose, planetData }) => {
    if (!isOpen || !planetData) return null;

    return (
        <div className="exoplanet-panel-overlay" onClick={onClose}>
            <div className="exoplanet-panel" onClick={(e) => e.stopPropagation()}>
                <div className="exoplanet-header">
                    <h3>Exoplanet Discovery</h3>
                    <button onClick={onClose} className="panel-close-btn" aria-label="Close discovery panel">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>
                    </button>
                </div>
                <div className="exoplanet-body">
                    <h4 className="planet-designation">{planetData.designation}</h4>
                    <p className="planet-summary">{planetData.summary}</p>

                    <div className="planet-stats-grid">
                        <div className="stat-item">
                            <label>Planet Type</label>
                            <span>{planetData.planetType}</span>
                        </div>
                        <div className="stat-item">
                            <label>Orbital Period</label>
                            <span>{planetData.orbitalPeriod.toFixed(2)} days</span>
                        </div>
                        <div className="stat-item">
                            <label>Radius (xEarth)</label>
                            <span>{planetData.radius.toFixed(2)}</span>
                        </div>
                    </div>

                    <StatBar label="Habitability Index" value={planetData.habitabilityIndex} />
                </div>
            </div>
        </div>
    );
};

export default ExoplanetDiscoveryPanel;
