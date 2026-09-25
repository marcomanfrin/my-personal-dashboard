# Hyperframes Composition Brief: Argus

## Objective
Short before/after launch video for Argus, the AI-agent-fed personal dashboard.

## Output
- Composition: `brag-output/composition/` · Render: `brag-output/brag.mp4`
- Landscape 1920x1080, 25s, 30fps

## Source Material
- Project root: repo root. Read: `demo.html` (tokens, copy, attention engine), `README.md`,
  `apps/web/public/favicon.svg` (logo path), `docs/dashboard-dark.png` (board to recreate).
- Verbatim product copy: "Attention required", "Urgent", "Need action", "Upcoming, 48h",
  "Production deploy failed: image push timed out", "Line 3 HMI keeps losing the PLC connection",
  "SLA escalation module is past its end date", "Submit August expense report",
  "Tasks due today", "Emails to act on", "PRs to review", "Search mail, PRs, tasks, events".
- On-screen story copy (Italian, requested by the user): "Lunedì, 09:00." · "Dove guardi prima?" ·
  "Sono già le 14:00." · "Poi arriva Argus." · "Legge tutto. Mette in ordine." ·
  "Tutto in un unico posto." · "Sapere cosa fare:" "5 ore" → "5 minuti".

## Creative Direction
- Tone: default with a chaotic first act; see `brag-plan.md` for the angle and storyboard.
- Mascot: built from the logo — the "A" stroke as body, the logo's circle as a big eye; extra
  eyes open across the body when it scans (Argus Panoptes).
- Avoid generic SaaS language, abstract filler, redesigning the product UI.

## Visual Identity
Dark theme tokens from demo.html: bg #0b0e1c, surfaces #131830/#191f3b/#222a50, text
#e8eaf8/#a3a8c8/#6d7398, accent #8e7fff / #b3a8ff, crit #ff5c6c, high #ff9a48, med #e9c350,
low #62a3ff, ok #40d396. Font: Manrope (local file in assets/fonts).

## Storyboard
1. Monday 09:00 — 0-3.0s — monitor, toasts, badges, "Lunedì, 09:00."
2. Overload — 3.0-7.4s — tabs multiply, windows cascade, clock to 14:07, two captions
3. Argus arrives — 7.4-13.2s — freeze, mascot walks in, scans, sorts into 3 piles
4. One place — 13.2-20.2s — user sits at 09:05, push into the Argus board, click marks done
5. Punchline — 20.2-25s — "5 ore" struck → "5 minuti", logo lockup

## Audio
- Act 1: no music, dense pings (glass/metal light, select_008), error buzz at 7.2s.
- Act 2: `assets/music/happy-beats-business-moves-vol-1-by-ende-dot-app.mp3` from comp 7.4s,
  media offset 3.0s, volume 0.34, fades. Cue preset:
  `~/.claude/skills/brag/assets/music/cues/happy-beats-business-moves-vol-1-by-ende-dot-app.music-cues.json`.
  Beat-lock "5 minuti" at 20.62s and the logo at 22.12s.
- Audio-reactive: subtle RMS glow on the act-2 background.
- SFX: footsteps, card slides on sorting, mouse click on the done action, bell on the logo.
