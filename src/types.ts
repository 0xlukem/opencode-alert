export type SoundType = "success" | "attention" | "error";

export interface AlertConfig {
  soundEnabled: boolean;
  toastEnabled: boolean;
  sounds?: {
    success?: string;
    attention?: string;
    error?: string;
  };
}

export interface PluginContext {
  project: any;
  client: any;
  $: any;
  directory: string;
  worktree: string;
}
