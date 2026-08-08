---
slug: installing-the-handoff-app-and-configuring-claude-access
title: 'Installing the Handoff App and Configuring Claude Access'
authors: [bffless-team]
tags: [apps, features]
image: /img/handoff-install-06.jpg
description: 'A walkthrough of installing the Handoff file-sharing app via BFFless one-click install, managing public and private folders with share links, and granting Claude read/write access through API keys and skills.'
---

Handoff is a file-sharing app built for [BFFless](https://bffless.dev/) that lets you move files back and forth between the cloud and a VPS server. It supports Markdown files, specs, HTML prototypes, and more — think of it as a self-hosted alternative to Claude's Artifacts feature. Instead of uploading assets to Claude's internal file hosting, you keep full control: files go to your own local storage or bucket. In this walkthrough we'll install Handoff with BFFless's [one-click install](/features/app-catalog/), explore its folder and sharing model, and then wire up Claude so it can read _and_ write files directly.

<YouTubeEmbed id="PqLK76JeXX8" title="Installing the Handoff App and Configuring Claude Access" />

<!-- truncate -->

## Installing Handoff with One-Click Install

From the admin homepage of the BFFless app, click **Install** and choose a project. If you already have one from earlier testing, you can delete it and start fresh.

Click **Install** again, choose **New Project**, and name it — in this case, `handoff`. By default the subdomain will match the project name (`handoff`), though you can change it to something else. Click install and within moments the app is ready. You'll get a link to your new Handoff instance.

![The BFFless admin showing the one-click install dialog for a new project](/img/handoff-install-01.jpg)

Once inside Handoff, the first thing to do is create some folder structure. Create a new folder — for example, `tmp`. By default, everything inside your folder is **private**. You can toggle a folder to public, and child folders will inherit that permission.

To demonstrate the permission model, create a subfolder called `private` inside the public parent and explicitly mark it as private. Now you have both a public folder and a private folder side by side, ready for uploading files.

![The Handoff app showing folder structure with public and private folders](/img/handoff-install-02.jpg)

## File Permissions and Sharing

Upload a file into the public folder and another into the private folder. When you view a file, a small header appears at the top with additional options: file details and sharing functionality.

An important distinction: **sharing in Handoff works at the folder level, not the file level.** If you share something, you're sharing the entire folder. However, you can also create a **direct link** to an individual file. This means a file can live in a private folder, but you can still share it with someone via a direct link — without giving them access to the rest of the folder's contents.

[Share links](/features/share-links/) include a token in the URL. If you open a share link in an incognito window, the file loads just fine because the token grants access. But be careful: the share link is public to anyone who has it.

Without the token, trying to load a private file in an incognito window simply won't work — the page is inaccessible. Public folders, on the other hand, are viewable by anyone. You can load a public folder in an incognito window and browse its contents, though you won't be able to delete anything without the proper permissions.

![Viewing a private file's share link options in the Handoff UI](/img/handoff-install-03.jpg)

## Connecting Claude via the BFFless API

The real power of Handoff comes when you connect it to Claude. Maybe you have a screenshot you want Claude to analyze, or you want Claude to upload spec files and HTML prototypes — essentially giving it full access to your file server. Here's how to set that up.

### Authenticating with an API key

Start a fresh terminal session on your VPS. The first step is to configure a BFFless token so Claude has access. Run:

```bash
npx bffless login
```

The command will prompt for an API key. To create one, go to your BFFless admin panel, navigate to **Settings → API Keys**, and click **Create Global API Key**. Give it a name, create it, and copy the value. Paste that key into the terminal prompt, and you're connected.

![Creating a Global API Key in the BFFless admin settings](/img/handoff-install-04.jpg)

### Installing the Handoff API skill

Next, install the Handoff API [skill](/features/claude-code-plugin/) so Claude knows how to interact with the app. This is done with another `npx` command — a skill install at the project level. The exact command is documented in the Handoff app's readme in the [BFFless apps repository](https://github.com/bffless/apps). Once installed, this skill gives Claude the extra context it needs to read from and write to your Handoff instance.

![The bffless-apps GitHub readme showing the skill install instructions](/img/handoff-install-05.jpg)

### Reading files with Claude

To test read access, go back to the Handoff app, grab the link to a public file, and paste it into your conversation with Claude: _"Can you see this file?"_ Claude downloads the file, recognizes it (in this case a YouTube thumbnail image), and renders it fine.

This is the simplest workflow: share a link with Claude and ask it to take a look. It's a great way to share images with Claude running on a VPS — just drop a file into Handoff, copy the public link, and paste it into your session.

## Uploading Markdown with Claude

Reading is useful, but writing is where things get really interesting. Ask Claude to write to a specific directory in Handoff and create a Markdown file — for example, an `example.md`. This mirrors a real-world scenario: you've gone through a planning session or documentation review, Claude has generated a spec file, and you want to save it somewhere accessible without cluttering your project repo.

Claude uses the [skill](/features/claude-code-plugin/) you just installed to figure out the folder ID for the target path (Handoff uses IDs internally) and uploads the file using the token configured during `npx bffless login`.

After a moment, the file is created. Refresh the Handoff UI and there it is — `example.md`. Handoff renders the Markdown beautifully, just like GitHub would. You can view the source, share it, switch back to the rendered view, and even **add comments** directly on the document.

![The rendered Markdown file uploaded by Claude, displayed in the Handoff app](/img/handoff-install-06.jpg)

## HTML Sites and the Backend Overview

Claude can also create full HTML pages. Ask it to build an HTML website example, and it will upload the files into a subfolder labeled as a **site**. This designation is important — it tells Handoff how to render the `index.html` and resolve all of its relative URLs correctly.

Once Claude finishes, the example website appears in a folder called "example site" and renders directly in the browser through Handoff.

![The rendered HTML example site created by Claude inside Handoff](/img/handoff-install-07.jpg)

### What one-click install created behind the scenes

Looking at the BFFless backend, you can see what the one-click install actually set up. There's now a project called **Handoff** with a collection of files and [pipelines](/features/pipelines/). The pipelines handle everything on the backend: file uploads, sharing, permissions — all the features that make Handoff work. As the app is upgraded in the future, additional versions will appear in the project.

All of this code is public and lives in the [BFFless apps repository](https://github.com/bffless/apps), so you're welcome to inspect it, fork it, or contribute.

![The BFFless backend showing the Handoff project's pipelines](/img/handoff-install-08.jpg)

## Wrapping Up

Handoff is a simple but powerful file-sharing app. The [one-click install](/features/app-catalog/) makes it trivial to get running — and just as easy to upgrade later. Combined with BFFless API keys and the Handoff skill, Claude gets full read and write access to your personal file server, turning it into a convenient place to stash specs, screenshots, Markdown documents, and even full HTML prototypes that you can review, comment on, and share at will.
