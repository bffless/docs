---
slug: bffless-skills-and-mcp-server
title: "Using BFFless Skills and MCP Server for AI Workflows"
authors: [bffless-team]
tags: [features]
image: /img/skills-01.jpg
description: Learn how to install BFFless skills in Claude for richer AI-assisted development, use skills inside BFFless pipelines to maintain consistent branding, and connect an MCP server so Claude can manage your backend directly.
---

When working with an LLM like Claude, the model is only as helpful as the context it has. BFFless publishes a dedicated [skills repository](/features/claude-code-plugin) — available at `github.com/bffless/skills` — that gives your AI coding agent domain knowledge about the BFFless platform. Once installed, these skills let Claude understand BFFless concepts like pipelines, proxy rules, deployments, and more, so you can ask informed questions and get accurate guidance without having to explain the platform from scratch every time.

<YouTubeEmbed id="oitzN1gByr0" title="Using BFFless Skills and MCP Server for AI Workflows" />

<!-- truncate -->

<img src="/img/skills-01.jpg" alt="The BFFless skills repository on GitHub" />

This walkthrough covers three complementary techniques: installing the developer skills into Claude Code, using skills inside a BFFless pipeline for consistent AI-generated content, and wiring up the [MCP server](/features/mcp-server) so Claude can query and manage your BFFless backend directly.

## Installing Developer Skills in Claude

The recommended way to get started is with Claude Code and its plugin marketplace. To follow along, you only need a project open in your terminal — even a bare-bones Vite "Hello World" site will do.

Open Claude Code at the root of your project. If you list your existing skills you will see whatever you already have installed, but no BFFless-specific knowledge yet. Installation is a two-step process:

1. **Add the BFFless marketplace:**

```bash
claude marketplace add BFFless/skills
```

2. **Install the plugin from that marketplace:**

```bash
claude plugin install BFFless-plugins
```

During installation you are asked whether to install at the **project scope** or the **user scope**. A project-scoped skill lives inside your repository directory (and will be checked into Git unless you add it to `.gitignore`). A user-scoped skill is installed once and shared across every project — a better fit if you use BFFless across many repos.

After installing, run:

```bash
reload plugins
```

Claude will now list the BFFless skills alongside any others you have. You can immediately test it by asking something like _"Can you tell me information about how BFFless pipelines work and give me a high-level summary of what I would do to use BFFless?"_ Claude will invoke the skill automatically — first loading the general BFFless skill, then the more specific [pipelines](/features/pipelines) skill — and return a rich, informed answer.

<img src="/img/skills-02.jpg" alt="Claude loading the BFFless skill and the pipeline skill in response to a question" />

## Using Skills in BFFless Pipelines

Skills are not just for developer tooling. You can also leverage them inside a BFFless pipeline to give your AI handlers persistent, reusable context. This is especially powerful for creative workflows where you want consistent branding without repeating yourself in every prompt.

Consider a real-world example: a post-production app called **Studio** that generates YouTube video thumbnails. The pipeline works in two stages:

1. **Draft the prompt** — A pipeline handler calls Claude (via the Vercel AI SDK) with a system prompt that says something like _"You write a single image generation prompt for Google Nano Banana that becomes a YouTube video thumbnail."_ Along with high-level direction, it receives the video's title, description, full script, and any creator notes.
2. **Generate the image** — The resulting prompt is fed to a second AI endpoint (Replicate's Nano Banana model) that actually produces the thumbnail.

The key ingredient is the **skill** attached to the first handler. Instead of pasting styling instructions into every pipeline call, you define a skill once — stored under your app's BFFless skills directory — and the AI handler loads it at runtime when it deems it relevant.

### Defining a pipeline skill

Inside the BFFless admin, navigate to your app's skills. You can have multiple skills defined, but only enable the ones you want active. In this example, the skill named **image prompts** contains direction like:

- For **tutorials, walkthroughs, or explainers** → use the _retro blueprint_ style
- For **"watch me code"** content → use the _modern dev tool_ style

Each style section includes detailed descriptions of colors, composition, and visual elements. Because the skill is defined once, every thumbnail generated through this pipeline inherits the same aesthetic — different content, same brand.

<img src="/img/skills-03.jpg" alt="The pipeline configuration in the BFFless admin showing the AI handler and skill settings" />

### Seeing the skill in action

To test, you can trigger the pipeline with a small twist — for instance, requesting _"use the tutorial style architecture design, but I want a darker background for this one."_ The pipeline calls Claude, which invokes the skill as a tool call, applies the stored retro-blueprint styling, and layers in the user's request for a darker background.

In the execution logs you can inspect the full trace: the system prompt, the user's additional info, and — critically — the **tool call** where the skill was loaded. The AI received all the rich styling context without the user having to spell it out again.

<img src="/img/skills-04.jpg" alt="Studio's export page showing the darker-background request, the drafted image prompt, and the generated thumbnail" />

The result is a thumbnail that looks almost identical to previous ones in the series, except with the requested black background. If you were to disable the skill entirely, the output would have a completely different feel. Skills give your LLM relevant, consistent context and eliminate repetition — whether you are a developer asking questions in your terminal or an [AI pipeline](/features/ai-pipelines) generating branded content.

## Setting Up the MCP Server

The final piece of the puzzle is the BFFless [MCP server](/features/mcp-server). MCP (Model Context Protocol) lets Claude make API calls directly to your BFFless backend — listing projects, managing deployments, and more — all from within your coding session. The BFFless skills already know how to use the MCP server, so the two complement each other naturally.

All the setup details live in the BFFless docs under **Features → MCP Server**. The short version:

1. **Create an API key** in your BFFless admin panel. Navigate to Settings → API Keys and create a new key. You can scope it to a specific project or create a global key that covers every project on that instance.

2. **Register the MCP server with Claude** by running a single command that includes your BFFless domain and API key:

```bash
claude mcp add --transport http <your-bffless-domain> --header "Authorization: Bearer <YOUR_API_KEY>"
```

This writes the connection into your local Claude MCP JSON configuration. Once added, open Claude Code in the project directory and verify the connection:

```bash
mcp
```

Claude will list your active MCP connections and available tools. You can then issue natural-language requests like _"list projects in BFFless,"_ and Claude will call the API on your behalf, returning the results directly in your terminal.

<img src="/img/skills-05.jpg" alt="Claude listing a BFFless project via the MCP server connection" />

In the demo, the MCP server returned a single project — **apps-test** — which matched exactly what was visible in the BFFless admin. From here you could ask Claude to inspect deployments, update configurations, or perform any other operation the API exposes, all without leaving your editor.

## Wrapping Up

Skills and the MCP server are two sides of the same coin: **skills** give your LLM the _knowledge_ it needs about BFFless, while the **MCP server** gives it the _ability to act_ on your backend. Together they create a workflow where you can ask Claude informed questions about BFFless concepts, generate branded AI content through pipelines with consistent styling, and manage your projects and deployments through natural-language commands.

Whether you are building software with BFFless as your hosting platform or using BFFless pipelines for AI-powered content generation, installing the skills and connecting the MCP server are small, one-time steps that pay dividends on every interaction.
