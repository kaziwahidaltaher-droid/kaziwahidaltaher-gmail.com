/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import cn from 'classnames';

type SatelliteData = {
    imageUrl: string;
    caption: string;
    date: string;
    coords: {
        dscovr_j2000_position: { x: number; y: number; z: number; };
        lunar_j2000_position: { x: number; y: number; z: number; };
        sun_j2000_position: { x: number; y: number; z: number; };
    };
    attitude: { q0: number; q1: number; q2: number; q3: number; };
};

type PanelProps = {
    isOpen: boolean;
    onNewImage: (imageUrl: string) => void;
};

// This component uses NASA's public DEMO_KEY for API access.
// For production applications, you should obtain your own key from https://api.nasa.gov/
const NASA_API_KEY = 'DEMO_KEY';

export const SatelliteDataPanel: React.FC<PanelProps> = ({ isOpen, onNewImage }) => {
    const [data, setData] = useState<SatelliteData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`https://api.nasa.gov/EPIC/api/natural/images?api_key=${NASA_API_KEY}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch data: ${response.statusText}`);
            }
            const images = await response.json();
            if (images.length === 0) {
                throw new Error('No recent images found.');
            }

            const latestImage = images[0];
            const date = new Date(latestImage.date);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            
            const imageUrl = `https://api.nasa.gov/EPIC/archive/natural/${year}/${month}/${day}/png/${latestImage.image}.png?api_key=${NASA_API_KEY}`;
            
            const newData: SatelliteData = {
                imageUrl: imageUrl,
                caption: latestImage.caption,
                date: latestImage.date,
                coords: {
                    dscovr_j2000_position: latestImage.dscovr_j2000_position,
                    lunar_j2000_position: latestImage.lunar_j2000_position,
                    sun_j2000_position: latestImage.sun_j2000_position,
                },
                attitude: latestImage.attitude_quaternions,
            };

            setData(newData);
            onNewImage(imageUrl);

        } catch (err: any) {
            console.error("Error fetching satellite data:", err);
            setError(err.message || 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen]);

    return (
        <div className={cn('satellite-data-panel', { closed: !isOpen })}>
            <div className="telemetry-header">
                <h4>DSCOVR:EPIC Live Feed</h4>
            </div>
            <div className="satellite-data-panel-body">
                <div className="satellite-image-container">
                    {isLoading && <div className="loader"></div>}
                    {error && <span className="loader-text">{error}</span>}
                    {data && <img src={data.imageUrl} alt="DSCOVR EPIC image of Earth" />}
                </div>

                {data && (
                    <div className="satellite-metadata-grid">
                        <div className="satellite-metadata-item">
                            <label>Capture Time (UTC)</label>
                            <span>{new Date(data.date).toLocaleString('en-GB', { timeZone: 'UTC' })}</span>
                        </div>
                         <div className="satellite-metadata-item">
                            <label>Satellite Position (DSCOVR J2000)</label>
                            <span>
                                X: {data.coords.dscovr_j2000_position.x.toFixed(2)}<br/>
                                Y: {data.coords.dscovr_j2000_position.y.toFixed(2)}<br/>
                                Z: {data.coords.dscovr_j2000_position.z.toFixed(2)}
                            </span>
                        </div>
                         <div className="satellite-metadata-item">
                            <label>Attitude Quaternions</label>
                             <span>
                                q0: {data.attitude.q0.toFixed(4)} q1: {data.attitude.q1.toFixed(4)}<br/>
                                q2: {data.attitude.q2.toFixed(4)} q3: {data.attitude.q3.toFixed(4)}
                            </span>
                        </div>
                    </div>
                )}
                <button className="satellite-fetch-btn" onClick={fetchData} disabled={isLoading}>
                    {isLoading ? 'Fetching...' : 'Fetch Latest Imagery'}
                </button>
            </div>
        </div>
    );
};
