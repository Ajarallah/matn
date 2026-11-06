# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: Arabic-speaking developers who work with coding agents (Claude Code, Codex, Cursor) and read what those agents write — plans, specs, reports, CLAUDE.md/AGENTS.md, project docs — often mixed Arabic and English with code, paths and tables. They read to decide: approve a plan, send notes back, see what changed after the agent's revision. (Inferred from the November 2026 market research and the owner's direction; recorded in docs/goal/QUESTIONS.md.)

Secondary: Arabic readers and writers — researchers, students, writers — who keep notes and long documents in Markdown or an Obsidian vault and want them to read like a well-set Arabic book.

## Product Purpose

Matn is a local Markdown reader that sets Arabic correctly (per-block direction, Arabic typography, Arabic-aware search) and closes the loop with coding agents: the agent writes, the reader reads, highlights, comments and decides, and the agent gets structured notes back. Success: a developer never copies text between windows to review an agent's plan, and an Arabic document never renders broken.

## Positioning

The only reader that combines correct mixed-direction Arabic with the agent review loop. Competing readers either treat RTL as an afterthought (VS Code, Claude/Codex panels, Typora, Marked) or are Arabic-only viewers with no agent workflow (ReyadMDX, MdReader). Matn reads, does not edit.

## Operating Context

- Runs locally: `matn file.md` or `matn folder` starts a server on 127.0.0.1 and opens the browser; also a Finder droplet, a Claude Code plugin (plan gate, `/matn:last`), and a Codex skill. A native macOS app (SwiftUI shell, same document renderer) is planned for direct download.
- Sessions alternate between long reading (minutes to an hour, often at night) and quick checks of a file an agent just wrote.
- Documents: agent plans and reports, READMEs, Obsidian notes with wikilinks/embeds/callouts, specs with tables, Mermaid, math and code.

## Capabilities and Constraints

- Zero runtime dependencies, no build step, vendored assets only; everything offline; binds to 127.0.0.1 and serves only the opened root.
- Reader, not editor: no in-place editing; annotations live in local app data, never in the file.
- Bilingual UI (Arabic default, English), four themes (light, sepia, dark, night), bundled Arabic fonts (Noto Naskh, Amiri, IBM Plex Sans Arabic, Tajawal, optional Thmanyah).
- Agent features: review with decision (approve / request changes), suggestions, revision view against sent notes, per-reader changes, follow.

## Brand Commitments

- Name: متن · Matn. Arabic first: Arabic is the default language and the default direction; English is a full peer, not a translation layer.
- Owner's binding constraints: simple, clear, a subtle soul; must not look like a template or dated; native Apple quality is the bar. Banned: colored top or side-border accents on cards, celestial/astrology themes, AI-kitsch, glass as decoration.

## Evidence on Hand

- Research: plans/013-market-research-2026-11.md with plans/013-research/ (competitors, demand). UI critique: plans/014-ui-critique-2026-11.md.
- No user testimonials, download counts or press exist; none may be invented.

## Product Principles

1. The text leads; chrome appears when it is needed and steps back when it is not.
2. Arabic is never a mode: every surface is designed right-to-left first and verified left-to-right.
3. Never lose the reader's work: notes, highlights and positions survive reloads, theme changes and agent rewrites.
4. The review moment is the product's most important screen and must be its most trustworthy.
5. Local, private, offline by default.

## Accessibility & Inclusion

WCAG AA contrast in every theme, full keyboard operation with visible focus, 44pt touch targets on touch devices, reduced-motion and reduced-transparency respected, shortcuts that work on Arabic keyboard layouts.
