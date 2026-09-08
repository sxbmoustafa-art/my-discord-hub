/**
 * Bot Hosting Platform - Main Integrated Backend Server
 * Super Admin ID: 1182602010651017298
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- CONSTANTS & CONFIGURATION ---
const SUPER_ADMIN_ID = process.env.SUPER_ADMIN_ID || '1182602010651017298';
const PORT = process.env.PORT || 5000;

// --- IN-MEMORY DATABASE ---
const db = {
  users: [
    {
      id: SUPER_ADMIN_ID,
      username: 'Orvex',
      role: 'SUPER_ADMIN',
      isBanned: false
    }
  ],
  bots: [],
  blacklist: []
};

// --- MIDDLEWARES ---
const verifySuperAdmin = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (userId !== SUPER_ADMIN_ID) {
    return res.status(403).json({ error: 'Access denied. Super Admin privileges required.' });
  }
  next();
};

const checkBannedUser = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const userIp = req.ip;

  const isBanned = db.blacklist.some(item => item.id === userId || item.ip === userIp);
  if (isBanned) {
    return res.status(403).json({ error: 'Your account or IP is banned from using this platform.' });
  }
  next();
};

app.use(checkBannedUser);

// --- 1. HEALTH CHECK & KEEP-ALIVE ENDPOINT ---
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    message: 'Bot Hosting Platform Backend is running 24/7'
  });
});

// --- 2. BOT MANAGEMENT ENDPOINTS ---
app.get('/api/bots', (req, res) => {
  const userId = req.headers['x-user-id'];

  if (userId === SUPER_ADMIN_ID) {
    return res.json({ access: 'SUPER_ADMIN', bots: db.bots });
  }

  const userBots = db.bots.filter(bot => bot.ownerId === userId);
  res.json({ access: 'USER', bots: userBots });
});

app.post('/api/bots/create', (req, res) => {
  const { botName, botToken, scriptCode } = req.body;
  const userId = req.headers['x-user-id'];

  const newBot = {
    id: `bot_${Date.now()}`,
    ownerId: userId,
    name: botName,
    token: botToken,
    status: 'OFFLINE',
    script: scriptCode || '// Default script',
    createdAt: new Date()
  };

  db.bots.push(newBot);
  res.status(201).json({ message: 'Bot registered successfully', bot: newBot });
});

app.put('/api/bots/:id/script', (req, res) => {
  const { id } = req.params;
  const { scriptCode } = req.body;
  const userId = req.headers['x-user-id'];

  const bot = db.bots.find(b => b.id === id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  if (userId !== SUPER_ADMIN_ID && bot.ownerId !== userId) {
    return res.status(403).json({ error: 'Unauthorized to modify this bot' });
  }

  bot.script = scriptCode;
  res.json({ message: 'Script updated successfully', bot });
});

// --- 3. SUPER ADMIN CONTROL ENDPOINTS ---
app.post('/api/admin/ban', verifySuperAdmin, (req, res) => {
  const { targetUserId, targetIp, reason } = req.body;

  db.blacklist.push({
    id: targetUserId,
    ip: targetIp,
    reason: reason || 'Violation of terms',
    bannedAt: new Date()
  });

  db.bots = db.bots.filter(bot => bot.ownerId !== targetUserId);

  res.json({ message: `User ${targetUserId} has been banned and their bots were terminated.` });
});

app.get('/api/admin/logs', verifySuperAdmin, (req, res) => {
  res.json({
    totalBots: db.bots.length,
    activeBots: db.bots.filter(b => b.status === 'ONLINE').length,
    bannedUsersCount: db.blacklist.length,
    systemUptime: process.uptime()
  });
});

// --- SERVER INITIALIZATION ---
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 Bot Hosting Platform Backend Started on Port ${PORT}`);
  console.log(`👑 Super Admin ID Configured: ${SUPER_ADMIN_ID}`);
  console.log(`🌐 Health Check Endpoint Active: http://localhost:${PORT}/health`);
  console.log(`=================================================`);
});
