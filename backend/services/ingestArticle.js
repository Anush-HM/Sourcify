const cheerio = require('cheerio');

const MIN_PARAGRAPH_LENGTH = 40; // skip nav/junk fragments
const MAX_CHUNK_CHARS = 1200;    // merge short paragraphs, cap long ones

function cleanText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EchoMindBot/1.0)' },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch article (status ${res.status})`);
  }
  return res.text();
}

function extractParagraphs(html) {
  const $ = cheerio.load(html);
  $('script, style, nav, header, footer, aside, form, noscript, iframe').remove();

  const containerSelectors = ['article', 'main', '#mw-content-text', '.post-content', '.article-content'];
  let $container = null;
  for (const sel of containerSelectors) {
    if ($(sel).length) {
      $container = $(sel).first();
      break;
    }
  }
  if (!$container) $container = $('body');

  const paragraphs = [];
  $container.find('p').each((_, el) => {
    const text = cleanText($(el).text());
    if (text.length >= MIN_PARAGRAPH_LENGTH) paragraphs.push(text);
  });

  return paragraphs;
}

function chunkParagraphs(paragraphs) {
  const chunks = [];
  let buffer = '';
  for (const para of paragraphs) {
    if ((buffer + ' ' + para).length > MAX_CHUNK_CHARS && buffer) {
      chunks.push(buffer.trim());
      buffer = para;
    } else {
      buffer = buffer ? `${buffer} ${para}` : para;
    }
  }
  if (buffer) chunks.push(buffer.trim());
  return chunks;
}

async function extractArticle(url) {
  const html = await fetchHtml(url);
  const paragraphs = extractParagraphs(html);

  if (paragraphs.length === 0) {
    throw new Error('Could not find readable paragraph content on that page.');
  }

  const chunkTexts = chunkParagraphs(paragraphs);
  return chunkTexts.map((text, index) => ({ text, metadata: { paragraphIndex: index } }));
}

module.exports = { extractArticle };