# LOOMINAR - " কৃবু বাবা " AI Sanctuary

This application is a professional-grade, AI-powered design studio. It allows you to generate high-quality images from text descriptions, and then provides a comprehensive, end-to-end go-to-market strategy for your creation.

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

## Flagship Features

-   **AI Image Generation:** Create images from detailed text prompts using the Imagen 3 model.
-   **Voice-Enabled Prompting:** Speak your ideas directly into the application using AI-powered speech-to-text.
-   **Audible AI Analysis:** Have the AI's strategic analysis read aloud to you for a more immersive experience.
-   **Live Camera Color Palette Generation:** Use your device's camera to capture inspiration from the world around you and generate a harmonious color palette for your designs.
-   **Image Upload:** Incorporate your own logo into the generated images using the `[LOGO]` placeholder.
-   **Dark Mode Studio UI:** A professional two-column interface with a fixed control panel and a main stage for results, optimized for creative work.
-   **Persistent Data:** All your design history is automatically saved in your browser's local storage, so your work is **never lost** on a page refresh.
-   **LOOMINAR ⚡ Studio:** A unified, tabbed dashboard that provides a complete go-to-market strategy for your designs.
    -   **Product DNA:** Automatically generates detailed manufacturing specifications, pricing analysis, and logistics overviews for your target market.
    -   **Branding & Identity:** The AI defines a brand archetype, establishes a brand voice, and provides actionable feedback on your uploaded logo.
    -   **Region-Aware SEO & SEM:** Get a localized digital marketing strategy grounded in real-time Google Search data.
        -   **Search Engine Optimization (SEO) Rate:** A key metric, visualized as a dynamic progress bar, that scores your product's SEO potential out of 100 for your target market.
        -   **Targeted Keywords & Ad Copy:** High-impact keywords for SEO & SEM, plus ready-to-use ad copy.
    -   **E-commerce Listing:** Generates a platform-ready product title, description, SKU, and Google Product Category for your online store.
    -   **Manufacturing & Sourcing:** Identifies potential manufacturing partners, suggests similar product ideas, and provides B2B keywords for finding suppliers.
    -   **Social Media Buzz:** A real-time analysis of the social media landscape, including sentiment analysis and viral content ideas.
-   **Design Review & Approval Workflow:** Manage design iterations with a workflow inspired by code reviews, complete with versioned history and statuses (`Proposed`, `Approved`, `Rejected`).
-   **Publish to Store:** "Publish" your approved designs to move them from the active design history into a "My Store" gallery.

## Backend Architecture

This is a frontend-only application that simulates a full-stack experience. All data operations (saving, updating, fetching designs) are handled by `async` functions in `index.tsx` that use the browser's `localStorage` to persist data.

In a real-world deployment, you would replace the functions in the "LOCAL STORAGE DATABASE & API LAYER" section of `index.tsx` with `fetch` calls to your own secure backend API (e.g., a serverless function). This backend API would be responsible for securely connecting to your database and making calls to the Google AI API using secrets stored safely as server-side environment variables.

## Security Considerations

This application has been built with security best practices for frontend development in mind.

### Cross-Site Scripting (XSS) Prevention

All dynamic data received from the AI API is rendered using safe DOM manipulation methods (e.g., setting `textContent`). The application strictly avoids the use of `innerHTML` with API-generated content to prevent potential Cross-Site Scripting (XSS) vulnerabilities.

### Cloudflare Deployment Settings

When deploying this application on Cloudflare Pages, it is recommended to configure your zone's security settings for optimal protection.

-   **Security Level:** It is recommended to set the Security Level to **High**. This will challenge visitors with suspicious behavior before they can access your site. You can configure this in your Cloudflare dashboard under `Security > Settings`.
-   **Bot Fight Mode:** Enable Bot Fight Mode to identify and challenge automated traffic.
-   **SSL/TLS:** Ensure your SSL/TLS encryption mode is set to **Full (Strict)** to secure traffic.

### API Key Security

As stated previously, your `API_KEY` is a critical secret. **Never expose it in frontend code.** Always use environment variables in your deployment environment as described in the "Deployment" section.


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

### Global Performance & Regional Focus

Using a global Content Delivery Network (CDN) like Cloudflare is a best practice. It ensures that the application assets (HTML, CSS, JS) are cached on servers around the world. This provides a fast and responsive experience for all users, including those in the primary target market of Bangladesh, by serving content from a geographically close data center (like DAC - Dhaka).

## Mobile Deployment Strategy (Android/Google Play Store)

To publish this application to the Google Play Store, we will use a modern approach that leverages the existing web codebase: a **Progressive Web App (PWA)** packaged inside a **Trusted Web Activity (TWA)**.

This strategy avoids the need to build and maintain a separate native Android application, saving significant time and resources while delivering a high-quality, app-like experience.

### Step 1: PWA Compliance

The first step is to ensure the web application meets PWA criteria. This involves adding two key files to the project: a Web App Manifest and a Service Worker.

1.  **Create `manifest.json`:** This file describes the application to the browser and operating system, enabling the "Add to Home Screen" feature. It should include:
    ```json
    {
      "name": "LOOMINAR \" কৃবু বাবা \" AI Sanctuary",
      "short_name": "Loominar",
      "start_url": "/",
      "display": "standalone",
      "background_color": "#1a1a1a",
      "theme_color": "#1a1a1a",
      "description": "Your AI-powered studio for product design, branding, and go-to-market strategy.",
      "icons": [
        { "src": "/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png" },
        { "src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png" }
      ]
    }
    ```
2.  **Link to Manifest in `index.html`:** Add `<link rel="manifest" href="/manifest.json">` to the `<head>` of `index.html`.
3.  **Create `service-worker.js`:** This script enables offline functionality by caching application assets. A basic service worker would cache the core HTML, CSS, and JS files.
4.  **Register the Service Worker:** Add a script in `index.tsx` to register the service worker when the application loads.

### Step 2: Create the TWA Wrapper in Android Studio

A TWA is a lightweight Android app that launches your PWA in a full-screen browser view.

1.  **Install Android Studio:** Download and set up the latest version of Android Studio.
2.  **Create a New Project:** Start a new Android Studio project with an "Empty Activity".
3.  **Add TWA Support:** Add the `androidx.browser:browser` library dependency to your app's `build.gradle` file.
4.  **Configure `AndroidManifest.xml`:** Configure the manifest to launch the TWA. This involves setting the `LAUNCH_URL` to your production web app's domain (e.g., `https://LOOMINAR.COM`).
5.  **Establish Digital Asset Links:** To remove the browser URL bar, you must prove ownership of the web domain.
    *   **Generate `assetlinks.json`:** Use Android Studio's "App Links Assistant" or an online generator to create this file. It links your domain to the signature of your Android app.
    *   **Host the file:** Upload the generated `assetlinks.json` file to your web server at `https://LOOMINAR.COM/.well-known/assetlinks.json`.

### Step 3: Publish to the Google Play Store

1.  **Enroll in Google Play Developer Program:** Register for a developer account (a one-time fee is required).
2.  **Generate a Signed App Bundle:** In Android Studio, use the "Build > Generate Signed Bundle / APK" wizard to create a production-ready Android App Bundle (.aab). **Securely store your signing key.**
3.  **Create App Listing:** In the Google Play Console, create a new app.
    *   Fill out all required store listing details: app name, descriptions, screenshots, privacy policy, and content ratings.
    *   Upload your app icon (high-resolution).
4.  **Upload App Bundle:** Upload your signed `.aab` file to a new release track (e.g., "Internal testing" or "Production").
5.  **Submit for Review:** Once all checks pass, roll out the release. Google's review process can take a few days.

By following this blueprint, we can efficiently bring the LOOMINAR AI Sanctuary to millions of Android users via the Google Play Store.