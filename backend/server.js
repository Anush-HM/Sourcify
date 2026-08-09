require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const connectDB = require('./db');
const migrateLegacyData = require('./migrateLegacyData');
const requireAuth = require('./middleware/requireAuth');
const requireSession = require('./middleware/requireSession');
const { chatLimiter, sourcesLimiter } = require('./middleware/rateLimit');
const authRoutes = require('./routes/auth');
const sessionsRoutes = require('./routes/sessions');
const sourcesRoutes = require('./routes/sources');
const chatRoutes = require('./routes/chat');
const reportRoutes = require('./routes/report');
const contradictionsRoutes = require('./routes/contradictions');

const app = express();
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

connectDB().then(migrateLegacyData);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/sessions', requireAuth, sessionsRoutes);
app.use('/api/sources', requireAuth, requireSession, sourcesLimiter, sourcesRoutes);
app.use('/api/chat', requireAuth, requireSession, chatLimiter, chatRoutes);
app.use('/api/report', requireAuth, requireSession, chatLimiter, reportRoutes);
app.use('/api/contradictions', requireAuth, requireSession, chatLimiter, contradictionsRoutes);

const distPath = path.join(__dirname, '..', 'frontend', 'dist');
const staticPath = require('fs').existsSync(distPath) ? distPath : path.join(__dirname, '..', 'frontend');
app.use(express.static(staticPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexPath = path.join(staticPath, 'index.html');
  res.sendFile(indexPath);
});

app.listen(PORT, () => {
  console.log(`Sourcify backend running on http://localhost:${PORT}`);
});