/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import cn from 'classnames';
import { UsageStats } from './use-live-api.tsx';

type ProgressBarProps = {
  promptValue: number;
  responseValue: number;
  totalValue: number;
  label: string;
};

const ProgressBar: React.FC<ProgressBarProps> = ({ promptValue, responseValue, totalValue, label }) => {
  const promptPercentage = totalValue > 0 ? (promptValue / totalValue) * 100 : 0;
  const responsePercentage = totalValue > 0 ? (responseValue / totalValue) * 100 : 0;

  return (
    <div className="progress-bar-container">
      <div className="progress-bar-labels">
        <span>{label}</span>
        <span>{totalValue.toLocaleString()} Tokens</span>
      </div>
      <div className="progress-bar">
        <div className="progress-bar-prompt" style={{ width: `${promptPercentage}%` }} title={`Prompt: ${promptValue.toLocaleString()}`}></div>
        <div className="progress-bar-response" style={{ width: `${responsePercentage}%` }} title={`Response: ${responseValue.toLocaleString()}`}></div>
      </div>
    </div>
  );
};


type TelemetryPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  lastUsage: UsageStats | null;
  totalUsage: UsageStats;
  messageCount: number;
  isConnected: boolean;
};

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({ isOpen, onClose, lastUsage, totalUsage, messageCount, isConnected }) => {
  return (
    <div className={cn('telemetry-panel', { closed: !isOpen })}>
        <div className="telemetry-header">
            <h4>API Telemetry</h4>
            <button onClick={onClose} className="telemetry-close-btn" aria-label="Close Telemetry">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>
            </button>
        </div>
        <div className="telemetry-body">
            <div className="telemetry-section">
                <h5>API Status</h5>
                <div className="metrics-grid">
                    <div className="metric-item">
                        <div className="metric-label-container">
                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor">
                                <path d="M0 0h24v24H0V0z" fill="none"/>
                                <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C19.73 3.27 4.27 3.27 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zM5 13l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/>
                            </svg>
                            <span className="metric-label">Status</span>
                        </div>
                        <div className={cn('metric-value', { connected: isConnected, disconnected: !isConnected })}>
                            <div className="status-dot"></div>
                            <span>{isConnected ? 'Online' : 'Offline'}</span>
                        </div>
                    </div>
                     <div className="metric-item">
                        <div className="metric-label-container">
                             <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor">
                                <path d="M0 0h24v24H0V0z" fill="none"/>
                                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                            </svg>
                            <span className="metric-label">Messages</span>
                        </div>
                        <span className="metric-value">{messageCount}</span>
                    </div>
                </div>
            </div>
             {lastUsage && (
                <div className="telemetry-section">
                    <h5>Last Turn Usage</h5>
                    <ProgressBar
                        label="Prompt / Response"
                        promptValue={lastUsage.promptTokens}
                        responseValue={lastUsage.responseTokens}
                        totalValue={lastUsage.totalTokens}
                    />
                </div>
            )}
            <div className="telemetry-section">
                <h5>Session Total Usage</h5>
                 <ProgressBar
                    label="Prompt / Response"
                    promptValue={totalUsage.promptTokens}
                    responseValue={totalUsage.responseTokens}
                    totalValue={totalUsage.totalTokens}
                />
            </div>
        </div>
    </div>
  );
};
