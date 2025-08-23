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
const VEO_MODEL = 'veo-2.0-generate-001';
const DB_KEY = 'LOOMINAR_DESIGNS_DB';
const AUTH_KEY = 'LOOMINAR_AUTH_USER';
const FAKE_OTP = '123456';

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

// --- AUTHENTICATION & SESSION MANAGEMENT ---
interface UserSession {
    role: 'Client' | 'Owner' | 'Driver';
    method: 'Mobile' | 'Gmail' | 'Facebook' | 'LinkedIn';
    identifier: string; // e.g., mobile number or social provider name
}

let currentUser: UserSession | null = null;

function loginUser(session: UserSession) {
    currentUser = session;
    localStorage.setItem(AUTH_KEY, JSON.stringify(session));
    showApp();
}

function logoutUser() {
    currentUser = null;
    localStorage.removeItem(AUTH_KEY);
    // Reloading is the simplest way to reset the app to its initial state
    window.location.reload();
}

function checkSession() {
    const sessionString = localStorage.getItem(AUTH_KEY);
    if (sessionString) {
        try {
            const session = JSON.parse(sessionString);
            // Basic validation
            if (session.role && session.method && session.identifier) {
                currentUser = session;
                showApp();
                return;
            }
        } catch (e) {
            console.error("Failed to parse session", e);
        }
    }
    showAuth();
}


// Global state for the uploaded logo
let uploadedLogo: { base64: string; mimeType: string } | null = null;
let uploadedProductImage: { base64: string; mimeType: string } | null = null;

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

// --- LEARN WITH AI INTERFACES ---
interface ProductionStep {
  step: number;
  title: string;
  description: string;
}
interface RawMaterial {
  name: string;
  sourcingLocation: string;
  notes: string;
}
interface Machine {
  name: string;
  purpose: string;
  estimatedCost: string;
}
interface CostItem {
  item: string;
  estimatedCost: string;
  notes: string;
}
interface CollaborationPartner {
  type: string;
  locationFocus: string;
  collaborationNotes: string;
}
interface LearnWithAiAnalysis {
  productionGuide: ProductionStep[];
  rawMaterials: RawMaterial[];
  requiredMachinery: Machine[];
  businessCostAnalysis: {
    title: string;
    summary: string;
    costBreakdown: CostItem[];
    totalEstimatedCost: string;
  };
  collaborationNetwork: {
    title: string;
    summary: string;
    partnerTypes: CollaborationPartner[];
  };
}

interface DesignRecord {
  id: string;
  timestamp: Date;
  imageDataUrl: string;
  finalPrompt: string;
  studioAnalysis: StudioAnalysis;
  socialBuzzAnalysis: SocialBuzzAnalysis;
  learnWithAiAnalysis: LearnWithAiAnalysis;
  market: string;
  logo: string | null;
  parentId: string | null;
  changeSummary?: string;
  designNotes?: string;
  status: 'Proposed' | 'Approved' | 'Rejected' | 'Published';
  reviewComments?: string;
  videoUrl?: string;
  isDelivered?: boolean;
}

/**
 * A helper function to create and append elements.
 * Use `textContent` where possible to prevent XSS vulnerabilities.
 */
function createAndAppend(
  parent: HTMLElement,
  tag: string,
  options: {
    className?: string;
    textContent?: string;
    innerHTML?: string;
    properties?: Record<string, any>;
    attributes?: Record<string, string>;
    listeners?: Record<string, (e: Event) => void>;
  } = {},
): HTMLElement {
  const el = document.createElement(tag);
  if (options.className) el.className = options.className;
  if (options.textContent) {
    el.textContent = options.textContent;
  } else if (options.innerHTML) {
    el.innerHTML = options.innerHTML;
  }
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

async function getLearnWithAiAnalysis(
  prompt: string,
  market: string,
): Promise<LearnWithAiAnalysis> {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const analysisPrompt = `
    You are a manufacturing and business consultant for the apparel industry, specializing in helping entrepreneurs start their own T-shirt businesses in the **${market}** market.

    Based on the product description below, provide a detailed, step-by-step guide and business plan.

    **Product Description:**
    "${prompt}"

    **Your Task:**
    Generate a complete guide in the specified JSON format. For all location-based suggestions (sourcing, partners), provide realistic city or district names within the **${market}** region. For costs, use the local currency and provide realistic estimates for a small-scale startup.

    1.  **Production Guide:** A detailed, step-by-step guide from raw materials to a finished product.
    2.  **Raw Materials:** List the necessary raw materials and suggest a specific city/area within **${market}** for sourcing them.
    3.  **Required Machinery:** List the essential hardware and machinery, including purpose and estimated cost.
    4.  **Business Cost Analysis:** Provide a startup cost breakdown (materials, machinery, rent, etc.) and a total estimated initial investment.
    5.  **Collaboration Network:** Suggest types of local business partners (e.g., fabric suppliers, printers) an entrepreneur could collaborate with. Suggest a general location/area to find them within **${market}**.
  `;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: analysisPrompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          productionGuide: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                step: { type: Type.NUMBER },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
              },
            },
          },
          rawMaterials: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                sourcingLocation: { type: Type.STRING },
                notes: { type: Type.STRING },
              },
            },
          },
          requiredMachinery: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                purpose: { type: Type.STRING },
                estimatedCost: { type: Type.STRING },
              },
            },
          },
          businessCostAnalysis: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              summary: { type: Type.STRING },
              costBreakdown: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    item: { type: Type.STRING },
                    estimatedCost: { type: Type.STRING },
                    notes: { type: Type.STRING },
                  },
                },
              },
              totalEstimatedCost: { type: Type.STRING },
            },
          },
          collaborationNetwork: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              summary: { type: Type.STRING },
              partnerTypes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    locationFocus: { type: Type.STRING },
                    collaborationNotes: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  return JSON.parse(response.text);
}

// --- DOM ELEMENT SELECTORS ---
// Auth Elements
const authOverlayEl = document.querySelector('#auth-overlay') as HTMLDivElement;
const loginViewEl = document.querySelector('#login-view') as HTMLDivElement;
const registerViewEl = document.querySelector('#register-view') as HTMLDivElement;
const showRegisterLink = document.querySelector('#show-register') as HTMLAnchorElement;
const showLoginLink = document.querySelector('#show-login') as HTMLAnchorElement;
const logoutButton = document.querySelector('#logout-button') as HTMLButtonElement;
// Login Form
const loginMobileInput = document.querySelector('#login-mobile') as HTMLInputElement;
const loginOtpButton = document.querySelector('#login-otp-button') as HTMLButtonElement;
const loginOtpInput = document.querySelector('#login-otp') as HTMLInputElement;
const loginButton = document.querySelector('#login-button') as HTMLButtonElement;
// Register Form
const registerRoleSelect = document.querySelector('#register-role') as HTMLSelectElement;
const registerMobileInput = document.querySelector('#register-mobile') as HTMLInputElement;
const registerOtpButton = document.querySelector('#register-otp-button') as HTMLButtonElement;
const registerOtpInput = document.querySelector('#register-otp') as HTMLInputElement;
const registerButton = document.querySelector('#register-button') as HTMLButtonElement;


// App Elements
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

// Learn With AI Tab
const learnProductionGuideEl = document.querySelector(
  '#learn-production-guide',
) as HTMLOListElement;
const learnRawMaterialsEl = document.querySelector(
  '#learn-raw-materials',
) as HTMLDivElement;
const learnMachineryEl = document.querySelector(
  '#learn-machinery',
) as HTMLDivElement;
const learnCostTitleEl = document.querySelector(
  '#learn-cost-title',
) as HTMLHeadingElement;
const learnCostSummaryEl = document.querySelector(
  '#learn-cost-summary',
) as HTMLParagraphElement;
const learnCostBreakdownEl = document.querySelector(
  '#learn-cost-breakdown',
) as HTMLUListElement;
const learnTotalCostEl = document.querySelector(
  '#learn-total-cost',
) as HTMLSpanElement;
const learnCollabTitleEl = document.querySelector(
  '#learn-collab-title',
) as HTMLHeadingElement;
const learnCollabSummaryEl = document.querySelector(
  '#learn-collab-summary',
) as HTMLParagraphElement;
const learnCollabPartnersEl = document.querySelector(
  '#learn-collab-partners',
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
const storeSectionTitleEl = document.querySelector(
  '#store-section-title',
) as HTMLHeadingElement;

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

// Video Generation
const videoModalEl = document.querySelector('#video-modal') as HTMLDivElement;
const videoStatusMessageEl = document.querySelector(
  '#video-status-message',
) as HTMLParagraphElement;
const videoPlayerModalEl = document.querySelector(
  '#video-player-modal',
) as HTMLDivElement;
const promoVideoPlayerEl = document.querySelector(
  '#promo-video-player',
) as HTMLVideoElement;
const closeVideoPlayerButton = document.querySelector(
  '#close-video-player-button',
) as HTMLButtonElement;

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
      'Building your Go-To-Market Strategy... 📈',
      'loading',
    );
    const market = marketSelectEl.value;
    const [studioAnalysis, socialBuzzAnalysis, learnWithAiAnalysis] =
      await Promise.all([
        getStudioAnalysis(finalPrompt, market, !!uploadedLogo),
        getSocialBuzzAnalysis(finalPrompt, market),
        getLearnWithAiAnalysis(finalPrompt, market),
      ]);

    const newDesign: DesignRecord = {
      id: `LMNR-${Date.now()}`,
      timestamp: new Date(),
      imageDataUrl: imageUrl,
      finalPrompt: finalPrompt,
      studioAnalysis,
      socialBuzzAnalysis,
      learnWithAiAnalysis,
      market: market,
      logo: uploadedLogo ? uploadedLogo.base64 : null,
      parentId: parentId,
      changeSummary: changeSummary,
      designNotes: designNotes,
      status: 'Proposed',
    };

    allDesigns.unshift(newDesign);
    await saveDesignsToDB(allDesigns);

    // Make the new design active
    await setActiveDesign(newDesign.id);

    // Re-render history to show the new item
    renderHistory();
    historyListEl.scrollTop = 0; // Scroll to top to see new design

    updateStatus('All analyses complete!', 'success');
  } catch (e: any) {
    console.error(e);
    const errorMsg = e.toString();
    if (
      errorMsg.includes('quota') ||
      errorMsg.includes('429') ||
      errorMsg.includes('API key not valid')
    ) {
      quotaErrorEl.style.display = 'block';
      updateStatus('API Quota or Key Error. Please check your key.', 'error');
    } else {
      updateStatus(`An error occurred during generation.`, 'error');
    }
    loaderEl.style.display = 'none';
  } finally {
    setUiLock(false);
  }
}

async function generateVideo(designId: string) {
  const design = allDesigns.find((d) => d.id === designId);
  if (!design) {
    updateStatus('Error: Design not found.', 'error');
    return;
  }

  videoModalEl.style.display = 'flex';
  const statusMessages = [
    'Warming up the digital cameras...',
    'Scouting virtual locations...',
    'Directing the AI talent...',
    'Setting up the lighting rigs...',
    'Rolling sound and action...',
    'Processing dailies...',
    'Editing the first cut...',
    'Adding special effects...',
    'Color grading the footage...',
    'Rendering the final cut...',
  ];
  let messageIndex = 0;
  videoStatusMessageEl.textContent = statusMessages[messageIndex];
  const messageInterval = setInterval(() => {
    messageIndex = (messageIndex + 1) % statusMessages.length;
    videoStatusMessageEl.textContent = statusMessages[messageIndex];
  }, 5000);

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    let operation = await ai.models.generateVideos({
      model: VEO_MODEL,
      prompt: `Create a short, dynamic, 5-second promotional video for a T-shirt with this design: "${design.finalPrompt}"`,
      config: {
        numberOfVideos: 1,
      },
    });

    while (!operation.done) {
      await new Promise((resolve) => setTimeout(resolve, 10000)); // Poll every 10 seconds
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (downloadLink) {
      design.videoUrl = downloadLink;
      await saveDesignsToDB(allDesigns);
      renderStore(); // Re-render store to show video button
      updateStatus('Promotional video generated successfully!', 'success');
    } else {
      throw new Error('Video generation finished but no URI was returned.');
    }
  } catch (e) {
    console.error('Video generation failed:', e);
    updateStatus('Failed to generate video.', 'error');
  } finally {
    clearInterval(messageInterval);
    videoModalEl.style.display = 'none';
  }
}

// --- UI UPDATE & RENDERING FUNCTIONS ---

let statusTimeout: number;
function updateStatus(
  message: string,
  type: 'loading' | 'success' | 'error' | 'info' = 'info',
  duration = 4000,
) {
  clearTimeout(statusTimeout);
  statusEl.textContent = message;
  statusEl.className = `status-${type}`;
  if (type === 'success' || type === 'error') {
    statusTimeout = window.setTimeout(() => {
      statusEl.className = '';
    }, duration);
  }
}

function renderTagList(
  container: HTMLElement,
  tags: string[],
  className: string,
) {
  container.innerHTML = '';
  // FIX: Add defensive check to prevent crash on undefined array
  (tags || []).forEach((tag) => {
    createAndAppend(container, 'span', { className, textContent: tag });
  });
}

function renderStudioAnalysis(analysis: StudioAnalysis) {
  // Product DNA
  const specs = analysis.productDNA.specs;
  dnaSpecsListEl.innerHTML = '';
  createAndAppend(dnaSpecsListEl, 'li', {
    innerHTML: `<strong>Fabric:</strong> ${specs.fabricType}`,
  });
  createAndAppend(dnaSpecsListEl, 'li', {
    innerHTML: `<strong>Weight:</strong> ${specs.fabricWeightGsm} GSM`,
  });
  createAndAppend(dnaSpecsListEl, 'li', {
    innerHTML: `<strong>Stitching:</strong> ${specs.stitchingDetails}`,
  });
  createAndAppend(dnaSpecsListEl, 'li', {
    innerHTML: `<strong>Printing:</strong> ${specs.printingMethod}`,
  });
  createAndAppend(dnaSpecsListEl, 'li', {
    innerHTML: `<strong>Logo:</strong> ${specs.logoComplexity}`,
  });
  dnaPricingContentEl.innerHTML = `<p>${analysis.productDNA.pricing.analysis}</p><strong>Est. Price: ${analysis.productDNA.pricing.estimatedPrice}</strong>`;
  dnaLogisticsContentEl.innerHTML = `<p>${analysis.productDNA.logistics.analysis}</p><strong>Est. Cost: ${analysis.productDNA.logistics.estimatedCost}</strong>`;

  // Branding
  brandingArchetypeEl.textContent = analysis.branding.brandArchetype;
  brandingVoiceEl.textContent = analysis.branding.brandVoice;
  brandingLogoFeedbackEl.textContent = analysis.branding.logoFeedback;

  // SEO/SEM
  const score = analysis.seoSem.seoRate.score;
  seoRateScoreEl.textContent = `${score}`;
  seoRateAnalysisEl.textContent = analysis.seoSem.seoRate.analysis;
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;
  seoRateCircle.style.strokeDashoffset = offset.toString();
  renderTagList(seoKeywordsEl, analysis.seoSem.targetKeywords, 'keyword-pill');
  semAdHeadlineEl.textContent = analysis.seoSem.semAd.headline;
  semAdDescriptionEl.textContent = analysis.seoSem.semAd.description;
  seoMetaDescriptionEl.textContent = analysis.seoSem.metaDescription;

  seoSocialPromptsEl.innerHTML = '';
  (analysis.seoSem.socialPrompts || []).forEach((prompt) => {
    createAndAppend(seoSocialPromptsEl, 'li', { textContent: prompt });
  });

  // E-commerce
  ecomTitleEl.textContent = analysis.ecommerce.productTitle;
  ecomDescriptionEl.textContent = analysis.ecommerce.productDescription;
  ecomSkuEl.textContent = analysis.ecommerce.sku;
  ecomGtinEl.textContent = analysis.ecommerce.gtinInfo;
  ecomCategoryEl.textContent = analysis.ecommerce.googleProductCategory;

  // Manufacturing
  manManufacturersEl.innerHTML = '';
  (analysis.manufacturing.manufacturers || []).forEach((m) => {
    const card = createAndAppend(manManufacturersEl, 'div', {
      className: 'manufacturer-card',
    });
    createAndAppend(card, 'strong', { textContent: m.name });
    createAndAppend(card, 'span', { className: 'chip', textContent: m.specialty });
    createAndAppend(card, 'span', { textContent: m.location });
    const links = createAndAppend(card, 'div', { className: 'card-links' });
    createAndAppend(links, 'a', {
      textContent: 'Website',
      properties: { href: m.website, target: '_blank' },
    });
    createAndAppend(links, 'a', {
      textContent: 'Contact',
      properties: { href: `mailto:${m.contact}` },
    });
  });

  manSimilarProductsEl.innerHTML = '';
  (analysis.manufacturing.similarProducts || []).forEach((p) => {
    createAndAppend(manSimilarProductsEl, 'li', { textContent: p });
  });
  renderTagList(
    manB2bKeywordsEl,
    analysis.manufacturing.b2bKeywords,
    'keyword-pill',
  );

  updateSources(analysis.sources, 'studio-sources');
}

function renderSocialBuzzAnalysis(analysis: SocialBuzzAnalysis) {
  const sentimentClass = `sentiment-${analysis.overallSentiment?.toLowerCase()}`;
  buzzSentimentEl.textContent = analysis.overallSentiment;
  buzzSentimentEl.className = `sentiment-badge ${sentimentClass}`;
  buzzSentimentAnalysisEl.textContent = analysis.sentimentAnalysis;

  buzzInfluencersEl.innerHTML = '';
  (analysis.keyInfluencers || []).forEach((i) => {
    const card = createAndAppend(buzzInfluencersEl, 'div', {
      className: 'influencer-card',
    });
    createAndAppend(card, 'span', {
      className: 'influencer-name',
      textContent: i.name,
    });
    createAndAppend(card, 'span', { className: 'chip', textContent: i.platform });
    createAndAppend(card, 'p', {
      className: 'influencer-reason',
      textContent: i.reason,
    });
  });

  buzzContentIdeasEl.innerHTML = '';
  (analysis.viralContentIdeas || []).forEach((idea) => {
    createAndAppend(buzzContentIdeasEl, 'li', { textContent: idea });
  });

  renderTagList(buzzHashtagsEl, analysis.relevantHashtags, 'hashtag keyword-pill');

  updateSources(analysis.sources, 'studio-sources');
}

function renderLearnWithAiAnalysis(analysis: LearnWithAiAnalysis) {
  learnProductionGuideEl.innerHTML = '';
  (analysis.productionGuide || []).forEach((step) => {
    const li = createAndAppend(learnProductionGuideEl, 'li');
    createAndAppend(li, 'strong', { textContent: step.title });
    createAndAppend(li, 'p', { textContent: step.description });
  });

  learnRawMaterialsEl.innerHTML = '';
  (analysis.rawMaterials || []).forEach((mat) => {
    const card = createAndAppend(learnRawMaterialsEl, 'div', {
      className: 'sourcing-card',
    });
    createAndAppend(card, 'strong', { textContent: mat.name });
    createAndAppend(card, 'p', { textContent: mat.notes });
    createAndAppend(card, 'a', {
      className: 'map-link',
      textContent: `Find in ${mat.sourcingLocation} ↗`,
      properties: {
        href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mat.name + ' supplier in ' + mat.sourcingLocation)}`,
        target: '_blank',
      },
    });
  });

  learnMachineryEl.innerHTML = '';
  (analysis.requiredMachinery || []).forEach((mac) => {
    const card = createAndAppend(learnMachineryEl, 'div', {
      className: 'sourcing-card',
    });
    createAndAppend(card, 'strong', { textContent: mac.name });
    createAndAppend(card, 'p', {
      textContent: `${mac.purpose} (Est. ${mac.estimatedCost})`,
    });
  });

  learnCostTitleEl.textContent = analysis.businessCostAnalysis.title;
  learnCostSummaryEl.textContent = analysis.businessCostAnalysis.summary;
  learnCostBreakdownEl.innerHTML = '';
  (analysis.businessCostAnalysis.costBreakdown || []).forEach((item) => {
    const li = createAndAppend(learnCostBreakdownEl, 'li');
    createAndAppend(li, 'span', { textContent: item.item });
    createAndAppend(li, 'strong', { textContent: item.estimatedCost });
  });
  learnTotalCostEl.textContent = analysis.businessCostAnalysis.totalEstimatedCost;

  learnCollabTitleEl.textContent = analysis.collaborationNetwork.title;
  learnCollabSummaryEl.textContent = analysis.collaborationNetwork.summary;
  learnCollabPartnersEl.innerHTML = '';
  (analysis.collaborationNetwork.partnerTypes || []).forEach((p) => {
    const card = createAndAppend(learnCollabPartnersEl, 'div', {
      className: 'sourcing-card',
    });
    createAndAppend(card, 'strong', { textContent: p.type });
    createAndAppend(card, 'p', { textContent: p.collaborationNotes });
    createAndAppend(card, 'a', {
      className: 'map-link',
      textContent: `Find near ${p.locationFocus} ↗`,
      properties: {
        href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.type + ' in ' + p.locationFocus)}`,
        target: '_blank',
      },
    });
  });
}

function updateSources(sources: GroundingChunk[] = [], containerId: string) {
  const container = document.getElementById(containerId);
  if (!container || !sources || sources.length === 0) return;

  container.innerHTML = ''; // Clear previous sources
  const heading = createAndAppend(container, 'h4', {
    textContent: 'Sources from Google Search',
  });
  const ul = createAndAppend(container, 'ul');
  sources.forEach((source) => {
    if (source.web) {
      const li = createAndAppend(ul, 'li');
      createAndAppend(li, 'a', {
        textContent: source.web.title || source.web.uri,
        properties: { href: source.web.uri, target: '_blank' },
      });
    }
  });
}

function renderActiveDesign() {
  if (!activeDesign) {
    welcomeScreenEl.style.display = 'flex';
    resultDisplayEl.style.display = 'none';
    generateButton.textContent = 'Generate & Analyze';
    return;
  }

  welcomeScreenEl.style.display = 'none';
  resultDisplayEl.style.display = 'block';
  studioContainerEl.style.display = 'block';
  imageEl.src = activeDesign.imageDataUrl;
  imageEl.style.display = 'block';
  loaderEl.style.display = 'none';
  promptEl.value = activeDesign.finalPrompt;

  // Render all analysis tabs
  renderStudioAnalysis(activeDesign.studioAnalysis);
  renderSocialBuzzAnalysis(activeDesign.socialBuzzAnalysis);
  renderLearnWithAiAnalysis(activeDesign.learnWithAiAnalysis);

  // Update design details panel
  if (activeDesign.parentId) {
    designDetailsContainerEl.style.display = 'block';
    const parent = allDesigns.find((d) => d.id === activeDesign?.parentId);
    designDetailsIdEl.textContent = `${parent?.id.slice(-4)} → ${activeDesign.id.slice(-4)}`;
    designDetailsSummaryEl.textContent = activeDesign.changeSummary || 'N/A';
    designDetailsNotesWrapperEl.style.display = activeDesign.designNotes
      ? 'block'
      : 'none';
    designDetailsNotesEl.textContent = activeDesign.designNotes || '';
    designDetailsReviewWrapperEl.style.display = activeDesign.reviewComments
      ? 'block'
      : 'none';
    designDetailsReviewEl.textContent = activeDesign.reviewComments || '';
  } else {
    designDetailsContainerEl.style.display = 'none';
  }

  // Update Generate button text based on status
  if (activeDesign.status === 'Approved') {
    generateButton.textContent = '✨ Iterate on this Design';
  } else {
    generateButton.textContent = 'Generate & Analyze';
  }

  // Set the first tab as active by default
  const firstTab = studioTabsContainer.querySelector(
    '.tab-button',
  ) as HTMLButtonElement;
  if (firstTab) {
    switchTab(firstTab);
  }
}

async function setActiveDesign(id: string | null) {
  if (id === null) {
    activeDesign = null;
  } else {
    activeDesign = allDesigns.find((d) => d.id === id) || null;
  }
  renderActiveDesign();
  renderHistory(); // Re-render to update active state
}

function renderHistory() {
  historyListEl.innerHTML = '';
  const designsToRender = allDesigns.filter((d) => d.status !== 'Published');

  if (designsToRender.length === 0) {
    historyEmptyStateEl.style.display = 'block';
  } else {
    historyEmptyStateEl.style.display = 'none';
    const designMap = new Map(allDesigns.map((d) => [d.id, d]));
    const designTree = new Map<string | null, DesignRecord[]>();
    designsToRender.forEach((d) => {
      if (!designTree.has(d.parentId)) {
        designTree.set(d.parentId, []);
      }
      designTree.get(d.parentId)!.push(d);
    });

    const renderBranch = (parentId: string | null, level: number) => {
      const children = designTree.get(parentId) || [];
      children
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .forEach((design) => {
          const isActive = activeDesign?.id === design.id;
          const li = createAndAppend(historyListEl, 'li', {
            className: `history-item ${isActive ? 'is-active' : ''} status-${design.status.toLowerCase()}`,
            attributes: {
              'data-id': design.id,
              tabindex: '0',
              'aria-label': `Design ${design.id.slice(-4)}: ${design.changeSummary || design.finalPrompt.slice(0, 20)}... Status: ${design.status}.`,
            },
            listeners: {
              click: () => setActiveDesign(design.id),
              keydown: (e: Event) => {
                if ((e as KeyboardEvent).key === 'Enter')
                  setActiveDesign(design.id);
              },
            },
          });
          (li.style as any).setProperty('--level', level);

          createAndAppend(li, 'img', {
            className: 'history-thumbnail',
            properties: { src: design.imageDataUrl, alt: 'Design thumbnail' },
          });

          const info = createAndAppend(li, 'div', { className: 'history-info' });
          createAndAppend(info, 'p', {
            className: 'history-summary',
            textContent: design.changeSummary || `Version ${design.id.slice(-4)}`,
          });
          createAndAppend(info, 'div', {
            className: 'history-meta',
            textContent: `${design.status} · ${design.timestamp.toLocaleDateString()}`,
          });

          if (isActive) {
            const actions = createAndAppend(li, 'div', {
              className: 'history-actions',
            });
            if (design.status === 'Proposed' && currentUser?.role === 'Owner') {
              createAndAppend(actions, 'button', {
                textContent: '🔎',
                attributes: { title: 'Review Change', 'aria-label': 'Review this design proposal' },
                listeners: { click: () => openReviewModal(design.id) },
              });
            }
            if (design.status === 'Approved' && currentUser?.role === 'Owner') {
              createAndAppend(actions, 'button', {
                textContent: '🎬',
                attributes: { title: 'Generate Promo Video', 'aria-label': 'Generate a promotional video for this design'},
                listeners: { click: () => generateVideo(design.id) }
              });
              createAndAppend(actions, 'button', {
                textContent: '🚀',
                attributes: { title: 'Publish to Store', 'aria-label': 'Publish this design to the store' },
                listeners: { click: () => handlePublish(design.id) },
              });
            }
          }
        });
      children.forEach((child) => renderBranch(child.id, level + 1));
    };

    renderBranch(null, 0);
  }
}

async function handleMarkAsDelivered(designId: string) {
  const design = allDesigns.find(d => d.id === designId);
  if (design) {
    design.isDelivered = true;
    await saveDesignsToDB(allDesigns);
    renderStore(); // Re-render to update the button state
  }
}

function renderStore() {
  storeGridEl.innerHTML = '';
  const publishedDesigns = allDesigns.filter((d) => d.status === 'Published');

  if (publishedDesigns.length === 0) {
    storeEmptyStateEl.style.display = 'block';
  } else {
    storeEmptyStateEl.style.display = 'none';
    publishedDesigns.forEach((design) => {
      const item = createAndAppend(storeGridEl, 'div', {
        className: 'store-item',
      });
      createAndAppend(item, 'img', {
        className: 'store-item-img',
        properties: { src: design.imageDataUrl, alt: design.finalPrompt },
      });
      const info = createAndAppend(item, 'div', {className: 'store-item-info'});
      createAndAppend(info, 'h4', {
        className: 'store-item-title',
        textContent:
          design.studioAnalysis.ecommerce.productTitle.slice(0, 30) + '...',
      });
      createAndAppend(info, 'p', {
        className: 'store-item-price',
        textContent: design.studioAnalysis.productDNA.pricing.estimatedPrice,
      });

      const actions = createAndAppend(item, 'div', { className: 'store-item-actions' });

      if (design.videoUrl) {
          createAndAppend(actions, 'button', {
            textContent: '▶️ Watch Promo',
            listeners: { click: () => playVideo(design.videoUrl!) }
          });
      }

      if (currentUser?.role === 'Driver') {
        const deliveredButton = createAndAppend(actions, 'button', {
            textContent: design.isDelivered ? 'Delivered' : 'Mark as Delivered',
            properties: { disabled: design.isDelivered },
            listeners: { click: () => handleMarkAsDelivered(design.id) }
        });
      }
    });
  }
}

function switchTab(button: HTMLButtonElement) {
  const tabId = button.dataset.tab;
  // Update button states
  studioTabsContainer.querySelectorAll('.tab-button').forEach((btn) => {
    btn.classList.remove('active');
    btn.setAttribute('aria-selected', 'false');
  });
  button.classList.add('active');
  button.setAttribute('aria-selected', 'true');

  // Update content visibility
  studioContainerEl.querySelectorAll('.tab-content').forEach((content) => {
    content.classList.remove('active');
  });
  const activeContent = document.getElementById(`tab-${tabId}`);
  if (activeContent) {
    activeContent.classList.add('active');
  }
}

// --- MODAL & WORKFLOW LOGIC ---
function openReviewModal(id: string) {
  reviewingDesignId = id;
  const design = allDesigns.find((d) => d.id === id);
  if (!design) return;

  reviewSummaryEl.textContent = design.changeSummary || 'N/A';
  reviewNotesEl.textContent = design.designNotes || 'No notes provided.';
  reviewCommentsInput.value = '';
  reviewModalEl.style.display = 'flex';
  reviewCommentsInput.focus();
}

async function handleApproval(isApproved: boolean) {
  if (!reviewingDesignId) return;
  const design = allDesigns.find((d) => d.id === reviewingDesignId);
  if (design) {
    design.status = isApproved ? 'Approved' : 'Rejected';
    design.reviewComments = reviewCommentsInput.value;
    await saveDesignsToDB(allDesigns);
    await setActiveDesign(design.id); // Refresh view
    renderHistory();
  }
  reviewModalEl.style.display = 'none';
  reviewingDesignId = null;
}

async function handlePublish(id: string) {
  const design = allDesigns.find((d) => d.id === id);
  if (design) {
    // Animate the item out of the history list
    const historyItem = historyListEl.querySelector(`[data-id="${id}"]`);
    if (historyItem) {
      historyItem.classList.add('is-publishing');
      historyItem.addEventListener('animationend', async () => {
        design.status = 'Published';
        await saveDesignsToDB(allDesigns);
        await setActiveDesign(null); // Deselect after publishing
        renderHistory();
        renderStore();
      }, { once: true });
    } else {
        // Fallback if animation fails
        design.status = 'Published';
        await saveDesignsToDB(allDesigns);
        await setActiveDesign(null);
        renderHistory();
        renderStore();
    }
  }
}


approveButton.addEventListener('click', () => handleApproval(true));
rejectButton.addEventListener('click', () => handleApproval(false));
cancelReviewButton.addEventListener('click', () => {
  reviewModalEl.style.display = 'none';
  reviewingDesignId = null;
});

// --- CAMERA & PALETTE LOGIC ---
async function openCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
  }
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
    });
    cameraVideoEl.srcObject = cameraStream;
    cameraModalEl.style.display = 'flex';
  } catch (err) {
    console.error('Camera access denied:', err);
    alert('Could not access camera. Please ensure permissions are granted.');
  }
}

async function getPaletteFromImage(base64: string, mimeType: string) {
  cameraLoaderEl.style.display = 'block';
  paletteContainerEl.innerHTML = '';
  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const imagePart = {
      inlineData: { data: base64, mimeType: mimeType },
    };
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: {
        parts: [
          imagePart,
          {
            text: 'Extract the 5 most dominant and harmonious colors from this image. For each color, provide its hex code and a simple, descriptive name (e.g., "Sky Blue", "Forest Green").',
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            colors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  hex: { type: Type.STRING },
                  name: { type: Type.STRING },
                },
              },
            },
          },
        },
      },
    });
    const result = JSON.parse(response.text);
    renderPalette(result.colors);
  } catch (error) {
    console.error('Palette extraction failed:', error);
    paletteContainerEl.textContent = 'Could not analyze image.';
  } finally {
    cameraLoaderEl.style.display = 'none';
  }
}

function renderPalette(colors: { hex: string; name: string }[]) {
  const swatches = createAndAppend(paletteContainerEl, 'div', {
    className: 'palette-swatches',
  });
  (colors || []).forEach((color) => {
    const swatch = createAndAppend(swatches, 'div', { className: 'swatch' });
    swatch.style.backgroundColor = color.hex;
    createAndAppend(swatch, 'div', {
      className: 'swatch-label',
      textContent: `${color.name} (${color.hex})`,
    });
  });

  const actions = createAndAppend(paletteContainerEl, 'div', {
    className: 'palette-actions',
  });
  createAndAppend(actions, 'button', {
    textContent: 'Use These Colors in Prompt',
    listeners: {
      click: () => {
        const colorString = colors.map((c) => `${c.name} (${c.hex})`).join(', ');
        promptEl.value += ` using a color palette of ${colorString}`;
        cameraModalEl.style.display = 'none';
      },
    },
  });
}

cameraButton.addEventListener('click', openCamera);
cancelCameraButton.addEventListener('click', () => {
  cameraModalEl.style.display = 'none';
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
  }
});
captureButton.addEventListener('click', () => {
  const canvas = document.createElement('canvas');
  canvas.width = cameraVideoEl.videoWidth;
  canvas.height = cameraVideoEl.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx?.drawImage(cameraVideoEl, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/jpeg');
  const base64 = dataUrl.split(',')[1];
  getPaletteFromImage(base64, 'image/jpeg');
});

async function playVideo(videoUrl: string) {
    videoPlayerModalEl.style.display = 'flex';
    let objectUrl = '';
    try {
        const response = await fetch(`${videoUrl}&key=${GEMINI_API_KEY}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch video: ${response.statusText}`);
        }
        const videoBlob = await response.blob();
        objectUrl = URL.createObjectURL(videoBlob);
        promoVideoPlayerEl.src = objectUrl;
        promoVideoPlayerEl.play();
    } catch (e) {
        console.error('Failed to play video', e);
        updateStatus('Could not load video.', 'error');
        videoPlayerModalEl.style.display = 'none';
    }

    // Cleanup when modal is closed
    const cleanup = () => {
        if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
        }
        promoVideoPlayerEl.pause();
        promoVideoPlayerEl.src = '';
        videoPlayerModalEl.style.display = 'none';
        closeVideoPlayerButton.removeEventListener('click', cleanup);
    };
    closeVideoPlayerButton.addEventListener('click', cleanup, { once: true });
}

// --- SPEECH RECOGNITION LOGIC ---
const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
let recognition: any;
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.lang = 'en-US';
  recognition.interimResults = false;

  micButton.addEventListener('click', () => {
    if (micButton.classList.contains('is-listening')) {
      recognition.stop();
    } else {
      recognition.start();
    }
  });

  recognition.onstart = () => {
    micButton.classList.add('is-listening');
    micButton.setAttribute('aria-label', 'Stop listening');
  };
  recognition.onend = () => {
    micButton.classList.remove('is-listening');
    micButton.setAttribute('aria-label', 'Use voice input');
  };
  recognition.onerror = (event: any) => {
    console.error('Speech recognition error:', event.error);
  };
  recognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript;
    promptEl.value = transcript;
  };
} else {
  micButton.style.display = 'none';
}

function showAuth() {
    initialLoaderEl.style.display = 'none';
    authOverlayEl.style.display = 'flex';
    appContainer.style.opacity = '0';
    appContainer.style.pointerEvents = 'none';
}

function applyRoleBasedUI() {
    if (!currentUser) return;
    const role = currentUser.role.toLowerCase();
    document.body.className = `role-${role}`;

    if (role === 'driver') {
        storeSectionTitleEl.textContent = "Delivery Orders";
    } else {
        storeSectionTitleEl.textContent = "My Store";
    }
}

async function showApp() {
    authOverlayEl.style.display = 'none';
    appContainer.style.opacity = '1';
    appContainer.style.pointerEvents = 'auto';
    
    applyRoleBasedUI();

    // This logic should only run once the user is authenticated
    allDesigns = await fetchDesignsFromDB();
    renderHistory();
    renderStore();
    setActiveDesign(null);

    studioTabsContainer.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const button = target.closest<HTMLButtonElement>('.tab-button');
        if (button) {
            switchTab(button);
        }
    });
    
    initialLoaderEl.style.display = 'none';
}


// --- INITIALIZATION ---
function init() {
  // --- AUTH EVENT LISTENERS ---
  logoutButton.addEventListener('click', logoutUser);

  showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginViewEl.classList.add('hidden');
    registerViewEl.classList.remove('hidden');
  });

  showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerViewEl.classList.add('hidden');
    loginViewEl.classList.remove('hidden');
  });
  
  const sendOtp = (mobileInput: HTMLInputElement, otpInput: HTMLInputElement) => {
      if (!mobileInput.value) {
          alert('Please enter a mobile number.');
          return;
      }
      alert(`Simulating OTP... Your code is ${FAKE_OTP}`);
      otpInput.disabled = false;
      otpInput.focus();
  };

  loginOtpButton.addEventListener('click', () => sendOtp(loginMobileInput, loginOtpInput));
  registerOtpButton.addEventListener('click', () => sendOtp(registerMobileInput, registerOtpInput));

  loginButton.addEventListener('click', () => {
      if (loginOtpInput.value === FAKE_OTP) {
          const session: UserSession = {
              role: 'Client', // Assume role on login for simulation
              method: 'Mobile',
              identifier: loginMobileInput.value,
          };
          loginUser(session);
      } else {
          alert('Invalid OTP.');
      }
  });

  registerButton.addEventListener('click', () => {
      if (registerOtpInput.value === FAKE_OTP) {
           const session: UserSession = {
              role: registerRoleSelect.value as UserSession['role'],
              method: 'Mobile',
              identifier: registerMobileInput.value,
          };
          loginUser(session);
      } else {
          alert('Invalid OTP.');
      }
  });

  authOverlayEl.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const socialBtn = target.closest<HTMLButtonElement>('.social-btn');
      if (socialBtn) {
          const provider = socialBtn.dataset.provider as UserSession['method'];
          const isRegistering = socialBtn.closest('#register-view');
          
          const session: UserSession = {
              role: isRegistering ? (registerRoleSelect.value as UserSession['role']) : 'Client',
              method: provider,
              identifier: `${provider}User`,
          };
          loginUser(session);
      }
  });

  // Register Service Worker for PWA capabilities
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js').then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      }, err => {
        console.log('ServiceWorker registration failed: ', err);
      });
    });
  }

  // Check for an existing session on startup
  checkSession();
}

init();