# Ink Tide

**Every night the tide studies you. Every dawn it shows what it learned.**

Play it here: **https://ink.sunmew.com**

Ink Tide is a build-by-day, defend-by-night game drawn in Chinese ink wash. You guard a single lamp. When night falls, a tide of ink comes for it from every side. The twist is that the tide learns. It watches how you fight, and the next night it comes back changed to beat you. You see exactly what it learned, so you can use that against it.

## How the tide learns

1. **It keeps score.** Every night it counts which damage you dealt (blade, fire, frost, lightning), who dealt it (you or your towers), and where its dead fell.
2. **At dawn it adapts.** Burn it and it grows Ember Shell. Wall it in and it learns to fly. Hunt it yourself and it sends assassins after you. Kill it all on one side and it comes from another.
3. **Every adaptation has a weakness.** The dawn report says what it learned, the evidence it learned it from, and what breaks it.
4. **So you can bait it.** Lean on fire for a night, then meet the shelled tide with frost. During the night the top-right corner shows what it is learning right now.
5. **It holds a grudge.** Use the same trick three nights in a row and its armor grows thicker.

## Features

- 7 nights and one of three bosses, then an endless mode
- 12 adaptations, 10 enemy types, 7 buildings with 3 upgrade levels
- Easy, Normal and Hard
- 27 relics, plus skill upgrades every third night
- Daily omens, some good, some bad
- A different map every run: open ground, a river with two bridges, or a dark bamboo forest
- Curses for a harder run and more souls
- The lamp can breathe fire once enough enemies fall (Q), and it talks when things get bad
- Four heroes: the Blade, the Archer, the Painter (whose strokes become walls) and the Seal (stamps that stack and burst, a great seal that stuns)
- At half health the boss turns into a mirror of your favourite damage
- Random night events: falling stars, fog, a gust from the lamp, an eclipse, ink rain, a lost merchant
- Enemies that fight your build: the Mimic hides among your towers, the Weaver webs them
- Survivors who join you as fighters after night 5
- Permanent unlocks, deeds, a bestiary and a souls shop between runs
- Plays on desktop and on phones held sideways

## Controls

| Action | Desktop | Phone |
|---|---|---|
| Move | WASD or arrow keys | Drag in the bottom-left |
| Attack | Hold left mouse button | Automatic |
| Skill | Space | Dash / Rain button |
| Build | 1 to 7, then click the ground | Tap a building, then tap the ground |
| Upgrade, repair, remove | Click a building by day | Tap a building by day |
| Start the night early | Enter | Start Night button |
| Pause | Esc or P | Pause button on the right |
| Lamp Flare | Q | Lamp button on the right |
| Mute | M | — |

## URL options

| Address | What it does |
|---|---|
| `?demo` | Starts on day 3 with plenty of materials. Used for recording the trailer. |
| `?dev` | Unlocks everything. |
| `?test` | Muted, and loads the testing helpers. |

## How it is made

- Plain JavaScript and the Canvas 2D API. No engine, no framework, no build step.
- Every picture is drawn by code: the paper, the ink, the lamp, the enemies. There are no image files.
- The music is played live by code with the Web Audio API.
- The sound effects are CC0 recordings: Kenney's *RPG Sounds* and *80 CC0 RPG SFX*. See `sfx/CREDITS.txt`.

### Project layout

```
index.html        page that loads everything
data/balance.js   all numbers (health, damage, costs, wave sizes)
data/text.js      all player-facing text
js/core.js        canvas, input, sound, ink drawing helpers
js/world.js       grid, path finding, buildings, resources, rocks
js/entities.js    hero, enemies, towers, projectiles, damage
js/learn.js       how the tide learns, and each night's wave plan
js/meta.js        save data, difficulty, relics, shop, deeds, omens
js/ui.js          HUD, menus, reports, screens
js/main.js        game flow, tutorial, world drawing, main loop
js/extras.js      the Painter, the boss mirror phase, night events
js/extras2.js     Ink Well, the Seal, Mimic and Weaver, extra adaptations, relics and events
js/extras3.js     lamp flare, map variants, curses, the other two bosses, ambient life, animation, music
js/music.js       background music
js/pause.js       pause screen
js/sim.js         an automatic player for testing
tools/headless.js runs whole games without a browser
sfx/              sound effects
```

### Running locally

Browsers will not load the scripts from a plain file, so serve the folder:

```
python -m http.server 8765
```

Then open http://localhost:8765.

### Balance testing without a browser

```
node tools/headless.js 10 normal
```

This plays 10 full games with the automatic player and prints how each one went. Add `fire` or `none` to change its strategy, or `--relic <name>` to start with a relic.

## Team

Made by a team of four for a game competition, with AI-assisted development.

- Programming and integration
- Writing (`data/text.js`)
- Balance and playtesting (`data/balance.js`)
- Presentation and trailer

The team's working guide (in Chinese) is in `docs/team-guide.zh.md`.
