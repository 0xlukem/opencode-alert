import { EventEmitter } from "events";

jest.mock("os", () => ({
  platform: jest.fn().mockReturnValue("darwin"),
}));

jest.mock("child_process", () => ({
  spawn: jest.fn(),
}));

import { showToast } from "../toast";
import { platform } from "os";
import { spawn } from "child_process";

const mockPlatform = platform as jest.Mock;
const mockSpawn = spawn as unknown as jest.Mock;

function createMockChildProcess(exitCode: number = 0) {
  const child = new EventEmitter() as any;
  child.stdout = undefined;
  child.stderr = undefined;
  process.nextTick(() => {
    child.emit("close", exitCode);
  });
  return child;
}

describe("showToast", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSpawn.mockImplementation(() => createMockChildProcess(0));
  });

  describe("macOS (darwin)", () => {
    beforeEach(() => {
      mockPlatform.mockReturnValue("darwin");
    });

    it("shows toast using osascript", async () => {
      await showToast("Test Title", "Test Message");

      expect(mockSpawn).toHaveBeenCalledWith(
        "osascript",
        expect.arrayContaining([
          "-e",
          'display notification "Test Message" with title "Test Title"',
        ]),
        expect.objectContaining({ shell: false })
      );
    });

    it("escapes quotes in title and message for osascript", async () => {
      await showToast('Title with "quotes"', 'Message with "quotes"');

      expect(mockSpawn).toHaveBeenCalledWith(
        "osascript",
        expect.arrayContaining([
          "-e",
          'display notification "Message with \\"quotes\\"" with title "Title with \\"quotes\\""',
        ]),
        expect.anything()
      );
    });

    it("does not allow shell injection via backticks, dollars or semicolons", async () => {
      const maliciousTitle = 'Title"; `rm -rf /` $(id)';
      const maliciousMessage = 'Message"; $HOME';

      await showToast(maliciousTitle, maliciousMessage);

      // With spawn + shell: false, the shell never sees these characters.
      // They should be passed literally into the AppleScript string.
      const [, args] = mockSpawn.mock.calls[0];
      const script = args[1];
      expect(script).toContain('\\"');
      expect(script).toContain("rm -rf /");
      expect(script).toContain("$(id)");
      expect(script).toContain("$HOME");
    });

    it("falls back to terminal-notifier when osascript fails", async () => {
      mockSpawn
        .mockImplementationOnce(() => createMockChildProcess(1))
        .mockImplementationOnce(() => createMockChildProcess(0));

      await showToast("Test", "Message");

      expect(mockSpawn).toHaveBeenCalledWith(
        "terminal-notifier",
        ["-title", "Test", "-message", "Message"],
        expect.anything()
      );
    });
  });

  describe("Linux", () => {
    beforeEach(() => {
      mockPlatform.mockReturnValue("linux");
    });

    it("shows toast using notify-send", async () => {
      await showToast("Test Title", "Test Message");

      expect(mockSpawn).toHaveBeenCalledWith(
        "notify-send",
        ["Test Title", "Test Message"],
        expect.anything()
      );
    });

    it("does not allow shell injection on Linux", async () => {
      const maliciousTitle = 'Title"; `rm -rf /` $(id)';
      const maliciousMessage = 'Message"; $HOME';

      await showToast(maliciousTitle, maliciousMessage);

      expect(mockSpawn).toHaveBeenCalledWith(
        "notify-send",
        [maliciousTitle, maliciousMessage],
        expect.anything()
      );
    });

    it("handles notify-send not being available", async () => {
      mockSpawn.mockImplementation(() => createMockChildProcess(1));

      await showToast("Test", "Message");

      expect(mockSpawn).toHaveBeenCalledWith(
        "notify-send",
        ["Test", "Message"],
        expect.anything()
      );
    });
  });

  describe("Windows (win32)", () => {
    beforeEach(() => {
      mockPlatform.mockReturnValue("win32");
    });

    it("shows toast using PowerShell", async () => {
      await showToast("Test Title", "Test Message");

      expect(mockSpawn).toHaveBeenCalledWith(
        "powershell",
        expect.arrayContaining([
          "-Command",
          expect.stringContaining("ToastNotificationManager"),
        ]),
        expect.anything()
      );
    });

    it("escapes single quotes in title and message", async () => {
      await showToast("Title with 'quotes'", "Message with 'quotes'");

      const [, args] = mockSpawn.mock.calls[0];
      const script = args[1];
      expect(script).toContain("Title with ''quotes''");
      expect(script).toContain("Message with ''quotes''");
    });

    it("falls back to MessageBox when toast fails", async () => {
      mockSpawn
        .mockImplementationOnce(() => createMockChildProcess(1))
        .mockImplementationOnce(() => createMockChildProcess(0));

      await showToast("Test", "Message");

      expect(mockSpawn).toHaveBeenCalledWith(
        "powershell",
        expect.arrayContaining([
          "-Command",
          expect.stringContaining("MessageBox"),
        ]),
        expect.anything()
      );
    });
  });

  describe("unsupported platform", () => {
    it("throws error for unsupported platforms", async () => {
      mockPlatform.mockReturnValue("freebsd");

      await expect(showToast("Test", "Message")).rejects.toThrow(
        "Unsupported platform: freebsd"
      );
    });
  });
});
