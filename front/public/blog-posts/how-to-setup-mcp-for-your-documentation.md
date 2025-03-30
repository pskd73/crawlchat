---
title: How to Set Up an MCP Server for Your Documentation
date: 2025-03-30
description: Configure an MCP server for your documentation so AI tools can access it.
---

AI has changed the way we consume content. People now want the quickest way to access your documentation—right from their workflow. **MCP** enables us to extend the functionality of AI. **Model Context Protocol** is a standard for building AI applications so that anyone can integrate them into their AI workflow.

Developers around the world are adopting AI-driven IDEs like **Cursor**, **Windsurf**, and others. These IDEs have AI capabilities built in at their core. Developers write prompts, and the AI writes code for them. It’s important to deliver your documentation to these IDEs so you can serve your community better. **CrawlChat** provides not only an **embed widget** and a **Discord bot**, but also an **MCP server** for your documentation—without any extra configuration.

## Add Knowledge

The first step in setting up an **MCP server** is to create a collection and add your documentation as a knowledge base. This knowledge base is then used as a resource for answering queries across different channels.

## Configure MCP Details

Once your knowledge base is set up, all you need to do is give your server a name. You’ll receive an MCP script that you can share with your community, which they can use to add your docs as an MCP client in their favorite AI app.

![MCP Settings on CrawlChat](/blog-images/mcp-settings.png)

The chat widget you embed on your site will also show an option to view the MCP script. You can toggle this off if you don't want it to appear.

## Add Client

Your developer community can paste the **MCP script** into their favorite tools and start using it. AI apps like **Cursor** or **Windsurf** will use this connection automatically whenever needed—for example, when the user asks something related to your documentation.

## Analyze

You can view the number of messages triggered from the MCP channel directly in your dashboard. It also shows a score for each response (from 0 to 1)—where 0 indicates a poor response and 1 indicates the best. You can use this metric to fine-tune your documentation over time.
