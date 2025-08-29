import React, { useState, useEffect, StrictMode, useContext, useRef } from 'react';
import BasicFace from './BasicFace.tsx';
import ControlTray from './ControlTray.tsx';
import { useLiveApi, LiveAPIContext, Message, UsageStats } from './use-live-api.tsx';
import cn from 'classnames';
import ArtisticLensPanel from './ArtisticLensPanel.tsx';

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
const TopRightControls = ({ isTelemetryOpen, onToggleTelemetry, onToggleArtLens }) => {
    const handleTogglePhantom = () => {
        if ((window as any).togglePhantom) {
            (window as any).togglePhantom();
        }
    };

    return (
        <div id="top-right-controls-react">
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

// --- Telemetry Panel ---
const TelemetryPanel = ({ lastUsage, totalUsage }) => {
    return (
        <div className="telemetry-panel">
            <h4>Last Turn</h4>
            {lastUsage ? (
                <ul>
                    <li><span>Prompt:</span> {lastUsage.promptTokens} tokens</li>
                    <li><span>Response:</span> {lastUsage.responseTokens} tokens</li>
                    <li><span>Total:</span> {lastUsage.totalTokens} tokens</li>
                </ul>
            ) : <p>No usage data yet.</p>}

            <h4>Session Total</h4>
             <ul>
                <li><span>Prompt:</span> {totalUsage.promptTokens} tokens</li>
                <li><span>Response:</span> {totalUsage.responseTokens} tokens</li>
                <li><span>Total:</span> {totalUsage.totalTokens} tokens</li>
            </ul>
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
// FIX: Rename component to `App` to match the import in `index.tsx`.
export function App() {
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);
  const [isArtLensOpen, setIsArtLensOpen] = useState(false);
  const [isModulesPanelOpen, setIsModulesPanelOpen] = useState(false);
  const [currentAIState, setCurrentAIState] = useState('idle');

  const liveApi = useLiveApi({ apiKey: process.env.API_KEY || '' });

  useEffect(() => {
    const handleStateChange = (e: CustomEvent) => {
        setCurrentAIState(e.detail.state);
    };
    window.addEventListener('aistatechange', handleStateChange as EventListener);
    return () => window.removeEventListener('aistatechange', handleStateChange as EventListener);
  }, []);

  return (
    <StrictMode>
      <LiveAPIContext.Provider value={liveApi}>
          <header className="main-header">
              <h1>AURELION <span className="sub-title">Universal Creation Engine</span></h1>
              <div className="header-controls">
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
             <div className="right-panel">
                {isTelemetryOpen && <TelemetryPanel lastUsage={liveApi.lastUsage} totalUsage={liveApi.totalUsage} />}
             </div>
          </main>
          
          <TopRightControls
            isTelemetryOpen={isTelemetryOpen}
            onToggleTelemetry={() => setIsTelemetryOpen(prev => !prev)}
            onToggleArtLens={() => setIsArtLensOpen(true)}
          />
          
          <div className="basic-face-container">
            <div className={cn('ai-state-indicator', currentAIState)}>
                {currentAIState.toUpperCase()}
            </div>
            <BasicFace
                mouthScale={liveApi.outputVolume}
                eyeScale={1}
                color="rgba(100, 150, 255, 0.5)"
            />
          </div>
          
          <ControlTray />

          <ModulesPanel
            isOpen={isModulesPanelOpen}
            onClose={() => setIsModulesPanelOpen(false)}
          />
          <ArtisticLensPanel
            isOpen={isArtLensOpen}
            onClose={() => setIsArtLensOpen(false)}
          />

      </LiveAPIContext.Provider>
    </StrictMode>
  );
}
