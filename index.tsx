/* tslint:disable */
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI, Type } from '@google/genai';

const GEMINI_API_KEY = process.env.API_KEY;
if (!GEMINI_API_KEY) {
    throw new Error("API_KEY environment variable not set");
}
const GEMINI_MODEL = 'gemini-2.5-flash';

// --- TYPE DEFINITIONS ---
interface BrandIdentity {
    businessName: string;
    tagline: string;
    logoConcept: string;
    colorPalette: Array<{ colorName: string; hex: string; description: string; }>;
    brandVoice: string;
}

interface RoadmapStep {
    stepTitle: string;
    stepDescription: string;
}

interface BusinessLaunchpad {
    brandIdentity: BrandIdentity;
    roadmap: RoadmapStep[];
}

interface BusinessProfile {
    businessType: string;
    businessIdea: string;
    launchpad: BusinessLaunchpad | null;
}


// --- STATE MANAGEMENT ---
let currentStep: 'TYPE_SELECTION' | 'IDEA_INPUT' | 'GENERATING' | 'DASHBOARD' = 'TYPE_SELECTION';
let businessProfile: BusinessProfile = {
    businessType: '',
    businessIdea: '',
    launchpad: null,
};

// --- DOM ELEMENT SELECTORS ---
const onboardingContainerEl = document.getElementById('onboarding-container') as HTMLDivElement;
const dashboardContainerEl = document.getElementById('dashboard-container') as HTMLDivElement;
const stepperEl = document.getElementById('stepper') as HTMLDivElement;

// Onboarding Steps
const stepTypeEl = document.getElementById('step-type-selection') as HTMLDivElement;
const stepIdeaEl = document.getElementById('step-idea-input') as HTMLDivElement;
const stepGeneratingEl = document.getElementById('step-generating') as HTMLDivElement;

// Onboarding Controls
const businessTypeGridEl = document.getElementById('business-type-grid') as HTMLDivElement;
const businessIdeaTextarea = document.getElementById('business-idea') as HTMLTextAreaElement;
const generateButton = document.getElementById('generate-brand-button') as HTMLButtonElement;
const backToTypeButton = document.getElementById('back-to-type-button') as HTMLButtonElement;


// --- AI CORE FUNCTION ---
async function generateLaunchpad(type: string, idea: string): Promise<BusinessLaunchpad> {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const prompt = `
        You are an expert brand strategist and startup mentor specializing in the Bangladesh market.
        A user wants to start a new business.

        Business Type: ${type}
        Business Idea: "${idea}"

        Your task is to generate a complete business launchpad. This includes:
        1.  A full Brand Identity: A creative, modern, and appealing brand identity that is culturally relevant for Bangladesh. The color palette must have 4 colors. The logo concept should be a detailed description for a designer.
        2.  A 3-Step Roadmap: A simple, actionable 3-step plan outlining the *very first* things the entrepreneur should do to get started. These steps should be realistic and high-impact for a brand new business in Bangladesh.
    `;

    const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    brandIdentity: {
                        type: Type.OBJECT,
                        properties: {
                            businessName: { type: Type.STRING, description: "A creative, unique business name." },
                            tagline: { type: Type.STRING, description: "A catchy and memorable tagline." },
                            logoConcept: { type: Type.STRING, description: "A detailed description of a logo concept." },
                            colorPalette: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        colorName: { type: Type.STRING },
                                        hex: { type: Type.STRING, description: "The hex code, e.g., #FFFFFF" },
                                        description: { type: Type.STRING, description: "How this color should be used in the brand." }
                                    }
                                }
                            },
                            brandVoice: { type: Type.STRING, description: "The tone and personality of the brand's communication (e.g., 'Friendly and Energetic', 'Professional and Trustworthy')." }
                        }
                    },
                    roadmap: {
                        type: Type.ARRAY,
                        description: "An actionable 3-step plan to get started.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                stepTitle: { type: Type.STRING, description: "A short, clear title for the step." },
                                stepDescription: { type: Type.STRING, description: "A brief, actionable description of the step." }
                            }
                        }
                    }
                }
            }
        }
    });

    return JSON.parse(response.text) as BusinessLaunchpad;
}

// --- UI RENDERING & LOGIC ---

/**
 * Updates the UI to show the correct step in the onboarding process.
 */
function updateUiForStep() {
    // Hide all steps first
    stepTypeEl.classList.add('hidden');
    stepIdeaEl.classList.add('hidden');
    stepGeneratingEl.classList.add('hidden');
    onboardingContainerEl.classList.add('hidden');
    dashboardContainerEl.classList.add('hidden');

    // Update stepper
    const steps = stepperEl.querySelectorAll('.step');
    steps.forEach((step, index) => {
        step.classList.remove('active', 'completed');
        const stepIndex = step.getAttribute('data-step-index');
        if (stepIndex) {
            const idx = parseInt(stepIndex, 10);
            if (idx < getStepIndex(currentStep)) {
                step.classList.add('completed');
            } else if (idx === getStepIndex(currentStep)) {
                step.classList.add('active');
            }
        }
    });


    switch (currentStep) {
        case 'TYPE_SELECTION':
            onboardingContainerEl.classList.remove('hidden');
            stepTypeEl.classList.remove('hidden');
            break;
        case 'IDEA_INPUT':
            onboardingContainerEl.classList.remove('hidden');
            stepIdeaEl.classList.remove('hidden');
            (document.getElementById('idea-prompt-type') as HTMLElement).textContent = businessProfile.businessType;
            businessIdeaTextarea.focus();
            break;
        case 'GENERATING':
            onboardingContainerEl.classList.remove('hidden');
            stepGeneratingEl.classList.remove('hidden');
            break;
        case 'DASHBOARD':
            dashboardContainerEl.classList.remove('hidden');
            renderDashboard();
            break;
    }
}

function getStepIndex(step: typeof currentStep): number {
    switch (step) {
        case 'TYPE_SELECTION': return 1;
        case 'IDEA_INPUT': return 2;
        case 'GENERATING': return 3;
        case 'DASHBOARD': return 4;
        default: return 0;
    }
}


/**
 * Renders the final dashboard with the AI-generated brand identity and roadmap.
 */
function renderDashboard() {
    if (!businessProfile.launchpad) return;

    const { brandIdentity, roadmap } = businessProfile.launchpad;
    const { businessName, tagline, logoConcept, colorPalette, brandVoice } = brandIdentity;

    (document.getElementById('dash-business-name') as HTMLElement).textContent = businessName;
    (document.getElementById('dash-tagline') as HTMLElement).textContent = tagline;
    (document.getElementById('dash-logo-concept') as HTMLElement).textContent = logoConcept;
    (document.getElementById('dash-brand-voice') as HTMLElement).textContent = brandVoice;
    (document.getElementById('dash-business-type') as HTMLElement).textContent = businessProfile.businessType;

    // Render Color Palette
    const paletteEl = document.getElementById('dash-color-palette') as HTMLElement;
    paletteEl.innerHTML = '';
    colorPalette.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch-item';
        swatch.innerHTML = `
            <div class="swatch" style="background-color: ${color.hex};"></div>
            <div class="swatch-info">
                <strong>${color.colorName} (${color.hex})</strong>
                <p>${color.description}</p>
            </div>
        `;
        paletteEl.appendChild(swatch);
    });

    // Render Roadmap
    const roadmapEl = document.getElementById('dash-roadmap-list') as HTMLElement;
    roadmapEl.innerHTML = '';
    roadmap.forEach(step => {
        const stepItem = document.createElement('li');
        stepItem.innerHTML = `
            <strong>${step.stepTitle}</strong>
            <p>${step.stepDescription}</p>
        `;
        roadmapEl.appendChild(stepItem);
    });
}

// --- EVENT LISTENERS ---

/**
 * Handles clicks on the business type selection grid.
 */
businessTypeGridEl.addEventListener('click', (e) => {
    const card = (e.target as HTMLElement).closest<HTMLButtonElement>('.business-type-card');
    if (card) {
        const type = card.dataset.type;
        if (type) {
            businessProfile.businessType = type;
            currentStep = 'IDEA_INPUT';
            updateUiForStep();
        }
    }
});

/**
 * Handles the "Generate Brand" button click.
 */
generateButton.addEventListener('click', async () => {
    const idea = businessIdeaTextarea.value.trim();
    if (idea.length < 10) {
        alert("Please describe your business idea in a little more detail.");
        return;
    }
    businessProfile.businessIdea = idea;
    currentStep = 'GENERATING';
    updateUiForStep();

    try {
        const launchpad = await generateLaunchpad(businessProfile.businessType, businessProfile.businessIdea);
        businessProfile.launchpad = launchpad;
        currentStep = 'DASHBOARD';
        updateUiForStep();
    } catch (error) {
        console.error("Error generating launchpad:", error);
        alert("Sorry, the AI couldn't generate a business plan. Please try again with a different idea.");
        currentStep = 'IDEA_INPUT';
        updateUiForStep();
    }
});

/**
 * Handles the "Back" button click.
 */
backToTypeButton.addEventListener('click', () => {
    currentStep = 'TYPE_SELECTION';
    updateUiForStep();
});

// --- INITIALIZATION ---
function init() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            const serviceWorkerUrl = `${window.location.origin}/service-worker.js`;
            navigator.serviceWorker.register(serviceWorkerUrl)
                .then(registration => console.log('ServiceWorker registration successful with scope: ', registration.scope))
                .catch(err => console.log('ServiceWorker registration failed: ', err));
        });
    }

    updateUiForStep();
    document.body.classList.remove('is-loading');
}

init();