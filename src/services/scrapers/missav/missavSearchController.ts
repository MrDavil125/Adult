import { load } from "cheerio";
import { ISearchVideoData } from "../../../interfaces";

async function launchBrowser() {
  if (process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const chromium = await import("@sparticuz/chromium").then(m => m.default);
    const puppeteer = await import("puppeteer-core").then(m => m.default);
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  } else {
    const puppeteer = await import("puppeteer").then(m => m.default);
    return puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
      ],
    });
  }
}

export async function scrapeContent(url: string) {
  let browser;
  try {
    browser = await launchBrowser();

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );
    await page.setViewport({ width: 1366, height: 768 });

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    const html = await page.content();
    const $ = load(html);

    class MissavSearch {
      search: object[];

      constructor() {
        this.search = $('div[x-data=""][x-init*="initLozad"] > div')
          .map((i, el) => {
            const $el = $(el);
            const linkElement = $el.find('a[href*="/en/"]').first();
            const imageElement = $el.find("img").first();
            const titleElement = $el.find("a.text-secondary").first();
            const durationElement = $el.find("span.absolute.bottom-1.right-1");

            return {
              link: linkElement.attr("href") || "None",
              id: linkElement.attr("href")?.split("/").pop() || "None",
              image:
                imageElement.attr("data-src") ||
                imageElement.attr("src") ||
                "None",
              title: titleElement.text().trim() || "None",
              duration: durationElement.text().trim() || "None",
            };
          })
          .get()
          .filter((item) => item.link !== "None");
      }
    }

    const missav = new MissavSearch();
    if (missav.search.length === 0) throw Error("No result found");

    const result: ISearchVideoData = {
      success: true,
      data: missav.search as unknown as string[],
      source: url,
    };

    return result;
  } catch (err) {
    const e = err as Error;
    throw Error(e.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
