# LOOMINAR - "তোদের বন্ধু তানিম"

This application allows you to generate high-quality, realistic images from text descriptions and uploaded logos. It has been upgraded into a comprehensive Branding & Go-to-Market Studio, providing a full suite of AI-powered tools to take a design from concept to a full-fledged brand with a ready-to-launch marketing strategy.

<br>

> [!CAUTION]
> **CRITICAL SECURITY WARNING**
>
> This project requires a Google AI (Gemini) API key to function. Your API key is a secret and must be protected at all times.
>
> -   **NEVER** hardcode your API key or any other secret (like a database connection string) directly in your frontend code (`index.tsx`, `index.html`, etc.).
> -   **NEVER** commit your secrets to a Git repository.
> -   The code is correctly configured to read the API key from a secure environment variable (`process.env.API_KEY`). You **MUST** configure this variable in your deployment environment.

<br>

## Features

-   **AI Image Generation:** Create images from detailed text prompts using the Imagen 3 model.
-   **Image Upload:** Incorporate your own logo into the generated images using the `[LOGO]` placeholder.
-   **LOOMINAR ⚡ Studio:** A unified, tabbed dashboard that provides a complete go-to-market strategy for your designs.
    -   **Product DNA:** Automatically generates detailed manufacturing specifications, pricing analysis, and logistics overviews for your target market.
    -   **Branding & Identity:** The AI defines a brand archetype, establishes a brand voice, and provides actionable feedback on your uploaded logo.
    -   **Region-Aware SEO & SEM:** Get a localized digital marketing strategy grounded in real-time Google Search data.
        -   **Search Engine Optimization (SEO) Rate:** A key metric that scores your product's SEO potential out of 100 for your target market.
        -   **Targeted Keywords:** High-impact keywords for SEO & SEM.
        -   **Ad Copy & Meta Descriptions:** Ready-to-use copy for your campaigns and product pages.
    -   **Social Media Buzz:** A real-time analysis of the social media landscape for your product.
        -   **Live Sentiment Analysis:** Assesses the current public mood towards similar products.
        -   **Key Influencer Identification:** Finds relevant influencers and content creators for your brand.
        -   **Viral Content Ideas:** Suggests actionable social media campaign ideas and relevant hashtags.
-   **Design Review & Approval Workflow:** Manage design iterations with a workflow inspired by code reviews.
    -   **Iterate on Designs:** Submit new design variations for review with descriptive summaries.
    -   **Review & Approve:** Each proposal can be reviewed, commented on, and then either "Approved" to become the new baseline or "Rejected".
    -   **Versioned History:** The design history clearly shows the status of each iteration (`Proposed`, `Approved`, `Rejected`), providing a clear audit trail.
-   **Publish to Store:** "Publish" your approved designs to move them from the active design history into a "My Store" gallery, simulating deployment to a production environment.
-   **Persistent Data (Simulated):** The application includes a mock in-memory database to simulate how a real backend would save and retrieve design history.

## Backend Architecture

This is a frontend application that simulates communication with a backend API. All data operations (saving, updating, fetching designs) are handled by `async` functions in `index.tsx` that mimic network requests to a mock database.

In a real-world deployment, you would replace the functions in the "MOCK DATABASE & API LAYER" section of `index.tsx` with `fetch` calls to your own secure backend API (e.g., a serverless function). This backend API would be responsible for securely connecting to your database and making calls to the Google AI API using secrets stored safely as server-side environment variables.

## Local Development

To run this app locally, you need a simple local web server because the app uses ES modules.

1.  **Clone the repository.**
2.  **Navigate to the project directory.**
3.  **Start a local server.**
    -   If you have Python installed, run `python -m http.server`.
    -   If you have Node.js installed, you can use a package like `serve` by running `npx serve .`.
4.  **Open the provided URL** in your web browser (e.g., `http://localhost:8000`).

*Note: For the API key to work locally, you would need a setup that injects environment variables (like using Vite or Create React App). For simple testing, you could temporarily replace `process.env.API_KEY` in `index.tsx` with your actual key, but **do not ever commit this change to version control.**_

## Deployment

To deploy this application, you must provide your Google AI API key as an environment variable in your hosting provider's dashboard.

1.  **Go to your hosting provider's dashboard** (e.g., Vercel, Netlify, Cloudflare Pages).
2.  **Connect your Git repository.**
3.  **Navigate to your project's settings.**
4.  **Find the "Environment Variables" section.**
5.  **Create a new secret variable:**
    -   **Name:** `API_KEY`
    -   **Value:** (Your secret Gemini API key)
6.  **Save the variable and deploy your application.**

Your hosting provider will securely inject this secret, allowing your live application to function correctly without exposing your key to the public.

## Hosting & DNS Configuration (LOOMINAR.COM)

The following section documents the official Cloudflare hosting and DNS configuration for this project.

### Cloudflare Nameservers

To point the `LOOMINAR.COM` domain to the Cloudflare-hosted application, the following nameservers must be set at the domain registrar:

-   `carmelo.ns.cloudflare.com`
-   `maeve.ns.cloudflare.com`

### Cloudflare Connectivity Details

This information provides a snapshot of the connectivity environment for reference.

-   **DNS Resolver:** `1.1.1.1`
-   **DNS Protocol:** HTTPS (DNS over HTTPS)
-   **Colocation Center:** DAC
-   **Public IP:** `103.161.69.22`
-   **Device ID:** `713aa8ec-8ecf-49c8-b793-1c49294a8516`
-   **Cloudflare App Version:** `2025.6.1400.0`
