const { YoutubeTranscript } = require('youtube-transcript');

const WINDOW_SECONDS = 30; // group consecutive segments into ~30s timestamped chunks

function extractVideoId(url) {
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  if (!match) throw new Error('Could not find a video id in that YouTube URL.');
  return match[1];
}

async function extractVideo(url) {
  const videoId = extractVideoId(url);

  let segments;
  try {
    segments = await YoutubeTranscript.fetchTranscript(videoId);
  } catch (err) {
    throw new Error('Could not fetch a transcript for that video (captions may be disabled).');
  }
  if (!segments || segments.length === 0) {
    throw new Error('That video has no available transcript.');
  }

  const chunks = [];
  let buffer = [];
  let windowStart = segments[0].offset / 1000;

  for (const seg of segments) {
    const startSec = seg.offset / 1000;
    if (startSec - windowStart > WINDOW_SECONDS && buffer.length) {
      chunks.push(flush(buffer, windowStart));
      buffer = [];
      windowStart = startSec;
    }
    buffer.push(seg);
  }
  if (buffer.length) chunks.push(flush(buffer, windowStart));

  return chunks;
}

function flush(buffer, windowStart) {
  const text = buffer.map((s) => s.text).join(' ').replace(/\s+/g, ' ').trim();
  const lastSeg = buffer[buffer.length - 1];
  const endSec = lastSeg.offset / 1000 + lastSeg.duration / 1000;
  return { text, metadata: { startTime: Math.round(windowStart), endTime: Math.round(endSec) } };
}

module.exports = { extractVideo };