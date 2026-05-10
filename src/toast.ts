import { exec } from "child_process";
import { platform } from "os";

function execAsync(command: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

export async function showToast(title: string, message: string): Promise<void> {
  switch (platform()) {
    case "darwin":
      await showMacOSToast(title, message);
      break;
    case "linux":
      await showLinuxToast(title, message);
      break;
    case "win32":
      await showWindowsToast(title, message);
      break;
    default:
      throw new Error(`Unsupported platform: ${platform()}`);
  }
}

async function showMacOSToast(title: string, message: string): Promise<void> {
  const escapedTitle = title.replace(/"/g, '\\"');
  const escapedMessage = message.replace(/"/g, '\\"');

  // Try osascript first (built-in)
  try {
    await execAsync(
      `osascript -e 'display notification "${escapedMessage}" with title "${escapedTitle}"'`
    );
    return;
  } catch {
    // Fallback to terminal-notifier if available
    try {
      await execAsync(
        `terminal-notifier -title "${escapedTitle}" -message "${escapedMessage}"`
      );
    } catch {
      // Silent fallback
    }
  }
}

async function showLinuxToast(title: string, message: string): Promise<void> {
  const escapedTitle = title.replace(/"/g, '\\"');
  const escapedMessage = message.replace(/"/g, '\\"');

  try {
    await execAsync(
      `notify-send "${escapedTitle}" "${escapedMessage}"`
    );
  } catch {
    // Silent fallback
  }
}

async function showWindowsToast(title: string, message: string): Promise<void> {
  const escapedTitle = title.replace(/'/g, "''");
  const escapedMessage = message.replace(/'/g, "''");

  const psCommand = `
    [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType=WindowsRuntime] | Out-Null
    $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
    $template.SelectSingleNode("//text[@id='1']").AppendChild($template.CreateTextNode('${escapedTitle}')) | Out-Null
    $template.SelectSingleNode("//text[@id='2']").AppendChild($template.CreateTextNode('${escapedMessage}')) | Out-Null
    $toast = [Windows.UI.Notifications.ToastNotification]::new($template)
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("OpenCode Alert").Show($toast)
  `;

  try {
    await execAsync(`powershell -Command "${psCommand}"`);
  } catch {
    // Fallback to simpler notification
    try {
      await execAsync(`powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('${escapedMessage}', '${escapedTitle}')"`);
    } catch {
      // Silent fallback
    }
  }
}
