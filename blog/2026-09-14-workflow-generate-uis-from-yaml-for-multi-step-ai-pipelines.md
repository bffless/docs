---
slug: workflow-generate-uis-from-yaml-for-multi-step-ai-pipelines
title: 'Workflow: Generate UIs from YAML for Multi-Step AI Pipelines'
authors: [bffless-team]
tags: [apps, features]
image: /img/workflow-yaml-ui-02.jpg
description: 'Workflow is a new BFFless app that lets you define multi-step AI pipelines in YAML and get a GitHub Actions-style UI for free — pipeline, script, island, and form steps, fan-out over scenes, and the full Studio post-production flow as one 540-line file.'
---

Building a polished UI for every new idea is expensive. When you just want to wire a handful of AI steps together — extract audio, transcribe, generate a thumbnail — the last thing you want is to maintain yet another bespoke frontend. **Workflow** is a new app that solves this problem: write a YAML file, and it renders a fully functional, GitHub Actions–style UI for your multi-step pipeline.

<YouTubeEmbed id="BBsTwY_Y1BI" title="Workflow: Generate UIs from YAML for Multi-Step AI Pipelines" />

<!-- truncate -->

## The Problem: Every Pipeline Wanted Its Own UI

A while back I built an app called [**Studio**](/blog/walkthrough-of-the-studio-ai-video-editing-app/). Studio is a post-production tool I use to clean up the screen recordings I publish. It leans on [BFFless pipelines](/features/pipelines/) that call out to Replicate and use a lot of AI to do the heavy lifting — extracting audio, transcribing, cutting scenes, generating thumbnails and blog posts.

![The Studio app showing completed projects](/img/workflow-yaml-ui-01.jpg)

Studio works great for its original purpose. Here's an exported, completed [video on vector databases and RAG](/blog/vector-databases-and-rag-explained-video-search-demo/): it has a description, the stitched-up version with its cuts, a generated thumbnail for the cover, and a blog post. I can upload a raw recording, walk away, and come back to find all of that done.

But the moment I wanted to tweak the process for a different use case — say, summarizing a long YouTube or Twitter video I don't have time to watch — I ran into a wall. LLMs aren't quite able to watch full videos on their own yet, so BFFless extracts all the information out of a video as text and screenshots. The pipeline logic was straightforward, but I didn't want to keep changing my UI or maintain dozens of new frontends for slightly different use cases. I really didn't care about the UI; I just wanted the tool.

That's where **Workflow** comes in.

## Write YAML, Get the UI

Workflow is essentially: write YAML, and the app creates a GitHub Actions– or n8n-like workflow UI for all your different steps.

![The Workflow landing page: "Write YAML, get the UI"](/img/workflow-yaml-ui-02.jpg)

If you've written a GitHub Action, the format should feel familiar. The system has two parts:

- **The harness** — the Workflow application itself. Think of it like GitHub Actions or n8n: it's the runtime and the UI shell.
- **The implementation** — your actual project, defined in a workflow YAML file inside a folder in a repo.

There are **four kinds of steps** in a workflow:

1. **Pipeline** — the backend; a [BFFless proxy rule](/features/proxy-rules/) that does the real work.
2. **Script** — plain JavaScript that executes inline.
3. **Island** — a fully custom UI component.
4. **Form** — a standardized input collector. If you just need to gather a few fields from a user, you declare them in YAML and the UI is generated for you.

![The four kinds of step: pipeline, script, island, form](/img/workflow-yaml-ui-03.jpg)

Each workflow lives as a folder inside a GitHub repo. In my implementations repo I have three folders — `hello`, `capture`, and `workflow-studio` — each defining a separate workflow.

## Walking Through the Hello Example

The simplest way to understand Workflow is the **hello** example. It's a tiny workflow with three steps:

1. **Say the greeting** — a pipeline step that sends a greeting.
2. **A person answers** — a form step that waits for user input.
3. **Echo back** — a pipeline step that echoes the result.

The `ask` step declares that it `needs` the `greet` step, and the `finish` step `needs` both `greet` and `ask`. This dependency graph is rendered visually in the UI.

![The hello workflow rendered in the Workflow UI with three steps](/img/workflow-yaml-ui-04.jpg)

Let's create a run. I type "hello Rico" — Rico being the greatest dog in the world — and kick it off. The first pipeline step fires, and then the workflow pauses at the form step, waiting for input. The form presents a single required text field. Rico, being a dog, says "woof." We submit, the final echo step runs, and the workflow completes.

At any point you can inspect the underlying YAML. Here's what the form step looks like:

```yaml
ask:
  name: A person answers
  needs: greet
  steps:
    - id: ask
      type: form
      description: "The driver parked here. Add a note and continue."
      fields:
        note: { type: string, required: true, label: Note }
  outputs:
    answer: ${{ steps.answer.outputs.note }}
```

Behind the scenes, the pipeline steps call [proxy rules](/features/proxy-rules/). The `hello-echo` rule is a simple function: if you pass an `upper` flag it transforms the text to uppercase; otherwise it just returns the response as-is.

With debug enabled, you can see exactly how each invocation ran. The first call received "hello Rico" and echoed it back. The second call, triggered by the form step, received "woof" and echoed that. Two executions, both visible in the execution logs.

![Execution logs showing the two echo calls](/img/workflow-yaml-ui-05.jpg)

## Scaling Up: Studio as a Workflow

Now let's scale this up to something real. The **Studio** workflow is considerably more complex, but each individual step remains straightforward. The full pipeline, defined in a single YAML file of roughly 540 lines, contains nine jobs:

`per-video` → `plan` → `sheets` → `director` → `per-scene` → `stitch` → and several output steps.

![The Studio workflow map showing nine jobs in a single file](/img/workflow-yaml-ui-06.jpg)

### Audio, Transcript, and Contact Sheets

For each uploaded video, the workflow first pulls out the audio track and transcribes it. Then it generates **contact sheets** — grids of still frames sampled at regular intervals throughout the recording. These contact sheets give the AI "eyes" to understand what's happening visually.

The process has two sub-steps: first, determine how frequently to sample frames (every N seconds), and then actually cut the frames and compose them into sheets.

![A generated contact sheet with 12 frames spaced evenly across the video](/img/workflow-yaml-ui-07.jpg)

Each contact sheet contains 12 images at different timestamps, spaced evenly throughout the video. These are the same kind of contact sheets you might use to give an LLM visual context about a recording.

### The AI Director and Fan-Out

Once the transcript and contact sheets are ready, the workflow passes them to an **AI video director**. This director analyzes the text and images and produces a list of scenes (chapters), along with a brief description of what each scene should contain.

Then comes one of the most powerful concepts in Workflow: **fan-out**. Just like a GitHub Actions matrix strategy, the workflow can say "for each of these scenes, fan out and run these steps in parallel." Each scene gets its own dedicated AI director — a second, more focused pass that examines just that shorter clip and decides exactly what to cut.

![The fan-out stage showing individual scenes being processed](/img/workflow-yaml-ui-08.jpg)

So there are two AI directors working in concert:
- A **big-picture director** that defines the overall scene structure.
- A **per-scene director** that makes fine-grained editing decisions for each individual clip.

After all scenes are processed, the workflow **fans back in**, stitching everything together into the final cut.

### Titles, Blog Posts, and Thumbnails

From the stitched result, the workflow moves to its output steps. It calls Claude to generate a title and description, then produces a blog post. The key insight is that by this point the content has been curated — only the text and images that matter remain, with all the filler stripped away. Claude receives this clean input and generates a blog post complete with screenshots and a summary.

![The blog post output step showing the generated post content](/img/workflow-yaml-ui-09.jpg)

The workflow can also generate a cover thumbnail, and all of these outputs are saved for later use — whether that's publishing directly, feeding into another context, or just archiving.

It's worth noting: the very video being discussed in this walkthrough was itself processed using this same Studio workflow.

## Summary

Workflow is a tool for stitching together [pipelines](/features/pipelines/) and apps without building a custom UI for each one. It's ideal for:

- **Prototyping an idea** — spin up a proof of concept without investing in frontend work.
- **Extending existing workflows** — adapt a pipeline for a slightly different use case by editing a YAML file, not by forking an entire application.
- **Focusing on output over presentation** — when you care about what the pipeline produces, not how the controls look.

The harness lives at [`github.com/bffless/apps` → `apps/workflow`](https://github.com/bffless/apps/tree/main/apps/workflow), the example implementations at [`github.com/bffless/workflow-implementations`](https://github.com/bffless/workflow-implementations), and the install steps in the [app catalog docs](/features/app-catalog/).

It's just a YAML file that lets you define the output you actually want — and skip the part where you build a custom UI you don't need.
