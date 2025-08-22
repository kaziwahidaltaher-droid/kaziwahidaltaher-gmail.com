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
const DB_KEY = 'LOOMINAR_DESIGNS_DB';

// --- LOCAL STORAGE DATABASE & API LAYER ---
// This simulates a backend database using the browser's localStorage.
const FAKE_LATENCY = 300;

async function fetchDesignsFromDB(): Promise<DesignRecord[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const dbString = localStorage.getItem(DB_KEY);
      const designs = dbString ? JSON.parse(dbString) : [];
      // Deserialize dates which are strings from storage
      const parsedDesigns = designs.map((d: any) => ({
        ...d,
        timestamp: new Date(d.timestamp),
      }));
      resolve(parsedDesigns);
    }, FAKE_LATENCY);
  });
}

async function saveDesignsToDB(designs: DesignRecord[]): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      localStorage.setItem(DB_KEY, JSON.stringify(designs));
      resolve();
    }, FAKE_LATENCY);
  });
}
// --- END DATABASE LAYER ---

// Global state for the uploaded logo
let uploadedLogo: { base64: string; mimeType: string } | null = null;

// Global state: Single source of truth for all designs
let allDesigns: DesignRecord[] = [];
let activeDesign: DesignRecord | null = null;
let reviewingDesignId: string | null = null;

const initialPrompt = '';

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
  ecommerce: {
    productTitle: string;
    productDescription: string;
    sku: string;
    gtinInfo: string;
    googleProductCategory: string;
  };
  manufacturing: {
    manufacturers: Array<{
      name: string;
      specialty: string;
      location: string;
      website: string;
      contact: string;
    }>;
    similarProducts: string[];
    b2bKeywords: string[];
  };
  sources: GroundingChunk[];
}

interface SocialBuzzAnalysis {
  overallSentiment: 'Positive' | 'Neutral' | 'Negative' | 'Mixed';
  sentimentAnalysis: string;
  keyInfluencers: Array<{ name: string; platform: string; reason: string }>;
  viralContentIdeas: string[];
  relevantHashtags: string[];
  sources: GroundingChunk[];
}

interface DesignRecord {
  id: string;
  timestamp: Date;
  imageDataUrl: string;
  finalPrompt: string;
  studioAnalysis: StudioAnalysis;
  socialBuzzAnalysis: SocialBuzzAnalysis;
  market: string;
  logo: string | null;
  parentId: string | null;
  changeSummary?: string;
  designNotes?: string;
  status: 'Proposed' | 'Approved' | 'Rejected' | 'Published';
  reviewComments?: string;
}

/**
 * A helper function to safely create and append elements.
 * Avoids the use of `innerHTML` to prevent XSS vulnerabilities.
 */
function createAndAppend(
  parent: HTMLElement,
  tag: string,
  options: {
    className?: string;
    textContent?: string;
    properties?: Record<string, any>;
    attributes?: Record<string, string>;
    listeners?: Record<string, (e: Event) => void>;
  } = {},
): HTMLElement {
  const el = document.createElement(tag);
  if (options.className) el.className = options.className;
  if (options.textContent) el.textContent = options.textContent;
  if (options.properties) {
    for (const key in options.properties) {
      (el as any)[key] = options.properties[key];
    }
  }
  if (options.attributes) {
    for (const key in options.attributes) {
      el.setAttribute(key, options.attributes[key]);
    }
  }
  if (options.listeners) {
    for (const key in options.listeners) {
      el.addEventListener(key, options.listeners[key]);
    }
  }
  parent.appendChild(el);
  return el;
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

async function generateImage(prompt: string): Promise<string> {
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
  return `data:image/jpeg;base64,${base64ImageBytes}`;
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
    You are an expert-level Brand Strategist, Marketing Analyst, E-commerce Merchandiser, and Sourcing Specialist. Your task is to provide a comprehensive, end-to-end go-to-market analysis for a T-shirt design for the **${market}** market, based on its description. Use real-time Google Search data to inform your analysis.

    **Product Description:**
    "${prompt}"

    **Logo Context:**
    ${logoContext}

    **Your Task:**
    Provide a complete analysis in natural language, covering all the following points:

    1.  **Product DNA:** Analyze the product's core specs, and provide pricing and logistics insights for the target market.
    2.  **Branding & Identity:** Define a compelling brand identity. Create a brand archetype and describe the brand voice. Provide logo feedback based on the context.
    3.  **Region-Aware SEO & SEM:** Develop a digital marketing strategy for ${market}.
        *   **SEO Rate:** Provide a "Search Engine Optimization Rate" as a score out of 100, representing the product's potential to rank well in the ${market} market based on your keyword analysis. Briefly justify the score.
        *   Generate targeted SEO keywords, SEM ad copy, a meta description, and social media prompts.
    4.  **E-commerce Listing:** Generate the essential data fields required to list this product on a platform like Google Merchant Center for the ${market} market.
    5.  **Manufacturing & Sourcing:** Identify potential manufacturing partners and strategic B2B keywords for the ${market} market.
    `;

  // Step 1: Grounding call to gather real-time information
  const groundingResponse = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: analysisPrompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const groundedText = groundingResponse.text;
  const sources =
    groundingResponse.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];

  // Step 2: Structuring call to format the grounded information into JSON
  const structuringPrompt = `
    Based on the following analysis, your task is to structure the information precisely into the specified JSON format. Do not add any new information; only use what is provided in the text below.

    **Provided Analysis:**
    ${groundedText}
    `;

  const structuringResponse = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: structuringPrompt,
    config: {
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
          ecommerce: {
            type: Type.OBJECT,
            properties: {
              productTitle: { type: Type.STRING },
              productDescription: { type: Type.STRING },
              sku: { type: Type.STRING },
              gtinInfo: { type: Type.STRING },
              googleProductCategory: { type: Type.STRING },
            },
          },
          manufacturing: {
            type: Type.OBJECT,
            properties: {
              manufacturers: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    specialty: { type: Type.STRING },
                    location: { type: Type.STRING },
                    website: { type: Type.STRING },
                    contact: { type: Type.STRING },
                  },
                },
              },
              similarProducts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              b2bKeywords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
          },
        },
      },
    },
  });

  const analysis = JSON.parse(structuringResponse.text);
  return { ...analysis, sources: sources as GroundingChunk[] };
}

async function getSocialBuzzAnalysis(
  prompt: string,
  market: string,
): Promise<SocialBuzzAnalysis> {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const analysisPrompt = `
    You are a social media trend analyst. Based on the following product description for the **${market}** market, perform a real-time analysis of social media buzz using Google Search.

    **Product Description:**
    "${prompt}"

    **Your Task:**
    Provide a complete social media analysis in natural language, covering all the following points:

    1.  **Sentiment:** What is the current public sentiment towards similar products or styles? Provide an overall sentiment and a brief analysis.
    2.  **Influencers:** Identify 2-3 key influencers or content creator archetypes in the ${market} market who would be a good fit for this brand. Explain why.
    3.  **Content Ideas:** Suggest 3 viral content ideas (e.g., TikTok challenge, Instagram Reel trend) that could be used to promote this product.
    4.  **Hashtags:** Provide a list of 5-7 relevant and trending hashtags.
  `;

  // Step 1: Grounding call to gather real-time information
  const groundingResponse = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: analysisPrompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const groundedText = groundingResponse.text;
  const sources =
    groundingResponse.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];

  // Step 2: Structuring call to format the grounded information into JSON
  const structuringPrompt = `
    Based on the following social media analysis, your task is to structure the information precisely into the specified JSON format. Only use the information provided below.

    **Provided Analysis:**
    ${groundedText}
    `;

  const structuringResponse = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: structuringPrompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overallSentiment: { type: Type.STRING },
          sentimentAnalysis: { type: Type.STRING },
          keyInfluencers: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                platform: { type: Type.STRING },
                reason: { type: Type.STRING },
              },
            },
          },
          viralContentIdeas: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          relevantHashtags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
      },
    },
  });

  const analysis = JSON.parse(structuringResponse.text);
  return { ...analysis, sources: sources as GroundingChunk[] };
}

// --- DOM ELEMENT SELECTORS ---
const sidebarEl = document.querySelector('.sidebar') as HTMLElement;
const mainContentEl = document.querySelector('.main-content') as HTMLElement;
const initialLoaderEl = document.querySelector(
  '#initial-loader',
) as HTMLDivElement;
const appContainer = document.querySelector('.app-container') as HTMLElement;
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

// Main Stage Welcome Screen
const welcomeScreenEl = document.querySelector(
  '#welcome-screen',
) as HTMLDivElement;
const resultDisplayEl = document.querySelector(
  '#result-display',
) as HTMLDivElement;

// Studio Elements
const studioContainerEl = document.querySelector(
  '#studio-container',
) as HTMLDivElement;
const studioTabsContainer = document.querySelector(
  '.tab-nav',
) as HTMLDivElement;

// Product DNA Tab
const dnaSpecsListEl = document.querySelector(
  '#dna-specs-list',
) as HTMLUListElement;
const dnaPricingContentEl = document.querySelector(
  '#dna-pricing-content',
) as HTMLDivElement;
const dnaLogisticsContentEl = document.querySelector(
  '#dna-logistics-content',
) as HTMLDivElement;

// Branding Tab
const brandingArchetypeEl = document.querySelector(
  '#branding-archetype',
) as HTMLElement;
const brandingVoiceEl = document.querySelector(
  '#branding-voice',
) as HTMLElement;
const brandingLogoFeedbackEl = document.querySelector(
  '#branding-logo-feedback',
) as HTMLElement;

// SEO/SEM Tab
const seoRateCircle = document.querySelector(
  '#seo-rate-circle',
) as SVGCircleElement;
const seoRateScoreEl = document.querySelector(
  '#seo-rate-score',
) as HTMLSpanElement;
const seoRateAnalysisEl = document.querySelector(
  '#seo-rate-analysis',
) as HTMLParagraphElement;
const seoKeywordsEl = document.querySelector('#seo-keywords') as HTMLDivElement;
const semAdHeadlineEl = document.querySelector(
  '#sem-ad-headline',
) as HTMLElement;
const semAdDescriptionEl = document.querySelector(
  '#sem-ad-description',
) as HTMLElement;
const seoMetaDescriptionEl = document.querySelector(
  '#seo-meta-description',
) as HTMLElement;
const seoSocialPromptsEl = document.querySelector(
  '#seo-social-prompts',
) as HTMLUListElement;

// E-commerce Tab
const ecomTitleEl = document.querySelector('#ecom-title') as HTMLElement;
const ecomDescriptionEl = document.querySelector(
  '#ecom-description',
) as HTMLElement;
const ecomSkuEl = document.querySelector('#ecom-sku') as HTMLElement;
const ecomGtinEl = document.querySelector('#ecom-gtin') as HTMLElement;
const ecomCategoryEl = document.querySelector('#ecom-category') as HTMLElement;

// Manufacturing Tab
const manManufacturersEl = document.querySelector(
  '#man-manufacturers',
) as HTMLDivElement;
const manSimilarProductsEl = document.querySelector(
  '#man-similar-products',
) as HTMLUListElement;
const manB2bKeywordsEl = document.querySelector(
  '#man-b2b-keywords',
) as HTMLDivElement;

// Social Buzz Tab
const buzzSentimentEl = document.querySelector(
  '#buzz-sentiment',
) as HTMLSpanElement;
const buzzSentimentAnalysisEl = document.querySelector(
  '#buzz-sentiment-analysis',
) as HTMLParagraphElement;
const buzzInfluencersEl = document.querySelector(
  '#buzz-influencers',
) as HTMLDivElement;
const buzzContentIdeasEl = document.querySelector(
  '#buzz-content-ideas',
) as HTMLUListElement;
const buzzHashtagsEl = document.querySelector('#buzz-hashtags') as HTMLDivElement;

const studioSourcesEl = document.querySelector(
  '#studio-sources',
) as HTMLDivElement;

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
const historyListEl = document.querySelector(
  '#history-list',
) as HTMLUListElement;
const historyEmptyStateEl = document.querySelector(
  '#history-empty-state',
) as HTMLDivElement;

// Store Elements
const storeGridEl = document.querySelector('#store-grid') as HTMLDivElement;
const storeEmptyStateEl = document.querySelector(
  '#store-empty-state',
) as HTMLDivElement;

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
const reviewNotesEl = document.querySelector(
  '#review-notes',
) as HTMLSpanElement;
const reviewCommentsInput = document.querySelector(
  '#review-comments',
) as HTMLTextAreaElement;
const approveButton = document.querySelector(
  '#approve-button',
) as HTMLButtonElement;
const rejectButton = document.querySelector(
  '#reject-button',
) as HTMLButtonElement;
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

// --- MULTIMODAL FEATURE ELEMENTS ---
// Voice Input
const micButton = document.querySelector('#mic-button') as HTMLButtonElement;

// Camera
const cameraButton = document.querySelector(
  '#camera-button',
) as HTMLButtonElement;
const cameraModalEl = document.querySelector(
  '#camera-modal',
) as HTMLDivElement;
const cameraVideoEl = document.querySelector(
  '#camera-video',
) as HTMLVideoElement;
const captureButton = document.querySelector(
  '#capture-button',
) as HTMLButtonElement;
const cancelCameraButton = document.querySelector(
  '#cancel-camera-button',
) as HTMLButtonElement;
const cameraLoaderEl = document.querySelector(
  '#camera-loader',
) as HTMLDivElement;
const paletteContainerEl = document.querySelector(
  '#palette-container',
) as HTMLDivElement;
let cameraStream: MediaStream | null = null;

// --- EVENT LISTENERS ---

openKeyEl.addEventListener('click', async (e) => {
  await window.aistudio?.openSelectKey();
});

const generateButton = document.querySelector(
  '#generate-button',
) as HTMLButtonElement;

function setUiLock(isLocked: boolean) {
  generateButton.disabled = isLocked;
  promptEl.disabled = isLocked;
  logoUploadInput.disabled = isLocked;
  removeLogoButton.disabled = isLocked;
  marketSelectEl.disabled = isLocked;
  sidebarEl.classList.toggle('is-locked', isLocked);

  if (isLocked) {
    generateButton.classList.add('is-loading');
    appContainer.setAttribute('aria-busy', 'true');
  } else {
    generateButton.classList.remove('is-loading');
    appContainer.setAttribute('aria-busy', 'false');
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

// --- CORE GENERATION LOGIC ---

async function generate(changeSummary?: string, designNotes?: string) {
  let prompt = promptEl.value;
  if (!prompt) {
    updateStatus('Error: Prompt cannot be empty.', 'error');
    return;
  }

  if (uploadedLogo && !prompt.includes('[LOGO]')) {
    updateStatus(
      'Error: Please use the [LOGO] placeholder in your prompt when uploading an image.',
      'error',
    );
    return;
  }

  const parentId = activeDesign ? activeDesign.id : null;

  updateStatus('Starting process...', 'loading');
  setUiLock(true);
  welcomeScreenEl.style.display = 'none';
  resultDisplayEl.style.display = 'block';
  imageEl.style.display = 'none';
  loaderEl.style.display = 'block';
  studioContainerEl.style.display = 'none';
  designDetailsContainerEl.style.display = 'none';
  quotaErrorEl.style.display = 'none';

  try {
    let finalPrompt = prompt;
    if (uploadedLogo && prompt.includes('[LOGO]')) {
      updateStatus('Analyzing uploaded image...', 'loading');
      const logoDescription = await getImageDescription(uploadedLogo);
      finalPrompt = prompt.replace(/\[LOGO\]/g, `(${logoDescription})`);
    }

    updateStatus('Bringing your vision to life... 🎨', 'loading');
    const imageUrl = await generateImage(finalPrompt);
    imageEl.src = imageUrl;
    imageEl.style.display = 'block';
    loaderEl.style.display = 'none';

    updateStatus(
      'Running Market & Social Analysis... 📈',
      'loading',
    );
    const market = marketSelectEl.value;
    const [studioAnalysis, socialBuzzAnalysis] = await Promise.all([
      getStudioAnalysis(finalPrompt, market, !!uploadedLogo),
      getSocialBuzzAnalysis(finalPrompt, market),
    ]);

    const newDesign: DesignRecord = {
      id: `LMNR-${Date.now()}`,
      timestamp: new Date(),
      imageDataUrl: imageUrl,
      finalPrompt,
      studioAnalysis,
      socialBuzzAnalysis,
      market: marketSelectEl.value,
      logo: uploadedLogo ? logoFilename.textContent : null,
      parentId,
      changeSummary,
      designNotes,
      status: parentId ? 'Proposed' : 'Approved',
    };

    updateStatus('Saving design...', 'loading');
    allDesigns.unshift(newDesign);
    await saveDesignsToDB(allDesigns);

    activeDesign = newDesign;
    refreshAllViews();
    viewHistoryItem(activeDesign.id);
    updateStatus('Success! Your new design is ready. 🚀', 'success');
  } catch (e: any) {
    console.error('An error occurred during generation:', e);
    let errorMessage = `An unexpected error occurred: ${e.message}`;
    // Attempt to parse a more specific Google AI error
    try {
      if (typeof e.message === 'string' && e.message.startsWith('{')) {
        const err = JSON.parse(e.message);
        if (err.error?.message) {
            errorMessage = `API Error: ${err.error.message}`;
        }
        if (err.error?.code === 429) {
            quotaErrorEl.style.display = 'block';
            errorMessage = 'You have exceeded your API quota.';
        }
      }
    } catch (parseError) {
      // Not a JSON error, use the original message
    }
    updateStatus(errorMessage, 'error');
    loaderEl.style.display = 'none';
  } finally {
    setUiLock(false);
    updateGenerateButtonState();
  }
}

// --- RENDERING FUNCTIONS ---

function updateStatus(
  message: string,
  type: 'loading' | 'success' | 'error' | 'info',
) {
  statusEl.textContent = message;
  statusEl.className = `status-message status-${type}`;
}

function addSpeakListeners(container: HTMLElement) {
  container.querySelectorAll('.info-block').forEach((block) => {
    const title = block.querySelector('h3');
    const content = block.querySelector('p, ul, div, span');
    if (title && content) {
      createAndAppend(title, 'button', {
        className: 'speak-button',
        attributes: { 'aria-label': 'Read content aloud' },
        listeners: {
          click: (e) => {
            e.stopPropagation();
            speak(content.textContent || '');
          },
        },
      });
    }
  });
}

function renderStudioAnalysis(analysis: StudioAnalysis) {
  const { productDNA, branding, seoSem, ecommerce, manufacturing } = analysis;

  // --- Clear previous content safely ---
  const elementsToClear = [
    dnaSpecsListEl,
    dnaPricingContentEl,
    dnaLogisticsContentEl,
    seoKeywordsEl,
    seoSocialPromptsEl,
    ecomDescriptionEl,
    manManufacturersEl,
    manSimilarProductsEl,
    manB2bKeywordsEl,
  ];
  elementsToClear.forEach((el) => {
    while (el.firstChild) el.removeChild(el.firstChild);
  });

  // --- Product DNA ---
  const specs: Record<string, string | number> = {
    'Fabric Type': productDNA.specs.fabricType,
    'Fabric Weight': `${productDNA.specs.fabricWeightGsm} GSM`,
    Stitching: productDNA.specs.stitchingDetails,
    Printing: productDNA.specs.printingMethod,
    Logo: productDNA.specs.logoComplexity,
  };
  for (const [key, value] of Object.entries(specs)) {
    const li = createAndAppend(dnaSpecsListEl, 'li');
    createAndAppend(li, 'strong', { textContent: `${key}:` });
    li.append(` ${value}`);
  }
  createAndAppend(dnaPricingContentEl, 'p', {
    textContent: productDNA.pricing.analysis,
  });
  createAndAppend(dnaPricingContentEl, 'strong', {
    textContent: productDNA.pricing.estimatedPrice,
  });
  createAndAppend(dnaLogisticsContentEl, 'p', {
    textContent: productDNA.logistics.analysis,
  });
  createAndAppend(dnaLogisticsContentEl, 'strong', {
    textContent: productDNA.logistics.estimatedCost,
  });

  // --- Branding ---
  brandingArchetypeEl.textContent = branding.brandArchetype;
  brandingVoiceEl.textContent = branding.brandVoice;
  brandingLogoFeedbackEl.textContent = branding.logoFeedback;

  // --- SEO/SEM ---
  seoRateScoreEl.textContent = seoSem.seoRate.score.toString();
  seoRateAnalysisEl.textContent = seoSem.seoRate.analysis;
  const circumference = 2 * Math.PI * 45; // r = 45
  const offset = circumference - (seoSem.seoRate.score / 100) * circumference;
  seoRateCircle.style.strokeDashoffset = offset.toString();
  seoRateCircle.style.stroke =
    seoSem.seoRate.score > 75
      ? '#28a745'
      : seoSem.seoRate.score > 40
      ? '#ffc107'
      : '#dc3545';

  seoSem.targetKeywords.forEach((kw) => {
    createAndAppend(seoKeywordsEl, 'span', {
      className: 'keyword-pill',
      textContent: kw,
    });
  });
  semAdHeadlineEl.textContent = seoSem.semAd.headline;
  semAdDescriptionEl.textContent = seoSem.semAd.description;
  seoMetaDescriptionEl.textContent = seoSem.metaDescription;
  seoSem.socialPrompts.forEach((p) => {
    createAndAppend(seoSocialPromptsEl, 'li', { textContent: p });
  });

  // --- E-commerce ---
  ecomTitleEl.textContent = ecommerce.productTitle;
  // Use pre-wrap for description
  ecomDescriptionEl.textContent = ecommerce.productDescription;
  ecomSkuEl.textContent = ecommerce.sku;
  ecomGtinEl.textContent = ecommerce.gtinInfo;
  ecomCategoryEl.textContent = ecommerce.googleProductCategory;

  // --- Manufacturing ---
  manufacturing.manufacturers.forEach((m) => {
    const card = createAndAppend(manManufacturersEl, 'div', {
      className: 'manufacturer-card',
    });
    createAndAppend(card, 'strong', { textContent: m.name });
    createAndAppend(card, 'span', {
      className: 'chip',
      textContent: m.specialty,
    });
    createAndAppend(card, 'p', { textContent: m.location });
    const links = createAndAppend(card, 'div', { className: 'card-links' });
    createAndAppend(links, 'a', {
      textContent: 'Website',
      properties: { href: m.website, target: '_blank' },
    });
    createAndAppend(links, 'a', {
      textContent: 'Contact',
      properties: { href: `mailto:${m.contact}` },
    });
    createAndAppend(links, 'a', {
      textContent: 'Map',
      properties: {
        href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          m.location,
        )}`,
        target: '_blank',
      },
    });
  });
  manufacturing.similarProducts.forEach((p) => {
    createAndAppend(manSimilarProductsEl, 'li', { textContent: p });
  });
  manufacturing.b2bKeywords.forEach((kw) => {
    createAndAppend(manB2bKeywordsEl, 'span', {
      className: 'keyword-pill',
      textContent: kw,
    });
  });

  // Add speak listeners after rendering all blocks
  studioContainerEl
    .querySelectorAll('.tab-content')
    .forEach((tab) => addSpeakListeners(tab as HTMLElement));

  renderSources();
}

function renderSocialBuzzAnalysis(analysis: SocialBuzzAnalysis) {
  // --- Clear previous content safely ---
  const elementsToClear = [
    buzzInfluencersEl,
    buzzContentIdeasEl,
    buzzHashtagsEl,
  ];
  elementsToClear.forEach((el) => {
    while (el.firstChild) el.removeChild(el.firstChild);
  });

  const sentimentClass = analysis.overallSentiment.toLowerCase();
  buzzSentimentEl.className = `sentiment-badge sentiment-${sentimentClass}`;
  buzzSentimentEl.textContent = analysis.overallSentiment;
  buzzSentimentAnalysisEl.textContent = analysis.sentimentAnalysis;

  analysis.keyInfluencers.forEach((inf) => {
    const card = createAndAppend(buzzInfluencersEl, 'div', {
      className: 'influencer-card',
    });
    createAndAppend(card, 'strong', {
      className: 'influencer-name',
      textContent: inf.name,
    });
    createAndAppend(card, 'span', {
      className: 'chip',
      textContent: inf.platform,
    });
    createAndAppend(card, 'p', {
      className: 'influencer-reason',
      textContent: inf.reason,
    });
  });

  analysis.viralContentIdeas.forEach((idea) => {
    createAndAppend(buzzContentIdeasEl, 'li', { textContent: idea });
  });

  analysis.relevantHashtags.forEach((tag) => {
    createAndAppend(buzzHashtagsEl, 'span', {
      className: 'keyword-pill hashtag',
      textContent: tag,
    });
  });
}

function renderSources() {
  while (studioSourcesEl.firstChild)
    studioSourcesEl.removeChild(studioSourcesEl.firstChild);
  if (!activeDesign) return;

  const allSources = [
    ...(activeDesign.studioAnalysis.sources || []),
    ...(activeDesign.socialBuzzAnalysis.sources || []),
  ];

  // De-duplicate sources based on URI
  const uniqueSources = Array.from(
    new Map(allSources.map((item) => [item.web.uri, item])).values(),
  );

  if (uniqueSources.length > 0) {
    createAndAppend(studioSourcesEl, 'h4', {
      textContent: 'Sources (via Google Search):',
    });
    const ul = createAndAppend(studioSourcesEl, 'ul');
    uniqueSources.forEach((source) => {
      const li = createAndAppend(ul, 'li');
      createAndAppend(li, 'a', {
        textContent: source.web.title,
        properties: {
          href: source.web.uri,
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      });
    });
  }
}

studioTabsContainer.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const tabButton = target.closest('.tab-button');
  if (!tabButton) return;

  const tabName = tabButton.getAttribute('data-tab');
  studioTabsContainer
    .querySelectorAll('.tab-button')
    .forEach((t) => t.classList.remove('active'));
  tabButton.classList.add('active');

  document.querySelectorAll('.tab-content').forEach((content) => {
    const contentEl = content as HTMLElement;
    contentEl.classList.toggle('active', content.id === `tab-${tabName}`);
  });
});

function refreshAllViews() {
  renderHistory();
  renderStore();
}

function renderHistory() {
  const designHistory = allDesigns.filter((d) => d.status !== 'Published');
  while (historyListEl.firstChild)
    historyListEl.removeChild(historyListEl.firstChild);

  historyEmptyStateEl.style.display =
    designHistory.length === 0 ? 'block' : 'none';
  if (designHistory.length === 0) return;

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

  const renderRecord = (record: DesignRecord, level: number) => {
    const li = createAndAppend(historyListEl, 'li', {
      className: `history-item status-${record.status.toLowerCase()}`,
      attributes: { 'data-id': record.id, role: 'button', tabindex: '0' },
    });
    li.style.setProperty('--level', level.toString());

    createAndAppend(li, 'img', {
      className: 'history-thumbnail',
      properties: { src: record.imageDataUrl, alt: 'Design thumbnail' },
    });

    const infoDiv = createAndAppend(li, 'div', { className: 'history-info' });
    createAndAppend(infoDiv, 'p', {
      className: 'history-summary',
      textContent: record.changeSummary || 'Initial Design',
    });
    const metaDiv = createAndAppend(infoDiv, 'div', {
      className: 'history-meta',
    });
    createAndAppend(metaDiv, 'span', {
      className: `history-status`,
      textContent: record.status,
    });
    createAndAppend(metaDiv, 'span', {
      className: 'history-timestamp',
      textContent: record.timestamp.toLocaleTimeString(),
    });

    const actionsDiv = createAndAppend(li, 'div', {
      className: 'history-actions',
    });
    if (record.status === 'Proposed') {
      const reviewButton = createAndAppend(actionsDiv, 'button', {
        textContent: 'Review',
        attributes: { 'data-action': 'review' },
      });
    } else if (record.status === 'Approved') {
      const publishButton = createAndAppend(actionsDiv, 'button', {
        textContent: 'Publish',
        attributes: { 'data-action': 'publish' },
      });
    }

    const children = childrenByParentId.get(record.id);
    if (children) {
      for (const child of children) {
        renderRecord(child, level + 1);
      }
    }
  };

  for (const record of rootRecords) {
    renderRecord(record, 0);
  }
}

function renderStore() {
  const publishedDesigns = allDesigns.filter((d) => d.status === 'Published');
  while (storeGridEl.firstChild)
    storeGridEl.removeChild(storeGridEl.firstChild);

  storeEmptyStateEl.style.display =
    publishedDesigns.length === 0 ? 'block' : 'none';
  if (publishedDesigns.length === 0) return;

  publishedDesigns.forEach((record) => {
    const storeItem = createAndAppend(storeGridEl, 'div', {
      className: 'store-item',
    });
    createAndAppend(storeItem, 'img', {
      className: 'store-item-img',
      properties: { src: record.imageDataUrl, alt: 'Published design' },
    });
    const textWrap = createAndAppend(storeItem, 'div');
    createAndAppend(textWrap, 'p', {
      className: 'store-item-title',
      textContent: record.changeSummary || 'Initial Design',
    });
    createAndAppend(textWrap, 'p', {
      className: 'store-item-price',
      textContent: record.studioAnalysis.productDNA.pricing.estimatedPrice,
    });
  });
}

historyListEl.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const item = target.closest('.history-item') as HTMLLIElement;
  if (!item) return;

  const id = item.dataset.id;
  if (!id) return;

  const actionButton = target.closest('button');
  const action = actionButton?.dataset.action;

  if (action === 'review') {
    openReviewModal(id);
  } else if (action === 'publish') {
    publishDesign(id, actionButton as HTMLButtonElement);
  } else {
    viewHistoryItem(id);
  }
});

function viewHistoryItem(id: string) {
  const record = allDesigns.find((r) => r.id === id);
  if (!record) return;

  activeDesign = record;

  // Highlight active history item
  document
    .querySelectorAll('.history-item')
    .forEach((el) => el.classList.remove('is-active'));
  document
    .querySelector(`.history-item[data-id="${id}"]`)
    ?.classList.add('is-active');

  // Show main content stage
  welcomeScreenEl.style.display = 'none';
  resultDisplayEl.style.display = 'block';
  loaderEl.style.display = 'none';

  imageEl.src = record.imageDataUrl;
  imageEl.style.display = 'block';
  promptEl.value = record.finalPrompt;

  renderStudioAnalysis(record.studioAnalysis);
  renderSocialBuzzAnalysis(record.socialBuzzAnalysis);
  studioContainerEl.style.display = 'block';

  // Set default tab to DNA
  studioTabsContainer
    .querySelectorAll('.tab-button')
    .forEach((t) => t.classList.remove('active'));
  document.querySelector('.tab-button[data-tab="dna"]')?.classList.add('active');
  document
    .querySelectorAll('.tab-content')
    .forEach((c) => (c as HTMLElement).classList.remove('active'));
  document.querySelector('#tab-dna')?.classList.add('active');

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
  updateStatus(
    `Viewing design from ${record.timestamp.toLocaleTimeString()}.`,
    'info',
  );
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
    const index = allDesigns.findIndex((r) => r.id === reviewingDesignId);
    if (index === -1) throw new Error('Design not found');

    allDesigns[index].status = approve ? 'Approved' : 'Rejected';
    allDesigns[index].reviewComments = reviewCommentsInput.value;

    await saveDesignsToDB(allDesigns);

    updateStatus(
      `Proposal ${reviewingDesignId} ${approve ? 'approved' : 'rejected'}.`,
      'success',
    );
    refreshAllViews();
    if (activeDesign?.id === reviewingDesignId) {
      viewHistoryItem(reviewingDesignId);
    }
  } catch (e: any) {
    updateStatus(`Error updating design: ${e.message}`, 'error');
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
    updateStatus('Error: Only approved designs can be published.', 'error');
    return;
  }

  button.classList.add('is-loading');
  button.disabled = true;
  updateStatus(`Publishing ${id} to your store...`, 'loading');

  try {
    const index = allDesigns.findIndex((r) => r.id === id);
    if (index === -1) throw new Error('Design not found');

    allDesigns[index].status = 'Published';
    await saveDesignsToDB(allDesigns);

    refreshAllViews();
    updateStatus(`Design ${id} has been published to your store!`, 'success');
  } catch (e: any) {
    updateStatus(`Error publishing design: ${e.message}`, 'error');
    button.classList.remove('is-loading');
    button.disabled = false;
  }
}

// --- MULTIMODAL FEATURE IMPLEMENTATIONS ---

// --- Speech Recognition (Voice-to-Text) ---
const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
let recognition: any | null = null;
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = (event: any) => {
    let interim_transcript = '';
    let final_transcript = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        final_transcript += event.results[i][0].transcript;
      } else {
        interim_transcript += event.results[i][0].transcript;
      }
    }
    promptEl.value = promptEl.value.replace(/ \.\.\./, '') + final_transcript;
    // Show interim with ellipsis
    if (interim_transcript) {
      promptEl.value = promptEl.value.replace(/ \.\.\./, '') + ' ...';
    }
  };

  recognition.onstart = () => {
    micButton.classList.add('is-listening');
    updateStatus('Listening... Speak your prompt.', 'info');
  };

  recognition.onend = () => {
    micButton.classList.remove('is-listening');
    updateStatus('Voice input ended.', 'info');
  };
}

micButton.addEventListener('click', () => {
  if (recognition) {
    if (micButton.classList.contains('is-listening')) {
      recognition.stop();
    } else {
      // Clear ellipsis if present before starting
      promptEl.value = promptEl.value.replace(/ \.\.\./, '');
      recognition.start();
    }
  } else {
    updateStatus(
      'Voice recognition is not supported in your browser.',
      'error',
    );
  }
});

// --- Speech Synthesis (Text-to-Speech) ---
function speak(text: string) {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel(); // Stop any previous speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    speechSynthesis.speak(utterance);
  } else {
    updateStatus('Text-to-speech is not supported in your browser.', 'error');
  }
}

// --- Camera Color Palette ---
async function startCamera() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
    cameraVideoEl.srcObject = cameraStream;
    cameraModalEl.style.display = 'flex';
  } catch (err) {
    console.error('Error accessing camera:', err);
    updateStatus(
      'Error: Could not access camera. Please check permissions.',
      'error',
    );
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
  }
  cameraStream = null;
  cameraModalEl.style.display = 'none';
}

cameraButton.addEventListener('click', startCamera);
cancelCameraButton.addEventListener('click', stopCamera);

captureButton.addEventListener('click', async () => {
  if (!cameraStream) return;
  cameraLoaderEl.style.display = 'block';
  while (paletteContainerEl.firstChild)
    paletteContainerEl.removeChild(paletteContainerEl.firstChild);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = cameraVideoEl.videoWidth;
    canvas.height = cameraVideoEl.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    ctx.drawImage(cameraVideoEl, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg');
    const base64 = dataUrl.split(',')[1];
    const mimeType = 'image/jpeg';
    const palette = await getColorPaletteFromImage({ base64, mimeType });

    renderPalette(palette);
  } catch (e: any) {
    updateStatus(`Error generating palette: ${e.message}`, 'error');
  } finally {
    cameraLoaderEl.style.display = 'none';
  }
});

async function getColorPaletteFromImage(image: {
  base64: string;
  mimeType: string;
}): Promise<{ name: string; hex: string }[]> {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const imagePart = {
    inlineData: {
      data: image.base64,
      mimeType: image.mimeType,
    },
  };
  const textPart = {
    text: 'Analyze this image and extract a harmonious color palette of 5 colors. Provide the most common or descriptive name for each color and its hex code.',
  };
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: { parts: [imagePart, textPart] },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          palette: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                hex: { type: Type.STRING },
              },
            },
          },
        },
      },
    },
  });
  return JSON.parse(response.text).palette;
}

function renderPalette(palette: { name: string; hex: string }[]) {
  const allColorNames = palette.map((c) => c.name).join(', ');
  createAndAppend(paletteContainerEl, 'p', {
    textContent: `Detected Palette: ${allColorNames}`,
  });
  const swatches = createAndAppend(paletteContainerEl, 'div', {
    className: 'palette-swatches',
  });
  palette.forEach((color) => {
    const swatch = createAndAppend(swatches, 'div', { className: 'swatch' });
    swatch.style.backgroundColor = color.hex;
    createAndAppend(swatch, 'span', {
      className: 'swatch-label',
      textContent: `${color.name} (${color.hex})`,
    });
  });

  const actions = createAndAppend(paletteContainerEl, 'div', {
    className: 'palette-actions',
  });
  createAndAppend(actions, 'button', {
    textContent: 'Add Colors to Prompt',
    listeners: {
      click: () => {
        promptEl.value = `${promptEl.value} with a color palette of ${allColorNames}.`;
        stopCamera();
      },
    },
  });
}

// --- APP INITIALIZATION ---

async function initializeApp() {
  try {
    allDesigns = await fetchDesignsFromDB();
    refreshAllViews();
  } catch (e: any) {
    updateStatus(`Error loading designs: ${e.message}`, 'error');
  } finally {
    initialLoaderEl.style.display = 'none';
    appContainer.style.opacity = '1';
  }
}

// Initial call to start the application
initializeApp();