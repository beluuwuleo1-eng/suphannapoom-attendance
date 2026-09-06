# Orbit · GitHub project dashboard

Orbit is a small-group, GitHub-only dashboard that runs as a static site on GitHub Pages. It reads public repository issues through the unauthenticated GitHub REST API and refreshes automatically every 12 seconds. Pull requests are excluded from the todo list.

## Configure

Edit [`config.js`](./config.js) before publishing:

```js
window.DASHBOARD_CONFIG = {
  owner: "your-github-org-or-user",
  repository: "your-public-repository",
  pollIntervalMs: 12000,
  issueLimit: 30,
  questionLabels: ["question", "request", "help wanted"],
};
```

Do not add a token to this file. Anything shipped to GitHub Pages is public.

## Publish with GitHub Pages

1. Push these files to a GitHub repository (the repository itself may be separate from the one being displayed).
2. In **Settings → Pages**, set **Source** to **Deploy from a branch**, choose the default branch and `/ (root)`, then select **Save**.
3. Wait for the Pages deployment, then open the generated Pages URL. No build command or package installation is required.

## How the dashboard works

- **Issues as todos** shows open, closed, and all issues with labels, assignees, timestamps, and direct GitHub links.
- **Questions & requests** uses issues labeled `question`, `request`, or `help wanted`. This is the GitHub-only fallback for Discussions because reading Discussions is not consistently available through the unauthenticated REST API. Change `questionLabels` to match your team’s labels.
- **New issue** and **Ask a question** open GitHub’s own forms. People need a GitHub account and repository permission to create or edit items.

## Limitations

The site only displays public data and never exposes a credential. Unauthenticated GitHub API requests are rate-limited (typically 60 requests per hour per IP). Polling is near-realtime, not a push stream, and may stop updating after the limit is reached. GitHub Pages is static hosting, so private repositories, server-side secrets, webhooks, and authenticated Discussions are intentionally not supported.
