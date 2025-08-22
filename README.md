# LOOMINARY - AI-Powered Image Generation & Analysis

This application allows you to generate high-quality, realistic images from text descriptions and uploaded logos. It also provides AI-powered product specification and market analysis for the generated designs.

## Features

-   **AI Image Generation:** Create images from detailed text prompts using the Imagen 3 model.
-   **Image Upload:** Incorporate your own logo into the generated images using the `[LOGO]` placeholder.
-   **AI-Powered Specifications:** Automatically generate detailed manufacturing specifications for T-shirt designs.
-   **Global Market Analysis:** Get a dynamic, AI-driven analysis of retail price, logistics, and marketing angles for your product in various markets (Bangladesh, USA, UK, India, Nigeria).
-   **Real-Time Market Trends:** Optionally enable Google Search grounding to get the latest market trends and insights for your product, complete with sources.
-   **Design Provenance Certificate:** Download a structured JSON certificate for each generation, detailing the inputs (prompt, logo), outputs (specifications, market analysis), and a unique generation ID. This creates a machine-readable provenance record inspired by the in-toto attestations framework.
-   **Design Review & Approval Workflow:** Manage design iterations with a workflow inspired by GitHub Pull Requests.
    -   **Propose Changes:** Submit new design iterations for review with commit-style messages.
    -   **Review & Approve:** Each proposal can be reviewed, commented on, and then either "Approved" to become the new baseline or "Rejected".
    -   **Versioned Status:** The design history clearly shows the status of each iteration (`Proposed`, `Approved`, `Rejected`), providing a clear audit trail of the creative process. You can only propose changes to designs that have been approved.
-   **Automated Design Handoff:** Inspired by CI/CD workflows, approving a design automatically generates a "production package." This downloadable `.zip` file contains the final design image, its provenance certificate, and a detailed summary, preparing it for the next stage of your pipeline.

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
1. Create an issue.
   outlining the fix or feature.
2. Fork the repository to your own github account and clone it locally.
3. Hack on your changes.
4. Update the README.md with details of changes to any interface. This includes new environment
   variables, exposed ports, useful file locations, CLI parameters and
   new or changed configuration values.
5. Correctly format your commit message see [Commit Messages](#commit-message-guidelines)
   below.
6. Ensure that CI passes. If it fails, fix the failures.
7. Every pull request requires a review from the [core sigstore team](https://github.com/orgs/sigstore/people)
   before merging.
8. If your pull request consists of more than one commit, please squash your
   commits as described in [Squash Commits](#commit-message-guidelines)

## Commit Message Guidelines

We follow the commit formatting recommendations found on [Chris Beams' How to Write a Git Commit Message article](https://chris.beams.io/posts/git-commit/).

Well formed commit messages not only help reviewers understand the nature of
the Pull Request, but also assists the release process where commit messages
are used to generate release notes.

A good example of a commit message would be as follows:

```
Summarize changes in around 50 characters or less

More detailed explanatory text, if necessary. Wrap it to about 72
characters or so. In some contexts, the first line is treated as the
subject of the commit and the rest of the text as the body. The
blank line separating the summary from the body is critical (unless
you omit the body entirely); various tools like `log`, `shortlog`
and `rebase` can get confused if you run the two together.

Explain the problem that this commit is solving. Focus on why you
are making this change as opposed to how (the code explains that).
Are there side effects or other unintuitive consequences of this
change? Here's the place to explain them.

Further paragraphs come after blank lines.

 - Bullet points are okay, too

 - Typically a hyphen or asterisk is used for the bullet, preceded
   by a single space, with blank lines in between, but conventions
   vary here

If you use an issue tracker, put references to them at the bottom,
like this:

Resolves: #123
See also: #456, #789
```

Note the `Resolves #123` tag: this references the issue raised and allows us to
ensure issues are associated and closed when a pull request is merged.

Please refer to [the Github help page on linking issues](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue)
for more information and valid keywords.

## Squash Commits

Should your pull request consist of more than one commit (perhaps due to
a change being requested during the review cycle), please perform a git squash
once a reviewer has approved your pull request.

A squash can be performed as follows. Let's say you have the following commits:

    initial commit
    second commit
    final commit

Run the command below with the number set to the total commits you wish to
squash (in our case 3 commits):

    git rebase -i HEAD~3

You default text editor will then open up and you will see the following::

    pick eb36612 initial commit
    pick 9ac8968 second commit
    pick a760569 final commit

    # Rebase eb1429f..a760569 onto eb1429f (3 commands)

We want to rebase on top of our first commit, so we change the other two commits
to `squash`:

    pick eb36612 initial commit
    squash 9ac8968 second commit
    squash a760569 final commit

After this, should you wish to update your commit message to better summarise
all of your pull request, run:

    git commit --amend

You will then need to force push (assuming your initial commit(s) were posted
to github):

    git push origin your-branch --force

Alternatively, a core member can squash your commits within Github.

## Code of Conduct

Sigstore adheres to and enforces the [Contributor Covenant](http://contributor-covenant.org/version/1/4/) Code of Conduct.
Please take a moment to read our [code of conduct](https://github.com/sigstore/.github/blob/main/CODE_OF_CONDUCT.md) document.Checkout with GitHub CLI
gh pr checkout 385Inspect the proposed changes in the pull request and ensure that you are comfortable running your workflows on the pull request branch. You should be especially alert to any proposed changes in the .github/workflows/ directory that affect workflow files.n your repository on GitHub, create a workflow file called github-actions-demo.yml in the .
kaziwahidaltaher-droid/kaziwahidaltaher-gmail.com on main
/workflows directory. To do this:

If the .github/workflows directory already exists, navigate to that directory on GitHub, click Add file, then click Create new file, and name the file github-actions-demo.yml.

If your repository doesn't have a .github/workflows directory, go to the main page of the repository on GitHub, click Add file, then click Create new file, and name the file .github/workflows/github-actions-demo.yml. This creates the .github and workflows directories and the github-actions-demo.yml file in a single step.

Note

For GitHub to discover any GitHub Actions workflows in your repository, you must save the workflow files in a directory called .github/workflows.

You can give the workflow file any name you like, but you must use .yml or .yaml as the file name extension. YAML is a markup language that's commonly used for configuration files.

Copy the following YAML contents into the github-actions-demo.yml file:

YAML
name: GitHub Actions Demo
run-name: ${{ github.actor }} is testing out GitHub Actions 🚀
on: [push]
jobs:
  Explore-GitHub-Actions:
    runs-on: ubuntu-latest
    steps:
      - run: echo "🎉 The job was automatically triggered by a ${{ github.event_name }} event."
      - run: echo "🐧 This job is now running on a ${{ runner.os }} server hosted by GitHub!"
      - run: echo "🔎 The name of your branch is ${{ github.ref }} and your repository is ${{ github.repository }}."
      - name: Check out repository code
        uses: actions/checkout@v4
      - run: echo "💡 The ${{ github.repository }} repository has been cloned to the runner."
      - run: echo "🖥️ The workflow is now ready to test your code on the runner."
      - name: List files in the repository
        run: |
          ls ${{ github.workspace }}
      - run: echo "🍏 This job's status is ${{ job.status }}."
At this stage you don't need to understand the details of this workflow. For now, you can just copy and paste the contents into the file. After completing this quickstart guide, you can learn about the syntax of workflow files in Workflows, and for an explanation of GitHub Actions contexts, such as ${{ github.actor }} and ${{ github.event_name }}, see Contexts reference.

Click Commit changes.

In the "Propose changes" dialog, select either the option to commit to the default branch or the option to create a new branch and start a pull request. Then click Commit changes or Propose changes.

Screenshot of the "Propose changes" dialog with the areas mentioned highlighted with an orange outline.
Committing the workflow file to a branch in your repository triggers the push event and runs your workflow.

If you chose to start a pull request, you can continue and create the pull request, but this is not necessary for the purposes of this quickstart because the commit has still been made to a branch and will trigger the new workflow.

Viewing your workflow results
On GitHub, navigate to the main page of the repository.

Under your repository name, click  Actions.

Screenshot of the tabs for the "github/docs" repository. The "Actions" tab is highlighted with an orange outline.
In the left sidebar, click the workflow you want to display, in this example "GitHub Actions Demo."

Screenshot of the "Actions" page. The name of the example workflow, "GitHub Actions Demo", is highlighted by a dark orange outline.
From the list of workflow runs, click the name of the run you want to see, in this example "USERNAME is testing out GitHub Actions."

In the left sidebar of the workflow run page, under Jobs, click the Explore-GitHub-Actions job.

Screenshot of the "Workflow run" page. In the left sidebar, the "Explore-GitHub-Actions" job is highlighted with a dark orange outline.
The log shows you how each of the steps was processed. Expand any of the steps to view its details.

Screenshot of steps run by the workflow.
For example, you can see the list of files in your repository:

Screenshot of the "List files in the repository" step expanded to show the log output. The output for the step is highlighted with an orange outline.
The example workflow you just added is triggered each time code is pushed to the branch, and shows you how GitHub Actions can work with the contents of your repository. For an in-depth tutorial, see Understanding GitHub Actions.

Next steps
GitHub Actions can help you automate nearly every aspect of your application development processes. Ready to get started? Here are some helpful resources for taking your next steps with GitHub Actions:

To create a GitHub Actions workflow, see Using workflow templates.
For continuous integration (CI) workflows, see Building and testing your code.
For building and publishing packages, see Publishing packages.
For deploying projects, see Deploying to third-party platforms.
For automating tasks and processes on GitHub, see Managing your work with GitHub Actions.
For examples that demonstrate more complex features of GitHub Actions, see Managing your work with GitHub Actions. These detailed examples explain how to test your code on a runner, access the GitHub CLI, and use advanced features such as concurrency and test matrices.
To certify your proficiency in automating workflows and accelerating development with GitHub Actions, earn a GitHub Actions certificate with GitHub Certifications. For more information, see About GitHub Certifications.
Help and support