import { expect, test } from "@playwright/test";

for (const width of [1440, 390]) {
  for (const variant of ["thread", "hero"]) {
    for (const notice of ["recovery", "stream", "fallback"]) {
      test(`${notice} aligns with ${variant} composer at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.addInitScript(({ dark, locale }) => {
          localStorage.setItem("nanobot.locale", locale);
          document.addEventListener("DOMContentLoaded", () => {
            document.documentElement.classList.toggle("dark", dark);
          });
        }, { dark: variant === "hero", locale: width === 390 ? "zh-CN" : "en" });
        await page.goto(`/browser/fixture.html?case=chat-failure&notice=${notice}&variant=${variant}`);
        const alert = page.locator(".thread-composer-notice");
        const composer = page.locator(".thread-composer-surface");
        await expect(alert).toBeVisible();
        await expect(composer).toBeVisible();
        const noticeBox = (await alert.boundingBox())!;
        const composerBox = (await composer.boundingBox())!;
        expect(Math.abs(noticeBox.x - composerBox.x)).toBeLessThan(1);
        expect(Math.abs(noticeBox.width - composerBox.width)).toBeLessThan(1);
        for (const button of await alert.getByRole("button").all()) {
          await expect(button).toBeInViewport({ ratio: 1 });
          const box = (await button.boundingBox())!;
          expect(box.x).toBeGreaterThanOrEqual(noticeBox.x);
          expect(box.x + box.width).toBeLessThanOrEqual(noticeBox.x + noticeBox.width);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
        if (notice === "recovery") {
          await expect(alert).toContainText(width === 390 ? "模型提供商验证失败" : "Model provider authorization failed");
          await alert.getByRole("button").first().click();
          await expect(page.getByLabel("Fixture action")).toHaveText("settings");
          await alert.getByRole("button").last().click();
          await expect(alert).toBeHidden();
          await expect(page.getByLabel("Fixture action")).toHaveText("continued");
        } else {
          await alert.getByRole("button").last().click();
          await expect(alert).toBeHidden();
          await expect(page.getByLabel("Fixture action")).toHaveText("dismissed");
        }
      });
    }
  }
}

test("an image and quote do not move the message menu away from the text", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/browser/fixture.html?case=chat-failure");
  const image = page.getByAltText("Failure screenshot");
  await expect(image).toBeVisible();
  await expect(page.getByText("Earlier context / 之前的上下文")).toBeVisible();
  const bubble = page.locator("[data-user-text-bubble]");
  const trigger = page.locator("[data-message-block-menu-trigger]");
  await bubble.hover();
  await expect(trigger).toBeVisible();
  const bubbleBox = (await bubble.boundingBox())!;
  const triggerBox = (await trigger.boundingBox())!;
  const imageBox = (await image.boundingBox())!;
  expect(imageBox.y + imageBox.height).toBeLessThan(bubbleBox.y);
  expect(triggerBox.y).toBeGreaterThanOrEqual(bubbleBox.y);
  expect(triggerBox.y + triggerBox.height).toBeLessThanOrEqual(bubbleBox.y + bubbleBox.height);
  await trigger.click();
  await expect(page.locator("[data-message-block-menu]")).toBeVisible();
});
