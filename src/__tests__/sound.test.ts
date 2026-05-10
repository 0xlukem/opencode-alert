jest.mock("os", () => ({
  platform: jest.fn().mockReturnValue("darwin"),
  homedir: jest.fn().mockReturnValue("/home/user"),
}));

jest.mock("fs", () => ({
  existsSync: jest.fn().mockReturnValue(false),
}));

jest.mock("child_process", () => ({
  exec: jest.fn((cmd: string, cb: Function) => cb(null, "", "")),
}));

import { playSound } from "../sound";
import { platform } from "os";
import { existsSync } from "fs";
import { exec } from "child_process";

const mockPlatform = platform as jest.Mock;
const mockExistsSync = existsSync as jest.Mock;
const mockExec = exec as unknown as jest.Mock;

describe("playSound", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExec.mockImplementation((cmd: string, cb: Function) => cb(null, "", ""));
  });

  describe("macOS (darwin)", () => {
    beforeEach(() => {
      mockPlatform.mockReturnValue("darwin");
    });

    it("plays custom MP3 when file exists", async () => {
      mockExistsSync.mockReturnValue(true);

      await playSound("success", "/custom/success.mp3");

      expect(mockExec).toHaveBeenCalledWith('afplay "/custom/success.mp3"', expect.any(Function));
    });

    it("falls back to system sound when no custom file", async () => {
      mockExistsSync.mockReturnValue(false);

      await playSound("success");

      expect(mockExec).toHaveBeenCalledWith("afplay /System/Library/Sounds/Glass.aiff", expect.any(Function));
    });

    it("plays correct system sounds for each type", async () => {
      mockExistsSync.mockReturnValue(false);

      await playSound("attention");
      expect(mockExec).toHaveBeenCalledWith("afplay /System/Library/Sounds/Submarine.aiff", expect.any(Function));

      mockExec.mockClear();
      await playSound("error");
      expect(mockExec).toHaveBeenCalledWith("afplay /System/Library/Sounds/Basso.aiff", expect.any(Function));
    });
  });

  describe("Linux", () => {
    beforeEach(() => {
      mockPlatform.mockReturnValue("linux");
    });

    it("tries paplay first for custom MP3", async () => {
      mockExistsSync.mockReturnValue(true);

      await playSound("success", "/custom/success.mp3");

      expect(mockExec).toHaveBeenCalledWith('paplay "/custom/success.mp3"', expect.any(Function));
    });

    it("falls back to aplay when paplay fails", async () => {
      mockExistsSync.mockReturnValue(true);
      mockExec
        .mockImplementationOnce((cmd: string, cb: Function) => cb(new Error("paplay not found")))
        .mockImplementationOnce((cmd: string, cb: Function) => cb(null, "", ""));

      await playSound("success", "/custom/success.mp3");

      expect(mockExec).toHaveBeenCalledWith('aplay "/custom/success.mp3"', expect.any(Function));
    });

    it("falls back to ffplay when paplay and aplay fail", async () => {
      mockExistsSync.mockReturnValue(true);
      mockExec
        .mockImplementationOnce((cmd: string, cb: Function) => cb(new Error("paplay not found")))
        .mockImplementationOnce((cmd: string, cb: Function) => cb(new Error("aplay not found")))
        .mockImplementationOnce((cmd: string, cb: Function) => cb(null, "", ""));

      await playSound("success", "/custom/success.mp3");

      expect(mockExec).toHaveBeenCalledWith('ffplay -nodisp -autoexit "/custom/success.mp3"', expect.any(Function));
    });

    it("falls back to system sound when no custom file", async () => {
      mockExistsSync.mockReturnValue(false);

      await playSound("success");

      expect(mockExec).toHaveBeenCalledWith("canberra-gtk-play -i dialog-information", expect.any(Function));
    });

    it("falls back to notify-send when canberra fails", async () => {
      mockExistsSync.mockReturnValue(false);
      mockExec
        .mockImplementationOnce((cmd: string, cb: Function) => cb(new Error("canberra not found")))
        .mockImplementationOnce((cmd: string, cb: Function) => cb(null, "", ""));

      await playSound("error");

      expect(mockExec).toHaveBeenCalledWith('notify-send -i dialog-error "OpenCode Alert" "error"', expect.any(Function));
    });
  });

  describe("Windows (win32)", () => {
    beforeEach(() => {
      mockPlatform.mockReturnValue("win32");
    });

    it("plays custom MP3 when file exists", async () => {
      mockExistsSync.mockReturnValue(true);

      await playSound("success", "C:\\sounds\\success.mp3");

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining("System.Media.SoundPlayer"),
        expect.any(Function)
      );
    });

    it("falls back to system sound when no custom file", async () => {
      mockExistsSync.mockReturnValue(false);

      await playSound("error");

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining("SystemSounds]::SystemHand.Play()"),
        expect.any(Function)
      );
    });
  });

  describe("unsupported platform", () => {
    it("throws error for unsupported platforms", async () => {
      mockPlatform.mockReturnValue("freebsd");

      await expect(playSound("success")).rejects.toThrow("Unsupported platform: freebsd");
    });
  });
});
