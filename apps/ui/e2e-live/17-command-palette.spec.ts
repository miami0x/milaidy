import { test, expect, getAppText } from "./fixtures.js";

test.describe("Command Palette", () => {
  test("header contains command palette trigger or keyboard shortcut hint", async ({ appPage: page }) => {
    const text = await getAppText(page);
    // Look for any keyboard shortcut hint (Cmd+K, ⌘K, Ctrl+K, etc.) or "search"
    const hasShortcutHint = /cmd|ctrl|⌘|search|palette/i.test(text);
    expect(hasShortcutHint).toBe(true);
  });

  test("command palette state is initially closed", async ({ appPage: page }) => {
    const paletteOpen = await page.evaluate(() => {
      const app = document.querySelector("milaidy-app") as HTMLElement & {
        commandPaletteOpen?: boolean;
      };
      return app?.commandPaletteOpen ?? false;
    });
    expect(paletteOpen).toBe(false);
  });

  test("header has interactive buttons", async ({ appPage: page }) => {
    const buttonCount = await page.evaluate(() => {
      const app = document.querySelector("milaidy-app");
      if (!app || !app.shadowRoot) return 0;
      return app.shadowRoot.querySelectorAll("button").length;
    });
    expect(buttonCount).toBeGreaterThan(0);
  });
});
