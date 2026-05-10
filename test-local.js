const { exec } = require("child_process");
const { platform, homedir } = require("os");
const { existsSync, readFileSync } = require("fs");
const { join, resolve } = require("path");

// Mock execAsync to log instead of execute (dry-run test)
let lastCommand = null;
function execAsync(command) {
  lastCommand = command;
  console.log("[DRY-RUN] Would execute:", command);
  return Promise.resolve({ stdout: "", stderr: "" });
}

// Config logic
function loadConfig() {
  const configPath = join(homedir(), ".config", "opencode", "alert.json");
  if (!existsSync(configPath)) {
    return { soundEnabled: true, toastEnabled: true };
  }
  try {
    const content = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(content);
    return {
      soundEnabled: parsed.soundEnabled ?? true,
      toastEnabled: parsed.toastEnabled ?? true,
      sounds: parsed.sounds,
    };
  } catch {
    return { soundEnabled: true, toastEnabled: true };
  }
}

// Sound logic
const SYSTEM_SOUNDS = {
  darwin: { success: "Glass", attention: "Submarine", error: "Basso" },
  linux: { success: "dialog-information", attention: "dialog-warning", error: "dialog-error" },
  win32: { success: "SystemExclamation", attention: "SystemAsterisk", error: "SystemHand" },
};

function getCustomSoundPath(type, customPath) {
  if (customPath && existsSync(customPath)) return resolve(customPath);
  const configDir = join(homedir(), ".config", "opencode", "sounds");
  const defaultPath = join(configDir, `${type}.mp3`);
  if (existsSync(defaultPath)) return defaultPath;
  return null;
}

async function playSound(type, customPath) {
  const p = platform();
  const custom = getCustomSoundPath(type, customPath);
  if (p === "darwin") {
    if (custom) {
      await execAsync(`afplay "${custom}"`);
    } else {
      await execAsync(`afplay /System/Library/Sounds/${SYSTEM_SOUNDS.darwin[type]}.aiff`);
    }
  } else if (p === "linux") {
    if (custom) {
      try { await execAsync(`paplay "${custom}"`); return; } catch {}
      try { await execAsync(`aplay "${custom}"`); return; } catch {}
      try { await execAsync(`ffplay -nodisp -autoexit "${custom}"`); return; } catch {}
    }
    try { await execAsync(`canberra-gtk-play -i ${SYSTEM_SOUNDS.linux[type]}`); } catch {}
  } else if (p === "win32") {
    if (custom) {
      const ps = `Add-Type -AssemblyName System.Windows.Forms; $player = New-Object System.Media.SoundPlayer '${custom}'; $player.PlaySync()`;
      await execAsync(`powershell -Command "${ps}"`);
    } else {
      const ps = `[System.Media.SystemSounds]::${SYSTEM_SOUNDS.win32[type]}.Play()`;
      await execAsync(`powershell -Command "${ps}"`);
    }
  }
}

async function showToast(title, message) {
  const p = platform();
  const t = title.replace(/"/g, '\\"');
  const m = message.replace(/"/g, '\\"');
  if (p === "darwin") {
    await execAsync(`osascript -e 'display notification "${m}" with title "${t}"'`);
  } else if (p === "linux") {
    await execAsync(`notify-send "${t}" "${m}"`);
  } else if (p === "win32") {
    const ps = `[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType=WindowsRuntime] | Out-Null; $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02); $template.SelectSingleNode("//text[@id='1']").AppendChild($template.CreateTextNode('${title.replace(/'/g, "''")}')) | Out-Null; $template.SelectSingleNode("//text[@id='2']").AppendChild($template.CreateTextNode('${message.replace(/'/g, "''")}')) | Out-Null; $toast = [Windows.UI.Notifications.ToastNotification]::new($template); [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("OpenCode Alert").Show($toast)`;
    await execAsync(`powershell -Command "${ps}"`);
  }
}

// --- Tests ---

async function runTests() {
  console.log("Platform:", platform());
  console.log("Config:", loadConfig());
  console.log("");

  console.log("--- Test 1: Success sound (system fallback) ---");
  await playSound("success");
  console.log("");

  console.log("--- Test 2: Attention sound (system fallback) ---");
  await playSound("attention");
  console.log("");

  console.log("--- Test 3: Error sound (system fallback) ---");
  await playSound("error");
  console.log("");

  console.log("--- Test 4: Toast notification ---");
  await showToast("Test Title", "Test message from opencode-alert");
  console.log("");

  console.log("--- Test 5: Custom sound path (non-existent, should fallback) ---");
  await playSound("success", "/tmp/nonexistent.mp3");
  console.log("");

  console.log("All dry-run tests completed successfully!");
}

runTests().catch(console.error);
