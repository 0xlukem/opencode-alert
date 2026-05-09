# Custom Sounds

Place your MP3 files here and reference them in `~/.config/opencode/alert.json`.

## Required Files

| File | Event | Description |
|------|-------|-------------|
| `success.mp3` | `session.idle` | Task completed successfully |
| `attention.mp3` | `permission.asked` | AI needs your input |
| `error.mp3` | `session.error` | Something went wrong |

## Setup

```bash
mkdir -p ~/.config/opencode/sounds
cp success.mp3 ~/.config/opencode/sounds/
cp attention.mp3 ~/.config/opencode/sounds/
cp error.mp3 ~/.config/opencode/sounds/
```

## Config

```json
{
  "sounds": {
    "success": "~/.config/opencode/sounds/success.mp3",
    "attention": "~/.config/opencode/sounds/attention.mp3",
    "error": "~/.config/opencode/sounds/error.mp3"
  }
}
```

## Where to Find Sounds

- [freesound.org](https://freesound.org) — Free sound effects
- [zapsplat.com](https://zapsplat.com) — Free with account
- Your OS system sounds (see README for paths)

## macOS System Sounds

Located at `/System/Library/Sounds/`:

- `Basso.aiff`
- `Blow.aiff`
- `Bottle.aiff`
- `Frog.aiff`
- `Funk.aiff`
- `Glass.aiff`
- `Hero.aiff`
- `Morse.aiff`
- `Ping.aiff`
- `Pop.aiff`
- `Purr.aiff`
- `Sosumi.aiff`
- `Submarine.aiff`
- `Tink.aiff`

Preview any sound:

```bash
afplay /System/Library/Sounds/Glass.aiff
```

## Tips

- Keep files small (< 500KB) for fast playback
- Use short sounds (< 3 seconds) for non-intrusive alerts
- Test with `afplay` (macOS), `paplay` (Linux), or PowerShell (Windows) before adding
