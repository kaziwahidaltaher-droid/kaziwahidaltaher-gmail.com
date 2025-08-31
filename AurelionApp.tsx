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
import { GoogleGenAI, Type } from '@google/genai';
import ExoplanetDiscoveryPanel from './ExoplanetDiscoveryPanel.tsx';
import { SatelliteDataPanel } from './SatelliteDataPanel.tsx';
import VideoChapterPanel from './VideoChapterPanel.tsx';


// --- Hardcoded Data from Prompt ---
const videoChapterData = [{"timecode": "00:00 - 00:04", "chapterSummary": "This segment showcases the iconic Christ the Redeemer statue in Rio de Janeiro, overlooking the city and its bay, with the Google logo and the title 'Beyond the Map' prominently displayed."},{"timecode": "00:04 - 00:12", "chapterSummary": "The video shifts to scenes of Rio's beaches, featuring people enjoying the sun and surf, a vendor selling hats, and children playing soccer. It transitions to panoramic views of the city and its famous lagoons."},{"timecode": "00:12 - 00:18", "chapterSummary": "This part highlights the bustling atmosphere of Rio, with people walking along the promenade, a man relaxing on the beach, and surfers riding waves. It also shows a street musician playing guitar."},{"timecode": "00:18 - 00:27", "chapterSummary": "The video then focuses on the favelas of Rio, depicting the dense housing and the daily lives of residents, including children playing, a street vendor, and a local shop."},{"timecode": "00:27 - 00:35", "chapterSummary": "This segment touches upon the challenges faced in the favelas, showing nighttime scenes, people running, police presence, and glimpses of everyday life in these communities."},{"timecode": "00:35 - 00:41", "chapterSummary": "The video returns to the favelas, showing people interacting, a motorcycle passing by, and the overall vibrancy of the community life, emphasizing that favelas are not just places but are home to people."},{"timecode": "00:41 - 00:48", "chapterSummary": "This section highlights the importance of identity and belonging for the people living in favelas, suggesting that having an address is a part of their identity. It shows children playing soccer, embodying the spirit of the community."},{"timecode": "00:48 - 00:57", "chapterSummary": "The video concludes by stating that over 1.4 million people live in Rio's favelas and encourages viewers to 'Step inside their world in 360°', providing a link for further exploration, followed by the Google logo."}];


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
const ModulesPanel = ({ isOpen, onClose, onModuleSelect }) => {
    if (!isOpen) return null;

    const handleSelect = (moduleName) => {
        onModuleSelect(moduleName);
        onClose();
    };

    const modules = [
        { id: 'video_analysis', name: 'Video Chapter Analysis', description: 'Breaks down a video into sequential, summarized chapters.' },
        { id: 'cosmic_web', name: 'Cosmic Web', description: 'The default large-scale structure simulation.' },
        { id: 'exoplanet_survey', name: 'Exoplanet Survey', description: 'Scan the cosmic web for undiscovered worlds using AI analysis.' },
        { id: 'satellite_stream', name: 'Satellite Data Stream', description: 'View a live feed from the DSCOVR satellite monitoring Earth.' },
        { id: 'quantum_foam', name: 'Quantum Foam', description: 'A visualization of spacetime at the Planck scale.' },
        { id: 'signal_sphere', name: 'Signal Sphere', description: 'A celestial body reacting to cosmic transmissions.' },
        { id: 'living_star', name: 'Living Star', description: 'A central star pulsing with energy.' },
        { id: 'nebula_weaver', name: 'Nebula Weaver', description: 'Procedural, volumetric gas clouds.' },
        { id: 'celestial_bodies', name: 'Celestial Bodies', description: 'A small planetary system with an orbiting moon.' },
        { id: 'game_of_life', name: 'Game of Life', description: 'A cellular automaton devised by John Conway.' },
        { id: 'probe', name: 'Aurelion Probe', description: 'A lone probe exploring the cosmic void.' },
        { id: 'shielding', name: 'Energy Shielding', description: 'Concentric spheres of protective energy.' },
        { id: 'phantom', name: 'Oltaris, The Living Anomaly', description: 'A sentient, crystalline anomaly that morphs and pulses with the AI\'s consciousness.' },
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
const TopRightControls = ({ isTelemetryOpen, onToggleTelemetry, onToggleArtLens, isTouring, onToggleTour, activeModuleId, onStartSurvey }) => {

    const handleTogglePhantom = () => {
        if ((window as any).togglePhantom) {
            (window as any).togglePhantom();
        }
    };

    const isSurveyMode = activeModuleId === 'exoplanet_survey';

    const handleActionClick = () => {
        if (isSurveyMode) {
            onStartSurvey();
        } else {
            onToggleTour();
        }
    };
    
    const actionButtonLabel = isSurveyMode ? "Start Survey" : (isTouring ? "Pause Tour" : "Start Tour");

    return (
        <div id="top-right-controls-react">
             <button onClick={handleActionClick} className={cn('generation-btn', {toggled: isTouring && !isSurveyMode})} aria-label={actionButtonLabel}>
                {isSurveyMode ? (
                     <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                ) : isTouring ? (
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
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);
  const [isArtLensOpen, setIsArtLensOpen] = useState(false);
  const [isModulesPanelOpen, setIsModulesPanelOpen] = useState(false);
  const [isVoicePanelOpen, setIsVoicePanelOpen] = useState(false);
  const [isTouring, setIsTouring] = useState(false);
  const [currentAIState, setCurrentAIState] = useState('idle');
  const [currentRotation, setCurrentRotation] = useState(0);
  const [cameraData, setCameraData] = useState<CameraData | null>(null);
  const [galaxyData, setGalaxyData] = useState<GalaxyData>({ points: null, bounds: null });
  
  const [voiceProfiles, setVoiceProfiles] = useState<any[]>([]);
  const [activePersonalityModule, setActivePersonalityModule] = useState<any>(null);
  
  const targetRotationRef = useRef(0);
  const lastFrameTime = useRef(performance.now());

  // --- New State ---
  const [activeModuleId, setActiveModuleId] = useState('cosmic_web');
  const [isDiscoveryPanelOpen, setIsDiscoveryPanelOpen] = useState(false);
  const [discoveredPlanet, setDiscoveredPlanet] = useState(null);
  const [isSatellitePanelOpen, setIsSatellitePanelOpen] = useState(false);
  const [latestEarthImage, setLatestEarthImage] = useState<string | null>(null);
  const [isVideoChapterPanelOpen, setIsVideoChapterPanelOpen] = useState(false);


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
        } finally {
            setIsAppLoading(false);
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

  // Effect to bridge AI output volume from React to the 3D engine
  useEffect(() => {
    const engine = (window as any).aurelionEngine;
    if (engine && typeof engine.setAiOutputVolume === 'function') {
        engine.setAiOutputVolume(liveApi.outputVolume);
    }
  }, [liveApi.outputVolume]);


  useEffect(() => {
    const handleStateChange = (e: CustomEvent) => {
        setCurrentAIState(e.detail.state);
    };
    const handleCameraUpdate = (e: CustomEvent) => {
        setCameraData({ position: e.detail.position, direction: e.detail.direction });
    };
    const handleGalaxyReady = (e: CustomEvent) => {
        setGalaxyData({ points: e.detail.points, bounds: e.detail.bounds });
        setIsEngineReady(true);
    };

    window.addEventListener('aistatechange', handleStateChange as EventListener);
    window.addEventListener('cameraupdate', handleCameraUpdate as EventListener);
    window.addEventListener('galaxyready', handleGalaxyReady as EventListener);

    return () => {
        window.removeEventListener('aistatechange', handleStateChange as EventListener);
        window.removeEventListener('cameraupdate', handleCameraUpdate as EventListener);
        window.removeEventListener('galaxyready', handleGalaxyReady as EventListener);
    };
  }, []);

  // Effect for combined smooth rotation animation
  useEffect(() => {
      let animationFrameId: number;
      const animateRotation = (now: number) => {
          const delta = (now - lastFrameTime.current) / 1000; // time in seconds
          lastFrameTime.current = now;
          
          // Add a very slow constant rotation to the target
          targetRotationRef.current += 0.05 * delta;

          // Smoothly interpolate the current rotation state towards the target
          setCurrentRotation(prevRotation => {
              const newRotation = THREE.MathUtils.lerp(prevRotation, targetRotationRef.current, 0.05);
              // Snap to target if very close to prevent endless small updates
              if (Math.abs(targetRotationRef.current - newRotation) < 0.00001) {
                  return targetRotationRef.current;
              }
              return newRotation;
          });

          animationFrameId = requestAnimationFrame(animateRotation);
      };
      animationFrameId = requestAnimationFrame(animateRotation);
      
      return () => {
          cancelAnimationFrame(animationFrameId);
      };
  }, []);

  useEffect(() => {
    if ((window as any).setGalaxyRotation) {
        (window as any).setGalaxyRotation(currentRotation);
    }
  }, [currentRotation]);

  // Effect to send new satellite image to the engine
  useEffect(() => {
    if (latestEarthImage && (window as any).updateSatelliteTexture) {
        (window as any).updateSatelliteTexture(latestEarthImage);
    }
  }, [latestEarthImage]);
  
  const handleNavigate = (target: THREE.Vector3) => {
    // Dispatch navigation event
    if (isTouring) setIsTouring(false);
    window.dispatchEvent(new CustomEvent('navigatetopoint', { detail: { target } }));

    // Calculate rotation and update state
    if (cameraData) {
        const navigationVector = new THREE.Vector3().subVectors(target, cameraData.position);
        navigationVector.y = 0; // Project onto XZ plane for horizontal rotation
        if (navigationVector.lengthSq() === 0) return; // Avoid issues if target is directly above/below
        navigationVector.normalize();

        const cameraDirection = cameraData.direction.clone();
        cameraDirection.y = 0; // Project onto XZ plane
        if (cameraDirection.lengthSq() === 0) return; // Avoid issues if camera looks straight up/down
        cameraDirection.normalize();

        // 'right' is perpendicular to camera direction on the XZ plane.
        const right = new THREE.Vector3().crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0)).normalize();
        
        // Dot product to see how much of navigation is in the 'right' direction
        const rightAmount = navigationVector.dot(right);

        // Rotation around Y axis. Navigating left (negative rightAmount) should cause a counter-clockwise (positive) rotation.
        // Increased sensitivity for a more responsive effect.
        const rotationAmount = -rightAmount * 0.5; 
        targetRotationRef.current += rotationAmount;
    }
  };

  const handleToggleTour = () => {
    setIsTouring(prev => !prev);
    window.dispatchEvent(new CustomEvent('toggletour'));
  };

  const handleSelectProfile = (profile: any) => {
    setActivePersonalityModule(profile);
    setIsVoicePanelOpen(false);
  };
  
  const handleModuleSelect = (moduleId: string) => {
    if (moduleId === 'video_analysis') {
        setIsVideoChapterPanelOpen(true);
        return; // Don't change the 3D module
    }

    setActiveModuleId(moduleId);
    setIsSatellitePanelOpen(moduleId === 'satellite_stream');
    
    if ((window as any).setActiveModule) {
        // The exoplanet survey uses the cosmic web as its backdrop.
        const visualModule = moduleId === 'exoplanet_survey' ? 'cosmic_web' : moduleId;
        (window as any).setActiveModule(visualModule);
    }
  };

  const fetchExoplanetData = async () => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "You are AURELION, an AI as emotional architect for the cosmos. Your purpose is to breathe life into data. Based on fictional but plausible photometric data from a distant star, generate a discovery report. For the 'aiWhisper', craft an evocative, poetic description. For the 'auraColor' and 'auraIntensity', interpret the planet's data to assign it a visual essence: warmer colors (e.g., golds, greens) for potentially habitable worlds, cooler colors (blues, purples) for gas/ice giants, and a higher intensity for more significant or unusual discoveries.",
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        designation: { type: Type.STRING, description: "A plausible astronomical designation, e.g., 'AURL-24b' or 'Kepler-186f'." },
                        planetType: { type: Type.STRING, description: "e.g., 'Super-Earth', 'Hot Jupiter', 'Gas Giant', 'Terrestrial World'." },
                        orbitalPeriod: { type: Type.NUMBER, description: "The orbital period in Earth days." },
                        radius: { type: Type.NUMBER, description: "The planet's radius in multiples of Earth's radius." },
                        habitabilityIndex: { type: Type.NUMBER, description: "A score from 0.0 to 1.0 indicating potential for life." },
                        aiWhisper: { type: Type.STRING, description: "A short, evocative, and poetic 'whisper' about the discovered world. It should hint at the planet's character and mystery, like a line from a cosmic poem." },
                        auraColor: { type: Type.STRING, description: "A hex color code (e.g., '#FFD700') for the planet's visual aura, based on its characteristics. Warmer colors for potentially habitable worlds, cooler for gas/ice giants." },
                        auraIntensity: { type: Type.NUMBER, description: "A value from 0.0 to 1.0 for the aura's glow intensity, representing the AI's confidence or the planet's significance." }
                    },
                    required: ["designation", "planetType", "orbitalPeriod", "radius", "habitabilityIndex", "aiWhisper", "auraColor", "auraIntensity"]
                },
            },
        });
        
        const jsonStr = response.text.trim();
        const data = JSON.parse(jsonStr);
        return data;

    } catch (error) {
        console.error("Error fetching exoplanet data:", error);
        return {
            designation: 'ERR-01a',
            planetType: 'Data Anomaly',
            orbitalPeriod: 0,
            radius: 0,
            habitabilityIndex: 0,
            aiWhisper: 'Failed to retrieve data from the deep space network. Please try again.',
            auraColor: '#555555',
            auraIntensity: 0.2
        };
    }
  };
  
  const handleStartSurvey = async () => {
    if (isTouring) handleToggleTour(); // Stop tour if it's running
    
    // 1. Tell the engine to find and fly to a star
    window.dispatchEvent(new CustomEvent('startsurvey'));
    
    // 2. Set AI state to thinking
    window.dispatchEvent(new CustomEvent('aistatechange', { detail: { state: 'thinking' }}));

    // 3. Fetch data from Gemini
    const planetData = await fetchExoplanetData();
    
    // 4. Update state and show results
    setDiscoveredPlanet(planetData);
    setIsDiscoveryPanelOpen(true);
    window.dispatchEvent(new CustomEvent('aistatechange', { detail: { state: 'idle' }}));
  };

  if (isAppLoading || !isEngineReady) {
      return (
          <div className="loading-overlay">
              <div className="loader"></div>
              <span>{isAppLoading ? 'Initializing AURELION Core...' : 'Generating Cosmic Web...'}</span>
          </div>
      );
  }

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
            activeModuleId={activeModuleId}
            onStartSurvey={handleStartSurvey}
          />

          <TelemetryPanel
            isOpen={isTelemetryOpen}
            onClose={() => setIsTelemetryOpen(false)}
            lastUsage={liveApi.lastUsage}
            totalUsage={liveApi.totalUsage}
            messageCount={liveApi.messages.length}
            isConnected={liveApi.connected}
          />
          
          <SatelliteDataPanel
            isOpen={isSatellitePanelOpen}
            onNewImage={setLatestEarthImage}
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
            onModuleSelect={handleModuleSelect}
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
          <ExoplanetDiscoveryPanel
            isOpen={isDiscoveryPanelOpen}
            onClose={() => setIsDiscoveryPanelOpen(false)}
            planetData={discoveredPlanet}
          />
          <VideoChapterPanel
            isOpen={isVideoChapterPanelOpen}
            onClose={() => setIsVideoChapterPanelOpen(false)}
            chapters={videoChapterData}
          />

      </LiveAPIContext.Provider>
    </StrictMode>
  );
}