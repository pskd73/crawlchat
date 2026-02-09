---
title: Skill Maker Tool
date: 2026-02-09
type: changelog
tags: focus
---

Added a new **Skill Maker** tool to help you create skill.md files optimized for LLM understanding. This tool is similar to Compose but specialized for generating Skills that follow best practices for Claude and other LLMs.

The Skill Maker tool:
- **Automatically formats titles** as `SKILL_{name}.md` (e.g., `SKILL_processing-pdfs.md`)
- **Guides the AI** to create clean, well-structured markdown following Skill authoring best practices
- **Ensures single skill per file** - creates one skill definition, not multiple
- **Includes YAML frontmatter** with proper name and description fields
- **Download functionality** - save your skill as a `.md` file with the title as filename

You can access Skill Maker from the Tools menu in your dashboard. It uses your knowledge base to generate comprehensive skill documentation that's concise, properly structured, and optimized for LLM consumption.
