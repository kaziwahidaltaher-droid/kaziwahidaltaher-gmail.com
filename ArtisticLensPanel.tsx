/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';
import { ArbitraryStyleTransferNetwork } from '@magenta/image';
import cn from 'classnames';

// --- Style Definitions ---
const styles = [
  { name: 'The Great Wave', url: 'https://upload.wikimedia.org/wikipedia/commons/0/0a/The_Great_Wave_off_Kanagawa.jpg' },
  { name: 'Starry Night', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1024px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg' },
  { name: 'Composition 7', url: 'https://upload.wikimedia.org/wikipedia/commons/b/b4/Vassily_Kandinsky%2C_1913_-_Composition_7.jpg' },
  { name: 'Pillars of Creation', url: 'https://upload.wikimedia.org/wikipedia/commons/6/68/Pillars_of_creation_2014_HST_WFC3-UVIS_full-res_denoised.jpg' },
  { name: 'The Scream', url: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg' },
  { name: 'Nantes', url: 'https://upload.wikimedia.org/wikipedia/commons/b/b7/JMW_Turner_-_Nantes_from_the_Ile_Feydeau.jpg' },
];

// --- The Component ---
const ArtisticLensPanel = ({ isOpen, onClose }) => {
  const modelRef = useRef<ArbitraryStyleTransferNetwork | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [selectedStyleUrl, setSelectedStyleUrl] = useState(styles[0].url);
  const [isGenerating, setIsGenerating] = useState(false);
  const [outputImage, setOutputImage] = useState<string | null>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);

  // Load the Magenta.js model on component mount
  useEffect(() => {
    if (!isOpen) return;
    const loadModel = async () => {
      try {
        const model = new ArbitraryStyleTransferNetwork();
        await model.initialize();
        modelRef.current = model;
        setIsModelLoaded(true);
      } catch (error) {
        console.error("Failed to load style transfer model:", error);
      }
    };
    if (!modelRef.current) {
        loadModel();
    }
  }, [isOpen]);

  const handleGenerate = async () => {
    if (!isModelLoaded || !modelRef.current) {
        console.warn("Model not loaded yet.");
        return;
    }

    setIsGenerating(true);
    setOutputImage(null);

    try {
        // 1. Capture the main 3D canvas as the content image
        const mainCanvas = document.getElementById('bg') as HTMLCanvasElement;
        const contentImg = new Image();
        contentImg.src = mainCanvas.toDataURL('image/jpeg');
        await new Promise((resolve, reject) => {
            contentImg.onload = resolve;
            contentImg.onerror = reject;
        });

        // 2. Load the selected style image (handling potential CORS issues)
        const styleImg = new Image();
        styleImg.crossOrigin = "anonymous";
        styleImg.src = selectedStyleUrl;
         await new Promise((resolve, reject) => {
            styleImg.onload = resolve;
            styleImg.onerror = reject;
        });
        
        // 3. Perform the style transfer onto our hidden canvas
        const outputCanvas = outputCanvasRef.current;
        if (outputCanvas) {
            outputCanvas.width = contentImg.width;
            outputCanvas.height = contentImg.height;
            const stylizedResult = await modelRef.current.stylize(contentImg, styleImg);
            const ctx = outputCanvas.getContext('2d');
            if (ctx) {
              ctx.putImageData(stylizedResult, 0, 0);
            }
            setOutputImage(outputCanvas.toDataURL('image/jpeg'));
        }
    } catch (error) {
        console.error("Error during style transfer:", error);
    } finally {
        setIsGenerating(false);
    }
  };
  
  const handleSave = () => {
    if (!outputImage) return;
    const link = document.createElement('a');
    link.download = 'aurelion-artwork.jpg';
    link.href = outputImage;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="artistic-lens-overlay" onClick={onClose}>
        <div className="artistic-lens-panel" onClick={(e) => e.stopPropagation()}>
            <h3>Artistic Lens</h3>
            
            <p className="panel-description">Reimagine the cosmos. Select a style, then generate a new piece of art based on the current view.</p>

            <h4>Choose a Style</h4>
            <div className="style-grid">
                {styles.map(style => (
                    <div
                        key={style.name}
                        className={cn('style-thumbnail', { selected: selectedStyleUrl === style.url })}
                        style={{ backgroundImage: `url(${style.url})` }}
                        onClick={() => setSelectedStyleUrl(style.url)}
                        role="button"
                        aria-pressed={selectedStyleUrl === style.url}
                        aria-label={`Select style: ${style.name}`}
                        tabIndex={0}
                    >
                        <div className="style-name">{style.name}</div>
                    </div>
                ))}
            </div>

            <div className="output-container">
                {!isModelLoaded && <div className="loader-text">Initializing AI artist...</div>}
                {isGenerating && <div className="loader"></div>}
                {outputImage && <img src={outputImage} alt="Stylized cosmic art" />}
                <canvas ref={outputCanvasRef} style={{ display: 'none' }}></canvas>
            </div>
            
            <div className="art-actions">
                <button
                    className="action-button"
                    onClick={handleGenerate}
                    disabled={!isModelLoaded || isGenerating}
                >
                    {isGenerating ? 'Creating...' : 'Generate Art'}
                </button>
                <button
                    className="action-button"
                    onClick={handleSave}
                    disabled={!outputImage || isGenerating}
                >
                    Save Image
                </button>
            </div>
        </div>
    </div>
  );
};

export default ArtisticLensPanel;