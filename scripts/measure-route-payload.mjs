import http from "node:http";
import fs from "node:fs";
import { gunzipSync } from "node:zlib";

const route = new URL(process.argv[2]);
if (route.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(route.hostname)) throw new Error("Use a local verification server.");
function request(url, gzip = false) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { headers: { "Accept-Encoding": gzip ? "gzip" : "identity" } }, (response) => {
      const parts = [];
      response.on("data", (part) => parts.push(part));
      response.on("end", () => {
        if (response.statusCode !== 200) return reject(new Error(`${url}: HTTP ${response.statusCode}`));
        const body = Buffer.concat(parts);
        const decoded = response.headers["content-encoding"] === "gzip" ? gunzipSync(body) : body;
        resolve({ body, decoded, encoding: response.headers["content-encoding"] ?? "identity" });
      });
      response.on("error", reject);
    });
    req.setTimeout(30000, () => req.destroy(new Error("Request timed out")));
    req.on("error", reject);
  });
}
const samples = [];
for (let run = 0; run < 5; run++) {
  const html = (await request(route)).decoded.toString();
  const urls = [...new Set([...html.matchAll(/<script\b[^>]*>/gi)].filter(([tag]) => !/nomodule/i.test(tag)).flatMap(([tag]) => {
    const src = tag.match(/\bsrc="([^"]+)"/i)?.[1];
    return src ? [new URL(src.replaceAll("&amp;", "&"), route).href] : [];
  }))];
  const scripts = [];
  for (const url of urls) {
    if (new URL(url).origin !== route.origin) throw new Error("Unexpected external script");
    const result = await request(url, true);
    scripts.push({ url, encodedBodyBytes: result.body.length, decodedBodyBytes: result.decoded.length, encoding: result.encoding });
  }
  samples.push({ run: run + 1, scriptCount: scripts.length, encodedBodyBytes: scripts.reduce((n, s) => n + s.encodedBodyBytes, 0), decodedBodyBytes: scripts.reduce((n, s) => n + s.decodedBodyBytes, 0), scripts });
}
const report = { route: route.href, method: "Five cacheless HTTP requests per HTML-linked non-nomodule script; gzip accepted. Body sizes exclude headers. This is not a browser timing or cache measurement.", samples };
if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(report, null, 2));
console.log(JSON.stringify(samples.map(({run, scriptCount, encodedBodyBytes, decodedBodyBytes}) => ({run, scriptCount, encodedBodyBytes, decodedBodyBytes}))));
