require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const connectDB = require('./db');
const requireAuth = require('./middleware/requireAuth');
const authRoutes = require('./routes/auth');
const sourcesRoutes = require('./routes/sources');
const chatRoutes = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 3000;

connectDB();

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
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  })
);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/sources', requireAuth, sourcesRoutes);
app.use('/api/chat', requireAuth, chatRoutes);

// Serve the existing frontend as static files, same-origin, so the
// session cookie just works with no CORS headaches.
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.listen(PORT, () => {
  console.log(`Omnivex backend running on http://localhost:${PORT}`);
});