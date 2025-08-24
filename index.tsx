/* tslint:disable */
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */


// --- TYPE DEFINITIONS ---
interface DesignAttributes {
    shape: string;
    material: string;
    functionality: string[];
    colorVariants: Array<{ name: string; description: string; }>;
}

interface CreationStep {
    step: number;
    module: string;
    action: string;
}

interface ProductConcept {
    category: 'Wearable Dashboard' | 'Serenity Token';
    id: number;
    productName: string; // e.g., "Stillpoint"
    purpose: string;
    designAttributes: DesignAttributes;
    creationFlow: CreationStep[];
    icon: string;
}

interface AurelionLaunchpad {
    productConcepts: ProductConcept[];
}

interface BusinessProfile {
    businessType: string;
    businessIdea: string;
    launchpad: AurelionLaunchpad | null;
}

// --- STATE MANAGEMENT ---
let currentStep: 'TYPE_SELECTION' | 'IDEA_INPUT' | 'GENERATING' | 'DASHBOARD' = 'TYPE_SELECTION';
let businessProfile: BusinessProfile = {
    businessType: '',
    businessIdea: '',
    launchpad: null,
};
let isConnected = false;
let isConnecting = false;


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

// Dashboard Content
const productConceptsContainerEl = document.getElementById('product-concepts-container') as HTMLDivElement;

// Studio Control Elements
const studioControlCardEl = document.getElementById('studio-control-card');
const moduleStatusListEl = document.getElementById('module-status-list');
const connectButton = document.getElementById('connect-button') as HTMLButtonElement;
const liveStatusIndicatorEl = document.getElementById('live-status-indicator') as HTMLSpanElement;
const liveStatusTextEl = document.getElementById('live-status-text') as HTMLSpanElement;
const syncStatusTextEl = document.getElementById('sync-status-text') as HTMLSpanElement;
const activateRitualButton = document.getElementById('activate-ritual-button') as HTMLButtonElement;
const ritualStatusEl = document.getElementById('ritual-status') as HTMLParagraphElement;
const ritualSelectEl = document.getElementById('ritual-select') as HTMLSelectElement;


// --- AI CORE FUNCTIONS (API Layer) ---
async function generateLaunchpad(type: string, idea: string): Promise<AurelionLaunchpad> {
    console.log("Simulating AI Launchpad generation for:", { type, idea });
    // This is a mock function to simulate the AI generation process.
    // It prevents the app from hanging on a failed network request
    // and provides instant feedback for a better user experience.
    return new Promise(resolve => {
        setTimeout(() => {
            resolve({
                productConcepts: [
                    {
                        category: 'Serenity Token',
                        id: 1,
                        productName: "Stillpoint",
                        purpose: "A tactile object that helps the user pause, breathe, and return to emotional equilibrium. It's not a gadget — it's a presence.",
                        designAttributes: {
                            shape: "Smooth oval with a subtle spiral indentation — fits naturally in the palm.",
                            material: "Biolight-infused polymer with soft matte texture. Warm to the touch, responsive to skin temperature.",
                            functionality: ["Gently pulses when held, syncing with the user's breath", "Stores a single calming phrase or memory", "Can be placed on a surface to emit ambient light"],
                            colorVariants: [{ name: "Mist Blue", description: "(calm)" }, { name: "Sandstone", description: "(grounding)" }, { name: "Pale Gold", description: "(clarity)" }]
                        },
                        creationFlow: [
                            { step: 1, module: "Matter Shaper", action: "molds the oval form" },
                            { step: 2, module: "BioWeaver", action: "infuses biolight and temperature-responsive layers" },
                            { step: 3, module: "Engraver", action: "inscribes a calming phrase (e.g. “You are held.”)" },
                            { step: 4, module: "Packaging Module", action: "wraps it in a soft, recyclable sleeve with a poetic card" }
                        ],
                        icon: "🌿"
                    },
                    {
                        category: 'Wearable Dashboard',
                        id: 1,
                        productName: "Pulseform",
                        purpose: "A soft, skin-friendly interface that tracks emotional rhythms, breath cycles, and ambient energy — designed to support calm focus and gentle transitions.",
                        designAttributes: {
                            shape: "Curved oblong panel with rounded edges, designed to sit on the chest or wrist.",
                            material: "Polymer blend with breathable mesh and embedded biolight sensors.",
                            functionality: ["Displays a heart icon and emotional graph", "Syncs with Serenity Tokens to reflect mood shifts", "Emits gentle pulses to guide breath or focus"],
                            colorVariants: [{ name: "Soft Graphite", description: "(focus)" }, { name: "Pale Lavender", description: "(calm)" }, { name: "Warm Sand", description: "(balance)" }]
                        },
                        creationFlow: [
                            { step: 1, module: "Matter Shaper", action: "molds the wearable form" },
                            { step: 2, module: "NanoPrint Engine", action: "embeds biometric sensors and emotional graph display" },
                            { step: 3, module: "Wellness Module", action: "calibrates pulse feedback and ambient sync" },
                            { step: 4, module: "Packaging Module", action: "includes a soft wrap and onboarding card" }
                        ],
                        icon: "🧠"
                    }
                ]
            });
        }, 2500); // Simulate network and AI generation time
    });
}


// --- UI RENDERING & LOGIC ---

/**
 * Updates the UI to show the correct step in the onboarding process.
 */
function updateUiForStep() {
    if (!stepTypeEl || !stepIdeaEl || !stepGeneratingEl || !onboardingContainerEl || !dashboardContainerEl || !stepperEl) return;

    stepTypeEl.classList.add('hidden');
    stepIdeaEl.classList.add('hidden');
    stepGeneratingEl.classList.add('hidden');
    onboardingContainerEl.classList.add('hidden');
    dashboardContainerEl.classList.add('hidden');

    const steps = stepperEl.querySelectorAll('.step');
    steps.forEach((step) => {
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

function updateUiForConnectionState() {
    if (!studioControlCardEl || !liveStatusIndicatorEl || !liveStatusTextEl || !syncStatusTextEl || !connectButton || !ritualSelectEl || !activateRitualButton) return;

    if (isConnected) {
        liveStatusIndicatorEl.classList.remove('disconnected');
        liveStatusIndicatorEl.classList.add('pulse');
        liveStatusTextEl.textContent = 'EMOTIONAL RHYTHM: STABLE';
        syncStatusTextEl.textContent = 'SYNC: CONNECTED';
        connectButton.textContent = 'DISCONNECT';
        ritualSelectEl.disabled = false;
        activateRitualButton.disabled = false;

        moduleStatusListEl?.querySelectorAll('li').forEach(li => {
            li.classList.remove('offline');
            const statusSpan = li.querySelector('span:last-of-type') as HTMLSpanElement;
            if (statusSpan) statusSpan.textContent = 'ONLINE';
        });

    } else {
        liveStatusIndicatorEl.classList.add('disconnected');
        liveStatusIndicatorEl.classList.remove('pulse');
        liveStatusTextEl.textContent = 'EMOTIONAL RHYTHM: OFFLINE';
        syncStatusTextEl.textContent = 'SYNC: DISCONNECTED';
        connectButton.textContent = 'CONNECT';
        ritualSelectEl.disabled = true;
        activateRitualButton.disabled = true;

        moduleStatusListEl?.querySelectorAll('li').forEach(li => {
            li.classList.add('offline');
            const statusSpan = li.querySelector('span:last-of-type') as HTMLSpanElement;
            if (statusSpan) statusSpan.textContent = 'OFFLINE';
        });
    }
}


function renderDashboard() {
    if (!businessProfile.launchpad || !productConceptsContainerEl) return;
    
    const dashCoreIntentionEl = document.getElementById('dash-core-intention');
    if (dashCoreIntentionEl) {
       dashCoreIntentionEl.textContent = `Based on your core intention: "${businessProfile.businessIdea}"`;
    }

    // Render Product Concept Cards
    productConceptsContainerEl.innerHTML = '';
    businessProfile.launchpad.productConcepts.forEach(concept => {
        const card = document.createElement('div');
        card.className = 'product-concept-card';

        const designAttributes = concept.designAttributes;

        const colorVariantsHtml = designAttributes.colorVariants.map(v => `<li><strong>${v.name}:</strong> ${v.description}</li>`).join('');
        const functionalityHtml = designAttributes.functionality.map(f => `<li>${f}</li>`).join('');
        const creationFlowHtml = concept.creationFlow.map(s => `<li><strong>${s.module}</strong> ${s.action}</li>`).join('');

        card.innerHTML = `
            <h2 class="product-header">
                <span>${concept.icon}</span> ${concept.category} ${String(concept.id).padStart(2, '0')}: "${concept.productName}"
            </h2>

            <div class="product-section">
                <h3><span>🧭</span> Purpose</h3>
                <p>${concept.purpose}</p>
            </div>

            <div class="product-section">
                <h3><span>🧬</span> Design Attributes</h3>
                <ul>
                    <li><strong>Shape:</strong> ${designAttributes.shape}</li>
                    <li><strong>Material:</strong> ${designAttributes.material}</li>
                </ul>
                <h4>Functionality:</h4>
                <ul>${functionalityHtml}</ul>
                <h4>Color Variants:</h4>
                <ul>${colorVariantsHtml}</ul>
            </div>

            <div class="product-section">
                <h3><span>🛠️</span> AURELION Creation Flow</h3>
                <ol class="creation-flow-list">${creationFlowHtml}</ol>
            </div>
        `;

        productConceptsContainerEl.appendChild(card);
    });

    // Render Studio Control Panel
    if (studioControlCardEl && moduleStatusListEl) {
        studioControlCardEl.classList.remove('hidden');
        
        moduleStatusListEl.innerHTML = '';
        businessProfile.launchpad.productConcepts.forEach(concept => {
            const li = document.createElement('li');
            li.innerHTML = `<span><span class="status-indicator-dot"></span>${concept.productName.toUpperCase()}</span><span>OFFLINE</span>`;
            moduleStatusListEl.appendChild(li);
        });

        // Set initial connection state UI
        updateUiForConnectionState();
    }
}

// --- EVENT LISTENERS ---

if (businessTypeGridEl) {
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
}

if (generateButton && businessIdeaTextarea) {
    generateButton.addEventListener('click', async () => {
        const idea = businessIdeaTextarea.value.trim();
        if (idea.length < 10) {
            alert("Please describe your core intention in a little more detail.");
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
            alert("Sorry, the Creation Engine couldn't generate a product line. Please try again with a different intention.");
            currentStep = 'IDEA_INPUT';
            updateUiForStep();
        }
    });
}


if (backToTypeButton) {
    backToTypeButton.addEventListener('click', () => {
        currentStep = 'TYPE_SELECTION';
        updateUiForStep();
    });
}


// Studio Control Listeners
if (activateRitualButton && ritualStatusEl && ritualSelectEl) {
    let isActivating = false;
    activateRitualButton.addEventListener('click', () => {
        if (isActivating || !isConnected) return;
        isActivating = true;

        const selectedRitual = ritualSelectEl.value;
        ritualStatusEl.textContent = `ACTIVATING: ${selectedRitual}...`;
        
        setTimeout(() => {
            ritualStatusEl.textContent = `RITUAL: ${selectedRitual} IS ACTIVE.`;
            setTimeout(() => {
                ritualStatusEl.textContent = '';
                isActivating = false;
            }, 3000);
        }, 1500);
    });
}

if (connectButton) {
    connectButton.addEventListener('click', () => {
        if (isConnecting) return;

        isConnecting = true;
        
        if(isConnected) {
            // Disconnect logic
            isConnected = false;
            updateUiForConnectionState();
            isConnecting = false;
        } else {
            // Connect logic
            connectButton.textContent = 'CONNECTING...';
            setTimeout(() => {
                isConnected = true;
                updateUiForConnectionState();
                isConnecting = false;
            }, 1000); // Simulate connection delay
        }
    });
}

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
    updateUiForConnectionState(); // Set initial UI for disconnected state
    document.body.classList.remove('is-loading');
}

init();