---
slug: vibe-coding-an-inline-comment-feature-for-handoff-with-claude
title: 'Vibe-Coding an Inline Comment Feature for Handoff with Claude'
authors: [bffless-team]
tags: [apps, features]
image: /img/handoff-comments-06.jpg
description: 'A developer builds a Google Docs–style inline commenting system for the open-source Handoff app using Claude, navigating architectural decisions, debugging deployment issues, and shipping the feature overnight.'
---

Handoff, the open-source file-sharing app built on [BFFless](https://bffless.dev/), just gained a Google Docs–style inline commenting system — designed, implemented, and shipped in roughly one overnight Claude session plus a morning of debugging. This post walks through the whole process: defining the feature, making the architectural calls, kicking off autonomous execution, and fixing the bugs that surfaced in testing.

<YouTubeEmbed id="zgT5yMvOpag" title="Vibe-Coding an Inline Comment Feature for Handoff with Claude" />

<!-- truncate -->

## Why Handoff Exists

Recent news about privacy leaks in Claude artifacts has highlighted a real concern: when you create a shareable artifact on Anthropic's platform, your conversations and content may end up indexed by Google. If you share a link, you're effectively sharing publicly. While some have been alarmed by this, it's really the expected behavior of a share link — the same way a Google Docs link works.

But this is exactly the kind of problem that motivated the creation of **Handoff**, an open-source app built on top of BFFless. Handoff gives you full control over how your static content — HTML pages, Markdown documents, images — is shared. You own the hosting, you own the [authorization](https://docs.bffless.dev/features/authorization/), and you don't have to rely on a third party to manage access to your artifacts.

At its core, Handoff works like a Dropbox-style sharing application. You can drag and drop screenshots, upload documents, copy a link, and share it — even pasting it into a Claude session on a VPS so the AI can pull down and read an image. Folders can be public or private, and private folders support [share links](https://docs.bffless.dev/features/share-links/) with tokens so you can grant access to specific people without making the content fully public. The other option is to restrict access to signed-in users only.

![The Handoff file browser showing folders and uploaded files](/img/handoff-comments-01.jpg)

Handoff also renders Markdown beautifully, similar to GitHub. You can view the raw source or a rendered version, which makes it a clean way to review specs, plans, and documentation.

## Defining the Comments Feature

With the basics of Handoff covered, the goal for this session was ambitious: vibe-code a brand-new inline commenting system, similar to Google Docs, using Claude. The challenge is significant because of how Handoff is architected. Documents are displayed inside an iframe — there's a parent frame with controls (the header, navigation) and a child iframe containing the actual content. Comments need to live in the parent layer, on top of the iframe, but visually align with the section of content the user is referencing.

The requirements laid out for Claude were detailed:

- Users should be able to select text in an HTML or Markdown document and attach a comment to that selection
- For images, comments should anchor to an X/Y percentage position (a pin on the image)
- Comments should scroll alongside the content, aligning with the referenced section — a true Google Docs–style experience
- No build-time injection into the content; the solution must work at render time using same-origin iframe access
- The feature needs new [pipelines](https://docs.bffless.dev/features/pipelines/), new rules-as-code, and a new database schema to persist comments
- Only logged-in users with view privileges can write comments
- Users can edit and delete their own comments, but not anyone else's
- V1 should include replies, threads, resolve/reopen, and emoji reactions

That last point was a moment of temptation — the developer initially wanted to keep it simple, but couldn't resist going all-in on the feature set.

## Architectural Decisions with Claude

Claude asked a series of sharp clarifying questions that shaped the architecture. One key question: _What should the comment anchor to in the document?_ This is the core design decision that determines how precise the Google Docs feel is and how much iframe communication is needed. For HTML and Markdown, text range selection was chosen. For images, a pin at X/Y percentage coordinates.

Another important question: _When a document is replaced with new content, what should happen to existing comments?_ The answer was fuzzy re-anchoring plus orphaning — a pragmatic choice, though one that could break comments if the document changes significantly.

On visibility: should anonymous share-link viewers see comments? The initial instinct was no — comments are internal review chatter, and share links should present a clean view. But on reflection, the developer decided this should be configurable.

A crucial architectural win: because Handoff serves everything on the same origin, the iframe communication problem largely disappears. There's no need for `postMessage` or CORS headers. The parent can directly access the child iframe's document via same-origin access, and the child can reference `window.parent`. Markdown renders inside a `srcdoc` iframe (unsandboxed, same host), so it's treated as same-origin. Images aren't iframed at all.

![Claude's clarifying questions about the comment feature architecture](/img/handoff-comments-02.jpg)

## Generating the Spec and Kicking Off Execution

Once the design decisions were locked in, Claude wrote a full specification document. Rather than just viewing it in a code editor, the developer used Handoff itself to host the spec — creating a new `specs` folder and instructing Claude to upload the finished document there. This is enabled by a [skill](https://docs.bffless.dev/features/claude-code-plugin/) (essentially a Handoff API integration) that teaches Claude how to log in and upload files.

![The rendered spec document viewed inside Handoff](/img/handoff-comments-03.jpg)

Reviewing the spec inside Handoff perfectly illustrated the feature's value. The developer wanted to leave feedback — "this goal is wrong," "this section needs work" — but had no way to do it inline. The whole point of building comments was to enable exactly this workflow: review a document, leave comments anchored to specific sections, and tell a collaborator (or Claude itself) to go check the feedback and refine.

After the spec came the implementation plan, also uploaded to Handoff. With both documents in place, the developer kicked off execution using Claude's sub-agent driven mode. This is a heavyweight operation — Claude breaks the plan into tasks and executes them via sub-agents. The estimate was a couple of hours, so the developer went to watch baseball, went to bed, and came back in the morning.

## Reviewing the PR

Overnight, Claude had completed the work: a feature branch with 21 commits, backend rules-as-code deployed automatically, and a summary of what shipped. The next step was raising a pull request.

![The PR on GitHub showing 48 changed files](/img/handoff-comments-04.jpg)

The PR was substantial — 48 file changes. The backend changes included new rules for creating, reading, updating, and deleting comments, plus a new schema for comment storage. There were extensive front-end changes for the comment UI components, and updates to the viewer.

The developer wanted to test the feature before merging, which meant setting up an isolated preview environment. The [GitHub Actions](https://docs.bffless.dev/deployment/github-actions/) deploy pipeline didn't have a pull-request trigger, so a one-off setup was needed: creating a new [proxy rule](https://docs.bffless.dev/features/proxy-rules/) set for the preview branch and attaching it to a preview alias. This process involved some friction — merge conflicts slowed things down, and resolving four conflicts consumed significant tokens and time.

## First Test and the Timestamp Bug

With the preview deployed, the first test began. The comment UI appeared — a small comment icon in the header. But clicking it immediately returned a 404 error. The issue turned out to be an alias mapping problem: the GitHub Action was setting proxy rule sets to `handoff` and `handoff-rss-feed` (the production aliases) instead of the custom preview alias. After some debugging and manual correction, the API started responding.

The commenting interaction itself was impressive. Double-clicking text in the document opened a comment dialog, anchored to the selected passage. The developer typed "this is critical" and posted the comment. It worked — but the timestamp read "57 years ago."

![The comment UI showing a posted comment with the incorrect timestamp](/img/handoff-comments-05.jpg)

Despite the timestamp bug, the feature set was clearly working. Emoji reactions (thumbs up, heart) were functional. Comments could be marked as resolved and reopened. Replies threaded correctly. The text highlight showed exactly where the comment was anchored. Edit and delete worked for your own comments.

## Fixing Bugs and Shipping

Several issues needed attention before merging:

- **Timestamp bug**: Comments displayed "57 years ago" instead of the correct relative time. Claude identified and fixed the issue.
- **Deleted comment husks**: When a comment was deleted, it still appeared in the UI as "unanchored," and attempting to interact with it produced a 400 error. The fix was to stop rendering deleted comments entirely.
- **Quote formatting**: Reply text was visually merging with the quoted content, making it hard to distinguish. A UI cleanup resolved this.
- **Alias mapping in CI**: The GitHub Action was overwriting preview proxy rule sets with production values on each push. Claude updated the workflow to compute preview identifiers and sync proxy rules correctly for PR branches.

The developer also filed issues against the BFFless CE itself for the alias-mapping behavior discovered during testing — a case where the admin panel appeared to show stale data, leading to confusion about whether rules were properly attached.

After the fixes landed, a final round of testing confirmed everything worked cleanly. Deleting a comment removed it from the UI entirely. Adding a new comment anchored correctly. The feature was ready.

![The final working comment feature with a comment anchored to selected text](/img/handoff-comments-06.jpg)

## Merge and Deploy

With the bugs squashed, the PR was merged and the branch deleted. Claude cleaned up the temporary preview proxy rule sets, folding the comment rules back into the main `handoff` rule set. The pipeline ran, and the feature went live.

![The merged PR and completed pipeline](/img/handoff-comments-07.jpg)

The final production test confirmed everything: navigating to a report in Handoff, clicking the comments button, selecting text, and posting a comment — all working smoothly.

## What This Means for Handoff

This commenting feature transforms Handoff from a simple file-sharing app into a collaborative review tool. The immediate use case is reviewing AI-generated documents — specs, plans, reports — and leaving inline feedback that Claude can later read back. Instead of copying text into a chat and saying "this part is wrong," you can anchor a comment directly to the section in question and tell your collaborator (human or AI) to check the feedback.

The session also surfaced real bugs in both the Handoff app and the BFFless CE platform itself, which is part of why the developer builds on Handoff — using the app in anger makes the platform better. The whole process, from defining the feature to shipping it, took roughly one overnight Claude session plus a morning of debugging and polish — a testament to what vibe coding with a capable AI can accomplish, even for complex features involving iframe communication, database schema design, and full-stack deployment pipelines.

Handoff is part of the [BFFless apps repository](https://github.com/bffless/apps) — clone it and deploy it on your own BFFless instance.
