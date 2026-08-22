import { PlaywrightScraper } from "./src/infrastructure/PlaywrightScraper.js";
import fs from "fs";

async function dump() {
    const scraper = new PlaywrightScraper();
    const text = await scraper.scrape("https://www.linkedin.com/jobs/view/4417344977");
    fs.writeFileSync("dump.txt", text);
    console.log("Dumped to dump.txt");
}

dump();
