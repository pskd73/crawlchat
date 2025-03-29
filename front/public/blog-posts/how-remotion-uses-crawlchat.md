---
title: How Remotion uses CrawlChat to integrate AI in their documentation
date: 2025-03-29
description: This is a short description
---

[Remotion](https://remotion.dev) is an open source library to make videos programmatically. It is powering amazing apps such as [Submagic](https://submagic.co), [AIVideo.com](https://aivideo.com), [Icon.me](https://icon.me), [MotionShot](https://motionshot.app) and more. They have a very strong documentation so that the community can easily build applications around Remotion. 

Remotion also has a Discord server where the developers interact and get help from the makers and the experts in the eco system. Both the documentation and the Discord servers have been the places where the developers get help. The best way to let people search the documents is to have a keyword search option, where people enter a keyword and get matching web pages. [Algolia](https://www.algolia.com) has been the de-facto method of adding such search functionality.

As the technology kept evolving and with a strong penetration of **AI** in how we consume the content, there has been a clear shift of how we search the documentation websites. The world has been adopting a natural conversation style interaction with computers almost in every vertical. Not integrating **AI** in terms of how people consume the documentation, is falling behind with the technology.

[Jonny](https://x.com/JNYBGR), the maker of Remotion is keen on it and wanted to integrate CrawlChat with Remotion documentation so that they can embed the **Ask AI** button on the Remotion's documentation site, have a **Discord Bot** that uses the documentation and answers queries from the community, and a **MCP Server** to take the documentation right into the developers AI workflow.

![3 main features of CrawlChat](/blog-images/3-features.png)

## Advantages

Generally people consider embedding a regular *AI of any LLM*. That's a very wrong approach as every LLM is trained on a set of data and up to a cut off time. It might know about some popular libraries or content but for sure it doesn't know about your documentation. Apart from that the chances of it hallucinating are super high.

That is the reason you need a solution like **CrawlChat** that digests your documentation and uses it as a context for LLMs. That is what CrawlChat exactly does under the hood and provides you

- A simple tool to digest your documentation using scraping
- Get AI that actually knows about your documentation
- Very minimal (or nothing at all) hallucination
- Gives your citation and resources for every answer
- Lot of options for you to assist the quality of your documentation and improve it

## Ask AI

Embedding the chatbot was the first step in Remotion's integration process. It let's Remotion community to ask any questions, issues that they are facing while building stuff around Remotion. 

On the other side, the Remotion team also get to see the queries that are being answered by the chatbot for further improvement on the documentation itself.

![Ask AI chatbot powered by CrawlChat](/blog-images/askai.png)

## Discord bot

Remotion Discord server has over 5000 members at the time of me writing this post. There are dedicated channels for seeking help. It is one of the most active Discord servers I've seen. Jonny wanted to take their documentation to this Discord server as well using **Discord bot**. 

The community now is able to get answers to the queries they have by just tagging **@crawlchat** and the bot answers in seconds. It also provides the resourses that it uses to answer in the message.

It just doesn't stop there, the owners of the server can make the bot learn new information by just **@crawlchat learn** and it adds the information to the knowledge base. All the Discord conversations are also being tracked and tagged accordingly for Remotion team to assess the performance.

![Discord bot powered by CrawlChat](/blog-images/remotion-discord-bot.png)

## MCP Server

**Model Context Protocol** (MCP) has been the latest buzz in the AI world. This is a standard protocol for AI apps to extend the ability to other apps. In short, **MCP is kind of API for AI**. A huge amount of developers across the world are moving to AI driven development workflow by making use of IDEs like **Cursor**, **Windsurf**. They have AI integrated in the editor at core, which means, you can use the **MCP** functionality and make these applications aware of the documentation so that they can generate code automatically for the developers.

Remotion integrated MCP as well and put up a page that demonstrates the [setup instructions](https://www.remotion.dev/docs/ai/mcp). What this means is that the community can just ask questions, or the IDE itself searches relevant content from Remotion documentation and generates the code anything related to Remotion with high accuracy.

## Results

While this is still early to find out any concrete results, it is clear that the community has another channel to get help from instead of just relying on experts. This **definitely solves** the first layer of queries with a **decent accuracy**.

In terms of numbers, CrawlChat is answering 100+ Remotion queries every day across the channels. It is performing a good at **0.75** score from the range of 0(worst) to 1(best). Most importantly, CrawlChat enables the Remotion team to have more visibility on the queries from the community that lets them find the data gaps and fine tune them periodically.