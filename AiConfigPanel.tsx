/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect } from "react";

export interface AiConfig {
  model: string;
  temperature: number;
  topK: number;
  topP: number;
  systemInstruction: string;
}

export interface EmotionalModule {
  name: string;
  description: string;
  config: AiConfig;
}

interface AiConfigPanelProps {
  config: AiConfig;
  onConfigChange: (config: AiConfig) => void;
  emotionalModules: EmotionalModule[];
}

export const AiConfigPanel: React.FC<AiConfigPanelProps> = ({
  config,
  onConfigChange,
  emotionalModules,
}) => {
  const [selectedModule, setSelectedModule] = useState<string>("custom");

  useEffect(() => {
    const matchingModule = emotionalModules.find(
      (module) => JSON.stringify(module.config) === JSON.stringify(config)
    );
    setSelectedModule(matchingModule ? matchingModule.name : "custom");
  }, [config, emotionalModules]);

  const handleModuleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const moduleName = e.target.value;
    const selected = emotionalModules.find((m) => m.name === moduleName);
    if (selected) {
      onConfigChange(selected.config);
    }
    setSelectedModule(moduleName);
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    const target = e.target as HTMLInputElement;
    let processedValue: string | number = value;

    if (target.type === "number" || target.type === "range") {
      processedValue = value === "" ? 0 : parseFloat(value);
    }

    onConfigChange({
      ...config,
      [name]: processedValue,
    });
  };

  return (
    <div className="ai-config-panel hud-panel">
      <div className="config-item">
        <label htmlFor="module-select">AI Personality Module</label>
        <div className="config-input-wrapper">
          <select
            id="module-select"
            value={selectedModule}
            onChange={handleModuleChange}
          >
            {emotionalModules.map((module) => (
              <option key={module.name} value={module.name}>
                {module.name} - {module.description}
              </option>
            ))}
            <option value="custom">Custom Configuration</option>
          </select>
        </div>
        <p className="config-description">
          Select a pre-configured personality for the AI. Any manual changes
          will create a custom configuration.
        </p>
      </div>

      <hr />

      <div className="config-item">
        <label htmlFor="model">AI Model</label>
        <div className="config-input-wrapper">
          <select
            id="model"
            name="model"
            value={config.model}
            onChange={handleInputChange}
          >
            <option value="gemini-2.5-flash">gemini-2.5-flash</option>
          </select>
        </div>
        <p className="config-description">
          The AI model used by the AURELION Probe for generating responses.
        </p>
      </div>

      <div className="config-item">
        <label htmlFor="temperature">
          Temperature:{" "}
          {typeof config.temperature === "number"
            ? config.temperature.toFixed(1)
            : "0.0"}
        </label>
        <div className="config-input-wrapper">
          <input
            type="range"
            id="temperature"
            name="temperature"
            min="0"
            max="1"
            step="0.1"
            value={config.temperature}
            onChange={handleInputChange}
          />
        </div>
        <p className="config-description">
          Controls randomness. Lower values are more deterministic, higher
          values are more creative.
        </p>
      </div>

      <div className="config-item-group">
        <div className="config-item">
          <label htmlFor="topK">Top-K</label>
          <div className="config-input-wrapper">
            <input
              type="number"
              id="topK"
              name="topK"
              min="1"
              step="1"
              value={config.topK}
              onChange={handleInputChange}
            />
          </div>
          <p className="config-description">
            Changes how the model selects tokens for output.
          </p>
        </div>
        <div className="config-item">
          <label htmlFor="topP">Top-P</label>
          <div className="config-input-wrapper">
            <input
              type="number"
              id="topP"
              name="topP"
              min="0"
              max="1"
              step="0.05"
              value={config.topP}
              onChange={handleInputChange}
            />
          </div>
          <p className="config-description">
            Selects tokens from the most probable choices.
          </p>
        </div>
      </div>

      <div className="config-item">
        <label htmlFor="systemInstruction">System Instruction</label>
        <div className="config-input-wrapper">
          <textarea
            id="systemInstruction"
            name="systemInstruction"
            value={config.systemInstruction}
            onChange={handleInputChange}
            rows={10}
          ></textarea>
        </div>
        <p className="config-description">
          The core directive that defines the AI's persona and task.
        </p>
      </div>
    </div>
  );
};
