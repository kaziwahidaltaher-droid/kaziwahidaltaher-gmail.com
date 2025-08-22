# LOOMINARY - AI-Powered Image Generation & Analysis

This application allows you to generate high-quality, realistic images from text descriptions and uploaded logos. It also provides AI-powered product specification and market analysis for the generated designs.

## Features

-   **AI Image Generation:** Create images from detailed text prompts using the Imagen 3 model.
-   **Image Upload:** Incorporate your own logo into the generated images using the `[LOGO]` placeholder.
-   **AI-Powered Specifications:** Automatically generate detailed manufacturing specifications for T-shirt designs.
-   **Bangladesh Market Analysis:** Get a dynamic, AI-driven analysis of the retail price and transportation costs for your product within the current Bangladeshi economic environment.

## API Keys and Secrets Management (`API_KEY`)

**This application will not function without a valid Google AI (Gemini) API key.**

Your API key is a secret and must be protected. The code is correctly set up to read the key from an environment variable (`process.env.API_KEY`). **You must never write your API key directly into the code.**

### How to Create and Use Your API Token for Deployment

When you ask to "create a worker build API token," you are referring to the process of securely providing your Gemini API key to the hosting environment where your application is built and runs. Here’s how to do it on a popular platform like Cloudflare Pages:

**Step 1: Get your Gemini API Key**
-   If you don't have one, get your key from [Google AI Studio](https://aistudio.google.com/app/apikey).

**Step 2: Add the Key to Your Hosting Provider**
-   **Go to your hosting provider's dashboard** (e.g., Cloudflare, Vercel, Netlify).
-   **Navigate to your project's settings.**
-   **Find the "Environment Variables" section.**
    -   In **Cloudflare Pages**, this is under `Settings -> Environment variables`.
    -   In **Vercel**, this is under `Settings -> Environment Variables`.
    -   In **Netlify**, this is under `Site settings -> Build & deploy -> Environment`.
-   **Create a new secret variable:**
    -   **Name:** `API_KEY` (This must match exactly what the code expects).
    -   **Value:** Paste your secret Gemini API key here.
-   **Save the variable.** Make sure it's available for all builds (Production, Preview, etc.).

Now, when your hosting provider builds and deploys your application, it will securely inject your API key as `process.env.API_KEY`, and your live application will work correctly without exposing your key in the public code.

## Local Development

To run this app locally, you need a simple local web server because the app uses ES modules.

-   If you have Python installed, run `python -m http.server` in the project directory.
-   If you have Node.js installed, you can use a package like `serve` by running `npx serve .`.

*Note: For the API key to work locally, you would need a more advanced setup (like using a `.env` file with a bundler like Vite). For simple testing, you could temporarily replace `process.env.API_KEY` in `index.tsx` with your actual key, but **never commit this change to version control.***

## Deployment Strategy & Deploy Branch

A robust deployment strategy ensures that your live application is stable while you continue to develop new features. We recommend using a Git branching model where `main` is your **deploy branch**.

### Recommended Branches

-   **`main` (Deploy Branch):** This branch should always contain the code that is currently live and deployed to your users. It must be stable and production-ready. Your hosting provider (e.g., Cloudflare Pages, Vercel) should be configured to automatically deploy any new commit that is pushed to this branch.
-   **`develop`:** This is your primary development branch. All new feature work is merged into this branch. It represents the "next" version of your app and should be mostly stable, but it's where you integrate and test new features together.
-   **Feature Branches (e.g., `feature/new-button`, `fix/login-bug`):** When you start working on a new feature or a bug fix, create a new branch from `develop`. Do all your work on this branch. Once the feature is complete and tested, merge it back into `develop`.

### Deployment Workflow

1.  **Start a Feature:** Create a new branch from `develop`: `git checkout -b feature/my-cool-feature develop`.
2.  **Develop:** Make your code changes on your feature branch.
3.  **Merge to Develop:** When the feature is complete, merge it into the `develop` branch.
4.  **Prepare for Release:** When you have integrated all the features for a new release into `develop`, you can prepare to deploy.
5.  **Deploy:** Merge the `develop` branch into your `main` branch:
    ```bash
    git checkout main
    git pull origin main
    git merge develop
    git push origin main
    ```
6.  **Automatic Deployment:** Your hosting service, configured to watch the `main` branch, will see the new commit and automatically start a new build and deploy your updated application.

By following this model, you ensure that your `main` branch is always a clean, deployable representation of your application, which is the essence of having a dedicated **deploy branch**.

## Advanced: Using a Worker for API Security (Worker Path)

While the current setup uses environment variables which are secure for build-time, an even more robust method for protecting your API key is to use a serverless function (often called a "worker" or "edge function") as a proxy. Your frontend application would call this worker instead of calling the Google AI API directly.

This is the recommended architecture for production applications handling sensitive keys.

**Why use a worker?**

-   **Ultimate Security:** Your secret API key **never** leaves your backend. It is never exposed to the user's browser, eliminating the risk of it being stolen from the client-side.
-   **Centralized Logic:** You can add rate limiting, caching, or other logic in one central place on the server-side.

**How it Works & The "Worker Path"**

1.  You create a serverless function file inside your project. A standard path for this would be `functions/api-proxy.js`. In this scenario, `/functions/api-proxy.js` is your **worker path**.
2.  You configure your hosting provider (like Cloudflare Pages or Vercel) to treat files in the `functions` directory as serverless functions.
3.  Your frontend code is changed to call your own endpoint (e.g., `/api/generate`) instead of the Google AI API URL.
4.  Your hosting platform routes the `/api/generate` request to your worker function.
5.  The worker function receives the request, adds the secret API key (which it gets from a server-side environment variable), calls the real Google AI API, and then returns the response to your frontend.

**Example Worker Code (`functions/api-proxy.js`)**

*This is a conceptual example for a Cloudflare Worker. You would need to adapt it for your specific hosting provider.*

```javascript
// This file would be at the path: functions/api-proxy.js

export async function onRequestPost(context) {
  // 1. Get the prompt from the frontend request
  const requestBody = await context.request.json();
  const prompt = requestBody.prompt;

  // 2. Get the secret API key from the server-side environment variables
  const GEMINI_API_KEY = context.env.API_KEY;

  // 3. Call the actual Google AI API (example for generateContent)
  // Note: The actual endpoint and body will vary based on the specific AI call.
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  // 4. Return the response to the frontend
  const data = await response.json();
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
}
```

By implementing this pattern, you create a highly secure application where the "worker path" points to your API proxy function.
