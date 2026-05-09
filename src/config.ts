import { readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { existsSync } from "fs";

export interface AlertConfig {
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

export async function loadConfig(): Promise<AlertConfig> {
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
