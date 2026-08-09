const MAX_COMMENT_DEPTH = 1; // comment + its direct replies as one chunk

function detectDiscussionSource(url) {
  if (/news\.ycombinator\.com/.test(url)) return 'hn';
  if (/stackoverflow\.com|stackexchange\.com/.test(url)) return 'stackexchange';
  throw new Error('Unsupported discussion URL — use a Hacker News or Stack Exchange link.');
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed (status ${res.status})`);
  return res.json();
}

// --- Hacker News (Firebase API, no key needed) ---
async function extractHackerNews(url) {
  const idMatch = url.match(/id=(\d+)/);
  if (!idMatch) throw new Error('Could not find an item id in that Hacker News URL.');
  const itemId = idMatch[1];

  const item = await fetchJson(`https://hacker-news.firebaseio.com/v0/item/${itemId}.json`);
  if (!item) throw new Error('Hacker News item not found.');

  const chunks = [];
  if (item.text) {
    chunks.push({ text: stripHtml(item.text), metadata: { commentId: String(item.id) } });
  }

  const topLevelIds = (item.kids || []).slice(0, 40); // cap breadth for a personal project
  for (const kidId of topLevelIds) {
    const comment = await fetchJson(`https://hacker-news.firebaseio.com/v0/item/${kidId}.json`);
    if (!comment || comment.deleted || comment.dead || !comment.text) continue;

    let combined = stripHtml(comment.text);
    const replyIds = (comment.kids || []).slice(0, 5);
    for (const replyId of replyIds) {
      const reply = await fetchJson(`https://hacker-news.firebaseio.com/v0/item/${replyId}.json`);
      if (reply && !reply.deleted && !reply.dead && reply.text) {
        combined += `\n\nReply: ${stripHtml(reply.text)}`;
      }
    }
    chunks.push({ text: combined, metadata: { commentId: String(comment.id) } });
  }

  if (chunks.length === 0) throw new Error('No usable comments found on that thread.');
  return chunks;
}

// --- Stack Exchange API ---
async function extractStackExchange(url) {
  const siteMatch = url.match(/(stackoverflow)\.com|(\w+)\.stackexchange\.com/);
  const site = siteMatch?.[1] ? 'stackoverflow' : siteMatch?.[2];
  if (!site) throw new Error('Could not determine the Stack Exchange site from that URL.');

  const idMatch = url.match(/questions\/(\d+)/);
  if (!idMatch) throw new Error('Could not find a question id in that URL.');
  const questionId = idMatch[1];

  const qData = await fetchJson(
    `https://api.stackexchange.com/2.3/questions/${questionId}?site=${site}&filter=withbody`
  );
  const question = qData.items?.[0];
  if (!question) throw new Error('Question not found.');

  const chunks = [{ text: stripHtml(question.body), metadata: { commentId: `q-${questionId}` } }];

  const aData = await fetchJson(
    `https://api.stackexchange.com/2.3/questions/${questionId}/answers?site=${site}&filter=withbody&sort=votes`
  );
  for (const answer of (aData.items || []).slice(0, 15)) {
    chunks.push({ text: stripHtml(answer.body), metadata: { commentId: `a-${answer.answer_id}` } });
  }

  return chunks;
}

const decodeHtmlEntities = require('../utils/decodeHtmlEntities');

function stripHtml(html) {
  if (!html) return '';
  const noTags = html.replace(/<[^>]+>/g, ' ');
  return decodeHtmlEntities(noTags);
}

async function extractDiscussion(url) {
  const source = detectDiscussionSource(url);
  return source === 'hn' ? extractHackerNews(url) : extractStackExchange(url);
}

module.exports = { extractDiscussion };