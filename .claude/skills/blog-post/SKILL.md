---
name: blog-post
description: Turn a Studio-generated blog post zip (from handoff.bffless.dev) into a published-ready post on the BFFless docs site (docs-public). Use this whenever the user shares a handoff.bffless.dev zip link or /tree/blog folder, says "new blog post", "publish this post", "here's the blog zip for the video", or wants an existing draft post formatted, cross-linked, or given its YouTube embed. Covers download, frontmatter, image import, YouTube embed, internal docs cross-linking, copy touch-up, build verification, and the PR.
---

# Blog post from a Handoff zip

The author records a video, runs it through the Studio app, and Studio emits a zip
(`post.md` + `images/frame-NN.jpg`) into the Handoff folder
`https://handoff.bffless.dev/tree/blog`. Your job is everything between that zip and
a merged PR on `bffless/docs`: format it to the site's conventions, embed the YouTube
video, wire it into the rest of the docs, and make sure it builds. The result should
be indistinguishable from the hand-finished posts already in `blog/` — read the most
recent one or two before you start so the target is concrete, not abstract.

## 1. Get the zip

- Direct link (`https://handoff.bffless.dev/r/<id>/<name>.zip?token=…`): download and
  extract with the bundled script — the VPS has no `unzip`, so it uses Python:
  `python3 .claude/skills/blog-post/scripts/fetch_handoff_zip.py "<url>" <scratchpad>/post`
  Quote the URL (it contains `?token=`).
- Only a folder link or "grab the latest": list the folder through the Handoff API
  (`bffless-apps:handoff-api` skill; `BFFLESS_API_KEY` is set on this box, base URL
  `https://handoff.bffless.dev`), pick the newest zip, confirm the pick with the user if
  more than one is plausible.
- The zip's `post.md` has `title`/`description` frontmatter, an H1, body with `##`
  sections, mermaid blocks, and `![alt](images/frame-NN.jpg)` figures.

## 2. Ask the one question you must ask — early, in one batch

The YouTube video ID is the thing you cannot derive. If the user did not supply an ID
or link, ask for it **once, up front**, and fold any other real decisions into the same
question so there is a single round trip (the user is often AFK): e.g. cover-image
choice when no frame is obviously the hero, or a tag when none fits. Accept any form —
`https://youtu.be/ID`, `watch?v=ID`, `/shorts/ID`, `/live/ID`, bare 11-char ID — and
extract the ID. Do all the work that does not depend on the answer while waiting;
leave `<YouTubeEmbed id="TODO" …/>` in place only until the answer arrives, never in
the PR.

Do **not** ask about things with an obvious answer: date (today), author
(`bffless-team`), slug (from the zip name), image naming — decide and report.

## 3. Build the file

Create `blog/YYYY-MM-DD-<slug>.md` (today's date; slug = the zip's basename, which is
already the kebab-cased title). Frontmatter, matching existing posts exactly:

```yaml
---
slug: <slug>
title: '<Title in Title Case>'
authors: [bffless-team]
tags: [apps, features]          # only keys from blog/tags.yml; add a new key there if truly needed
image: /img/<prefix>-NN.jpg     # hero — see images below
description: '<one or two sentences, ~150–200 chars, rewritten for a reader deciding whether to click>'
---
```

- If two posts would land the same day and ordering matters, add `date: YYYY-MM-DDTHH:MM`
  (see the content-pipeline post) — otherwise omit `date`.
- Drop the H1 — Docusaurus renders the title. Keep the intro paragraph(s).
- Insert the embed after the intro (before the first `##`), then the truncate marker:

  ```mdx
  <YouTubeEmbed id="<ID>" title="<Title>" />

  <!-- truncate -->
  ```

  `YouTubeEmbed` is registered globally in `src/theme/MDXComponents.tsx`; `.md` files
  are MDX here so no import. Optional `start={seconds}` exists for chaptered links.
  The truncate marker controls the blog index excerpt — everything above it is the
  teaser, so make sure the intro reads well standing alone.

## 4. Images

- Copy `images/frame-NN.jpg` → `static/img/<prefix>-NN.jpg` where `<prefix>` is a short
  topic name (2–3 words: `studio-one-shot`, `handoff-comments`, `rag-video-search`),
  not the full slug. Keep numbering. Rewrite every `![alt](images/frame-NN.jpg)` to
  `![alt](/img/<prefix>-NN.jpg)`; keep the alt text, it doubles as a caption.
- `image:` (social card) defaults to the most striking frame — a finished result, generated
  thumbnail, or the app's UI — rather than a terminal or chat screenshot. Only when no
  frame works as a hero, fall back to the video's own thumbnail:
  `curl -sL https://img.youtube.com/vi/<ID>/maxresdefault.jpg -o static/img/<prefix>-cover.jpg`
  (`hqdefault.jpg` if that 404s). Say which you picked, and why, in the PR body.
- Frames run 300–700 KB; that is normal here. Only worry if something is >1.5 MB.
- Sanity-check each frame's alt text against what the surrounding prose says it shows;
  Studio occasionally mislabels a frame.

## 5. Cross-link into the docs site (this is where most of the value is)

Run `.claude/skills/blog-post/scripts/link_targets.sh` — it prints every docs route and
blog slug with its title (and the tag vocabulary). Then:

- **Convert absolute self-links.** `https://docs.bffless.app/...` and
  `https://docs.bffless.dev/...` become root-relative routes (`/features/pipelines/`).
  Bare `https://bffless.dev/` (the product site) stays absolute.
- **Link the first substantive mention** of any concept the docs cover: pipelines,
  proxy rules, rules as code, app catalog / one-click install, GitHub Actions
  (upload-artifact etc.), authorization/roles, chat, share links, traffic splitting,
  the Claude Code plugin/skills, MCP server, server video ops, storage backends,
  Cloudflare/Umbrel/DigitalOcean setup, and so on. Prior blog posts count too — a
  mention of Studio, Handoff, Recall, or an earlier session should link to that post.
- Link naturally on the noun phrase already in the sentence; do not add "see also"
  clutter or link the same target repeatedly. Two to eight links per post is typical.
- **Every internal link ends with a trailing slash** — `/features/pipelines/`, and for
  anchors `/getting-started/setup-wizard/#step-2`. `trailingSlash: true` makes this the
  canonical URL and the build's broken-link check (`onBrokenLinks: 'throw'`) does not
  forgive typos, so copy routes from the script output rather than typing them.
- If a link points at a docs page that would obviously benefit from linking back (a
  new app walkthrough that the App Catalog page should list, say), mention it in the
  PR body as a follow-up rather than silently widening the change.

## 6. Touch up the copy — the transcript's facts, the author's voice, no AI slop

The prose came from a transcript run through a model, so it arrives with two kinds of
damage: transcription errors, and model tics. Fix both without rewriting the post.

**Facts.** ASR misspellings of product and brand names (`bfflist.dev` → `bffless.dev`,
`Nano Banana`, `Playwright`, model names), wrong or invented attribution ("Anthropic
Superpowers" — Superpowers is not an Anthropic product), domains that should match reality
(`oneshot.bffless.dev`, `admin.bffless.dev`), API names that a transcript mangled
(`utils.randomUUID` → `crypto.randomUUID`). Verify against the docs and the video title;
ask only if a claim looks off *and* matters.

**Intro.** The teaser above `<!-- truncate -->` is what the blog index shows. Two short
paragraphs, 40–150 words, saying what was built or learned and why a reader should care.
Cut throat-clearing ("In this post we will…") and generic scene-setting.

**Voice — this is where the model tics live.** The author wants posts that read like a
person telling you what happened, so strip these even though older posts in `blog/`
contain them (they predate this rule):

- **Em dashes.** None in prose. Rewrite each one as a comma, a colon, a period, or
  parentheses, and re-read the sentence so it still flows; don't do a blind substitution.
  (Mermaid labels and code are exempt.)
- **Filler and marketing words**: delve, leverage, utilize, seamless, robust,
  game-changer, unlock, empower, elevate, harness, landscape, crucial, cutting-edge,
  streamline, "deep dive", "it's worth noting", "in today's". Say the plain thing instead.
- **Staccato for effect.** No "The problem? … The culprit? …" fragments, no paragraph
  that lands on a punchy four-word sentence, no "But here's the thing." Cap rhetorical
  questions at a couple per post; most should become statements.
- **Bold-lead bullet parades** (`- **Foo** — description`) as a substitute for prose:
  fine for a real list of fields or steps, not for narrative.
- **Boilerplate closers**: "In conclusion", "Overall,", "To sum up".
- Prefer the concrete verb and the specific noun; keep the author's asides and admissions
  of what went wrong, they are the voice.

**Substance.** Make sure the post leaves the reader with things to act on: the command,
the settings path, the gotcha and its fix, the design decision and its reason. If the
zip glossed over a step the video clearly showed, add the one line that makes it
reproducible; do not add content the video did not cover.

**Ending.** Close with a clear call to action, one or two sentences with a link: clone
the repo, install the app from the [catalog](/features/app-catalog/), read the specific
docs page, watch the next episode, open an issue. A closing sentiment about open platforms
is not a CTA. If the post has no natural next step, ask the user for one in the step 2 batch.

**Keep**: section structure, mermaid diagrams (check each has a valid type keyword and
balanced quotes; a bad one fails the build), quotes, image placement.
`evals/grade.py <post.md>` runs the scripted version of these rules; step 7 makes an
independent agent run it plus the judged rubric before you call the post done.

## 7. Verify: build, then an independent quality check

- `pnpm build` from the repo root is the hard gate: broken internal links, mermaid
  syntax, MDX parse errors all fail here. Fix and re-run until clean.
- Then **spawn a fresh agent to grade the post** (Agent tool, general-purpose). It must
  not be you: you have been staring at the prose for an hour and will read what you
  meant, not what is on the page. Give it only the file path and this prompt:

  > Grade `<repo>/blog/<file>.md`. First run
  > `python3 <repo>/.claude/skills/blog-post/evals/grade.py <file>` and report every
  > FAIL line verbatim. Then read `<repo>/.claude/skills/blog-post/evals/rubric.md` and
  > judge each of its six items PASS/FAIL, quoting the sentence(s) that decided each
  > verdict. Do not edit the file. Return the scripted FAILs and the rubric verdicts
  > with evidence, nothing else.

- **You (the writing agent) fix what it flags**, in this file, then re-run `grade.py`
  yourself and, for rubric failures, spawn a fresh grader again. Repeat until the
  scripted checks are all PASS and the rubric has no FAIL. Two or three rounds is
  normal; if a rubric item keeps failing, the fix is usually structural (the intro
  is buried, there is no next step to point at), so change the post, not the grader.
  Only if a check is genuinely wrong for this post (a quoted transcript line that
  legitimately contains an em dash, say) note the exception in the PR body.
- Optional visual check: `pnpm serve` (or `pnpm start`) and screenshot
  `/blog/<slug>/` with `/home/rico/bffless/localdev-tools/shot.mjs` to eyeball the
  embed, hero image, and diagrams. Expected local noise: the blog-likes `/api` call
  fails and GA is blocked; those are not bugs.

## 8. Ship

- Branch `blog/<short-name>` off `main`; add the post + `static/img/<prefix>-*.jpg`
  (+ `blog/tags.yml` if changed).
- Commit message and PR title: `blog: <title in sentence case>`. PR body:

  ```
  ## Summary
  - New blog post: **<Title>** — <one-line what it is>.
  - YouTube embed `<ID>`, N frame images under `static/img/<prefix>-*.jpg`, cover = <which>.
  - <links converted / notable fixes, e.g. transcription typos>.

  ## Verification
  - `pnpm build` passes (broken-link check + mermaid render).
  ```

- **Ask before committing/pushing** (repo rule); show the file list and PR body, then
  `gh pr create`. Merging to `main` deploys to production via the Deploy workflow; PRs
  get a preview deployment — share the preview URL when it appears.

## Reference

`references/before-after.md` shows the head of a real zip `post.md` next to the
published result, if you want to see the transformation concretely.
