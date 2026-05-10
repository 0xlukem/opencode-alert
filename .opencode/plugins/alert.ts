import type { Plugin } from "@opencode-ai/plugin";
import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";
import { homedir, platform } from "os";
import { exec } from "child_process";

// --- Exec Helper (no promisify for compatibility) ---

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

// --- Config ---

interface AlertConfig {
  soundEnabled: boolean;
  toastEnabled: boolean;
  sounds?: {
    success?: string;
    attention?: string;
    error?: string;
  };
}

const DEFAULT_CONFIG: AlertConfig = {
  soundEnabled: true,
  toastEnabled: true,
};

function loadConfig(): AlertConfig {
  const configPath = join(homedir(), ".config", "opencode", "alert.json");

  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(content) as Partial<AlertConfig>;
    return {
      soundEnabled: parsed.soundEnabled ?? DEFAULT_CONFIG.soundEnabled,
      toastEnabled: parsed.toastEnabled ?? DEFAULT_CONFIG.toastEnabled,
      sounds: parsed.sounds,
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

// --- Sound ---

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
    const ps = `Add-Type -AssemblyName System.Windows.Forms; $player = New-Object System.Media.SoundPlayer '${custom}'; $player.PlaySync()`;
    await execAsync(`powershell -Command "${ps}"`);
    return;
  }
  const systemSound = SYSTEM_SOUNDS.win32[type];
  const ps = `[System.Media.SystemSounds]::${systemSound}.Play()`;
  await execAsync(`powershell -Command "${ps}"`);
}

async function playSound(type: SoundType, customPath?: string): Promise<void> {
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

// --- Toast ---

async function showMacOSToast(title: string, message: string): Promise<void> {
  const t = title.replace(/"/g, '\\"');
  const m = message.replace(/"/g, '\\"');
  try {
    await execAsync(`osascript -e 'display notification "${m}" with title "${t}"'`);
  } catch {
    try {
      await execAsync(`terminal-notifier -title "${t}" -message "${m}"`);
    } catch {
      // Silent fallback
    }
  }
}

async function showLinuxToast(title: string, message: string): Promise<void> {
  const t = title.replace(/"/g, '\\"');
  const m = message.replace(/"/g, '\\"');
  try {
    await execAsync(`notify-send "${t}" "${m}"`);
  } catch {
    // Silent fallback
  }
}

async function showWindowsToast(title: string, message: string): Promise<void> {
  const t = title.replace(/'/g, "''");
  const m = message.replace(/'/g, "''");
  const ps = `
    [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType=WindowsRuntime] | Out-Null
    $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
    $template.SelectSingleNode("//text[@id='1']").AppendChild($template.CreateTextNode('${t}')) | Out-Null
    $template.SelectSingleNode("//text[@id='2']").AppendChild($template.CreateTextNode('${m}')) | Out-Null
    $toast = [Windows.UI.Notifications.ToastNotification]::new($template)
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("OpenCode Alert").Show($toast)
  `;
  try {
    await execAsync(`powershell -Command "${ps}"`);
  } catch {
    try {
      await execAsync(`powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('${m}', '${t}')"`);
    } catch {
      // Silent fallback
    }
  }
}

async function showToast(title: string, message: string): Promise<void> {
  switch (platform()) {
    case "darwin":
      await showMacOSToast(title, message);
      break;
    case "linux":
      await showLinuxToast(title, message);
      break;
    case "win32":
      await showWindowsToast(title, message);
      break;
    default:
      throw new Error(`Unsupported platform: ${platform()}`);
  }
}

// --- Main Plugin ---

export const OpenCodeAlert: Plugin = async (ctx) => {
  const config = loadConfig();

  const handle = async (type: SoundType, title: string, message: string) => {
    if (config.soundEnabled) {
      await playSound(type, config.sounds?.[type]).catch(() => {});
    }
    if (config.toastEnabled) {
      await showToast(title, message).catch(() => {});
    }
  };

  return {
    event: async ({ event }: { event: any }) => {
      switch (event.type) {
        case "session.idle": {
          await handle("success", "OpenCode — Task Complete", "The AI has finished its task.");
          break;
        }
        case "session.error": {
          const errorMessage = event.properties?.error?.message || "Something went wrong. Check the session.";
          await handle("error", "OpenCode — Error", errorMessage);
          break;
        }
        case "tui.toast.show": {
          if (event.properties?.variant === "error") {
            await handle("error", "OpenCode — Error", event.properties.message || "An error occurred.");
          }
          break;
        }
      }
    },

    "permission.ask": async (_input: any, _output: any) => {
      await handle("attention", "OpenCode — Attention Needed", "The AI needs your input to continue.");
    },
  };
};

export default OpenCodeAlert;
