# Brag Plan: Argus

## What is this app?
Argus is a personal dashboard fed by autonomous AI agents: they read mail, calendar, GitHub, Trello
and company planning, and the board ranks what needs you right now ("Attention required").

## Vertical cut (2026-09-25)
1080x1920: the screen is a 1080-wide camera window panning over the 1920-wide recording (band y 560-1640); captions large on top; Argus stands under the band; punchline and lockup stacked.

## Revision (2026-09-25)
New logo (argo-logo.jpg, circular crop): Argus is now the round logo badge with gold scan rings; sidebar brand and final lockup use it too.
Punchline retimed: "5 ore" holds centred and clean ~1.4s before the strike, "5 minuti" lands on 21.92s; total 26s.
Screen-recording only: the screen fills the frame, captions are overlay pills, no monitor, desk or person watching it. A frantic cursor carries act 1; Argus appears over the screen, sorts everything and hops off before the board fills in.

## The angle
Before / after, as the user asked: a desk drowning in Mail, Slack, Teams, Trello, YouTrack tabs and
toasts, the clock racing from 09:00 to 14:00 while the user doesn't know where to look. Hard stop.
Argus — a little character built from the logo (the "A" with the eye; Argus Panoptes, the giant with
a hundred eyes) — walks in, looks at everything, opens all its eyes, and sorts the mess into the real
Argus board. The user sits down at 09:05 with everything in one place. Punchline: 5 minutes, not 5 hours.

## Hook (first 2-3 seconds)
A monitor with a Gmail window, toasts slamming in from every side (Slack "@marco prod is down?",
Teams "Call in 2 min", YouTrack "HMI-5309 assigned to you"), badge counters climbing. Caption
"Lunedì, 09:00." The notification pings are the hook.

## Key moments
- The tab bar multiplying to 40+ tabs while the taskbar clock spins 09:00 → 14:07.
- Argus's eye looking left/right, then many eyes opening across its body as it scans.
- Windows and toasts flying into the three levels Urgent / Need action / Upcoming.
- The real board: "Good morning, Marco — You have 8 things that need your attention today",
  counts 2 / 6 / 7, attention rows cascading in, a click marks one done.

## Outro / punchline
"Sapere cosa fare:" — "5 ore" struck through, "5 minuti" slams in. Then the Argus lockup:
"Tutto in un unico posto."

## User flow worth showing
Open Argus → read "Attention required" (ranked rows from GitHub, Mail, Plan, Reminders) →
mark "Submit August expense report" as done (toast with Undo).

## Tone
- Preset: default (with a chaotic first act)
- Creative direction: before/after mini-story — frantic notification chaos, then a calm, friendly fix
- Interpretation: act 1 is fast, dense, no music, only pings; act 2 is clean, rhythmic, music on.

## Format: landscape — 1920x1080
## Duration: 25s

## Visual identity (from the project)
- Background: #0b0e1c (dark theme), surfaces #131830 / #191f3b / #222a50
- Accent: #8e7fff, accent text #b3a8ff
- Text: #e8eaf8 / #a3a8c8 / #6d7398
- Signal: crit #ff5c6c, high #ff9a48, med #e9c350, low #62a3ff, ok #40d396
- Display/body font: Manrope 400-800 (the demo's font)
- Strongest visual element: the Attention required card + KPI tiles (docs/dashboard-dark.png)

## Share copy (draft)
Mail, Slack, Teams, Trello, YouTrack: 5 hours to figure out where to start. Argus reads everything
for you and puts it on one board — you know what to do in 5 minutes.

## Audio direction
- Role: act 1 intentional music silence + dense notification pings; act 2 warm upbeat bed.
- Music: happy-beats-business-moves-vol-1 (120 BPM), starting at the hard stop (~7.4s),
  track offset 3.0s so the first beat hits immediately.
- Music treatment: 0.34 volume, short fade-in, fade-out on the last second.
- Music cue guidance: preset `assets/music/cues/...vol-1...music-cues.json`. With offset
  comp = track + 4.6 → strong cues at track 16.02 / 17.52 → comp 20.62 (punchline) / 22.12 (logo).
  Attention rows on every other beat from comp ~15.1.
- Audio-reactive treatment: subtle; background glow breathes with music RMS in act 2.
- SFX posture: dense in act 1 (pings per toast), sparse in act 2 (footsteps, whooshes, click, bell).
- Restraint rule: no pings after the stop; one bell only on the logo.

## Storyboard
### Scene 1 — Monday 09:00 — 0-3.0s
Monitor, Gmail window, toasts pop in; badges climb. Caption "Lunedì, 09:00."
Audio: pings per toast. → hard continuation
### Scene 2 — Overload — 3.0-7.4s
Tabs multiply, Slack/Teams/Trello/YouTrack windows cascade, clock 09:00→14:07, user head swivels,
"?" marks. Captions "Dove guardi prima?" (3.6-5.6) then "Sono già le 14:00." (5.8-7.4).
Audio: pings accelerate, error buzz at the end. → hard stop
### Scene 3 — Argus arrives — 7.4-13.2s
Freeze + dim. Argus walks in, looks around, many eyes open, windows fly into three piles
(Urgent / Need action / Upcoming). Captions "Poi arriva Argus." / "Legge tutto. Mette in ordine."
Audio: music starts, footsteps, card slides for the sorting.
### Scene 4 — One place — 13.2-20.2s
User walks in with a coffee, clock 09:05; push into the monitor: the Argus board, counts count up,
rows cascade on the beat, cursor marks a reminder done ("Marked as done · Undo").
Caption "Tutto in un unico posto."
### Scene 5 — Punchline — 20.2-25s
"Sapere cosa fare:" / "5 ore" struck / "5 minuti" (beat-locked 20.62), then Argus lockup (22.12)
with "Tutto in un unico posto." held to the end. Audio: soft impact, bell on the logo.

**Music mood:** upbeat, from the stop onward.
**Audio summary:** notification noise with no music gives way to a warm beat when Argus arrives.
