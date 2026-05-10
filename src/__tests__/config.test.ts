import { loadConfig } from "../config";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

jest.mock("fs");
jest.mock("os");

describe("loadConfig", () => {
  const mockHomedir = "/home/testuser";
  const configPath = path.join(mockHomedir, ".config", "opencode", "alert.json");

  beforeEach(() => {
    jest.resetAllMocks();
    (os.homedir as jest.Mock).mockReturnValue(mockHomedir);
  });

  it("returns default config when file does not exist", async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    const config = await loadConfig();

    expect(config).toEqual({
      soundEnabled: true,
      toastEnabled: true,
    });
    expect(fs.existsSync).toHaveBeenCalledWith(configPath);
  });

  it("parses valid config file", async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(
      JSON.stringify({
        soundEnabled: false,
        toastEnabled: false,
        sounds: {
          success: "/custom/success.mp3",
          attention: "/custom/attention.mp3",
          error: "/custom/error.mp3",
        },
      })
    );

    const config = await loadConfig();

    expect(config).toEqual({
      soundEnabled: false,
      toastEnabled: false,
      sounds: {
        success: "/custom/success.mp3",
        attention: "/custom/attention.mp3",
        error: "/custom/error.mp3",
      },
    });
  });

  it("uses defaults for missing fields", async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(
      JSON.stringify({
        sounds: {
          success: "/custom/success.mp3",
        },
      })
    );

    const config = await loadConfig();

    expect(config).toEqual({
      soundEnabled: true,
      toastEnabled: true,
      sounds: {
        success: "/custom/success.mp3",
      },
    });
  });

  it("handles malformed JSON gracefully", async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue("not valid json");

    const config = await loadConfig();

    expect(config).toEqual({
      soundEnabled: true,
      toastEnabled: true,
    });
  });

  it("handles file read errors gracefully", async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockImplementation(() => {
      throw new Error("Permission denied");
    });

    const config = await loadConfig();

    expect(config).toEqual({
      soundEnabled: true,
      toastEnabled: true,
    });
  });
});
