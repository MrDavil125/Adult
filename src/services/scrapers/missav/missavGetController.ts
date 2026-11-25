import { load } from "cheerio";
import { IJavTsunamiSearchData } from "../../../interfaces";

// Puppeteer conditionally - local mein full puppeteer, Vercel par chromium
async function launchBrowser() {
  if (process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    // Vercel / Lambda environment
    const chromium = await import("@sparticuz/chromium").then(m => m.default);
    const puppeteer = await import("puppeteer-core").then(m => m.default);
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  } else {
    // Local environment - full puppeteer
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

    class MissavGet {
      title: string;
      id: string;
      image: string;
      upload_date: string;
      duration: string;
      tags: string[];
      description: string;
      embed: string;

      constructor() {
        this.title =
          $("h1.text-base.lg\\:text-lg.text-nord6").first().text().trim() ||
          $("meta[property='og:title']").attr("content") ||
          $("title").text().trim() ||
          "None";

        this.id =
          url?.split("/").pop()?.split("#")[0]?.split("?")[0] ||
          $("meta[property='og:url']")
            .attr("content")
            ?.split("/")
            .pop()
            ?.split("#")[0] ||
          "None";

        this.image =
          $("meta[property='og:image']").attr("content") ||
          $("video[data-poster]").attr("data-poster") ||
          $("video.player").attr("data-poster") ||
          "None";

        const durationMeta = $("meta[property='og:video:duration']").attr("content");
        if (durationMeta && !isNaN(parseInt(durationMeta))) {
          const totalSeconds = parseInt(durationMeta);
          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          const seconds = totalSeconds % 60;
          if (hours > 0) {
            this.duration = `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
          } else {
            this.duration = `${minutes}:${seconds.toString().padStart(2, "0")}`;
          }
        } else {
          this.duration = "None";
        }

        const releaseDateMeta = $("meta[property='og:video:release_date']").attr("content");
        if (releaseDateMeta) {
          try {
            const date = new Date(releaseDateMeta);
            this.upload_date = date.toISOString().split("T")[0];
          } catch {
            this.upload_date = releaseDateMeta;
          }
        } else {
          this.upload_date = "None";
        }

        this.tags = [];
        const genreSection = $("div.text-secondary").filter((_, el) => {
          return $(el).text().includes("Genre:");
        });
        genreSection.find("a.text-nord13").each((_, tagEl) => {
          const tagText = $(tagEl).text().trim();
          if (tagText && !this.tags.includes(tagText)) {
            this.tags.push(tagText);
          }
        });
        const keywords = $("meta[name='keywords']").attr("content");
        if (keywords && this.tags.length === 0) {
          this.tags = keywords.split(",").map((k) => k.trim()).filter((k) => k);
        }

        this.description =
          $("meta[name='description']").attr("content") ||
          $("meta[property='og:description']").attr("content") ||
          "None";

        this.embed = "None";
        const scriptContent = $.html();
        const sourcePatterns = [
          /source\s*=\s*['\"`]([^'\"`]+\.m3u8[^'\"`]*)['\"`]/i,
          /['\"`](https?:\/\/[^'\"`]+\.m3u8[^'\"`]*)['\"`]/i,
        ];
        for (const pattern of sourcePatterns) {
          const match = scriptContent.match(pattern);
          if (match) {
            this.embed = match[1];
            break;
          }
        }
      }
    }

    const missav = new MissavGet();
    const assets = [missav.embed, missav.image].filter((asset) => asset && asset !== "None");

    const result: IJavTsunamiSearchData = {
      success: true,
      data: {
        title: missav.title,
        id: missav.id,
        image: missav.image,
        upload_date: missav.upload_date,
        duration: missav.duration,
        tags: missav.tags,
        description: missav.description,
      },
      assets,
      source: url,
    };

    return result;
  } catch (err) {
    const e = err as Error;
    throw Error(`MissAV scraper error: ${e.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
