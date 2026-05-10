import { loadConfig } from "./config";
import { playSound } from "./sound";
import { showToast } from "./toast";

export { playSound, showToast };

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
    event: async ({ event }: { event: any }) => {
      switch (event.type) {
        case "session.idle": {
          await handleEvent("success", "OpenCode — Task Complete", "The AI has finished its task.");
          break;
        }
        case "session.error": {
          const errorMessage = event.properties?.error?.message || "Something went wrong. Check the session.";
          await handleEvent("error", "OpenCode — Error", errorMessage);
          break;
        }
        case "tui.toast.show": {
          if (event.properties?.variant === "error") {
            await handleEvent("error", "OpenCode — Error", event.properties.message || "An error occurred.");
          }
          break;
        }
      }
    },

    "permission.ask": async (_input: any, _output: any) => {
      await handleEvent("attention", "OpenCode — Attention Needed", "The AI needs your input to continue.");
    },
  };
};

export default OpenCodeAlert;
