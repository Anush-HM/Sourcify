const { YoutubeTranscript } = require('youtube-transcript');
const { callLLM } = require('./llm');
const decodeHtmlEntities = require('../utils/decodeHtmlEntities');

const WINDOW_SECONDS = 30; // group consecutive segments into ~30s timestamped chunks

function extractVideoId(url) {
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  if (!match) throw new Error('Could not find a video id in that YouTube URL.');
  return match[1];
}

function isNonEnglishScript(text) {
  // Detect Arabic, Cyrillic, CJK, Hebrew, etc.
  return /[\u0600-\u06FF\u0400-\u04FF\u4e00-\u9fff\u0590-\u05FF]/.test(text);
}

async function translateChunkIfNeeded(text) {
  if (!isNonEnglishScript(text)) return text;
  try {
    const prompt = `Translate the following video transcript segment into clear English. Output ONLY the translated English text with no additional comments or introduction:\n\n${text}`;
    const translated = await callLLM(prompt, { label: 'translate-video-transcript' });
    return translated || text;
  } catch (err) {
    console.warn('Failed to translate video transcript chunk:', err.message);
    return text;
  }
}

async function extractVideo(url) {
  const videoId = extractVideoId(url);

  let segments;
  const langOptions = ['en', 'en-US', 'en-GB'];
  for (const lang of langOptions) {
    try {
      segments = await YoutubeTranscript.fetchTranscript(videoId, { lang });
      if (segments && segments.length) break;
    } catch (e) {
      // try next language option
    }
  }

  if (!segments || segments.length === 0) {
    try {
      segments = await YoutubeTranscript.fetchTranscript(videoId);
    } catch (err) {
      throw new Error('Could not fetch a transcript for that video (captions may be disabled).');
    }
  }

  if (!segments || segments.length === 0) {
    throw new Error('That video has no available transcript.');
  }

  const rawChunks = [];
  let buffer = [];
  let windowStart = segments[0].offset / 1000;

  for (const seg of segments) {
    const startSec = seg.offset / 1000;
    if (startSec - windowStart > WINDOW_SECONDS && buffer.length) {
      rawChunks.push(flush(buffer, windowStart));
      buffer = [];
      windowStart = startSec;
    }
    buffer.push(seg);
  }
  if (buffer.length) rawChunks.push(flush(buffer, windowStart));

  // Translate non-English chunks if necessary
  const chunks = await Promise.all(
    rawChunks.map(async (chunk) => {
      const translatedText = await translateChunkIfNeeded(chunk.text);
      return { ...chunk, text: translatedText };
    })
  );

  return chunks;
}

function cleanTranscriptText(rawText) {
  if (!rawText) return '';
  const cleaned = rawText
    .replace(/[\u0000-\u001F\u007F-\u009F\uFEFF\uFFFD\u00FE\u00FF]/g, '')
    .replace(/\s+/g, ' ');
  return decodeHtmlEntities(cleaned);
}

function flush(buffer, windowStart) {
  const rawJoined = buffer.map((s) => s.text).join(' ');
  const text = cleanTranscriptText(rawJoined);
  const lastSeg = buffer[buffer.length - 1];
  const endSec = lastSeg.offset / 1000 + lastSeg.duration / 1000;
  return { text, metadata: { startTime: Math.round(windowStart), endTime: Math.round(endSec) } };
}

module.exports = { extractVideo };