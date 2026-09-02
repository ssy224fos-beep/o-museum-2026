# Artwork Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the site owner attach shared links to individual artworks from the browser and show Y/Q/L badges beside the rank.

**Architecture:** Store link overrides in one small `data/links.json` file keyed by artwork number. Load and merge it at startup. An owner-only editor uses a fine-grained GitHub token held in `sessionStorage` and updates that file through GitHub's Contents API; ordinary visitors only read and open links.

**Tech Stack:** Static HTML/CSS/JavaScript, GitHub Pages, GitHub REST Contents API, Node built-in test runner.

**Spec:** Approved in this conversation on 2026-09-02.

## Global Constraints

- Support multiple links per artwork.
- Display YouTube as `Y`, QuizKnock as `Q`, and other URLs as `L` beside the rank badge.
- Keep repository credentials out of source files and persistent browser storage.
- Preserve the existing floor, room, rank, keyword, card expansion, and S-rank Wikipedia behavior.

---

### Task 1: Link classification and artwork badges

**Files:**
- Modify: `app.test.js`
- Modify: `app.js`
- Modify: `styles.css`

**Interfaces:**
- Produces: `linkKind(url)`, `linkBadges(work)`, and link rendering inside `card(work)`.

- [ ] Write tests asserting YouTube, QuizKnock, and generic URL classification.
- [ ] Run `node --test app.test.js` and confirm the new assertions fail because the functions do not exist.
- [ ] Implement URL validation, classification, escaped badges, and safe external-link attributes.
- [ ] Run `node --test app.test.js` and confirm all assertions pass.

### Task 2: Shared GitHub-backed editing

**Files:**
- Modify: `app.test.js`
- Modify: `app.js`
- Modify: `b3.html`
- Modify: `b2.html`
- Modify: `b1.html`
- Modify: `1f.html`
- Modify: `2f.html`
- Create: `data/links.json`

**Interfaces:**
- Consumes: `linkKind(url)` and the link record `{url, kind}`.
- Produces: `loadLinks()`, `saveLinksToGitHub(token, links)`, and owner editor event handling.

- [ ] Write tests for link merging, input validation, and GitHub request construction.
- [ ] Run `node --test app.test.js` and confirm failures identify the missing editor behavior.
- [ ] Add the edit dialog, session-only token handling, link add/remove controls, and single-file GitHub update.
- [ ] Run `node --test app.test.js` and confirm all assertions pass.

### Task 3: Documentation, regression verification, and publication

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: the finished browser editor.
- Produces: owner setup instructions for a repository-scoped fine-grained token.

- [ ] Document owner mode, minimum token permissions, session-only storage, and badge meanings.
- [ ] Run `node --test app.test.js`, data integrity checks, and JavaScript syntax checks.
- [ ] Inspect the complete diff against every approved requirement.
- [ ] Create one atomic commit on GitHub `main` and verify the resulting tree.
