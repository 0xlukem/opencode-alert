import { exec } from "child_process";
import { platform } from "os";
import { existsSync } from "fs";
import { join, resolve } from "path";
import { homedir } from "os";

function execAsync(command: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

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
    await execAsync(`afplay "${custom}"`);
    return;
  }

  const systemSound = SYSTEM_SOUNDS.darwin[type];
  await execAsync(`afplay /System/Library/Sounds/${systemSound}.aiff`);
}

async function playLinux(type: SoundType, customPath?: string): Promise<void> {
  const custom = getCustomSoundPath(type, customPath);

  if (custom) {
    try {
      await execAsync(`paplay "${custom}"`);
      return;
    } catch {
      try {
        await execAsync(`aplay "${custom}"`);
        return;
      } catch {
        try {
          await execAsync(`ffplay -nodisp -autoexit "${custom}"`);
          return;
        } catch {
          // Fall through to system sound
        }
      }
    }
  }

  const systemSound = SYSTEM_SOUNDS.linux[type];
  try {
    await execAsync(`canberra-gtk-play -i ${systemSound}`);
  } catch {
    try {
      await execAsync(`notify-send -i ${systemSound} "OpenCode Alert" "${type}"`);
    } catch {
      // Silent fallback
    }
  }
}

async function playWindows(type: SoundType, customPath?: string): Promise<void> {
  const custom = getCustomSoundPath(type, customPath);

  if (custom) {
    const psCommand = `Add-Type -AssemblyName System.Windows.Forms; $player = New-Object System.Media.SoundPlayer '${custom}'; $player.PlaySync()`;
    await execAsync(`powershell -Command "${psCommand}"`);
    return;
  }

  const systemSound = SYSTEM_SOUNDS.win32[type];
  const psCommand = `[System.Media.SystemSounds]::${systemSound}.Play()`;
  await execAsync(`powershell -Command "${psCommand}"`);
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
