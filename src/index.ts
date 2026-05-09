import { loadConfig } from "./config";
import { playSound } from "./sound";
import { showToast } from "./toast";

export const OpenCodeAlert = async (ctx: any) => {
  const config = await loadConfig();

  const handleEvent = async (type: "success" | "attention" | "error", title: string, message: string) => {
    if (config.soundEnabled) {
      await playSound(type, config.sounds?.[type]).catch(() => {});
    }
    if (config.toastEnabled) {
      await showToast(title, message).catch(() => {});
    }
  };

  return {
    "session.idle": async () => {
      await handleEvent("success", "OpenCode — Task Complete", "The AI has finished its task.");
    },

    "session.error": async () => {
      await handleEvent("error", "OpenCode — Error", "Something went wrong. Check the session.");
    },

    "permission.asked": async () => {
      await handleEvent("attention", "OpenCode — Attention Needed", "The AI needs your input to continue.");
    },

    "tui.toast.show": async (input: any) => {
      if (input?.output?.type === "error") {
        await handleEvent("error", "OpenCode — Error", input.output.message || "An error occurred.");
      }
    },
  };
};

export default OpenCodeAlert;
