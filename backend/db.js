const mongoose = require('mongoose');
const dns = require('dns');

// Force Node's DNS resolver to use Google's DNS servers for this process.
// This bypasses ISP/router/VPN DNS servers that often block the SRV
// record lookups mongodb+srv:// URLs depend on.
dns.setServers(['8.8.8.8', '8.8.4.4']);

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;