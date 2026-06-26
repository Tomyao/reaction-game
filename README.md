# Reaction Timer · 3D Edition

A visual reaction time game built as a single static HTML file. Designed as a portfolio demo.

## How to play

1. Open `index.html` in any modern browser — no build step, no dependencies to install.
2. Press **Start Game** (or **Space**) to begin a round.
3. Watch the 3D shape. When it flashes **green**, click, tap, or press **Space** as fast as you can.
4. Clicking before the green signal counts as a false start.
5. Your time in milliseconds is shown after each round. Session stats (attempts, average, best) accumulate at the top.
6. Press **R** or click **Reset** to clear the session.

## Features

- **Sub-millisecond timing** via `performance.now()` captured at the exact moment the signal fires
- **Five game states**: idle → waiting → ready → result (or false start)
- **3D animated scene** built with Three.js — icosahedron core, orbiting shapes, background particles, and a pulse ring on the green signal
- **Performance rating** after each attempt (Superhuman / Elite / Excellent / Good / Average / Keep Practicing)
- **Session stats** tracking attempts, average, and personal best
- **Responsive** — works on desktop and mobile portrait/landscape
- **No dependencies to install** — Three.js loaded from CDN, everything else vanilla JS/CSS

## Tech

| Concern | Approach |
|---|---|
| 3D graphics | Three.js r128 (CDN) |
| Timing | `performance.now()` |
| Fonts | Inter (UI), Poppins (headings) via Google Fonts |
| State machine | Plain JS switch, 5 states |
| Layout | CSS Grid / Flexbox, `position: fixed` overlay |
| Bundler | None — single `.html` file |

## File structure

```
reaction-game/
└── index.html   # entire app — HTML, CSS, and JS in one file
```
