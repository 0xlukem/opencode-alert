jest.mock("../config");
jest.mock("../sound");
jest.mock("../toast");

import { OpenCodeAlert } from "../index";
import { loadConfig } from "../config";
import { playSound } from "../sound";
import { showToast } from "../toast";

const mockLoadConfig = loadConfig as jest.Mock;
const mockPlaySound = playSound as jest.Mock;
const mockShowToast = showToast as jest.Mock;

describe("OpenCodeAlert", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockPlaySound.mockResolvedValue(undefined);
    mockShowToast.mockResolvedValue(undefined);
  });

  it("subscribes to correct OpenCode hooks", async () => {
    mockLoadConfig.mockResolvedValue({
      soundEnabled: true,
      toastEnabled: true,
    });

    const plugin = await OpenCodeAlert({});

    expect(plugin["event"]).toBeDefined();
    expect(plugin["permission.ask"]).toBeDefined();
  });

  describe("event hook", () => {
    describe("session.idle", () => {
      it("plays success sound and shows toast when enabled", async () => {
        mockLoadConfig.mockResolvedValue({
          soundEnabled: true,
          toastEnabled: true,
        });

        const plugin = await OpenCodeAlert({});
        await (plugin["event"] as Function)({
          event: { type: "session.idle", properties: { sessionID: "123" } },
        });

        expect(mockPlaySound).toHaveBeenCalledWith("success", undefined);
        expect(mockShowToast).toHaveBeenCalledWith(
          "OpenCode — Task Complete",
          "The AI has finished its task."
        );
      });

      it("only plays sound when toast is disabled", async () => {
        mockLoadConfig.mockResolvedValue({
          soundEnabled: true,
          toastEnabled: false,
        });

        const plugin = await OpenCodeAlert({});
        await (plugin["event"] as Function)({
          event: { type: "session.idle", properties: { sessionID: "123" } },
        });

        expect(mockPlaySound).toHaveBeenCalled();
        expect(mockShowToast).not.toHaveBeenCalled();
      });

      it("only shows toast when sound is disabled", async () => {
        mockLoadConfig.mockResolvedValue({
          soundEnabled: false,
          toastEnabled: true,
        });

        const plugin = await OpenCodeAlert({});
        await (plugin["event"] as Function)({
          event: { type: "session.idle", properties: { sessionID: "123" } },
        });

        expect(mockPlaySound).not.toHaveBeenCalled();
        expect(mockShowToast).toHaveBeenCalled();
      });

      it("does nothing when both are disabled", async () => {
        mockLoadConfig.mockResolvedValue({
          soundEnabled: false,
          toastEnabled: false,
        });

        const plugin = await OpenCodeAlert({});
        await (plugin["event"] as Function)({
          event: { type: "session.idle", properties: { sessionID: "123" } },
        });

        expect(mockPlaySound).not.toHaveBeenCalled();
        expect(mockShowToast).not.toHaveBeenCalled();
      });
    });

    describe("session.error", () => {
      it("plays error sound and shows toast", async () => {
        mockLoadConfig.mockResolvedValue({
          soundEnabled: true,
          toastEnabled: true,
        });

        const plugin = await OpenCodeAlert({});
        await (plugin["event"] as Function)({
          event: {
            type: "session.error",
            properties: { sessionID: "123", error: { message: "Something broke" } },
          },
        });

        expect(mockPlaySound).toHaveBeenCalledWith("error", undefined);
        expect(mockShowToast).toHaveBeenCalledWith(
          "OpenCode — Error",
          "Something broke"
        );
      });

      it("uses fallback message when error has no message", async () => {
        mockLoadConfig.mockResolvedValue({
          soundEnabled: true,
          toastEnabled: true,
        });

        const plugin = await OpenCodeAlert({});
        await (plugin["event"] as Function)({
          event: { type: "session.error", properties: { sessionID: "123" } },
        });

        expect(mockShowToast).toHaveBeenCalledWith(
          "OpenCode — Error",
          "Something went wrong. Check the session."
        );
      });
    });

    describe("tui.toast.show", () => {
      it("plays error sound for error toasts", async () => {
        mockLoadConfig.mockResolvedValue({
          soundEnabled: true,
          toastEnabled: true,
        });

        const plugin = await OpenCodeAlert({});
        await (plugin["event"] as Function)({
          event: {
            type: "tui.toast.show",
            properties: { message: "Custom error message", variant: "error" },
          },
        });

        expect(mockPlaySound).toHaveBeenCalledWith("error", undefined);
        expect(mockShowToast).toHaveBeenCalledWith(
          "OpenCode — Error",
          "Custom error message"
        );
      });

      it("does nothing for non-error toasts", async () => {
        mockLoadConfig.mockResolvedValue({
          soundEnabled: true,
          toastEnabled: true,
        });

        const plugin = await OpenCodeAlert({});
        await (plugin["event"] as Function)({
          event: {
            type: "tui.toast.show",
            properties: { message: "Info message", variant: "info" },
          },
        });

        expect(mockPlaySound).not.toHaveBeenCalled();
        expect(mockShowToast).not.toHaveBeenCalled();
      });
    });
  });

  describe("permission.ask hook", () => {
    it("plays attention sound and shows toast", async () => {
      mockLoadConfig.mockResolvedValue({
        soundEnabled: true,
        toastEnabled: true,
      });

      const plugin = await OpenCodeAlert({});
      const output = { status: "ask" };
      await (plugin["permission.ask"] as Function)({}, output);

      expect(mockPlaySound).toHaveBeenCalledWith("attention", undefined);
      expect(mockShowToast).toHaveBeenCalledWith(
        "OpenCode — Attention Needed",
        "The AI needs your input to continue."
      );
    });
  });

  describe("custom sounds", () => {
    it("uses custom sound paths from config", async () => {
      mockLoadConfig.mockResolvedValue({
        soundEnabled: true,
        toastEnabled: false,
        sounds: {
          success: "/custom/success.mp3",
          attention: "/custom/attention.mp3",
          error: "/custom/error.mp3",
        },
      });

      const plugin = await OpenCodeAlert({});
      await (plugin["event"] as Function)({
        event: { type: "session.idle", properties: { sessionID: "123" } },
      });

      expect(mockPlaySound).toHaveBeenCalledWith("success", "/custom/success.mp3");
    });
  });

  describe("error handling", () => {
    it("does not crash when sound fails", async () => {
      mockLoadConfig.mockResolvedValue({
        soundEnabled: true,
        toastEnabled: true,
      });
      mockPlaySound.mockRejectedValue(new Error("Sound failed"));

      const plugin = await OpenCodeAlert({});

      await expect(
        (plugin["event"] as Function)({
          event: { type: "session.idle", properties: { sessionID: "123" } },
        })
      ).resolves.not.toThrow();
      expect(mockShowToast).toHaveBeenCalled();
    });

    it("does not crash when toast fails", async () => {
      mockLoadConfig.mockResolvedValue({
        soundEnabled: true,
        toastEnabled: true,
      });
      mockShowToast.mockRejectedValue(new Error("Toast failed"));

      const plugin = await OpenCodeAlert({});

      await expect(
        (plugin["event"] as Function)({
          event: { type: "session.idle", properties: { sessionID: "123" } },
        })
      ).resolves.not.toThrow();
      expect(mockPlaySound).toHaveBeenCalled();
    });
  });
});
