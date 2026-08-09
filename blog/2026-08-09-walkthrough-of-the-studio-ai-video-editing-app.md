---
slug: walkthrough-of-the-studio-ai-video-editing-app
title: 'Walkthrough of the Studio AI Video Editing App'
authors: [bffless-team]
tags: [apps, features]
image: /img/studio-walkthrough-05.jpg
description: 'A complete walkthrough of installing and using the AI-powered Studio app on BFFless to automatically edit video recordings, generate custom thumbnails, and create matching blog posts.'
---

Editing video is tedious. Scrubbing through footage, cutting dead air, trimming pauses — it can easily take longer than the recording itself. [Studio](/blog/custom-ai-video-editing-app/) is an app that tackles this problem with AI. It is a post-processing tool that analyzes your raw recording, identifies the parts worth keeping, and trims the rest automatically. In this walkthrough we will install Studio on [BFFless](https://bffless.dev/) with a [one-click install](/features/app-catalog/), configure the required API keys, and then run a real video through the entire pipeline — from upload to final export, including a custom AI-generated thumbnail and a companion blog post.

<YouTubeEmbed id="XlPdbxP8a70" title="Walkthrough of the Studio AI Video Editing App" />

<!-- truncate -->

## Installing Studio

The process begins in the BFFless admin panel. From the admin home page you can find the Studio app and kick off a one-click install. Before clicking **Install**, it is important to create a dedicated project for the app. Creating a separate project matters because [permissions](/features/authorization/) are scoped at the project level. By isolating Studio in its own project you can restrict access so that only admin users can reach it, keeping everyone else out.

![The BFFless admin panel showing the Studio app ready for one-click install](/img/studio-walkthrough-01.jpg)

Once you click **Install**, Studio is deployed to its own subdomain (e.g. `studio.bffless.dev`). The install itself is straightforward, but there are several environment variables and integrations to configure before the app is usable.

## Configuring API Keys and Settings

Studio relies on external AI services, so you need to wire up a few tokens before anything will work.

### Replicate

First, head to Replicate and either create a new API token or regenerate an existing one. Back in the BFFless admin, navigate to the **Settings** section of your Studio project and click **Connect Replicate**. Paste the token, test the connection, and save.

### Anthropic

Next, connect Anthropic. The setup page provides a direct link to Anthropic's API key console. Create a new key (a short-lived key works fine), copy it, then return to the BFFless [LLM Providers](/features/ai-pipelines/) section. Click **Add Provider**, choose Anthropic, paste the key, and confirm.

### Cross-Origin Isolation

Studio uses FFmpeg in the browser to do its video processing, and FFmpeg requires certain HTTP headers to function correctly. BFFless makes this easy: on the project home page there is a pre-configured **Cross-Origin Isolation** button. One click sets the necessary headers so you will not run into CORS issues.

### Keeping Studio Private

Because Studio calls paid APIs every time it processes a video, you will want to lock it down. On the home page, toggle the app to **private**, enable **redirect to login**, and **require admin users**. This ensures that only you (or other admins) can access the app and incur costs.

### Hugging Face Token

The final setup step is labeled "optional" in the UI, but it is actually required. One of Studio's [pipelines](/features/pipelines/) performs _speaker diarization_ — distinguishing who is speaking when — and that pipeline needs a Hugging Face token. Sign up for a free Hugging Face account, generate a read-only token, and add it as a secret in BFFless (named `HF_TOKEN`). Without it, the transcription step will fail. Hugging Face does not charge for this; you just need the account.

![The BFFless settings page with the Hugging Face token configured as a secret](/img/studio-walkthrough-02.jpg)

## Uploading and Processing a Video

With configuration complete, click the link to open Studio at your subdomain. The first screen lets you create a new project and choose files to upload. In this walkthrough the source material is a previous 13-minute recording called "Handoff."

> **Tip:** Keep individual recordings under 30–40 minutes. FFmpeg runs in the browser and must transcribe, analyze, and cut the entire video in memory. Longer recordings are significantly harder on the tool. If your session runs long, stop at a natural break and start a new recording — Studio can handle multiple files in a single project.

After uploading, clicking **Show Preview** reveals what Studio has already done behind the scenes: it has the original video, an extracted audio-only track, and a full text transcription. That transcript is what gets fed to the LLM in the next steps.

### Generating Contact Sheets

Clicking **Continue** triggers thumbnail generation. Studio scrubs through the entire video and produces _contact sheets_ — grids of frames sampled roughly seven seconds apart. For a 13-minute video this results in about 10 full contact-sheet images. These give the AI "eyes" into the video: each frame carries a timestamp so the model knows exactly what is happening visually at any given moment.

![Contact sheets generated from the video, showing timestamped frame grids](/img/studio-walkthrough-03.jpg)

### The AI Director

With the transcript and contact sheets in hand, the AI master director analyzes the content and breaks the video into chapters. You can optionally add your own direction, but in this case we simply click **Send AI Director** and let it work.

The director produced five chapters for the Handoff video:

1. Installing Handoff
2. File Permission and Sharing
3. Connecting Claude via API
4. Uploading Markdown with Claude
5. HTML Sites and Backend Overview

Each chapter comes with its own _cutting brief_ — a short description of what the chapter covers and guidance for the sub-directors on what to trim.

## Building the Chapters

The next step is the **Build** phase. You can manually walk through each chapter, but Studio offers an **Auto Build** button that processes every chapter in sequence. For each one it:

1. Cuts the scene from the full video
2. Generates chapter-specific contact sheets
3. Refines the scene (trimming dead space)
4. Assembles and saves the result

Auto Build takes some time — roughly 15 minutes for this 13-minute source video. During this process the browser must stay open because FFmpeg is running client-side, doing all the actual video editing and cutting.

## Reviewing the Edits

Once Auto Build completes, you can review each chapter to see exactly what the AI decided to keep and what it cut. The interface highlights removed segments in purple, making it easy to spot trimmed dead space. Each chapter shows the original duration alongside the trimmed duration — for example, one chapter went from 2 minutes 48 seconds down to 1 minute 51 seconds.

If you disagree with any cut, you can edit it manually. The full clip is available at the bottom of each chapter for reference.

![The edit review screen showing purple-highlighted cuts in the timeline](/img/studio-walkthrough-04.jpg)

## Exporting the Final Video

Continuing to the **Export** step, Studio stitches all the trimmed chapters together into a single video. The 13-minute original was cut down to 9 minutes and 22 seconds. The export step also generates a custom title, writes a video description, and assigns chapter timestamps — which are especially useful for YouTube, where they appear in the progress bar.

### Generating a Thumbnail

Studio can also generate a thumbnail for the video. You start by drafting a prompt — in this case, selecting a "tutorial template" from the available skills. There are different templates you can customize, though the details of the skills system are beyond the scope of this walkthrough.

What makes the thumbnail generation interesting is the ability to upload a reference photo. Here, a quick selfie was taken via Photo Booth, saved to the Downloads folder, and then uploaded into Studio. The prompt was refined to instruct the AI to "stitch in the person from the photo to the thumbnail." The AI then composited the person into its usual sketch-style tutorial thumbnail — a nice touch that personalizes the result without manual image editing.

![The AI-generated thumbnail with the creator's likeness stitched into a tutorial-style design](/img/studio-walkthrough-05.jpg)

## Generating a Blog Post

The last feature demonstrated is automatic blog post generation. With one click on **Generate**, Studio creates a full blog post based on the video's content — no additional direction needed. The generated post includes a title, written prose, and embedded screenshots pulled from the video frames.

The screenshots are not always perfect, though. Studio lets you scroll through nearby frames (about 30 seconds ahead and behind the selected moment) to pick a better one. For instance, if a screenshot is supposed to show the admin panel's one-click install dialog but the selected frame is not quite right, you can browse alternatives and swap it in.

Once you are happy with the images, clicking **Download Bundle** gives you a zip file containing all the selected images alongside the Markdown version of the blog post. This makes it easy to publish: link to the blog from the video description, and link back to the video from the blog. It is great for viewers who prefer reading, and it gives you a place to include copyable code snippets that would otherwise be trapped in a screenshot.

![The blog post editor with adjustable screenshot frames and download bundle option](/img/studio-walkthrough-06.jpg)

## Browser Compatibility Note

One important caveat: Studio currently only works in **Firefox**. There are known issues with Chrome and FFmpeg's in-browser execution. A banner warning is being added for Chrome users. Hopefully broader browser support will come soon, but for now, Firefox is the way to go.

## Wrapping Up

Studio is an impressive AI post-production tool that handles the most tedious parts of video editing — trimming dead air, generating chapters, creating thumbnails, and even writing companion blog posts. The entire pipeline runs through BFFless with a [one-click install](/features/app-catalog/), and the combination of Replicate, Anthropic, and Hugging Face integrations means the AI does the heavy lifting while you review and refine. If you spend a lot of time editing tutorial or walkthrough videos, this is worth a look.
