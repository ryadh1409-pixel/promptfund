type ClipboardModule = {
  setStringAsync: (value: string) => Promise<void>;
};

let clipboardModule: ClipboardModule | null | undefined;

function resolveClipboardModule(): ClipboardModule | null {
  if (clipboardModule !== undefined) {
    return clipboardModule;
  }

  try {
    // Lazy require so missing native modules never crash route loading.
    const mod = require('expo-clipboard') as {
      setStringAsync?: (value: string) => Promise<void>;
      default?: { setStringAsync?: (value: string) => Promise<void> };
    };

    const setStringAsync = mod.setStringAsync ?? mod.default?.setStringAsync;
    if (typeof setStringAsync === 'function') {
      clipboardModule = { setStringAsync: (value) => setStringAsync(value) };
      return clipboardModule;
    }
  } catch {
    // Clipboard unavailable in this runtime.
  }

  clipboardModule = null;
  return clipboardModule;
}

export function isClipboardAvailable(): boolean {
  return resolveClipboardModule() !== null;
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  const clipboard = resolveClipboardModule();
  if (!clipboard) {
    return false;
  }

  try {
    await clipboard.setStringAsync(text);
    return true;
  } catch {
    return false;
  }
}
