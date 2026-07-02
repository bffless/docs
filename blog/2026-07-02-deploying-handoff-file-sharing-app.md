---
slug: deploying-handoff-file-sharing-app
title: "Deploying Handoff: A BFFless File-Sharing App with Claude"
authors: [bffless-team]
tags: [apps, features]
image: /img/handoff-04.jpg
description: A complete walkthrough of deploying Handoff — a Dropbox-like file-sharing app built on BFFless — from GitHub and AWS S3 setup to letting Claude handle the deployment over MCP, plus per-folder permissions and signed share links.
---

Handoff is a Dropbox-like file-sharing app built on top of BFFless: upload docs, prototypes, and HTML, organize them into a folder tree, control who can see each folder, and hand them off to a team. HTML uploads render **live** in the browser rather than just downloading, and every folder can be shared with specific users or handed to an AI assistant running on a VPS via a short-lived signed link.

In this walkthrough we'll deploy Handoff end to end — wiring up GitHub and AWS, migrating storage to S3, and then handing the actual deployment to Claude over an MCP connection.

<YouTubeEmbed id="rLE7baWKBp8" title="Deploying Handoff: A BFFless File-Sharing App with Claude" />

<!-- truncate -->

## Setting the Stage: GitHub and MCP

The first step is establishing credentials and environment variables. Inside the BFFless admin dashboard, we generate a global API key dedicated to our GitHub and Model Context Protocol (MCP) integrations. With the key in hand, we fork the [`bffless-apps`](https://github.com/bffless/apps) repository on GitHub.

In the forked repository's settings, we create a repository **secret** named `BFFLESS_API_KEY` to securely store the token, and a repository **variable** called `BFFLESS_URL` that points to our BFFless backend domain.

<img src="/img/handoff-01.jpg" alt="Configuring the BFFLESS_URL repository variable in GitHub" />

Next, we configure the MCP server locally. By grabbing the MCP server code from the documentation and updating it with our domain and API key in VS Code, we give Claude direct, authenticated access to our BFFless instance. A quick test prompt confirms Claude can connect to the backend and read the current project state.

## Migrating Storage to AWS S3

By default, a fresh BFFless server uses the local file system for storage. For a file-sharing app like Handoff, we want cloud storage instead.

Navigating to the infrastructure settings in the BFFless admin panel, we start a storage migration. Over in the AWS console, we provision a new S3 bucket for the app, then create a dedicated IAM user with a custom JSON policy that restricts permissions strictly to that bucket.

<img src="/img/handoff-02.jpg" alt="Migrating BFFless storage from the local file system to AWS S3" />

After generating access keys for the IAM user, we paste the bucket name and credentials back into the BFFless migration wizard. Once the migration completes, the storage provider is switched to AWS — every file uploaded through Handoff now lands straight in the S3 bucket.

## Letting Claude Take the Wheel

With the repository cloned locally and the MCP connection active in the correct directory, we can hand the heavy lifting to Claude. We prompt it to explore the repository and create the Handoff app on our target domain, noting that the MCP connection, AWS bucket, and GitHub secrets are all configured.

<img src="/img/handoff-03.jpg" alt="Claude using the MCP connection to deploy the app" />

Claude immediately invokes the `install-app` skill included in the repository. It reads the getting-started docs, scans the proxy rules, and uses the MCP connection to check the current state of the BFFless instance. It verifies the wildcard route exists and prepares to build out the project and data tables.

## Configuring CORS

During deployment, Claude spots that because the app uploads files directly from the browser to the S3 bucket, we need Cross-Origin Resource Sharing (CORS) rules on the bucket.

To resolve this, we run a quick AWS CLI command (`put-bucket-cors`) against the bucket, passing a JSON configuration that allows `PUT` requests from the app's origin. Once we confirm the CORS rules are applied, Claude finalizes execution and completes the deployment.

## Exploring the Handoff App

With deployment finished, we can open the live Handoff app. The interface has a clean folder tree on the left and a content viewing area on the right. After a minor schema adjustment to make certain database columns optional, folder creation and drag-and-drop uploads work flawlessly.

<img src="/img/handoff-04.jpg" alt="The deployed Handoff app showing an uploaded file" />

When a file is uploaded, it renders directly in the app. One standout feature is generating **share links** straight from the dashboard. When someone opens a share link, the app issues a `302` redirect to a signed AWS URL that stays valid for five minutes — a clean way to pass files to external services or AI assistants without transferring them manually over SSH.

## Managing Access and Proxy Rules

Under the hood, the app relies on **proxy rules** defined in the BFFless admin dashboard. These act as functions that serve content out of the S3 bucket's subdirectories, so files are never publicly accessible by default.

To demonstrate onboarding, we enable public signups in the BFFless authentication settings. A new user starts with restricted access — they can view the interface but cannot upload or create folders.

<img src="/img/handoff-05.jpg" alt="Sharing a folder with another user and setting view permissions" />

As the app owner, you can share specific folders with those users, granting view-only permissions. If a user needs to upload or delete content, an administrator can promote their account role in the BFFless user management panel. The result is straightforward access control: files stay secure while collaboration stays flexible.

## Try It Yourself

Handoff is open source and built to run on top of BFFless. Everything above — the project, data tables, proxy rules, and permissions — is provisioned by the `install-app` skill and MCP connection, so the fastest path is to fork the repo, wire up your API key, and let Claude do the setup.

You can find the source on GitHub at [github.com/bffless/apps](https://github.com/bffless/apps).
