import { load } from "cheerio";
import { IJavTsunamiSearchData } from "../../../interfaces";

async function launchBrowser() {
  const chromium = await import("@sparticuz/chromium").then(m => m.default);
  const puppeteer = await import("puppeteer-core").then(m => m.default);
  return puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
}

export async function scrapeContent(url: string) {
  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36");
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    const html = await page.content();
    const $ = load(html);
    const title = $("meta[property='og:title']").attr("content") || "None";
    const id = url?.split("/").pop()?.split("#")[0] || "None";
    const image = $("meta[property='og:image']").attr("content") || "None";
    const description = $("meta[name='description']").attr("content") || "None";
    const tags: string[] = ($("meta[name='keywords']").attr("content") || "").split(",").map(k => k.trim()).filter(k => k);
    const result: IJavTsunamiSearchData = {
      success: true,
      data: { title, id, image, upload_date: "None", duration: "None", tags, description },
      assets: [image].filter(a => a !== "None"),
      source: url,
    };
    return result;
  } catch (err) {
    throw Error(`MissAV error: ${(err as Error).message}`);
  } finally {
    if (browser) await browser.close();
  }
}
