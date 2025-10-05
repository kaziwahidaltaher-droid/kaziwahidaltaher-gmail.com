import React, { useState } from 'react';
import { Chart } from 'react-chartjs-2';
import { Button, Input, Select, Table } from 'antd';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';

interface PredictionResult {
  label: string;
  confidence: number;
}

interface FeatureImportance {
  feature: string;
  importance: number;
}

const mockPrediction: PredictionResult = {
  label: 'Confirmed Exoplanet',
  confidence: 0.92,
};

const mockFeatureImportance: FeatureImportance[] = [
  { feature: 'Transit Depth', importance: 0.35 },
  { feature: 'Orbital Period', importance: 0.25 },
  { feature: 'Planetary Radius', importance: 0.20 },
  { feature: 'Transit Duration', importance: 0.10 },
  { feature: 'Stellar Flux', importance: 0.10 },
];

const AiCoreVisualizer: React.FC = () => {
  const [inputData, setInputData] = useState('');
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);

  const handlePredict = () => {
    // Replace with actual model inference logic
    setPrediction(mockPrediction);
  };

  const featureChartData = {
    labels: mockFeatureImportance.map((f) => f.feature),
    datasets: [
      {
        label: 'Feature Importance',
        data: mockFeatureImportance.map((f) => f.importance),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
      },
    ],
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>🧠 AI Core Visualizer</h2>
      <Input.TextArea
        rows={4}
        placeholder="Enter transit data (JSON or CSV format)"
        value={inputData}
        onChange={(e) => setInputData(e.target.value)}
      />
      <Button type="primary" onClick={handlePredict} style={{ marginTop: '1rem' }}>
        Run Prediction
      </Button>

      {prediction && (
        <div style={{ marginTop: '2rem' }}>
          <h3>🔍 Prediction Result</h3>
          <p><strong>Label:</strong> {prediction.label}</p>
          <p><strong>Confidence:</strong> {(prediction.confidence * 100).toFixed(2)}%</p>
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <h3>📊 Feature Importance</h3>
        <Bar data={featureChartData} />
      </div>
    </div>
  );
};

export default AiCoreVisualizer;
