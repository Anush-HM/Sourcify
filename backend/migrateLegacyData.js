const Session = require('./models/Session');
const Source = require('./models/Source');
const Chunk = require('./models/Chunk');
const Message = require('./models/Message');

async function migrateLegacyData() {
  const orphanedUserIds = await Source.distinct('userId', { sessionId: { $exists: false } });
  for (const userId of orphanedUserIds) {
    const legacySession = await Session.create({ userId, title: 'Previous session' });
    await Source.updateMany({ userId, sessionId: { $exists: false } }, { sessionId: legacySession._id });
    await Chunk.updateMany({ userId, sessionId: { $exists: false } }, { sessionId: legacySession._id });
    await Message.updateMany({ userId, sessionId: { $exists: false } }, { sessionId: legacySession._id });
    console.log(`Migrated legacy data for user ${userId} into session ${legacySession._id}`);
  }
}

module.exports = migrateLegacyData;