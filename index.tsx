/* tslint:disable */
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { GenerateImagesParameters, GoogleGenAI, Type } from '@google/genai';

const GEMINI_API_KEY = process.env.API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash';
const IMAGEN_MODEL = 'imagen-3.0-generate-002';

// --- MOCK DATABASE & API LAYER ---
// This simulates a backend database. In a real application, these functions
// would make `fetch` calls to a server-side API.
const MOCK_DB = {
  designs: [] as DesignRecord[],
};

// Simulate network latency
const FAKE_LATENCY = 300;

async function fetchDesignsFromDB(): Promise<DesignRecord[]> {
  console.log('API: Fetching all designs...');
  return new Promise((resolve) => {
    setTimeout(() => {
      // Deserialize dates which would be strings from a real API
      const designs = MOCK_DB.designs.map((d) => ({
        ...d,
        timestamp: new Date(d.timestamp),
      }));
      resolve(designs);
    }, FAKE_LATENCY);
  });
}

async function saveDesignInDB(design: DesignRecord): Promise<DesignRecord> {
  console.log('API: Saving new design...', design.id);
  return new Promise((resolve) => {
    setTimeout(() => {
      MOCK_DB.designs.unshift(design);
      resolve(design);
    }, FAKE_LATENCY);
  });
}

async function updateDesignInDB(
  id: string,
  updates: Partial<DesignRecord>,
): Promise<DesignRecord> {
  console.log('API: Updating design...', id, updates);
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = MOCK_DB.designs.findIndex((d) => d.id === id);
      if (index === -1) {
        return reject(new Error(`Design with id ${id} not found`));
      }
      MOCK_DB.designs[index] = { ...MOCK_DB.designs[index], ...updates };
      resolve(MOCK_DB.designs[index]);
    }, FAKE_LATENCY);
  });
}
// --- END MOCK DATABASE & API LAYER ---

// Global state for the uploaded logo
let uploadedLogo: { base64: string; mimeType: string } | null = null;

// Global state: Single source of truth for all designs
let allDesigns: DesignRecord[] = [];
let activeDesign: DesignRecord | null = null;
let reviewingDesignId: string | null = null;

const initialPrompt = `Create a high‑resolution, realistic showroom image of a men’s European‑fit, short‑sleeve T‑shirt, shown in multiple solid colors. The shirt should have a tailored, body‑hugging silhouette with a double‑stitched crew neck collar and neatly hemmed sleeves. The fabric should be a premium combed cotton texture (200–220 gsm) with a visible weave detail. Display both front and back views within the same landscape frame, against a neutral studio background. On the front of the shirt, place a bold emblem of the 'LOOMINAR' logo on the left chest. On the back, center the text 'CREATE • INSPIRE • SHINE' in a clean, bold, uppercase sans-serif font. The lighting should be soft and even to highlight the fabric's texture and the shirt's fit, including product specifications.`;

interface ProductSpecification {
  fabricType: string;
  fabricWeightGsm: number;
  stitchingDetails: string;
  printingMethod: string;
  logoComplexity: 'simple' | 'moderate' | 'complex' | 'none';
}

interface GroundingChunk {
  web: {
    uri: string;
    title: string;
  };
}

interface StudioAnalysis {
  productDNA: {
    specs: ProductSpecification;
    pricing: {
      analysis: string;
      estimatedPrice: string;
    };
    logistics: {
      analysis: string;
      estimatedCost: string;
    };
  };
  branding: {
    brandArchetype: string;
    brandVoice: string;
    logoFeedback: string;
  };
  seoSem: {
    seoRate: {
      score: number;
      analysis: string;
    };
    targetKeywords: string[];
    semAd: {
      headline: string;
      description: string;
    };
    metaDescription: string;
    socialPrompts: string[];
  };
  sources: GroundingChunk[];
}

interface DesignRecord {
  id: string;
  timestamp: Date;
  imageDataUrl: string;
  finalPrompt: string;
  studioAnalysis: StudioAnalysis;
  market: string;
  logo: string | null;
  parentId: string | null;
  changeSummary?: string;
  designNotes?: string;
  status: 'Proposed' | 'Approved' | 'Rejected' | 'Published';
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
    model: GEMINI_MODEL,
    contents: { parts: [imagePart, textPart] },
  });
  return response.text.trim();
}

async function generateImage(prompt: string) {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  const config: GenerateImagesParameters = {
    model: IMAGEN_MODEL,
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

async function getStudioAnalysis(
  prompt: string,
  market: string,
  hasLogo: boolean,
): Promise<StudioAnalysis> {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const logoContext = hasLogo
    ? 'A custom logo has been provided. Provide constructive feedback on its suitability for the brand identity you create, assuming it will be placed on the product.'
    : 'No custom logo has been provided. The brand will use a text-based logo or a generic emblem.';

  const analysisPrompt = `
    You are an expert-level Brand Strategist, Marketing Analyst, and SEO/SEM Specialist. Your task is to provide a comprehensive go-to-market analysis for a T-shirt design for the **${market}** market, based on its description. Use real-time Google Search data to inform your analysis.

    **Product Description:**
    "${prompt}"

    **Logo Context:**
    ${logoContext}

    **Your Task:**
    Provide a complete analysis in the specified JSON format.

    1.  **Product DNA:** Analyze the product's core specs, and provide pricing and logistics insights for the target market.
    2.  **Branding & Identity:** Define a compelling brand identity. Create a brand archetype and describe the brand voice. Provide logo feedback based on the context.
    3.  **Region-Aware SEO & SEM:** Develop a digital marketing strategy for ${market}.
        *   **SEO Rate:** Provide a "Search Engine Optimization Rate" as a score out of 100, representing the product's potential to rank well in the ${market} market based on your keyword analysis. Briefly justify the score.
        *   Generate targeted SEO keywords, SEM ad copy, a meta description, and social media prompts.
    `;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: analysisPrompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          productDNA: {
            type: Type.OBJECT,
            properties: {
              specs: {
                type: Type.OBJECT,
                properties: {
                  fabricType: { type: Type.STRING },
                  fabricWeightGsm: { type: Type.NUMBER },
                  stitchingDetails: { type: Type.STRING },
                  printingMethod: { type: Type.STRING },
                  logoComplexity: { type: Type.STRING },
                },
              },
              pricing: {
                type: Type.OBJECT,
                properties: {
                  analysis: { type: Type.STRING },
                  estimatedPrice: { type: Type.STRING },
                },
              },
              logistics: {
                type: Type.OBJECT,
                properties: {
                  analysis: { type: Type.STRING },
                  estimatedCost: { type: Type.STRING },
                },
              },
            },
          },
          branding: {
            type: Type.OBJECT,
            properties: {
              brandArchetype: { type: Type.STRING },
              brandVoice: { type: Type.STRING },
              logoFeedback: { type: Type.STRING },
            },
          },
          seoSem: {
            type: Type.OBJECT,
            properties: {
              seoRate: {
                type: Type.OBJECT,
                properties: {
                  score: { type: Type.NUMBER },
                  analysis: { type: Type.STRING },
                },
              },
              targetKeywords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              semAd: {
                type: Type.OBJECT,
                properties: {
                  headline: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
              },
              metaDescription: { type: Type.STRING },
              socialPrompts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
          },
        },
      },
    },
  });

  const analysis = JSON.parse(response.text);
  const sources =
    response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  return { ...analysis, sources: sources as GroundingChunk[] };
}

const mainContainer = document.querySelector('#main-container') as HTMLElement;
const initialLoaderEl = document.querySelector(
  '#initial-loader',
) as HTMLDivElement;
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

// Studio Elements
const studioContainerEl = document.querySelector(
  '#studio-container',
) as HTMLDivElement;
const studioTabs = document.querySelectorAll('.tab-button');

// Product DNA Tab
const dnaSpecsListEl = document.querySelector('#dna-specs-list') as HTMLUListElement;
const dnaPricingContentEl = document.querySelector('#dna-pricing-content') as HTMLParagraphElement;
const dnaLogisticsContentEl = document.querySelector('#dna-logistics-content') as HTMLParagraphElement;

// Branding Tab
const brandingArchetypeEl = document.querySelector('#branding-archetype') as HTMLElement;
const brandingVoiceEl = document.querySelector('#branding-voice') as HTMLElement;
const brandingLogoFeedbackEl = document.querySelector('#branding-logo-feedback') as HTMLElement;

// SEO/SEM Tab
const seoRateScoreEl = document.querySelector('#seo-rate-score') as HTMLSpanElement;
const seoRateAnalysisEl = document.querySelector('#seo-rate-analysis') as HTMLParagraphElement;
const seoKeywordsEl = document.querySelector('#seo-keywords') as HTMLDivElement;
const semAdHeadlineEl = document.querySelector('#sem-ad-headline') as HTMLElement;
const semAdDescriptionEl = document.querySelector('#sem-ad-description') as HTMLElement;
const seoMetaDescriptionEl = document.querySelector('#seo-meta-description') as HTMLElement;
const seoSocialPromptsEl = document.querySelector('#seo-social-prompts') as HTMLUListElement;
const studioSourcesEl = document.querySelector('#studio-sources') as HTMLDivElement;

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
const historyListEl = document.querySelector(
  '#history-list',
) as HTMLUListElement;

// Store Elements
const storeCardEl = document.querySelector('#store-card') as HTMLDivElement;
const storeGridEl = document.querySelector('#store-grid') as HTMLDivElement;

// Proposal Modal Elements
const proposalModalEl = document.querySelector(
  '#proposal-modal',
) as HTMLDivElement;
const changeSummaryInput = document.querySelector(
  '#change-summary',
) as HTMLInputElement;
const designNotesInput = document.querySelector(
  '#design-notes',
) as HTMLTextAreaElement;
const proposeButton = document.querySelector(
  '#propose-button',
) as HTMLButtonElement;
const cancelProposalButton = document.querySelector(
  '#cancel-proposal-button',
) as HTMLButtonElement;

// Review Modal Elements
const reviewModalEl = document.querySelector('#review-modal') as HTMLDivElement;
const reviewSummaryEl = document.querySelector(
  '#review-summary',
) as HTMLSpanElement;
const reviewNotesEl = document.querySelector('#review-notes') as HTMLSpanElement;
const reviewCommentsInput = document.querySelector(
  '#review-comments',
) as HTMLTextAreaElement;
const approveButton = document.querySelector(
  '#approve-button',
) as HTMLButtonElement;
const rejectButton = document.querySelector('#reject-button') as HTMLButtonElement;
const cancelReviewButton = document.querySelector(
  '#cancel-review-button',
) as HTMLButtonElement;

// Design Details display elements
const designDetailsContainerEl = document.querySelector(
  '#design-details-container',
) as HTMLDivElement;
const designDetailsIdEl = document.querySelector(
  '#design-details-id',
) as HTMLSpanElement;
const designDetailsSummaryEl = document.querySelector(
  '#design-details-summary',
) as HTMLSpanElement;
const designDetailsNotesEl = document.querySelector(
  '#design-details-notes',
) as HTMLParagraphElement;
const designDetailsNotesWrapperEl = document.querySelector(
  '#design-details-notes-wrapper',
) as HTMLDivElement;
const designDetailsReviewEl = document.querySelector(
  '#design-details-review',
) as HTMLParagraphElement;
const designDetailsReviewWrapperEl = document.querySelector(
  '#design-details-review-wrapper',
) as HTMLDivElement;

openKeyEl.addEventListener('click', async (e) => {
  await window.aistudio?.openSelectKey();
});

const generateButton = document.querySelector(
  '#generate-button',
) as HTMLButtonElement;

function setLoadingState(isLoading: boolean) {
  generateButton.disabled = isLoading;
  promptEl.disabled = isLoading;
  logoUploadInput.disabled = isLoading;
  removeLogoButton.disabled = isLoading;
  marketSelectEl.disabled = isLoading;

  if (isLoading) {
    generateButton.classList.add('is-loading');
    loaderEl.style.display = 'block';
    mainContainer.setAttribute('aria-busy', 'true');
  } else {
    generateButton.classList.remove('is-loading');
    loaderEl.style.display = 'none';
    mainContainer.setAttribute('aria-busy', 'false');
  }
}

generateButton.addEventListener('click', () => {
  if (activeDesign?.status === 'Approved') {
    changeSummaryInput.value = '';
    designNotesInput.value = '';
    proposalModalEl.style.display = 'flex';
    changeSummaryInput.focus();
  } else {
    generate();
  }
});

cancelProposalButton.addEventListener('click', () => {
  proposalModalEl.style.display = 'none';
});

proposeButton.addEventListener('click', async () => {
  const summary = changeSummaryInput.value;
  if (!summary) {
    alert('Please provide a Change Summary.');
    changeSummaryInput.focus();
    return;
  }
  proposalModalEl.style.display = 'none';
  await generate(summary, designNotesInput.value);
});

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

  if (uploadedLogo && !prompt.includes('[LOGO]')) {
    statusEl.innerText =
      'Error: Please use the [LOGO] placeholder in your prompt when uploading an image.';
    return;
  }

  const parentId = activeDesign ? activeDesign.id : null;
  const status = parentId ? 'Proposed' : 'Approved';

  statusEl.innerText = 'Starting process...';
  imageEl.style.display = 'none';
  studioContainerEl.style.display = 'none';
  designDetailsContainerEl.style.display = 'none';
  quotaErrorEl.style.display = 'none';
  setLoadingState(true);

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

    statusEl.innerText = 'Running Studio Analysis...';
    const analysis = await getStudioAnalysis(
      finalPrompt,
      marketSelectEl.value,
      !!uploadedLogo,
    );
    renderStudioAnalysis(analysis);
    studioContainerEl.style.display = 'block';

    const newDesign: DesignRecord = {
      id: `LMNR-${Date.now()}`,
      timestamp: new Date(),
      imageDataUrl: imageEl.src,
      finalPrompt,
      studioAnalysis: analysis,
      market: marketSelectEl.value,
      logo: uploadedLogo ? logoFilename.textContent : null,
      parentId,
      changeSummary,
      designNotes,
      status: status as 'Proposed' | 'Approved',
    };

    statusEl.innerText = 'Saving design...';
    const savedDesign = await saveDesignInDB(newDesign);
    allDesigns.unshift(savedDesign); // Update local state

    activeDesign = savedDesign;
    refreshAllViews();

    statusEl.innerText = 'Done!';
    viewHistoryItem(activeDesign.id);
  } catch (e) {
    console.error('An error occurred during generation:', e);
    let errorMessage = `An unexpected error occurred: ${e.message}`;
    // Attempt to parse a more specific Google AI error
    try {
      const err = JSON.parse(e.message);
      if (err.error?.message) {
        errorMessage = `API Error: ${err.error.message}`;
      }
      if (err.error?.code === 429) {
        quotaErrorEl.style.display = 'block';
        errorMessage = 'You have exceeded your API quota.';
      }
    } catch (parseError) {
      // Not a JSON error, use the original message
    }
    statusEl.innerText = errorMessage;
  } finally {
    setLoadingState(false);
    updateGenerateButtonState();
  }
}

function renderStudioAnalysis(analysis: StudioAnalysis) {
  // Product DNA
  const specs = analysis.productDNA.specs;
  dnaSpecsListEl.innerHTML = `
      <li><strong>Fabric Type:</strong> ${specs.fabricType}</li>
      <li><strong>Fabric Weight:</strong> ${specs.fabricWeightGsm} GSM</li>
      <li><strong>Stitching:</strong> ${specs.stitchingDetails}</li>
      <li><strong>Printing:</strong> ${specs.printingMethod}</li>
      <li><strong>Logo:</strong> ${specs.logoComplexity}</li>
  `;
  dnaPricingContentEl.innerHTML = `
    ${analysis.productDNA.pricing.analysis}
    <br><br>
    <strong>${analysis.productDNA.pricing.estimatedPrice}</strong>
  `;
  dnaLogisticsContentEl.innerHTML = `
    ${analysis.productDNA.logistics.analysis}
    <br><br>
    <strong>${analysis.productDNA.logistics.estimatedCost}</strong>
  `;

  // Branding
  brandingArchetypeEl.textContent = analysis.branding.brandArchetype;
  brandingVoiceEl.textContent = analysis.branding.brandVoice;
  brandingLogoFeedbackEl.textContent = analysis.branding.logoFeedback;

  // SEO/SEM
  const { seoSem } = analysis;
  seoRateScoreEl.textContent = seoSem.seoRate.score.toString();
  seoRateAnalysisEl.textContent = seoSem.seoRate.analysis;

  seoKeywordsEl.innerHTML = seoSem.targetKeywords
    .map((kw) => `<span class="keyword-pill">${kw}</span>`)
    .join('');
  semAdHeadlineEl.textContent = seoSem.semAd.headline;
  semAdDescriptionEl.textContent = seoSem.semAd.description;
  seoMetaDescriptionEl.textContent = seoSem.metaDescription;
  seoSocialPromptsEl.innerHTML = seoSem.socialPrompts
    .map((p) => `<li>${p}</li>`)
    .join('');

  if (analysis.sources.length > 0) {
    studioSourcesEl.innerHTML = `
              <h4>Sources (via Google Search):</h4>
              <ul>
                  ${analysis.sources
                    .map(
                      (source) =>
                        `<li><a href="${source.web.uri}" target="_blank" rel="noopener noreferrer">${source.web.title}</a></li>`,
                    )
                    .join('')}
              </ul>
          `;
  } else {
    studioSourcesEl.innerHTML = '';
  }

  // Set default tab
  studioTabs.forEach(t => t.classList.remove('active'));
  document.querySelector('.tab-button[data-tab="dna"]')?.classList.add('active');
  document.querySelectorAll('.tab-content').forEach(c => (c as HTMLElement).style.display = 'none');
  document.querySelector('#tab-dna')!.setAttribute('style', 'display: grid');

}

studioTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
        const tabName = tab.getAttribute('data-tab');
        studioTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(content => {
            const contentEl = content as HTMLElement;
            if (content.id === `tab-${tabName}`) {
                contentEl.style.display = contentEl.id === 'tab-dna' ? 'grid' : 'block';
            } else {
                contentEl.style.display = 'none';
            }
        });
    });
});

function refreshAllViews() {
  renderHistory();
  renderStore();
}

function renderHistory() {
  const designHistory = allDesigns.filter((d) => d.status !== 'Published');
  if (designHistory.length === 0) {
    historyCardEl.style.display = 'none';
    return;
  }

  historyCardEl.style.display = 'block';
  historyListEl.innerHTML = '';

  const recordsById = new Map<string, DesignRecord>();
  designHistory.forEach((r) => recordsById.set(r.id, r));

  const childrenByParentId = new Map<string, DesignRecord[]>();
  const rootRecords: DesignRecord[] = [];

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

  childrenByParentId.forEach((children) => {
    children.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  });

  rootRecords.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const renderRecord = (record: DesignRecord, isChild: boolean) => {
    const li = document.createElement('li');
    li.className = 'history-item';
    if (isChild) li.classList.add('is-child');
    if (record.status === 'Rejected') li.classList.add('is-rejected');

    const statusBadge = `<span class="history-status status-${record.status.toLowerCase()}">${
      record.status
    }</span>`;
    let actionButtonHtml = '';
    if (record.status === 'Proposed') {
      actionButtonHtml = `<button class="secondary-button review-button" data-id="${record.id}">Review</button>`;
    } else if (record.status === 'Approved') {
      actionButtonHtml = `
        <button class="secondary-button view-history-button" data-id="${record.id}">View</button>
        <button class="secondary-button publish-button" data-id="${record.id}">Publish</button>
      `;
    } else {
      // Rejected or Published
      actionButtonHtml = `<button class="secondary-button view-history-button" data-id="${record.id}">View</button>`;
    }

    li.innerHTML = `
      <img src="${record.imageDataUrl}" alt="Design thumbnail" class="history-thumbnail">
      <div class="history-info">
        <p class="history-summary">${
          record.changeSummary || 'Initial Design'
        }</p>
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

function renderStore() {
  const publishedDesigns = allDesigns.filter((d) => d.status === 'Published');
  if (publishedDesigns.length === 0) {
    storeCardEl.style.display = 'none';
    return;
  }

  storeCardEl.style.display = 'block';
  storeGridEl.innerHTML = publishedDesigns
    .map(
      (record) => `
        <div class="store-item">
            <img src="${
              record.imageDataUrl
            }" alt="Published design" class="store-item-img">
            <p class="store-item-title">${
              record.changeSummary || 'Initial Design'
            }</p>
            <p class="store-item-price">${
              record.studioAnalysis.productDNA.pricing.estimatedPrice
            }</p>
        </div>
    `,
    )
    .join('');
}

historyListEl.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const viewButton = target.closest('.view-history-button');
  const reviewButton = target.closest('.review-button');
  const publishButton = target.closest('.publish-button');

  if (viewButton) {
    const id = viewButton.getAttribute('data-id');
    if (id) viewHistoryItem(id);
  } else if (reviewButton) {
    const id = reviewButton.getAttribute('data-id');
    if (id) openReviewModal(id);
  } else if (publishButton) {
    const id = publishButton.getAttribute('data-id');
    const buttonEl = publishButton as HTMLButtonElement;
    if (id) publishDesign(id, buttonEl);
  }
});

function viewHistoryItem(id: string) {
  const record = allDesigns.find((r) => r.id === id);
  if (!record) return;

  activeDesign = record;

  imageEl.src = record.imageDataUrl;
  imageEl.style.display = 'block';
  promptEl.value = record.finalPrompt;

  renderStudioAnalysis(record.studioAnalysis);
  studioContainerEl.style.display = 'block';

  if (record.changeSummary) {
    designDetailsIdEl.textContent = record.id;
    designDetailsSummaryEl.textContent = record.changeSummary;
    designDetailsNotesEl.textContent =
      record.designNotes || 'No details provided.';
    designDetailsNotesWrapperEl.style.display = record.designNotes
      ? 'block'
      : 'none';
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

  updateGenerateButtonState();

  statusEl.innerText = `Viewing design from ${record.timestamp.toLocaleTimeString()}.`;
  const resultCard = document.querySelector('.result-card');
  resultCard?.scrollIntoView({ behavior: 'smooth' });
}

function updateGenerateButtonState() {
  if (!activeDesign) {
    generateButton.textContent = 'Generate & Analyze';
    generateButton.disabled = false;
  } else if (activeDesign.status === 'Approved') {
    generateButton.textContent = 'Iterate on Design';
    generateButton.disabled = false;
  } else {
    generateButton.textContent = `Change is ${activeDesign.status}`;
    generateButton.disabled = true;
  }
}

function openReviewModal(id: string) {
  const record = allDesigns.find((r) => r.id === id);
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

async function handleReview(approve: boolean, button: HTMLButtonElement) {
  if (!reviewingDesignId) return;

  button.classList.add('is-loading');
  button.disabled = true;

  try {
    const updates: Partial<DesignRecord> = {
      status: approve ? 'Approved' : 'Rejected',
      reviewComments: reviewCommentsInput.value,
    };
    const updatedRecord = await updateDesignInDB(reviewingDesignId, updates);

    // Update local state
    const index = allDesigns.findIndex((r) => r.id === reviewingDesignId);
    if (index !== -1) allDesigns[index] = updatedRecord;

    statusEl.innerText = `Proposal ${updatedRecord.id} ${
      approve ? 'approved' : 'rejected'
    }.`;
    refreshAllViews();
    if (activeDesign?.id === updatedRecord.id) {
      viewHistoryItem(updatedRecord.id);
    }
  } catch (e) {
    statusEl.innerText = `Error updating design: ${e.message}`;
  } finally {
    button.classList.remove('is-loading');
    button.disabled = false;
    closeReviewModal();
  }
}

approveButton.addEventListener('click', (e) =>
  handleReview(true, e.currentTarget as HTMLButtonElement),
);
rejectButton.addEventListener('click', (e) =>
  handleReview(false, e.currentTarget as HTMLButtonElement),
);
cancelReviewButton.addEventListener('click', closeReviewModal);

async function publishDesign(id: string, button: HTMLButtonElement) {
  const record = allDesigns.find((r) => r.id === id);
  if (!record || record.status !== 'Approved') {
    statusEl.innerText = 'Error: Only approved designs can be published.';
    return;
  }

  button.classList.add('is-loading');
  button.disabled = true;
  statusEl.innerText = `Publishing ${id} to your store...`;

  try {
    const updatedRecord = await updateDesignInDB(id, { status: 'Published' });

    const index = allDesigns.findIndex((r) => r.id === id);
    if (index !== -1) allDesigns[index] = updatedRecord;

    refreshAllViews();
    statusEl.innerText = `Design ${id} has been published to your store!`;
    storeCardEl.scrollIntoView({ behavior: 'smooth' });
  } catch (e) {
    statusEl.innerText = `Error publishing design: ${e.message}`;
  } finally {
    // Button will disappear on re-render, no need to re-enable
  }
}

async function initializeApp() {
  try {
    allDesigns = await fetchDesignsFromDB();
    refreshAllViews();
  } catch (e) {
    statusEl.innerText = `Error loading designs: ${e.message}`;
  } finally {
    initialLoaderEl.style.display = 'none';
    mainContainer.style.display = 'grid';
  }
}

// Initial call to start the application
initializeApp();
