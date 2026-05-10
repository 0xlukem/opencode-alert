import { platform, homedir } from "os";
import { existsSync } from "fs";
import { join, resolve } from "path";
import { spawnAsync } from "./spawn";

type SoundType = "success" | "attention" | "error";

const SYSTEM_SOUNDS: Record<string, Record<SoundType, string>> = {
  darwin: {
    success: "Glass",
    attention: "Submarine",
    error: "Basso",
  },
  linux: {
    success: "dialog-information",
    attention: "dialog-warning",
    error: "dialog-error",
  },
  win32: {
    success: "SystemExclamation",
    attention: "SystemAsterisk",
    error: "SystemHand",
  },
};

function getCustomSoundPath(type: SoundType, customPath?: string): string | null {
  if (customPath && existsSync(customPath)) {
    return resolve(customPath);
  }

  const configDir = join(homedir(), ".config", "opencode", "sounds");
  const defaultPath = join(configDir, `${type}.mp3`);

  if (existsSync(defaultPath)) {
    return defaultPath;
  }

  return null;
}

async function playMacOS(type: SoundType, customPath?: string): Promise<void> {
  const custom = getCustomSoundPath(type, customPath);

  if (custom) {
    await spawnAsync("afplay", [custom]);
    return;
  }

  const systemSound = SYSTEM_SOUNDS.darwin[type];
  await spawnAsync("afplay", [`/System/Library/Sounds/${systemSound}.aiff`]);
}

async function playLinux(type: SoundType, customPath?: string): Promise<void> {
  const custom = getCustomSoundPath(type, customPath);

  if (custom) {
    try {
      await spawnAsync("paplay", [custom]);
      return;
    } catch {
      try {
        await spawnAsync("aplay", [custom]);
        return;
      } catch {
        try {
          await spawnAsync("ffplay", ["-nodisp", "-autoexit", custom]);
          return;
        } catch {
          // Fall through to system sound
        }
      }
    }
  }

  const systemSound = SYSTEM_SOUNDS.linux[type];
  try {
    await spawnAsync("canberra-gtk-play", ["-i", systemSound]);
  } catch {
    try {
      await spawnAsync("notify-send", [
        "-i",
        systemSound,
        "OpenCode Alert",
        type,
      ]);
    } catch {
      // Silent fallback
    }
  }
}

async function playWindows(type: SoundType, customPath?: string): Promise<void> {
  const custom = getCustomSoundPath(type, customPath);

  if (custom) {
    // Escape single quotes for PowerShell string literals
    const escapedCustom = custom.replace(/'/g, "''");

    // Try Windows Media Player COM object first (supports MP3)
    try {
      const psCommand = `$wmp = New-Object -ComObject WMPlayer.OCX.7; $wmp.URL = '${escapedCustom}'; $wmp.controls.play(); $timeout = (Get-Date).AddSeconds(30); while ($wmp.playState -ne 1 -and (Get-Date) -lt $timeout) { Start-Sleep -Milliseconds 100 }; $wmp.close()`;
      await spawnAsync("powershell", ["-Command", psCommand]);
      return;
    } catch {
      // Fallback to ffplay if available (cross-platform)
      try {
        await spawnAsync("ffplay", ["-nodisp", "-autoexit", custom]);
        return;
      } catch {
        // Fall through to system sound
      }
    }
  }

  const systemSound = SYSTEM_SOUNDS.win32[type];
  const psCommand = `[System.Media.SystemSounds]::${systemSound}.Play()`;
  await spawnAsync("powershell", ["-Command", psCommand]);
}

export async function playSound(type: SoundType, customPath?: string): Promise<void> {
  switch (platform()) {
    case "darwin":
      await playMacOS(type, customPath);
      break;
    case "linux":
      await playLinux(type, customPath);
      break;
    case "win32":
      await playWindows(type, customPath);
      break;
    default:
      throw new Error(`Unsupported platform: ${platform()}`);
  }
}
