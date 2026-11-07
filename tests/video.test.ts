import { test } from "node:test";
import assert from "node:assert/strict";
import { parseVideoUrl, embedUrl, parseStart } from "../lib/blog/video";

test("parses YouTube URL shapes", () => {
  const id = "dQw4w9WgXcQ";
  for (const u of [`https://www.youtube.com/watch?v=${id}`, `youtube.com/watch?v=${id}&list=PL123`, `https://youtu.be/${id}`, `https://m.youtube.com/watch?v=${id}`, `https://www.youtube.com/embed/${id}`, `https://www.youtube.com/live/${id}?si=abc`]) {
    assert.equal(parseVideoUrl(u)?.videoId, id, u);
  }
  assert.equal(parseVideoUrl(`https://youtu.be/${id}?t=90`)?.start, 90);
  assert.equal(parseVideoUrl(`https://www.youtube.com/watch?v=${id}&t=1m30s`)?.start, 90);
  assert.equal(parseVideoUrl(`https://www.youtube.com/shorts/${id}`)?.vertical, true);
});

test("parses Vimeo URL shapes", () => {
  assert.deepEqual(parseVideoUrl("https://vimeo.com/76979871"), { provider: "vimeo", videoId: "76979871" });
  assert.deepEqual(parseVideoUrl("https://vimeo.com/76979871/abc123def0"), { provider: "vimeo", videoId: "76979871", hash: "abc123def0" });
  assert.equal(parseVideoUrl("https://player.vimeo.com/video/76979871?h=abc123def0")?.hash, "abc123def0");
  assert.equal(parseVideoUrl("https://vimeo.com/channels/staffpicks/76979871")?.videoId, "76979871");
});

test("rejects everything else", () => {
  for (const u of ["https://example.com/watch?v=dQw4w9WgXcQ", "https://www.youtube.com/watch?v=short", "javascript:alert(1)", "https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ", "https://www.youtube.com/@channel", "not a url", "https://vimeo.com/about"]) {
    assert.equal(parseVideoUrl(u), null, u);
  }
});

test("builds privacy-friendly embed URLs", () => {
  assert.match(embedUrl({ provider: "youtube", videoId: "dQw4w9WgXcQ", start: 30 }), /^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?.*start=30/);
  assert.match(embedUrl({ provider: "vimeo", videoId: "76979871" }), /^https:\/\/player\.vimeo\.com\/video\/76979871\?dnt=1/);
  assert.equal(parseStart("1h2m3s"), 3723);
  assert.equal(parseStart("abc"), undefined);
});
