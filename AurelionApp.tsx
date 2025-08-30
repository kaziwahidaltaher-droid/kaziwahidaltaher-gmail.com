import React, { useState, useEffect, StrictMode, useRef } from 'react';
import BasicFace from './BasicFace.tsx';
import ControlTray from './ControlTray.tsx';
import { useLiveApi, LiveAPIContext, Message } from './use-live-api.tsx';
import cn from 'classnames';
import ArtisticLensPanel from './ArtisticLensPanel.tsx';
import { Minimap } from './Minimap.tsx';
import { TelemetryPanel } from './TelemetryPanel.tsx';
import { VoiceProfileSelector } from './VoiceProfileSelector.tsx';
import * as THREE from 'three';

// --- Type Definitions ---
type CameraData = {
    position: THREE.Vector3;
    direction: THREE.Vector3;
};
type GalaxyData = {
    points: Float32Array | null;
    bounds: THREE.Box3 | null;
};

// --- The UI Panel for selecting modules ---
const ModulesPanel = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const handleSelect = (moduleName) => {
        if ((window as any).setActiveModule) {
            (window as any).setActiveModule(moduleName);
        }
        onClose();
    };

    const modules = [
        { id: 'cosmic_web', name: 'Cosmic Web', description: 'The default large-scale structure simulation.' },
        { id: 'quantum_foam', name: 'Quantum Foam', description: 'A visualization of spacetime at the Planck scale.' },
        { id: 'signal_sphere', name: 'Signal Sphere', description: 'A celestial body reacting to cosmic transmissions.' },
        { id: 'living_star', name: 'Living Star', description: 'A central star pulsing with energy.' },
        { id: 'nebula_weaver', name: 'Nebula Weaver', description: 'Procedural, volumetric gas clouds.' },
        { id: 'game_of_life', name: 'Game of Life', description: 'A cellular automaton devised by John Conway.' },
    ];

    return (
        <div className="modules-panel-overlay" onClick={onClose}>
            <div className="modules-panel" onClick={(e) => e.stopPropagation()}>
                <h3>Select AURELION Module</h3>
                <ul>
                    {modules.map(module => (
                        <li key={module.id}>
                            <button
                                data-visual-element-name={module.name}
                                onClick={() => handleSelect(module.id)}
                            >
                                <h4>{module.name}</h4>
                                <p>{module.description}</p>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

// --- New: Top Right Controls ---
const TopRightControls = ({ isTelemetryOpen, onToggleTelemetry, onToggleArtLens, isTouring, onToggleTour, isAutoRotating, onToggleAutoRotate }) => {
    const handleTogglePhantom = () => {
        if ((window as any).togglePhantom) {
            (window as any).togglePhantom();
        }
    };

    return (
        <div id="top-right-controls-react">
             <button onClick={onToggleAutoRotate} className={cn('generation-btn', {toggled: isAutoRotating})} aria-label={isAutoRotating ? "Pause Rotation" : "Start Auto Rotation"}>
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z"/></svg>
            </button>
             <button onClick={onToggleTour} className={cn('generation-btn', {toggled: isTouring})} aria-label={isTouring ? "Pause Tour" : "Start Tour"}>
                {isTouring ? (
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M8 5v14l11-7L8 5z"/></svg>
                )}
            </button>
            <button onClick={handleTogglePhantom} className="generation-btn" aria-label="Toggle Phantom">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2.5-9c.83 0 1.5-.67 1.5-1.5S10.33 8 9.5 8 8 8.67 8 9.5s.67 1.5 1.5 1.5zm5 0c.83 0 1.5-.67 1.5-1.5S15.33 8 14.5 8s-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm-5 4c1.48 0 2.75-.81 3.45-2H8.05c.7 1.19 1.97 2 3.45 2z"/></svg>
            </button>
             <button onClick={onToggleArtLens} className="generation-btn" aria-label="Toggle Artistic Lens">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4c-.83 0-1.5-.67-1.5-1.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
            </button>
             <button onClick={onToggleTelemetry} className={cn('generation-btn', {toggled: isTelemetryOpen})} aria-label="Toggle Telemetry">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/></svg>
            </button>
        </div>
    );
};

// --- Chat Log ---
const ChatLog = ({ messages }: { messages: Message[] }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="chat-log-container" ref={scrollRef}>
            {messages.map((msg) => (
                <div key={msg.id} className={cn('chat-message', msg.sender)}>
                    <div className="chat-bubble">{msg.text}</div>
                </div>
            ))}
        </div>
    );
};

// --- MAIN APP COMPONENT ---
export function App() {
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);
  const [isArtLensOpen, setIsArtLensOpen] = useState(false);
  const [isModulesPanelOpen, setIsModulesPanelOpen] = useState(false);
  const [isVoicePanelOpen, setIsVoicePanelOpen] = useState(false);
  const [isTouring, setIsTouring] = useState(false);
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [currentAIState, setCurrentAIState] = useState('idle');
  const [cameraData, setCameraData] = useState<CameraData | null>(null);
  const [galaxyData, setGalaxyData] = useState<GalaxyData>({ points: null, bounds: null });
  
  const [voiceProfiles, setVoiceProfiles] = useState<any[]>([]);
  const [activePersonalityModule, setActivePersonalityModule] = useState<any>(null);

  useEffect(() => {
    const loadAndSetDefaultProfile = async () => {
        try {
            const response = await fetch('./voice-profiles.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setVoiceProfiles(data.voiceProfiles);
            // Set the first profile as the default
            if (data.voiceProfiles.length > 0) {
                setActivePersonalityModule(data.voiceProfiles[0]);
            }
        } catch (error) {
            console.error("Could not load voice profiles:", error);
        }
    };
    loadAndSetDefaultProfile();
  }, []);

  useEffect(() => {
    if (activePersonalityModule && (window as any).setVisualConfig) {
        (window as any).setVisualConfig({
            ambientColor: activePersonalityModule.visuals.ambientColor,
            sunColor: activePersonalityModule.visuals.sunColor,
        });
    }
  }, [activePersonalityModule]);
  
  const systemInstruction = activePersonalityModule?.systemInstruction;
  const liveApi = useLiveApi({ 
      apiKey: process.env.API_KEY || '', 
      systemInstruction 
  });

  useEffect(() => {
    const handleStateChange = (e: CustomEvent) => setCurrentAIState(e.detail.state);
    const handleCameraUpdate = (e: CustomEvent) => setCameraData({ position: e.detail.position, direction: e.detail.direction });
    const handleGalaxyReady = (e: CustomEvent) => setGalaxyData({ points: e.detail.points, bounds: e.detail.bounds });
    const handleCameraControlChange = (e: CustomEvent) => {
        if (e.detail) {
            setIsTouring(e.detail.isTouring);
            setIsAutoRotating(e.detail.isAutoRotating);
        }
    };

    window.addEventListener('aistatechange', handleStateChange as EventListener);
    window.addEventListener('cameraupdate', handleCameraUpdate as EventListener);
    window.addEventListener('galaxyready', handleGalaxyReady as EventListener);
    window.addEventListener('cameracontrolchange', handleCameraControlChange as EventListener);

    return () => {
        window.removeEventListener('aistatechange', handleStateChange as EventListener);
        window.removeEventListener('cameraupdate', handleCameraUpdate as EventListener);
        window.removeEventListener('galaxyready', handleGalaxyReady as EventListener);
        window.removeEventListener('cameracontrolchange', handleCameraControlChange as EventListener);
    };
  }, []);
  
  const handleNavigate = (target: THREE.Vector3) => {
    window.dispatchEvent(new CustomEvent('navigatetopoint', { detail: { target } }));
  };

  const handleToggleTour = () => {
    window.dispatchEvent(new CustomEvent('toggletour'));
  };

  const handleToggleAutoRotate = () => {
    if ((window as any).toggleAutoRotate) {
        (window as any).toggleAutoRotate();
    }
  };

  const handleSelectProfile = (profile: any) => {
    setActivePersonalityModule(profile);
    setIsVoicePanelOpen(false);
  };

  return (
    <StrictMode>
      <LiveAPIContext.Provider value={liveApi}>
          <header className="main-header">
              <h1>AURELION <span className="sub-title">Universal Creation Engine</span></h1>
              <div className="header-controls">
                 <button className="module-selector-btn" onClick={() => setIsVoicePanelOpen(true)}>
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                    <span>Select Voice</span>
                </button>
                 <button className="module-selector-btn" onClick={() => setIsModulesPanelOpen(true)}>
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M4 18h17v-6H4v6zM4 5v6h17V5H4z"/></svg>
                    <span>Select Module</span>
                </button>
              </div>
          </header>

          <main className={cn('main-content', { 'telemetry-visible': isTelemetryOpen })}>
             <div className="left-panel">
                <ChatLog messages={liveApi.messages} />
             </div>
          </main>
          
          <TopRightControls
            isTelemetryOpen={isTelemetryOpen}
            onToggleTelemetry={() => setIsTelemetryOpen(prev => !prev)}
            onToggleArtLens={() => setIsArtLensOpen(true)}
            isTouring={isTouring}
            onToggleTour={handleToggleTour}
            isAutoRotating={isAutoRotating}
            onToggleAutoRotate={handleToggleAutoRotate}
          />

          <TelemetryPanel
            isOpen={isTelemetryOpen}
            onClose={() => setIsTelemetryOpen(false)}
            lastUsage={liveApi.lastUsage}
            totalUsage={liveApi.totalUsage}
            messageCount={liveApi.messages.length}
            isConnected={liveApi.connected}
          />
          
          <div className={cn('basic-face-container', currentAIState)}>
            <div className={cn('ai-state-indicator', currentAIState)}>
                {currentAIState.toUpperCase()}
            </div>
            <BasicFace
                mouthScale={liveApi.outputVolume}
                eyeScale={1}
                color="rgba(100, 150, 255, 0.5)"
            />
          </div>

          {galaxyData.points && cameraData && (
              <Minimap 
                  galaxyPoints={galaxyData.points}
                  galaxyBounds={galaxyData.bounds}
                  cameraData={cameraData}
                  onNavigate={handleNavigate}
              />
          )}
          
          <ControlTray />

          <ModulesPanel
            isOpen={isModulesPanelOpen}
            onClose={() => setIsModulesPanelOpen(false)}
          />
          <VoiceProfileSelector
            isOpen={isVoicePanelOpen}
            onClose={() => setIsVoicePanelOpen(false)}
            profiles={voiceProfiles}
            activeProfileId={activePersonalityModule?.id}
            onSelect={handleSelectProfile}
          />
          <ArtisticLensPanel
            isOpen={isArtLensOpen}
            onClose={() => setIsArtLensOpen(false)}
          />

      </LiveAPIContext.Provider>
    </StrictMode>
  );
}