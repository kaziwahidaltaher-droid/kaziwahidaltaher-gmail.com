# ✨ AURELION | Universal Creation Engine

Aurelion is an AI-powered concept generator for mindful technology. It's a creative engine that transforms a core intention into a cohesive product line of tangible, wellness-focused objects.

**Tagline:** _“A Universal Creation Engine for mindful technology.”_

<br>

## Architecture

This project follows a secure client-server architecture.
-   **Frontend:** A static web application (HTML, CSS, TS) that provides the user interface. It does **not** handle the API key.
-   **Backend:** A server (e.g., Node.js/Express) that exposes a REST API. It is responsible for securely storing the Google AI API key and making all calls to the Gemini API.

## Features

-   **Intention-Based Generation:** Starts with your core concept or feeling to generate a unique product line.
-   **AI-Powered Product Design:** Instantly creates a collection of mindful-tech objects (e.g., "Serenity Tokens", "Wearable Dashboards").
-   **Detailed Specifications:** Each generated product comes with a full design specification, including:
    -   Purpose and core concept.
    -   Design Attributes (Shape, Material, Functionality).
    -   Color Variants.
-   **Conceptual Creation Flow:** Outlines a high-level manufacturing and creation process for each object, sparking ideas for production.

---

### API Key Security

The Google AI (Gemini) API key is managed exclusively by the backend server. The client-side code makes API calls to this backend, which then securely communicates with the Google AI services. This is a critical security practice that prevents your API key from being exposed in the browser.

### Local Development

1.  **Backend Setup:**
    -   Navigate to your backend directory.
    -   Create a `.env` file and add your `API_KEY=YOUR_GEMINI_API_KEY`.
    -   Install dependencies (`npm install`) and start the backend server (`npm start`).
2.  **Frontend Setup:**
    -   In a separate terminal, navigate to the frontend project directory.
    -   Start a local web server (e.g., `npx serve .`).
    -   Open the provided URL in your browser. The frontend will make calls to your local backend.

### Deployment

1.  **Backend Deployment:**
    -   Deploy your backend service to a hosting provider (e.g., Render, Heroku, Google Cloud Run).
    -   In your provider's dashboard, set the `API_KEY` as a secret environment variable.
2.  **Frontend Deployment:**
    -   Deploy the static frontend to a provider like Vercel, Netlify, or Cloudflare Pages.
    -   If your backend is on a different domain, you will need to configure CORS on your backend server to allow requests from your frontend's domain.