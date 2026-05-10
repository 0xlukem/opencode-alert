jest.mock("os", () => ({
  platform: jest.fn().mockReturnValue("darwin"),
}));

jest.mock("child_process", () => ({
  exec: jest.fn((cmd: string, cb: Function) => cb(null, "", "")),
}));

import { showToast } from "../toast";
import { platform } from "os";
import { exec } from "child_process";

const mockPlatform = platform as jest.Mock;
const mockExec = exec as unknown as jest.Mock;

describe("showToast", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExec.mockImplementation((cmd: string, cb: Function) => cb(null, "", ""));
  });

  describe("macOS (darwin)", () => {
    beforeEach(() => {
      mockPlatform.mockReturnValue("darwin");
    });

    it("shows toast using osascript", async () => {
      await showToast("Test Title", "Test Message");

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('display notification "Test Message" with title "Test Title"'),
        expect.any(Function)
      );
    });

    it("escapes quotes in title and message", async () => {
      await showToast('Title with "quotes"', 'Message with "quotes"');

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('display notification "Message with \\"quotes\\"" with title "Title with \\"quotes\\""'),
        expect.any(Function)
      );
    });

    it("falls back to terminal-notifier when osascript fails", async () => {
      mockExec
        .mockImplementationOnce((cmd: string, cb: Function) => cb(new Error("osascript failed")))
        .mockImplementationOnce((cmd: string, cb: Function) => cb(null, "", ""));

      await showToast("Test", "Message");

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('terminal-notifier'),
        expect.any(Function)
      );
    });
  });

  describe("Linux", () => {
    beforeEach(() => {
      mockPlatform.mockReturnValue("linux");
    });

    it("shows toast using notify-send", async () => {
      await showToast("Test Title", "Test Message");

      expect(mockExec).toHaveBeenCalledWith('notify-send "Test Title" "Test Message"', expect.any(Function));
    });

    it("escapes quotes in title and message", async () => {
      await showToast('Title with "quotes"', 'Message with "quotes"');

      expect(mockExec).toHaveBeenCalledWith('notify-send "Title with \\"quotes\\"" "Message with \\"quotes\\""', expect.any(Function));
    });

    it("handles notify-send not being available", async () => {
      mockExec.mockImplementation((cmd: string, cb: Function) => cb(new Error("notify-send not found")));

      await showToast("Test", "Message");

      expect(mockExec).toHaveBeenCalledWith('notify-send "Test" "Message"', expect.any(Function));
    });
  });

  describe("Windows (win32)", () => {
    beforeEach(() => {
      mockPlatform.mockReturnValue("win32");
    });

    it("shows toast using PowerShell", async () => {
      await showToast("Test Title", "Test Message");

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining("ToastNotificationManager"),
        expect.any(Function)
      );
    });

    it("escapes single quotes in title and message", async () => {
      await showToast("Title with 'quotes'", "Message with 'quotes'");

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining("Title with ''quotes''"),
        expect.any(Function)
      );
    });

    it("falls back to MessageBox when toast fails", async () => {
      mockExec
        .mockImplementationOnce((cmd: string, cb: Function) => cb(new Error("Toast failed")))
        .mockImplementationOnce((cmd: string, cb: Function) => cb(null, "", ""));

      await showToast("Test", "Message");

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining("MessageBox"),
        expect.any(Function)
      );
    });
  });

  describe("unsupported platform", () => {
    it("throws error for unsupported platforms", async () => {
      mockPlatform.mockReturnValue("freebsd");

      await expect(showToast("Test", "Message")).rejects.toThrow("Unsupported platform: freebsd");
    });
  });
});
