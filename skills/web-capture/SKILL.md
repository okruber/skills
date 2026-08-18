---
name: web-capture
description: |
  Use when capturing content from a login-gated, paywalled, or anti-bot-protected page — X/Twitter threads, gated articles, JS-heavy SPAs — that returns a login wall, partial text, or empty content to ordinary fetching (read/reader-mode/headless). Drives your own already-logged-in Chrome over CDP so the site serves the page to a genuine human session.
triggers:
  - "capture this X thread"
  - "read this paywalled/gated page"
  - "the fetch just returns a login wall"
---

# web-capture

## Overview

Login-gated and anti-bot sites serve nothing useful to logged-out or headless clients: a login wall, tweet text only partially, no replies, a "verify you are human" interstitial. Mimicking a human while *anonymous* does not help.

The fix is a **real session**: drive your own Chrome — one you logged into once — over the DevTools protocol (CDP). The site sees genuine human browsing from a real profile, not injected cookies or a scripted headless client, so it cannot tell your capture apart from normal use. Everything below serves that one idea.

## Fallback ladder

Capture in this order; stop at the first that returns the full content:

1. **Reader / Nitter first** — the built-in `read` tool (reader-mode; auto-falls back to a Nitter mirror for X) is free and needs no login. It often returns the whole article or thread as clean markdown. Nitter instances are flaky and rate-limited, so this sometimes fails or returns a partial thread.

   Reader services also apply **domain-wide blocks**, not just per-page failures. `r.jina.ai` returns HTTP 403 `AbuseAlleviationError` for all of `x.com` when someone else has tripped its rate limiter, with an explicit unblock timestamp hours away. That is not a fixable request — do not retry or vary the URL, go straight to step 2.
2. **CDP → real logged-in Chrome** — the robust path when step 1 is down, partial, or the source is gated. This skill's harness. Details below.
3. **Paste / Web Clipper** — always-available human fallback when automation is unwelcome or the site actively fights step 2.

## The CDP path

### 1. Launch the dedicated profile

Use an **isolated** profile, never your everyday browser. Log in **once**; the session persists in the profile for every later capture.

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.chrome-omp-profile" \
  --new-window "<login-or-target-url>"
```

For X, point the first launch at `https://x.com/i/flow/login`. If the profile is already logged in, launch straight at the target URL.

### 2. Capture with the harness

`extract.mjs` connects over CDP, opens a fresh tab, waits for render, runs an extraction, and prints JSON. Zero dependencies — pure CDP over Node's built-in WebSocket, so there is nothing to `npm install` and no npx cache to resolve.

```bash
node "$HOME/.agents/skills/web-capture/extract.mjs" "<url>"
```

The default extraction is generic (title + readable text of `<article>`/`<main>`/`<body>`). The wrapper also reports `loggedOutGuess` and a `signalSample` — read these first, and diagnose before re-running:

| Symptom | Meaning | Fix |
|---|---|---|
| `loggedOutGuess: true`, or a "just a moment" / "verify you are human" sample | profile isn't authenticated for that site | log in once in the profile window, retry |
| empty extraction, `loggedOutGuess: false`, consent copy in `signalSample` | an overlay is blocking render | dismiss it, then poll — see *Consent dialogs* below |
| partial content (first tweet only, truncated body) | lazy render still in flight | raise `--wait`, or poll in the extraction |

Note that `document.title` is often populated even when the extraction is empty, so a failed capture still tells you the real headline — useful for deciding whether the page is worth a second attempt.

### 3. Tailor the extraction to the site

When the generic pass is thin — an SPA, a custom DOM, a partial thread — shape the scrape to the page:

1. Open the URL in the profile window and inspect the DOM for **stable containers** (prefer `data-testid`/`role`/semantic tags over generated class names).
2. Write a small JS expression returning the fields you want.
3. Pass it in and re-run:

```bash
node "$HOME/.agents/skills/web-capture/extract.mjs" "<url>" --eval-file scrape.js
```

Options: `--eval '<expr>'` for a one-liner, `--wait <ms>` to give a slow SPA longer to render (default 4000), `--raw` to print only the extraction, `--keep-open` to leave the tab for inspection, `--port <n>` for a non-default debug port.

## Worked example — X / Twitter

X is a JS-heavy SPA behind a login wall: the canonical case. Thread text lives in `[data-testid="tweetText"]`; longform articles in `[data-testid="longformText"]` (or `div[data-testid="articleNoteTweet"]`).

```js
// scrape.js — pass with --eval-file
(() => {
  const tweets = Array.from(document.querySelectorAll('[data-testid="tweetText"]'))
    .map((e) => e.innerText.trim()).filter(Boolean);
  const lf = document.querySelector('[data-testid="longformText"], div[data-testid="articleNoteTweet"]');
  return {
    title: document.title,
    tweetBlocks: tweets,
    longform: lf ? lf.innerText.trim().slice(0, 8000) : '',
  };
})()
```

A short thread that returns only the first tweet usually needs a longer `--wait` (replies load lazily); bump it to `--wait 6000` and re-run rather than scripting scroll.

### Consent dialogs and other overlays

The example above returns **zero blocks** on an X longform article gated behind a cookie-consent dialog: the overlay suppresses content render, so every selector legitimately misses. The tell is a capture with `loggedOutGuess: false` (you *are* authenticated), empty extraction, and a `signalSample` full of consent copy ("Did someone say … cookies?", "X and its partners use cookies").

Raising `--wait` does not fix this — the dialog never goes away on its own. Dismiss it, then poll. `extract.mjs` awaits a promise, so the extraction can be `async`:

```js
// scrape.js — robust version: dismiss overlay, then poll for content
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const sel = '[data-testid="longformText"], div[data-testid="articleNoteTweet"], [data-testid="twitterArticleRichTextView"]';

  for (const re of [/^accept all cookies$/i, /^accept all$/i, /^accept$/i]) {
    const hit = Array.from(document.querySelectorAll('button, [role="button"]'))
      .find((e) => re.test((e.innerText || '').trim()));
    if (hit) { hit.click(); break; }
  }
  await sleep(2500);

  const grab = () => ({
    tweets: Array.from(document.querySelectorAll('[data-testid="tweetText"]'))
      .map((e) => e.innerText.trim()).filter(Boolean),
    longform: (document.querySelector(sel)?.innerText || '').trim(),
  });

  let r = grab();
  for (let i = 0; i < 6 && !r.longform && !r.tweets.length; i++) { await sleep(1500); r = grab(); }
  return { ...r, longformLen: r.longform.length };
})()
```

Accepting once persists in the profile, so this is self-healing for later captures of the same domain. Two habits that save a second round trip: **poll in a loop instead of guessing one `--wait`**, and **return the full text plus its length** rather than a `.slice()` — a truncated capture reads as complete and you only notice the missing tail after writing it somewhere.

## Per source type

| Source | Extraction |
|---|---|
| X thread | tweet blocks via `[data-testid="tweetText"]` (worked example above) |
| X longform article | `[data-testid="longformText"]` / `articleNoteTweet` / `twitterArticleRichTextView`; use the async dismiss-and-poll version, since a consent overlay yields zero blocks |
| Paywalled article | generic pass usually works once logged in; tailor to the article body container if the page wraps content in a reader shell |
| JS-heavy SPA | inspect for the stable content container, raise `--wait`, then a tailored `--eval-file` |

## Security — hard rules

- Keep the session **inside the browser profile and nowhere else**. Never write `auth_token`, session cookies, or any credential into a note, a captured source, or memory — a session cookie is a full account credential. The CDP path already keeps it in the profile; keep it that way.
- Keep automated volume **light**. High-frequency automated access violates site terms (X especially) and volume can flag or lock the account. Capture the source you need, not a crawl.
