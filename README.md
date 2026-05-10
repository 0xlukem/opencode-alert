# OpenCode Alert

Sound and toast notifications for [OpenCode](https://opencode.ai). Know when the AI finishes, needs you, or hits an error — without staring at your terminal.

## Why

You delegate a task and switch to another window. Now you're checking back every 30 seconds. Did it finish? Did it error? Is it waiting for permission?

This plugin solves that:

- **Stay focused** — Work in other apps. A sound + toast arrives when the AI needs you.
- **Three states** — Success (task done), Attention (input needed), Error (something broke).
- **Cross-platform** — Works on macOS, Linux, and Windows.
- **Custom sounds** — Use your own MP3s or fall back to system sounds.

## Installation

### From npm (recommended)

Add to your `opencode.json`:

**Global** (`~/.config/opencode/opencode.json`):
```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-alert"]
}
```

**Project-level** (`./opencode.json`):
```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-alert"]
}
```

OpenCode will auto-install the plugin on next startup using Bun. **No manual `npm install` needed.**

### For local development / testing

Copy the plugin file directly to OpenCode's plugin directory:

```bash
# Global plugins
mkdir -p ~/.config/opencode/plugins
cp .opencode/plugins/alert.ts ~/.config/opencode/plugins/

# Or project-level plugins
mkdir -p .opencode/plugins
cp .opencode/plugins/alert.ts .opencode/plugins/
```

## Configuration

Create `~/.config/opencode/alert.json`:

```json
{
  "soundEnabled": true,
  "toastEnabled": true,
  "sounds": {
    "success": "~/.config/opencode/sounds/success.mp3",
    "attention": "~/.config/opencode/sounds/attention.mp3",
    "error": "~/.config/opencode/sounds/error.mp3"
  }
}
```

### Disable Flags

| Flag | Description |
|------|-------------|
| `soundEnabled: false` | Disable all sounds |
| `toastEnabled: false` | Disable all toasts |
| Both `false` | Completely silent |

### Environment Variables

You can also use env vars (take precedence over config file):

```bash
export OPENCODE_ALERT_DISABLE_SOUND=1   # Disable sounds
export OPENCODE_ALERT_DISABLE_TOAST=1   # Disable toasts
export OPENCODE_ALERT_DISABLE_ALL=1     # Disable everything
```

## Custom Sounds

### Default Behavior

By default, the plugin uses your operating system's built-in sounds:

| State | macOS | Linux | Windows |
|-------|-------|-------|---------|
| Success | `Glass.aiff` | `dialog-information` | `SystemExclamation` |
| Attention | `Submarine.aiff` | `dialog-warning` | `SystemAsterisk` |
| Error | `Basso.aiff` | `dialog-error` | `SystemHand` |

### Using Custom MP3s

1. Create the sounds directory:

```bash
mkdir -p ~/.config/opencode/sounds
```

2. Add your MP3 files:

```bash
cp ~/Downloads/my-success-sound.mp3 ~/.config/opencode/sounds/success.mp3
cp ~/Downloads/my-attention-sound.mp3 ~/.config/opencode/sounds/attention.mp3
cp ~/Downloads/my-error-sound.mp3 ~/.config/opencode/sounds/error.mp3
```

3. Update your config:

```json
{
  "sounds": {
    "success": "~/.config/opencode/sounds/success.mp3",
    "attention": "~/.config/opencode/sounds/attention.mp3",
    "error": "~/.config/opencode/sounds/error.mp3"
  }
}
```

### macOS System Sounds

You can use any of these built-in sounds without adding MP3s:

`Basso`, `Blow`, `Bottle`, `Frog`, `Funk`, `Glass`, `Hero`, `Morse`, `Ping`, `Pop`, `Purr`, `Sosumi`, `Submarine`, `Tink`

To preview a sound:

```bash
afplay /System/Library/Sounds/Glass.aiff
```

### Sound File Requirements

- Format: MP3 (recommended), WAV, AIFF, or any format your OS can play
- macOS: `afplay` supports AIFF, WAV, MP3, AAC
- Linux: `paplay` (PulseAudio) supports WAV, OGG; `ffplay` supports almost anything
- Windows: PowerShell `System.Media.SoundPlayer` supports WAV; custom MP3s use `ffplay` fallback

## How It Works

The plugin listens to three OpenCode events:

| Event | Sound | Toast | When |
|-------|-------|-------|------|
| `session.idle` | Success sound | "Task Complete" | AI finishes a task |
| `permission.asked` | Attention sound | "Attention Needed" | AI needs your input |
| `session.error` | Error sound | "Error" | Something went wrong |

## Platform Support

| Feature | macOS | Linux | Windows |
|---------|-------|-------|---------|
| Custom MP3 sounds | Yes | Yes | Yes |
| System sound fallback | Yes | Yes | Yes |
| Toast notifications | Yes (osascript) | Yes (notify-send) | Yes (PowerShell) |

## Disclaimer

This project is not built by the OpenCode team and is not affiliated with OpenCode in any way.
