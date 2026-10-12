import { expect, test } from "../fixtures/test.js";

test("home artwork, value propositions and purchase controls stay within their layout", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const locale of ["it", "en"]) {
    for (const width of [1624, 1440, 1050, 1024, 1001, 1000, 900, 768, 700, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`/${locale}`);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator(".hero-airplane")).toBeVisible();
      const layout: {
        overflow: boolean;
        clippedPlane: boolean;
        overlappingTitle: boolean;
        croppedPlane: boolean;
        overflowingText: boolean;
        overflowingButtons: boolean;
      } = await page.evaluate(() => {
        const hero: DOMRect = (
          document.querySelector(".hero") as HTMLElement
        ).getBoundingClientRect();
        const title: DOMRect = (
          document.querySelector(".hero h1") as HTMLElement
        ).getBoundingClientRect();
        const image: HTMLImageElement = document.querySelector(
          ".hero-airplane",
        ) as HTMLImageElement;
        const plane: DOMRect = image.getBoundingClientRect();
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          clippedPlane:
            plane.left < hero.left ||
            plane.right > hero.right ||
            plane.top < hero.top ||
            plane.bottom > hero.bottom,
          overlappingTitle:
            plane.left < title.right &&
            plane.right > title.left &&
            plane.top < title.bottom &&
            plane.bottom > title.top,
          croppedPlane:
            Math.abs(plane.width / plane.height - image.naturalWidth / image.naturalHeight) > 0.01,
          overflowingText: [...document.querySelectorAll(".value-props > div")].some((item) => {
            const card: DOMRect = item.getBoundingClientRect();
            const text: DOMRect = (
              item.querySelector("span") as HTMLElement
            ).getBoundingClientRect();
            return text.left < card.left || text.right > card.right + 1;
          }),
          overflowingButtons: [...document.querySelectorAll(".featured-grid .product-card")].some(
            (item) => {
              const card: DOMRect = item.getBoundingClientRect();
              const button: DOMRect = (
                item.querySelector("button[type=submit]") as HTMLElement
              ).getBoundingClientRect();
              return (
                button.left < card.left || button.right > card.right || button.bottom > card.bottom
              );
            },
          ),
        };
      });
      expect(layout, `${locale}, ${width}px`).toEqual({
        overflow: false,
        clippedPlane: false,
        overlappingTitle: false,
        croppedPlane: false,
        overflowingText: false,
        overflowingButtons: false,
      });
    }
  }
});
