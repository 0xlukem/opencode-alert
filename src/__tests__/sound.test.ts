import { EventEmitter } from "events";

jest.mock("os", () => ({
  platform: jest.fn().mockReturnValue("darwin"),
  homedir: jest.fn().mockReturnValue("/home/user"),
}));

jest.mock("fs", () => ({
  existsSync: jest.fn().mockReturnValue(false),
}));

jest.mock("child_process", () => ({
  spawn: jest.fn(),
}));

import { playSound } from "../sound";
import { platform } from "os";
import { existsSync } from "fs";
import { spawn } from "child_process";

const mockPlatform = platform as jest.Mock;
const mockExistsSync = existsSync as jest.Mock;
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

describe("playSound", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSpawn.mockImplementation(() => createMockChildProcess(0));
  });

  describe("macOS (darwin)", () => {
    beforeEach(() => {
      mockPlatform.mockReturnValue("darwin");
    });

    it("plays custom MP3 when file exists", async () => {
      mockExistsSync.mockReturnValue(true);

      await playSound("success", "/custom/success.mp3");

      expect(mockSpawn).toHaveBeenCalledWith(
        "afplay",
        ["/custom/success.mp3"],
        expect.anything()
      );
    });

    it("does not allow shell injection in custom path", async () => {
      mockExistsSync.mockReturnValue(true);

      const maliciousPath = '/custom/success"; $(id).mp3';
      await playSound("success", maliciousPath);

      expect(mockSpawn).toHaveBeenCalledWith(
        "afplay",
        [maliciousPath],
        expect.anything()
      );
    });

    it("falls back to system sound when no custom file", async () => {
      mockExistsSync.mockReturnValue(false);

      await playSound("success");

      expect(mockSpawn).toHaveBeenCalledWith(
        "afplay",
        ["/System/Library/Sounds/Glass.aiff"],
        expect.anything()
      );
    });

    it("plays correct system sounds for each type", async () => {
      mockExistsSync.mockReturnValue(false);

      await playSound("attention");
      expect(mockSpawn).toHaveBeenCalledWith(
        "afplay",
        ["/System/Library/Sounds/Submarine.aiff"],
        expect.anything()
      );

      mockSpawn.mockClear();
      await playSound("error");
      expect(mockSpawn).toHaveBeenCalledWith(
        "afplay",
        ["/System/Library/Sounds/Basso.aiff"],
        expect.anything()
      );
    });
  });

  describe("Linux", () => {
    beforeEach(() => {
      mockPlatform.mockReturnValue("linux");
    });

    it("tries paplay first for custom MP3", async () => {
      mockExistsSync.mockReturnValue(true);

      await playSound("success", "/custom/success.mp3");

      expect(mockSpawn).toHaveBeenCalledWith(
        "paplay",
        ["/custom/success.mp3"],
        expect.anything()
      );
    });

    it("falls back to aplay when paplay fails", async () => {
      mockExistsSync.mockReturnValue(true);
      mockSpawn
        .mockImplementationOnce(() => createMockChildProcess(1))
        .mockImplementationOnce(() => createMockChildProcess(0));

      await playSound("success", "/custom/success.mp3");

      expect(mockSpawn).toHaveBeenCalledWith(
        "aplay",
        ["/custom/success.mp3"],
        expect.anything()
      );
    });

    it("falls back to ffplay when paplay and aplay fail", async () => {
      mockExistsSync.mockReturnValue(true);
      mockSpawn
        .mockImplementationOnce(() => createMockChildProcess(1))
        .mockImplementationOnce(() => createMockChildProcess(1))
        .mockImplementationOnce(() => createMockChildProcess(0));

      await playSound("success", "/custom/success.mp3");

      expect(mockSpawn).toHaveBeenCalledWith(
        "ffplay",
        ["-nodisp", "-autoexit", "/custom/success.mp3"],
        expect.anything()
      );
    });

    it("does not allow shell injection in custom path", async () => {
      mockExistsSync.mockReturnValue(true);

      const maliciousPath = '/custom/success"; $(id).mp3';
      await playSound("success", maliciousPath);

      expect(mockSpawn).toHaveBeenCalledWith(
        "paplay",
        [maliciousPath],
        expect.anything()
      );
    });

    it("falls back to system sound when no custom file", async () => {
      mockExistsSync.mockReturnValue(false);

      await playSound("success");

      expect(mockSpawn).toHaveBeenCalledWith(
        "canberra-gtk-play",
        ["-i", "dialog-information"],
        expect.anything()
      );
    });

    it("falls back to notify-send when canberra fails", async () => {
      mockExistsSync.mockReturnValue(false);
      mockSpawn
        .mockImplementationOnce(() => createMockChildProcess(1))
        .mockImplementationOnce(() => createMockChildProcess(0));

      await playSound("error");

      expect(mockSpawn).toHaveBeenCalledWith(
        "notify-send",
        ["-i", "dialog-error", "OpenCode Alert", "error"],
        expect.anything()
      );
    });
  });

  describe("Windows (win32)", () => {
    beforeEach(() => {
      mockPlatform.mockReturnValue("win32");
    });

    it("plays custom MP3 when file exists", async () => {
      mockExistsSync.mockReturnValue(true);

      await playSound("success", "C:\\sounds\\success.mp3");

      expect(mockSpawn).toHaveBeenCalledWith(
        "powershell",
        expect.arrayContaining([
          "-Command",
          expect.stringContaining("WMPlayer.OCX.7"),
        ]),
        expect.anything()
      );
    });

    it("does not allow shell injection in custom path", async () => {
      mockExistsSync.mockReturnValue(true);

      const maliciousPath = "C:\\sounds\\success'; Remove-Item C:\\ -Recurse; '.mp3";
      await playSound("success", maliciousPath);

      const [, args] = mockSpawn.mock.calls[0];
      const script = args[1];
      // PowerShell single quotes must be doubled inside the string literal
      expect(script).toContain("''");
      // The entire path should remain inside the single-quoted PowerShell string
      expect(script).toMatch(
        /WMPlayer\.OCX\.7.*URL = '[^']*(?:''[^']*)*'/s
      );
    });

    it("falls back to ffplay when WMP COM object fails", async () => {
      mockExistsSync.mockReturnValue(true);
      mockSpawn
        .mockImplementationOnce(() => createMockChildProcess(1))
        .mockImplementationOnce(() => createMockChildProcess(0));

      await playSound("success", "C:\\sounds\\success.mp3");

      expect(mockSpawn).toHaveBeenCalledWith(
        "ffplay",
        expect.arrayContaining(["-nodisp", "-autoexit"]),
        expect.anything()
      );
    });

    it("falls back to system sound when no custom file", async () => {
      mockExistsSync.mockReturnValue(false);

      await playSound("error");

      expect(mockSpawn).toHaveBeenCalledWith(
        "powershell",
        expect.arrayContaining([
          "-Command",
          expect.stringContaining("SystemSounds]::SystemHand.Play()"),
        ]),
        expect.anything()
      );
    });
  });

  describe("unsupported platform", () => {
    it("throws error for unsupported platforms", async () => {
      mockPlatform.mockReturnValue("freebsd");

      await expect(playSound("success")).rejects.toThrow(
        "Unsupported platform: freebsd"
      );
    });
  });
});
