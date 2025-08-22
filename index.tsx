/* tslint:disable */
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { GenerateImagesParameters, GoogleGenAI, Type } from '@google/genai';

const GEMINI_API_KEY = process.env.API_KEY;

// Global state for the uploaded logo
let uploadedLogo: { base64: string; mimeType: string } | null = null;

const initialPrompt = `Create a high‑resolution, realistic showroom image of a men’s European‑fit, short‑sleeve T‑shirt, shown in multiple solid colors. The shirt should have a tailored, body‑hugging silhouette with a double‑stitched crew neck collar and neatly hemmed sleeves. The fabric should be a premium combed cotton texture (200–220 gsm) with a visible weave detail. Display both front and back views within the same landscape frame, against a neutral studio background. On the front of the shirt, place a bold emblem of the 'LOOMINARY' logo on the left chest. On the back, center the text 'CREATE • INSPIRE • SHINE' in a clean, bold, uppercase sans-serif font. The lighting should be soft and even to highlight the fabric's texture and the shirt's fit, including product specifications.`;

interface ProductSpecification {
  fabricType: string;
  fabricWeightGsm: number;
  stitchingDetails: string;
  printingMethod: string;
  logoComplexity: 'simple' | 'moderate' | 'complex' | 'none';
}

interface MarketAnalysisResult {
  marketSnapshot: {
    targetDemographic: string;
    competitorInsights: string;
  };
  pricingStrategy: {
    analysis: string;
    estimatedPrice: string;
  };
  logistics: {
    analysis: string;
    estimatedCost: string;
  };
  marketingAngles: string[];
}

async function getImageDescription(logo: {
  base64: string;
  mimeType: string;
}): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const imagePart = {
    inlineData: {
      data: logo.base64,
      mimeType: logo.mimeType,
    },
  };
  const textPart = {
    text: 'Describe this image for an image generation model. Be concise and descriptive, focusing on key visual elements.',
  };
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [imagePart, textPart] },
  });
  return response.text.trim();
}

async function generateImage(prompt: string) {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  const config: GenerateImagesParameters = {
    model: 'imagen-3.0-generate-002',
    prompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/jpeg',
      aspectRatio: '16:9',
    },
  };

  const response = await ai.models.generateImages(config);

  if (!response.generatedImages || response.generatedImages.length === 0) {
    throw new Error('No images generated');
  }

  const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
  const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;

  imageEl.src = imageUrl;
  imageEl.style.display = 'block';
}

async function getProductSpecifications(
  prompt: string,
): Promise<ProductSpecification> {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Analyze the following T-shirt description and provide the manufacturing specifications: "${prompt}"`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          fabricType: {
            type: Type.STRING,
            description: 'e.g., "Combed Cotton", "Polyester Blend"',
          },
          fabricWeightGsm: {
            type: Type.NUMBER,
            description:
              'Fabric weight in grams per square meter (GSM), e.g., 210',
          },
          stitchingDetails: {
            type: Type.STRING,
            description: 'e.g., "Double-stitched collar", "Standard hemming"',
          },
          printingMethod: {
            type: Type.STRING,
            description: 'e.g., "Screen Print", "DTG", "Embroidery"',
          },
          logoComplexity: {
            type: Type.STRING,
            description:
              'Complexity of the logo, one of: simple, moderate, complex, or none.',
          },
        },
        propertyOrdering: [
          'fabricType',
          'fabricWeightGsm',
          'stitchingDetails',
          'printingMethod',
          'logoComplexity',
        ],
      },
    },
  });

  const specs = JSON.parse(response.text);
  return specs as ProductSpecification;
}

async function getGlobalMarketAnalysis(
  specs: ProductSpecification,
  market: string,
): Promise<MarketAnalysisResult> {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const analysisPrompt = `
    You are an expert economic and marketing analyst. Your task is to provide a detailed market analysis for a single T-shirt based on its specifications for the **${market}** market.

    **Product Specifications:**
    - Fabric Type: ${specs.fabricType}
    - Fabric Weight: ${specs.fabricWeightGsm} GSM
    - Stitching Details: ${specs.stitchingDetails}
    - Printing Method: ${specs.printingMethod}
    - Logo Complexity: ${specs.logoComplexity}

    **Your Task:**
    Provide a comprehensive analysis covering the following four areas for the specified market.

    1.  **Market Snapshot:** Briefly describe the target demographic for this type of product in ${market}. Add a sentence about the competitive landscape (e.g., high competition from fast fashion, niche for premium quality).
    2.  **Pricing Strategy:** Analyze a fair retail price. Ground your analysis in the current economic environment of ${market}, considering factors like consumer purchasing power, inflation, and typical e-commerce pricing for similar goods. Conclude with a clear estimated price range.
    3.  **Logistics Overview:** Provide a brief analysis of estimated last-mile delivery costs for a single product within major metropolitan areas in ${market} (e.g., Dhaka, Lagos, New York, London, Mumbai).
    4.  **Marketing Angles:** Generate 3 short, catchy marketing slogans for this product, tailored to the ${market} audience.
    `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: analysisPrompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          marketSnapshot: {
            type: Type.OBJECT,
            properties: {
              targetDemographic: { type: Type.STRING },
              competitorInsights: { type: Type.STRING },
            },
          },
          pricingStrategy: {
            type: Type.OBJECT,
            properties: {
              analysis: { type: Type.STRING },
              estimatedPrice: {
                type: Type.STRING,
                description: 'e.g., "$25 - $35 USD"',
              },
            },
          },
          logistics: {
            type: Type.OBJECT,
            properties: {
              analysis: { type: Type.STRING },
              estimatedCost: {
                type: Type.STRING,
                description: 'e.g., "$4 - $7 USD"',
              },
            },
          },
          marketingAngles: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
      },
    },
  });

  const analysis = JSON.parse(response.text);
  return analysis as MarketAnalysisResult;
}

const container = document.querySelector('#main-container') as HTMLElement;
const promptEl = document.querySelector('#prompt-input') as HTMLTextAreaElement;
promptEl.value = initialPrompt;

const statusEl = document.querySelector('#status') as HTMLDivElement;
const imageEl = document.querySelector('#generated-image') as HTMLImageElement;
const loaderEl = document.querySelector('#loader') as HTMLDivElement;
const quotaErrorEl = document.querySelector('#quota-error') as HTMLDivElement;
const openKeyEl = document.querySelector('#open-key') as HTMLButtonElement;
const marketSelectEl = document.querySelector(
  '#market-select',
) as HTMLSelectElement;

// Analysis Elements
const analysisContainer = document.querySelector(
  '#analysis-container',
) as HTMLDivElement;
const marketSnapshotContentEl = document.querySelector(
  '#market-snapshot-content',
) as HTMLParagraphElement;
const pricingStrategyContentEl = document.querySelector(
  '#pricing-strategy-content',
) as HTMLParagraphElement;
const logisticsContentEl = document.querySelector(
  '#logistics-content',
) as HTMLParagraphElement;
const marketingAnglesListEl = document.querySelector(
  '#marketing-angles-list',
) as HTMLUListElement;

// Specs Elements
const specsContainer = document.querySelector(
  '#specs-container',
) as HTMLDivElement;
const specsListEl = document.querySelector('#specs-list') as HTMLUListElement;

// File upload DOM Elements
const logoUploadInput = document.querySelector(
  '#logo-upload-input',
) as HTMLInputElement;
const logoPreviewContainer = document.querySelector(
  '#logo-preview-container',
) as HTMLDivElement;
const logoPreview = document.querySelector('#logo-preview') as HTMLImageElement;
const logoFilename = document.querySelector('#logo-filename') as HTMLSpanElement;
const removeLogoButton = document.querySelector(
  '#remove-logo-button',
) as HTMLButtonElement;

openKeyEl.addEventListener('click', async (e) => {
  await window.aistudio?.openSelectKey();
});

const generateButton = document.querySelector(
  '#generate-button',
) as HTMLButtonElement;
generateButton.addEventListener('click', () => {
  generate();
});

// Event listener for file upload
logoUploadInput.addEventListener('change', () => {
  const file = logoUploadInput.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const mimeType = dataUrl.substring(
        dataUrl.indexOf(':') + 1,
        dataUrl.indexOf(';'),
      );
      const base64 = dataUrl.substring(dataUrl.indexOf(',') + 1);

      uploadedLogo = { base64, mimeType };

      logoPreview.src = dataUrl;
      logoFilename.textContent = file.name;
      logoPreviewContainer.style.display = 'flex';
    };
    reader.readAsDataURL(file);
  }
});

// Event listener for remove button
removeLogoButton.addEventListener('click', () => {
  uploadedLogo = null;
  logoUploadInput.value = ''; // Reset file input
  logoPreviewContainer.style.display = 'none';
  logoPreview.src = '';
  logoFilename.textContent = '';
});

async function generate() {
  let prompt = promptEl.value;
  if (!prompt) {
    statusEl.innerText = 'Error: Prompt cannot be empty.';
    return;
  }

  // Validate that if a logo is uploaded, the prompt contains the placeholder
  if (uploadedLogo && !prompt.includes('[LOGO]')) {
    statusEl.innerText =
      'Error: Please use the [LOGO] placeholder in your prompt when uploading an image.';
    return;
  }

  statusEl.innerText = 'Starting process...';
  imageEl.style.display = 'none';
  specsContainer.style.display = 'none';
  analysisContainer.style.display = 'none';
  loaderEl.style.display = 'block';
  generateButton.disabled = true;
  promptEl.disabled = true;
  logoUploadInput.disabled = true;
  removeLogoButton.disabled = true;
  marketSelectEl.disabled = true;
  quotaErrorEl.style.display = 'none';
  container.setAttribute('aria-busy', 'true');

  try {
    let finalPrompt = prompt;
    if (uploadedLogo && prompt.includes('[LOGO]')) {
      statusEl.innerText = 'Analyzing uploaded image...';
      const logoDescription = await getImageDescription(uploadedLogo);
      finalPrompt = prompt.replace(/\[LOGO\]/g, `(${logoDescription})`);
      statusEl.innerText = 'Generating image with custom logo...';
    } else {
      statusEl.innerText = 'Generating your image...';
    }
    await generateImage(finalPrompt);

    statusEl.innerText = 'Analyzing product specifications...';
    const specs = await getProductSpecifications(finalPrompt);
    specsListEl.innerHTML = `
        <li><strong>Fabric Type:</strong> ${specs.fabricType}</li>
        <li><strong>Fabric Weight:</strong> ${specs.fabricWeightGsm} GSM</li>
        <li><strong>Stitching:</strong> ${specs.stitchingDetails}</li>
        <li><strong>Printing:</strong> ${specs.printingMethod}</li>
        <li><strong>Logo:</strong> ${specs.logoComplexity}</li>
    `;
    specsContainer.style.display = 'block';

    statusEl.innerText = `Analyzing ${marketSelectEl.value} market...`;
    const analysis = await getGlobalMarketAnalysis(specs, marketSelectEl.value);

    marketSnapshotContentEl.innerHTML = `
        <strong>Target Demographic:</strong> ${analysis.marketSnapshot.targetDemographic}
        <br><br>
        <strong>Competitor Insights:</strong> ${analysis.marketSnapshot.competitorInsights}
    `;

    pricingStrategyContentEl.innerHTML = `
        ${analysis.pricingStrategy.analysis}
        <br><br>
        <strong>${analysis.pricingStrategy.estimatedPrice}</strong>
    `;

    logisticsContentEl.innerHTML = `
        ${analysis.logistics.analysis}
        <br><br>
        <strong>${analysis.logistics.estimatedCost}</strong>
    `;

    marketingAnglesListEl.innerHTML = analysis.marketingAngles
      .map((slogan) => `<li>${slogan}</li>`)
      .join('');

    analysisContainer.style.display = 'grid';
    statusEl.innerText = 'Done!';
  } catch (e) {
    try {
      const err = JSON.parse(e.message);
      if (err.error.code === 429) {
        quotaErrorEl.style.display = 'block';
        statusEl.innerText = '';
      } else {
        statusEl.innerText = `Error: ${err.error.message}`;
      }
    } catch (parseError) {
      statusEl.innerText = `Error: ${e.message}`;
      console.error('Error:', e);
    }
  } finally {
    generateButton.disabled = false;
    promptEl.disabled = false;
    logoUploadInput.disabled = false;
    removeLogoButton.disabled = false;
    marketSelectEl.disabled = false;
    loaderEl.style.display = 'none';
    container.setAttribute('aria-busy', 'false');
  }
}