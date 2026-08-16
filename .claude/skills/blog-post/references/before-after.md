# Before / after — head of a real post

Zip `post.md` (Studio output):

```md
---
title: Building an Automated AI Video Editing Pipeline with Claude
description: A developer vibe-codes a custom BFFless frontend that triggers a GitHub Action to run Playwright, automating AI video post-production including cutting, blog post generation, and thumbnail creation.
---

# Building an Automated AI Video Editing Pipeline with Claude

What if you could upload a raw video, fill in a few fields, click **Submit**, and walk away … using Claude, [BFFless](https://docs.bffless.app/), and GitHub Actions.

The existing Studio app already handles AI-driven video editing … a Playwright-based [GitHub Actions](https://docs.bffless.app/deployment/github-actions/) workflow that drives Studio programmatically. …

## The Vision: A One-Shot Launcher
…
![Claude asking design questions during the pairing session](images/frame-01.jpg)

One important infrastructure note: Studio runs on `bfflist.dev`, which is a 2 GB DigitalOcean droplet …
```

Published `blog/2026-08-15-building-an-automated-ai-video-editing-pipeline-with-claude.md`:

```md
---
slug: building-an-automated-ai-video-editing-pipeline-with-claude
title: 'Building an Automated AI Video Editing Pipeline with Claude'
authors: [bffless-team]
tags: [apps, features]
image: /img/studio-one-shot-05.jpg
description: 'Vibe-coding Studio One-Shot: a small BFFless frontend that uploads a raw video and dispatches a GitHub Action, which drives the Studio app headlessly with Playwright to cut the video, generate a blog post, and create an AI thumbnail — no babysitting required.'
---

What if you could upload a raw video, fill in a few fields, click **Submit**, and walk away … using Claude, [BFFless](https://bffless.dev/), and [GitHub Actions](/deployment/github-actions/).

The existing [Studio app](/blog/walkthrough-of-the-studio-ai-video-editing-app/) already handles AI-driven video editing … a Playwright-based GitHub Actions workflow that drives Studio programmatically. …

<YouTubeEmbed id="TFKGedjVbtE" title="Building an Automated AI Video Editing Pipeline with Claude" />

<!-- truncate -->

## The Vision: A One-Shot Launcher
…
![Claude asking design questions during the pairing session](/img/studio-one-shot-01.jpg)

One important infrastructure note: Studio runs on `bffless.dev`, which is a 2 GB DigitalOcean droplet … A 1 GB droplet is not enough for [server-side FFmpeg](/features/server-video-ops/) …
```

What changed: frontmatter completed (slug/authors/tags/image, description rewritten
as a hook); H1 dropped; embed + truncate after the intro; absolute docs links →
root-relative with trailing slash; the product site link left absolute; first
mentions of Studio, GitHub Actions, pipelines, rules as code, server video ops linked
to their docs/blog pages; images renamed to `static/img/studio-one-shot-NN.jpg`;
`bfflist.dev` transcription error fixed; body otherwise kept as written.
