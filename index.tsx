/* tslint:disable */
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { GenerateImagesParameters, GoogleGenAI, Type } from '@google/genai';
import JSZip from 'jszip';

const GEMINI_API_KEY = process.env.API_KEY;

// Global state for the uploaded logo
let uploadedLogo: { base64: string; mimeType: string } | null = null;

// Global state for design history, the currently active design, and review state
let designHistory: DesignRecord[] = [];
let activeDesign: DesignRecord | null = null;
let reviewingDesignId: string | null = null;

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

interface GroundingChunk {
  web: {
    uri: string;
    title: string;
  };
}

interface MarketTrendsResult {
  trends: string;
  sources: GroundingChunk[];
}

interface DesignRecord {
  id: string;
  timestamp: Date;
  imageDataUrl: string;
  finalPrompt: string;
  specs: ProductSpecification;
  analysis: MarketAnalysisResult;
  trends?: MarketTrendsResult;
  market: string;
  logo: string | null;
  parentId: string | null;
  changeSummary?: string;
  designNotes?: string;
  status: 'Proposed' | 'Approved' | 'Rejected';
  reviewComments?: string;
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

async function getMarketTrends(
  specs: ProductSpecification,
  market: string,
): Promise<MarketTrendsResult> {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const analysisPrompt = `
    Based on real-time web data, analyze the latest fashion and e-commerce trends for a T-shirt in the **${market}** market with the following specifications. Provide a concise summary.

    **Product Specifications:**
    - Fabric Type: ${specs.fabricType}
    - Fabric Weight: ${specs.fabricWeightGsm} GSM
    - Stitching Details: ${specs.stitchingDetails}
    - Printing Method: ${specs.printingMethod}
    - Logo Complexity: ${specs.logoComplexity}
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: analysisPrompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const sources =
    response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];

  return {
    trends: response.text,
    sources: sources as GroundingChunk[],
  };
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
const groundingSelectEl = document.querySelector(
  '#grounding-select',
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
const marketTrendsContainerEl = document.querySelector(
  '#market-trends-container',
) as HTMLDivElement;
const marketTrendsContentEl = document.querySelector(
  '#market-trends-content',
) as HTMLParagraphElement;
const marketTrendsSourcesEl = document.querySelector(
  '#market-trends-sources',
) as HTMLDivElement;

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

// History Elements
const historyCardEl = document.querySelector('#history-card') as HTMLDivElement;
const historyListEl = document.querySelector('#history-list') as HTMLUListElement;

// Proposal Modal Elements
const proposalModalEl = document.querySelector('#proposal-modal') as HTMLDivElement;
const changeSummaryInput = document.querySelector('#change-summary') as HTMLInputElement;
const designNotesInput = document.querySelector('#design-notes') as HTMLTextAreaElement;
const proposeButton = document.querySelector('#propose-button') as HTMLButtonElement;
const cancelProposalButton = document.querySelector('#cancel-proposal-button') as HTMLButtonElement;

// Review Modal Elements
const reviewModalEl = document.querySelector('#review-modal') as HTMLDivElement;
const reviewSummaryEl = document.querySelector('#review-summary') as HTMLSpanElement;
const reviewNotesEl = document.querySelector('#review-notes') as HTMLSpanElement;
const reviewCommentsInput = document.querySelector('#review-comments') as HTMLTextAreaElement;
const approveButton = document.querySelector('#approve-button') as HTMLButtonElement;
const rejectButton = document.querySelector('#reject-button') as HTMLButtonElement;
const cancelReviewButton = document.querySelector('#cancel-review-button') as HTMLButtonElement;

// Design Details display elements
const designDetailsContainerEl = document.querySelector('#design-details-container') as HTMLDivElement;
const designDetailsIdEl = document.querySelector('#design-details-id') as HTMLSpanElement;
const designDetailsSummaryEl = document.querySelector('#design-details-summary') as HTMLSpanElement;
const designDetailsNotesEl = document.querySelector('#design-details-notes') as HTMLParagraphElement;
const designDetailsNotesWrapperEl = document.querySelector('#design-details-notes-wrapper') as HTMLDivElement;
const designDetailsReviewEl = document.querySelector('#design-details-review') as HTMLParagraphElement;
const designDetailsReviewWrapperEl = document.querySelector('#design-details-review-wrapper') as HTMLDivElement;


openKeyEl.addEventListener('click', async (e) => {
  await window.aistudio?.openSelectKey();
});

const generateButton = document.querySelector(
  '#generate-button',
) as HTMLButtonElement;
const downloadCertificateButton = document.querySelector(
  '#download-certificate-button',
) as HTMLButtonElement;

generateButton.addEventListener('click', () => {
  if (activeDesign?.status === 'Approved') {
    // Open the modal for iteration
    changeSummaryInput.value = '';
    designNotesInput.value = '';
    proposalModalEl.style.display = 'flex';
    changeSummaryInput.focus();
  } else {
    // Regular generation for a new design
    generate();
  }
});

cancelProposalButton.addEventListener('click', () => {
    proposalModalEl.style.display = 'none';
});

proposeButton.addEventListener('click', () => {
    const summary = changeSummaryInput.value;
    if (!summary) {
        alert('Please provide a Change Summary.');
        changeSummaryInput.focus();
        return;
    }
    proposalModalEl.style.display = 'none';
    generate(summary, designNotesInput.value);
});

function createCertificateJson(record: DesignRecord) {
  const { id, finalPrompt, specs, analysis, market, logo, timestamp } = record;
  return {
    _type: 'https://in-toto.io/Statement/v1',
    subject: [
      {
        name: 'ai-design',
        digest: {
          generationId: id,
        },
      },
    ],
    predicateType: 'https://loomiary.ai/design-provenance/v1',
    predicate: {
      generator: 'Loominary AI',
      timestamp: timestamp.toISOString(),
      inputs: {
        prompt: finalPrompt,
        logo: logo,
        market: market,
      },
      outputs: {
        specifications: specs,
        marketAnalysis: analysis,
      },
    },
  };
}

downloadCertificateButton.addEventListener('click', () => {
  if (!activeDesign) return;
  const certificateJson = createCertificateJson(activeDesign);
  const blob = new Blob([JSON.stringify(certificateJson, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `loomiary_certificate_${activeDesign.id}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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

async function generate(changeSummary?: string, designNotes?: string) {
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

  const parentId = activeDesign ? activeDesign.id : null;
  // An iteration is Proposed, a new design is Approved by default.
  const status = parentId ? 'Proposed' : 'Approved';

  statusEl.innerText = 'Starting process...';
  imageEl.style.display = 'none';
  specsContainer.style.display = 'none';
  analysisContainer.style.display = 'none';
  marketTrendsContainerEl.style.display = 'none';
  designDetailsContainerEl.style.display = 'none';
  loaderEl.style.display = 'block';
  generateButton.disabled = true;
  downloadCertificateButton.style.display = 'none';
  downloadCertificateButton.disabled = true;
  promptEl.disabled = true;
  logoUploadInput.disabled = true;
  removeLogoButton.disabled = true;
  marketSelectEl.disabled = true;
  groundingSelectEl.disabled = true;
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
    renderSpecs(specs);
    specsContainer.style.display = 'block';

    statusEl.innerText = `Analyzing ${marketSelectEl.value} market...`;
    const analysis = await getGlobalMarketAnalysis(specs, marketSelectEl.value);
    renderAnalysis(analysis);
    analysisContainer.style.display = 'grid';

    let trendsResult: MarketTrendsResult | undefined;
    if (groundingSelectEl.value === 'enabled') {
      statusEl.innerText = 'Researching market trends with Google Search...';
      trendsResult = await getMarketTrends(specs, marketSelectEl.value);
      renderTrends(trendsResult);
      marketTrendsContainerEl.style.display = 'block';
    }

    const newDesign: DesignRecord = {
      id: `LOOM-${Date.now()}`,
      timestamp: new Date(),
      imageDataUrl: imageEl.src,
      finalPrompt,
      specs,
      analysis,
      trends: trendsResult,
      market: marketSelectEl.value,
      logo: uploadedLogo ? logoFilename.textContent : null,
      parentId,
      changeSummary,
      designNotes,
      status,
    };

    activeDesign = newDesign;
    designHistory.unshift(activeDesign);
    renderHistory();

    statusEl.innerText = 'Done!';
    downloadCertificateButton.style.display = 'inline-block';
    // After a successful generation, show its details
    viewHistoryItem(activeDesign.id);
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
    groundingSelectEl.disabled = false;
    downloadCertificateButton.disabled = !activeDesign;
    loaderEl.style.display = 'none';
    container.setAttribute('aria-busy', 'false');
    updateGenerateButtonState();
  }
}

function renderSpecs(specs: ProductSpecification) {
  specsListEl.innerHTML = `
      <li><strong>Fabric Type:</strong> ${specs.fabricType}</li>
      <li><strong>Fabric Weight:</strong> ${specs.fabricWeightGsm} GSM</li>
      <li><strong>Stitching:</strong> ${specs.stitchingDetails}</li>
      <li><strong>Printing:</strong> ${specs.printingMethod}</li>
      <li><strong>Logo:</strong> ${specs.logoComplexity}</li>
  `;
}

function renderAnalysis(analysis: MarketAnalysisResult) {
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
}

function renderTrends(trendsResult: MarketTrendsResult) {
  marketTrendsContentEl.textContent = trendsResult.trends;
  if (trendsResult.sources.length > 0) {
    marketTrendsSourcesEl.innerHTML = `
            <h4>Sources:</h4>
            <ul>
                ${trendsResult.sources
                  .map(
                    (source) =>
                      `<li><a href="${source.web.uri}" target="_blank" rel="noopener noreferrer">${source.web.title}</a></li>`,
                  )
                  .join('')}
            </ul>
        `;
  } else {
    marketTrendsSourcesEl.innerHTML = '';
  }
}

function renderHistory() {
  if (designHistory.length === 0) {
    historyCardEl.style.display = 'none';
    return;
  }

  historyCardEl.style.display = 'block';
  historyListEl.innerHTML = ''; // Clear previous content

  const recordsById = new Map<string, DesignRecord>();
  designHistory.forEach((r) => recordsById.set(r.id, r));

  const childrenByParentId = new Map<string, DesignRecord[]>();
  const rootRecords: DesignRecord[] = [];

  // Group children and identify root nodes
  for (const record of designHistory) {
    if (record.parentId && recordsById.has(record.parentId)) {
      if (!childrenByParentId.has(record.parentId)) {
        childrenByParentId.set(record.parentId, []);
      }
      childrenByParentId.get(record.parentId)!.push(record);
    } else {
      rootRecords.push(record);
    }
  }

  // Sort children by timestamp (newest first)
  childrenByParentId.forEach((children) => {
    children.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  });

  // Sort root records by timestamp (newest first)
  rootRecords.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const renderRecord = (record: DesignRecord, isChild: boolean) => {
    const li = document.createElement('li');
    li.className = 'history-item';
    if (isChild) {
      li.classList.add('is-child');
    }
    if (record.status === 'Rejected') {
      li.classList.add('is-rejected');
    }

    const statusBadge = `<span class="history-status status-${record.status.toLowerCase()}">${record.status}</span>`;
    let actionButtonHtml = '';
    if (record.status === 'Proposed') {
      actionButtonHtml = `<button class="secondary-button review-button" data-id="${record.id}">Review</button>`;
    } else if (record.status === 'Approved') {
      actionButtonHtml = `
        <button class="secondary-button view-history-button" data-id="${record.id}">View</button>
        <button class="secondary-button download-package-button" data-id="${record.id}">Package</button>
      `;
    } else {
      // Rejected or other states
      actionButtonHtml = `<button class="secondary-button view-history-button" data-id="${record.id}">View</button>`;
    }

    li.innerHTML = `
      <img src="${record.imageDataUrl}" alt="Design thumbnail" class="history-thumbnail">
      <div class="history-info">
        <p class="history-summary">${record.changeSummary || 'Initial Design'}</p>
        <div class="history-meta">
          ${statusBadge}
          <span class="history-timestamp">${record.timestamp.toLocaleTimeString()}</span>
        </div>
      </div>
      <div class="history-actions">
        ${actionButtonHtml}
      </div>
    `;
    historyListEl.appendChild(li);

    // Render children
    const children = childrenByParentId.get(record.id);
    if (children) {
      for (const child of children) {
        renderRecord(child, true);
      }
    }
  };

  for (const record of rootRecords) {
    renderRecord(record, false);
  }
}

historyListEl.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const viewButton = target.closest('.view-history-button');
  const reviewButton = target.closest('.review-button');
  const packageButton = target.closest('.download-package-button');

  if (viewButton) {
    const id = viewButton.getAttribute('data-id');
    if (id) {
      viewHistoryItem(id);
    }
  } else if (reviewButton) {
    const id = reviewButton.getAttribute('data-id');
    if (id) {
      openReviewModal(id);
    }
  } else if (packageButton) {
    const id = packageButton.getAttribute('data-id');
    if (id) {
      generateAndDownloadPackage(id);
    }
  }
});

function viewHistoryItem(id: string) {
  const record = designHistory.find((r) => r.id === id);
  if (!record) return;

  activeDesign = record;

  // 1. Update main image and prompt
  imageEl.src = record.imageDataUrl;
  imageEl.style.display = 'block';
  promptEl.value = record.finalPrompt;

  // 2. Update specs, analysis, and trends
  renderSpecs(record.specs);
  specsContainer.style.display = 'block';

  renderAnalysis(record.analysis);
  analysisContainer.style.display = 'grid';

  if (record.trends) {
    renderTrends(record.trends);
    marketTrendsContainerEl.style.display = 'block';
  } else {
    marketTrendsContainerEl.style.display = 'none';
  }

  // 3. Display design and review details if they exist
  if (record.changeSummary) {
    designDetailsIdEl.textContent = record.id;
    designDetailsSummaryEl.textContent = record.changeSummary;
    designDetailsNotesEl.textContent = record.designNotes || 'No details provided.';
    designDetailsNotesWrapperEl.style.display = record.designNotes ? 'block' : 'none';
    designDetailsContainerEl.style.display = 'block';
  } else {
    designDetailsContainerEl.style.display = 'none';
  }

  if (record.reviewComments) {
      designDetailsReviewEl.textContent = record.reviewComments;
      designDetailsReviewWrapperEl.style.display = 'block';
  } else {
      designDetailsReviewWrapperEl.style.display = 'none';
  }


  // 4. Ensure download button is active & update generate button
  downloadCertificateButton.style.display = 'inline-block';
  downloadCertificateButton.disabled = false;
  updateGenerateButtonState();

  // 5. Update status and scroll into view
  statusEl.innerText = `Viewing design from ${record.timestamp.toLocaleTimeString()}.`;
  const resultCard = document.querySelector('.result-card');
  resultCard?.scrollIntoView({ behavior: 'smooth' });
}

function updateGenerateButtonState() {
    if (!activeDesign) {
        generateButton.textContent = 'Generate & Analyze';
        generateButton.disabled = false;
    } else if (activeDesign.status === 'Approved') {
        generateButton.textContent = 'Propose Change';
        generateButton.disabled = false;
    } else {
        generateButton.textContent = `Change is ${activeDesign.status}`;
        generateButton.disabled = true;
    }
}

function openReviewModal(id: string) {
    const record = designHistory.find((r) => r.id === id);
    if (!record || record.status !== 'Proposed') return;

    reviewingDesignId = id;
    reviewSummaryEl.textContent = record.changeSummary || '';
    reviewNotesEl.textContent = record.designNotes || 'No details provided.';
    reviewCommentsInput.value = '';
    reviewModalEl.style.display = 'flex';
    reviewCommentsInput.focus();
}

function closeReviewModal() {
    reviewingDesignId = null;
    reviewModalEl.style.display = 'none';
}

approveButton.addEventListener('click', () => {
    if (!reviewingDesignId) return;
    const record = designHistory.find((r) => r.id === reviewingDesignId);
    if (record) {
        record.status = 'Approved';
        record.reviewComments = reviewCommentsInput.value;
        statusEl.innerText = `Proposal ${record.id} approved. A production package is now available.`;
        renderHistory();
        if (activeDesign?.id === record.id) {
            viewHistoryItem(record.id); // Refresh view
        }
    }
    closeReviewModal();
});

rejectButton.addEventListener('click', () => {
    if (!reviewingDesignId) return;
    const record = designHistory.find((r) => r.id === reviewingDesignId);
    if (record) {
        record.status = 'Rejected';
        record.reviewComments = reviewCommentsInput.value;
        statusEl.innerText = `Proposal ${record.id} rejected.`;
        renderHistory();
        if (activeDesign?.id === record.id) {
            viewHistoryItem(record.id); // Refresh view
        }
    }
    closeReviewModal();
});

cancelReviewButton.addEventListener('click', closeReviewModal);

// Helper function to convert data URL to blob for zipping
function dataURLtoBlob(dataurl: string): Blob {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1];
  if (!mime) {
    throw new Error('Could not determine MIME type from data URL');
  }
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

async function generateAndDownloadPackage(id: string) {
  const record = designHistory.find((r) => r.id === id);
  if (!record) {
    statusEl.innerText = `Error: Could not find design ${id}.`;
    return;
  }

  statusEl.innerText = `Generating production package for ${id}...`;

  try {
    const zip = new JSZip();

    // 1. Add image
    const imageBlob = dataURLtoBlob(record.imageDataUrl);
    zip.file('design.jpg', imageBlob);

    // 2. Add certificate
    const certificateJson = createCertificateJson(record);
    zip.file('certificate.json', JSON.stringify(certificateJson, null, 2));

    // 3. Add summary text
    const summaryText = `
Design Summary - ${record.id}
=======================================
Generated on: ${record.timestamp.toISOString()}
Market: ${record.market}
Status: ${record.status}

--- PROMPT ---
${record.finalPrompt}

--- PRODUCT SPECIFICATIONS ---
Fabric Type: ${record.specs.fabricType}
Fabric Weight: ${record.specs.fabricWeightGsm} GSM
Stitching: ${record.specs.stitchingDetails}
Printing: ${record.specs.printingMethod}
Logo: ${record.specs.logoComplexity}

--- MARKET ANALYSIS ---
Target Demographic: ${record.analysis.marketSnapshot.targetDemographic}
Competitor Insights: ${record.analysis.marketSnapshot.competitorInsights}
Pricing Analysis: ${record.analysis.pricingStrategy.analysis}
Estimated Price: ${record.analysis.pricingStrategy.estimatedPrice}
Logistics Analysis: ${record.analysis.logistics.analysis}
Estimated Cost: ${record.analysis.logistics.estimatedCost}
Marketing Angles:
${record.analysis.marketingAngles.map((a) => `- ${a}`).join('\n')}
`;
    zip.file('summary.txt', summaryText.trim());

    const content = await zip.generateAsync({ type: 'blob' });

    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loomiary_package_${id}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    statusEl.innerText = `Production package for ${id} downloaded.`;
  } catch (e) {
    statusEl.innerText = `Error generating package: ${e.message}`;
    console.error('Package generation error:', e);
  }
}
