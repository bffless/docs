---
slug: walkthrough-of-recall-a-custom-rag-video-search-app
title: 'Walkthrough of Recall: A Custom RAG Video Search App'
authors: [bffless-team]
tags: [apps, features]
image: /img/recall-walkthrough-01.jpg
description: 'Recall is a custom application built on the BFFless platform that uses Retrieval Augmented Generation to search video transcripts and jump to exact timestamps via direct queries or AI chat.'
---

As a library of tutorial videos grows, finding the exact moment where you explained a specific topic becomes increasingly difficult. Scrolling through dozens of recordings hoping to stumble on the right segment is not a sustainable workflow. **Recall** is a custom application designed to solve that problem. It indexes the full text of every video and lets you search across the entire catalog, returning links to the precise timestamps where your query matches best.

<YouTubeEmbed id="c1Df4i9WnCA" title="Walkthrough of Recall: A Custom RAG Video Search App" />

<!-- truncate -->

![The Recall homepage showing indexed videos with thumbnails](/img/recall-walkthrough-01.jpg)

Recall is powered by **RAG — Retrieval Augmented Generation**. In practice, that means every video's transcript is vectorized and stored in a database. When you search, your query is also vectorized and compared against those stored vectors to surface the closest matches. The app was built on top of the [BFFless platform](https://bffless.dev/) and was created in under a day thanks to the features the platform already provides out of the box — a Postgres database, a VectorDB plugin, [AI chat](/features/chat/) integration, and [proxy rules](/features/proxy-rules/) for the backend.

The UI is intentionally minimal. The goal is to keep it as a clean blank slate that others can fork, eject, and customize to fit their own use case without having to strip away opinionated styling first.

## Searching with Direct Search

Recall offers two ways to find content: **direct search** and **chat**. Direct search is the more straightforward of the two. You type a natural-language query — for example, "Cloudflare onboarding setup" — and hit search.

![Direct search results for "Cloudflare onboarding setup"](/img/recall-walkthrough-02.jpg)

Behind the scenes, the query is sent to Replicate, which vectorizes the input text. The resulting vector — a JSON array of numbers — is then used to perform a similarity search against the Postgres database that ships out of the box with BFFless. The platform's VectorDB plugin handles the heavy lifting: during the initial upload and processing of each video, the transcript text was indexed through VectorDB, so every segment is already stored as a vector ready for comparison.

The search returns a list of matching segments, each linked to the exact point in the source YouTube video. Clicking a result opens the video at that timestamp. If you want more context, you can navigate to the full video page within Recall, which displays the entire transcript. Every line in the transcript is clickable, letting you jump to that specific moment in the video.

![A video detail page showing the full transcript with clickable timestamps](/img/recall-walkthrough-03.jpg)

This makes Recall especially useful when you vaguely remember covering a topic but cannot recall which video it was in. You search, find the exact point in time, grab the link, and share it with someone — or save it for your own reference.

## Searching with Chat

The second search mode is an AI-powered **chat interface**. Instead of getting a flat list of results, you can have a conversation. Typing something like "How to get started with Cloudflare setup" triggers the same vector search under the hood, but the results are fed into a chatbot that presents them conversationally — summarizing the relevant segments and providing clickable links to the matching video moments.

![The chat interface responding with Cloudflare setup guidance and video links](/img/recall-walkthrough-04.jpg)

The chat integration leverages the [AI SDK chat](/features/chat/) functionality that was already available on the BFFless platform. The chatbot receives the matched transcript segments as context, so its responses are grounded in actual video content rather than general knowledge. You can click any of the provided links to jump straight into the referenced video.

## Indexing a New Video

The admin side of Recall — which is behind authentication while the main search interface is public — is where new videos are indexed. The workflow demonstrated in the video starts by grabbing a YouTube URL from YouTube Studio and downloading the video file.

![The admin video list alongside YouTube Studio](/img/recall-walkthrough-05.jpg)

Once the video file is downloaded, it gets uploaded into Recall's admin interface. The upload triggers two processing steps:

1. **Frame extraction** — The system pulls frames from the video to generate thumbnail images. These thumbnails appear alongside search results, giving you a visual preview of what the video looks like at each matched timestamp.

2. **Audio transcription** — The audio track is extracted and sent through a Replicate pipeline that converts speech to text, returning every word with its corresponding timestamp. The result is a full transcript — in the demonstrated example, roughly 2,000 words.

![Transcript preview after processing, ready to publish](/img/recall-walkthrough-06.jpg)

After reviewing the transcript, you hit **Publish**, which kicks off the vectorization step. The text content is broken into segments, each segment is vectorized, and the vectors are stored in the database. From that point on, the new video is searchable.

To verify, searching for a term like "FFmpeg CORS" immediately returns results from the freshly indexed video, linking to the exact moment where FFmpeg and CORS headers are discussed.

## Deployment and Customization

Recall is installable on BFFless via [one-click install](/features/app-catalog/). After installation, all of your data lives in your own BFFless backend — the Postgres database, the vectorized content, and the video metadata.

![The BFFless admin dashboard showing Recall installed](/img/recall-walkthrough-07.jpg)

The app is publicly available and designed to be customized. If you have a similar use case — or even a different one that could benefit from RAG-powered search over text content — you can fork the project, perform a one-click install, and then eject from the admin dashboard to modify the code for your specific needs. The backend is driven by [proxy rules](/features/proxy-rules/), making the architecture straightforward to understand and extend.

The plan is to continue enhancing Recall with additional features and UX improvements while keeping the core intentionally simple — a solid foundation others can build on top of.
