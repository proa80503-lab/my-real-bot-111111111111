'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║         🎛️  لوحة تحكم البوت الاحترافية — Dashboard Server       ║
 * ║  تعمل محلياً وعلى Render/Railway/Koyeb                           ║
 * ║  ترسل رابطها للمالك عبر DM عند كتابة: !#1                        ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

const http   = require('http');
const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');
const db     = require('./utils/database');
const dConf  = require('./utils/dashboard-config');
const config = require('./config'); // Needed for shopItems

// ─── Token Management for Web UIs (Store/Auction) ─────────────────────────
const webTokens = new Map(); // token -> { userId, username, avatar, expiresAt }

function generateWebToken(user) {
    const token = crypto.randomBytes(16).toString('hex');
    webTokens.set(token, {
        userId: user.id,
        username: user.username,
        avatar: user.displayAvatarURL({ dynamic: true, size: 128 }),
        expiresAt: Date.now() + (1000 * 60 * 60 * 2) // 2 hours
    });
    return token;
}
module.exports.generateWebToken = generateWebToken;

// ─── Auction State Manager ──────────────────────────────────────────────────
const activeAuctions = new Map(); // auctionId -> { itemId, sellerId, sellerName, highestBid, highestBidderId, highestBidderName, endsAt }


// ─── الإعدادات ───────────────────────────────────────────────────────────────
const PORT           = process.env.PORT || 3000;
const DASHBOARD_KEY  = process.env.DASHBOARD_KEY || crypto.randomBytes(16).toString('hex');
const RENDER_URL     = process.env.RENDER_EXTERNAL_URL || null; // يُعيَّن تلقائياً على Render
const BASE_URL       = RENDER_URL || `http://localhost:${PORT}`;

// ─── المسارات ────────────────────────────────────────────────────────────────
const ROOT_DIR = __dirname;
const dataDir  = path.join(ROOT_DIR, 'data');
const dbPath   = path.join(dataDir, 'economy.json');
const logPath  = path.join(ROOT_DIR, 'logs', 'bot.log');
const bakPath  = dbPath + '.bak';

// ─── رابط الداشبورد الكامل (مع مفتاح الأمان) ───────────────────────────────
function getDashboardUrl() {
    return `${BASE_URL}/dashboard?key=${DASHBOARD_KEY}`;
}
module.exports.getDashboardUrl = getDashboardUrl;
module.exports.DASHBOARD_KEY   = DASHBOARD_KEY;

// ─── قراءة آمنة لقاعدة البيانات ──────────────────────────────────────────────
function readDB() {
    try {
        if (fs.existsSync(dbPath)) return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch {}
    return { users: {}, guilds: {} };
}

// ─── قراءة آخر سطور اللوق ──────────────────────────────────────────────────
function readLogs(n = 200) {
    try {
        if (!fs.existsSync(logPath)) return [];
        const lines = fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
        return lines.slice(-n).reverse();
    } catch { return []; }
}

// ─── إحصائيات الأوامر من مجلد commands/ ────────────────────────────────────
function getCommandStats() {
    const base = path.join(ROOT_DIR, 'commands');
    const cats = {};
    try {
        for (const cat of fs.readdirSync(base)) {
            const p = path.join(base, cat);
            if (!fs.statSync(p).isDirectory()) continue;
            cats[cat] = fs.readdirSync(p).filter(f => f.endsWith('.js'));
        }
    } catch {}
    return cats;
}

// ─── بناء الإحصائيات ─────────────────────────────────────────────────────────
function buildStats(client) {
    const db       = readDB();
    const users    = Object.entries(db.users || {});
    const guilds   = Object.entries(db.guilds || {});
    const cmdStats = getCommandStats();
    const totalCmds = Object.values(cmdStats).reduce((s, v) => s + v.length, 0);

    const sorted = users
        .map(([id, u]) => ({ id, balance: (u.balance||0)+(u.bank||0), level: u.level||1, xp: u.xp||0, games: u.stats?.gamesPlayed||0, warnings: u.warnings||0 }))
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 10);

    const totalMoney       = users.reduce((s,[,u]) => s+(u.balance||0)+(u.bank||0), 0);
    const totalWarnings    = users.reduce((s,[,u]) => s+(u.warnings||0), 0);
    const totalGamesPlayed = users.reduce((s,[,u]) => s+(u.stats?.gamesPlayed||0), 0);
    const totalWins        = users.reduce((s,[,u]) => s+(u.stats?.gamesWon||0), 0);

    const discordGuilds = client?.guilds?.cache?.size ?? 0;
    const discordUsers  = client?.users?.cache?.size  ?? 0;
    const ping          = client?.ws?.ping ?? 0;
    const botTag        = client?.user?.tag ?? 'offline';

    const mem = process.memoryUsage();

    return {
        totalCmds, totalUsers: users.length, totalGuilds: guilds.length,
        totalMoney, totalWarnings, totalGamesPlayed, totalWins,
        discordGuilds, discordUsers, ping, botTag,
        topUsers: sorted,
        cmdStats,
        guilds: guilds.map(([id,g]) => ({id,...g})),
        logs: readLogs(),
        uptime: process.uptime(),
        heapMB: Math.round(mem.heapUsed/1024/1024),
        rssMB: Math.round(mem.rss/1024/1024),
        nodeVersion: process.version,
        platform: process.platform,
        baseUrl: BASE_URL,
        isRender: !!RENDER_URL,
    };
}

// ─── أيقونات الفئات ──────────────────────────────────────────────────────────
const CAT_ICONS = { economy:'💰', moderation:'🛡️', games:'🎮', fun:'🎉', social:'👥', main:'⭐' };

// ─── Escape HTML ─────────────────────────────────────────────────────────────
function esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ─── تنسيق الأرقام ───────────────────────────────────────────────────────────
function fmt(n) { return Number(n||0).toLocaleString('en-US'); }
function fmtTime(s) {
    const d=Math.floor(s/86400), h=Math.floor((s%86400)/3600), m=Math.floor((s%3600)/60), sec=Math.floor(s%60);
    return d>0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${sec}s`;
}

// ─── بناء صفحة HTML الرئيسية ─────────────────────────────────────────────────
function buildHTML(client) {
    const s = buildStats(client);

    const catCards = Object.entries(s.cmdStats).map(([cat, files]) => `
      <div class="cmd-card" onclick="filterCmds('${cat}')">
        <div class="cmd-card-top">
          <span class="cmd-icon">${CAT_ICONS[cat]||'📦'}</span>
          <span class="cmd-count">${files.length}</span>
        </div>
        <div class="cmd-name">${cat}</div>
        <div class="cmd-files" id="files-${cat}" style="display:none;">
          ${files.map(f=>`<span class="tag">${f.replace('.js','')}</span>`).join('')}
        </div>
      </div>`).join('');

    const topRows = s.topUsers.map((u,i) => `
      <tr>
        <td><span class="rank rank-${i<3?i+1:'n'}">#${i+1}</span></td>
        <td><code class="uid">${u.id}</code></td>
        <td class="money-cell">${fmt(u.balance)} 💰</td>
        <td>${u.level} ⭐</td>
        <td>${u.games} 🎮</td>
        <td><span class="badge ${u.warnings>0?'red':'green'}">${u.warnings}</span></td>
      </tr>`).join('') || `<tr><td colspan="6" class="empty-row">لا توجد بيانات بعد</td></tr>`;

    const guildRows = s.guilds.slice(0,30).map(g => `
      <tr>
        <td><code class="uid">${g.id}</code></td>
        <td>${g.setupComplete ? '<span class="badge green">✅ مكتمل</span>' : '<span class="badge red">❌ غير مكتمل</span>'}</td>
        <td>${g.logChannel ? `<code>${g.logChannel}</code>` : '<span class="muted">—</span>'}</td>
        <td>${g.jailRole   ? `<code>${g.jailRole}</code>`   : '<span class="muted">—</span>'}</td>
        <td>${g.muteRole   ? `<code>${g.muteRole}</code>`   : '<span class="muted">—</span>'}</td>
      </tr>`).join('') || `<tr><td colspan="5" class="empty-row">لا توجد سيرفرات مُعدَّة</td></tr>`;

    const logLines = s.logs.map(l => {
        let cls = 'li';
        if (/ERROR|❌|CRASH/.test(l)) cls='le';
        else if (/WARN|⚠️/.test(l)) cls='lw';
        else if (/✅|Ready|Online|SUCCESS/.test(l)) cls='ls';
        return `<div class="ll ${cls}">${esc(l)}</div>`;
    }).join('');

    const pingColor = s.ping < 100 ? '#57f287' : s.ping < 200 ? '#fee75c' : '#ed4245';
    const pingEmoji = s.ping < 100 ? '🟢' : s.ping < 200 ? '🟡' : '🔴';

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>🤖 لوحة تحكم البوت</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{
  --bg:#0a0b1a;--card:#111228;--card2:#181930;--card3:#1e1f3a;
  --accent:#5865f2;--accent2:#7289da;--accent3:#4752c4;
  --green:#57f287;--red:#ed4245;--yellow:#fee75c;--orange:#f57c00;--purple:#9b59b6;--cyan:#00bcd4;
  --text:#e0e1f0;--muted:#7b7d9e;--border:rgba(88,101,242,.14);
  --glow:0 0 30px rgba(88,101,242,.15);
  --font:'Cairo',sans-serif;--mono:'JetBrains Mono',monospace;
}
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{font-family:var(--font);background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden}
body::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse 60% 40% at 15% 15%,rgba(88,101,242,.07) 0%,transparent 60%),radial-gradient(ellipse 50% 40% at 85% 85%,rgba(114,137,218,.05) 0%,transparent 60%);pointer-events:none;z-index:0}
.wrap{max-width:1420px;margin:0 auto;padding:0 20px;position:relative;z-index:1}

/* ── HEADER ── */
.hdr{background:rgba(17,18,40,.9);border-bottom:1px solid var(--border);padding:18px 0;position:sticky;top:0;z-index:200;backdrop-filter:blur(14px)}
.hdr-in{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
.logo{display:flex;align-items:center;gap:14px}
.logo-ico{width:48px;height:48px;background:linear-gradient(135deg,var(--accent),var(--accent2));border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 4px 20px rgba(88,101,242,.4);animation:pulse 3s ease-in-out infinite}
@keyframes pulse{0%,100%{box-shadow:0 4px 20px rgba(88,101,242,.4)}50%{box-shadow:0 4px 40px rgba(88,101,242,.7)}}
.logo-txt h1{font-size:20px;font-weight:900;color:#fff;letter-spacing:-.3px}
.logo-txt p{font-size:11px;color:var(--muted);margin-top:1px}
.hdr-right{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.status-pill{display:flex;align-items:center;gap:7px;background:rgba(87,242,135,.1);border:1px solid rgba(87,242,135,.25);border-radius:50px;padding:7px 16px;font-size:12px;color:var(--green);font-weight:700}
.status-dot{width:7px;height:7px;background:var(--green);border-radius:50%;animation:blink 1.5s ease-in-out infinite;box-shadow:0 0 8px var(--green)}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
.hdr-meta{font-size:12px;color:var(--muted);display:flex;gap:16px;flex-wrap:wrap}
.hdr-meta span{display:flex;align-items:center;gap:5px}
.hdr-meta strong{color:#fff}
.btn{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;border:none;border-radius:10px;padding:9px 18px;font-family:var(--font);font-size:12px;font-weight:700;cursor:pointer;transition:.2s;display:flex;align-items:center;gap:7px}
.btn:hover{transform:scale(1.05);box-shadow:0 0 18px rgba(88,101,242,.45)}
.btn.sm{padding:6px 13px;font-size:11px}
.btn.danger{background:linear-gradient(135deg,var(--red),#c62828)}
.btn.success{background:linear-gradient(135deg,var(--green),#00897b);color:#000}

/* ── NAV ── */
.nav{background:var(--card);border-bottom:1px solid var(--border);overflow-x:auto}
.nav-in{display:flex}
.ntab{padding:15px 22px;cursor:pointer;font-family:var(--font);font-size:13px;font-weight:600;color:var(--muted);background:none;border:none;border-bottom:3px solid transparent;transition:.2s;white-space:nowrap;display:flex;align-items:center;gap:8px}
.ntab:hover{color:var(--text);background:rgba(88,101,242,.06)}
.ntab.active{color:var(--accent2);border-bottom-color:var(--accent)}

/* ── SECTIONS ── */
.sec{display:none;padding:28px 0}
.sec.active{display:block}

/* ── STAT CARDS ── */
.stats-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:18px;margin-bottom:28px}
.sc{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:22px;position:relative;overflow:hidden;transition:.25s;cursor:default}
.sc:hover{transform:translateY(-4px);box-shadow:var(--glow);border-color:rgba(88,101,242,.3)}
.sc::after{content:'';position:absolute;top:0;right:0;width:55px;height:55px;border-radius:0 16px 0 55px;opacity:.1}
.sc.blue::after{background:var(--accent)}.sc.green::after{background:var(--green)}.sc.red::after{background:var(--red)}.sc.yellow::after{background:var(--yellow)}.sc.purple::after{background:var(--purple)}.sc.cyan::after{background:var(--cyan)}.sc.orange::after{background:var(--orange)}
.sc-ico{font-size:26px;margin-bottom:10px}
.sc-val{font-size:30px;font-weight:900;color:#fff;line-height:1;margin-bottom:5px}
.sc-lbl{font-size:12px;color:var(--muted);font-weight:700;letter-spacing:.3px}
.sc-sub{font-size:11px;color:var(--muted);margin-top:4px}

/* ── SECTION TITLE ── */
.stitle{font-size:17px;font-weight:800;color:#fff;margin-bottom:18px;display:flex;align-items:center;gap:10px}
.stitle::after{content:'';flex:1;height:1px;background:var(--border)}

/* ── TABLES ── */
.tw{background:var(--card);border:1px solid var(--border);border-radius:16px;overflow:hidden;margin-bottom:28px}
.tw table{width:100%;border-collapse:collapse}
.tw th{background:var(--card2);padding:12px 16px;text-align:right;font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--border)}
.tw td{padding:11px 16px;font-size:12px;border-bottom:1px solid rgba(255,255,255,.04);vertical-align:middle}
.tw tr:last-child td{border-bottom:none}
.tw tr:hover td{background:rgba(88,101,242,.04)}
.empty-row{text-align:center;color:var(--muted);padding:24px!important}
code,.uid{font-family:var(--mono);background:rgba(88,101,242,.12);border-radius:5px;padding:2px 7px;font-size:11px;color:var(--accent2)}
.badge{padding:3px 9px;border-radius:50px;font-size:11px;font-weight:700}
.badge.green{background:rgba(87,242,135,.15);color:var(--green)}.badge.red{background:rgba(237,66,69,.15);color:var(--red)}.badge.yellow{background:rgba(254,231,92,.15);color:var(--yellow)}
.rank{font-weight:900;font-size:15px}
.rank-1{color:#ffd700}.rank-2{color:#c0c0c0}.rank-3{color:#cd7f32}.rank-n{color:var(--muted)}
.money-cell{font-family:var(--mono);color:var(--yellow);font-weight:700}
.muted{color:var(--muted)}

/* ── CMD CARDS ── */
.cmds-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;margin-bottom:28px}
.cmd-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px;cursor:pointer;transition:.2s;user-select:none}
.cmd-card:hover{border-color:rgba(88,101,242,.35);transform:translateY(-2px);box-shadow:var(--glow)}
.cmd-card.expanded{border-color:var(--accent);background:var(--card2)}
.cmd-card-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.cmd-icon{font-size:26px}
.cmd-count{background:rgba(88,101,242,.2);color:var(--accent2);border-radius:50px;padding:3px 12px;font-size:13px;font-weight:800}
.cmd-name{font-size:15px;font-weight:700;color:#fff;text-transform:capitalize;margin-bottom:10px}
.cmd-files{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px}
.tag{background:rgba(88,101,242,.12);border:1px solid rgba(88,101,242,.18);border-radius:6px;padding:2px 7px;font-size:10px;color:var(--accent2);font-family:var(--mono)}

/* ── LOGS ── */
.log-box{background:#050612;border:1px solid var(--border);border-radius:16px;overflow:hidden;margin-bottom:28px}
.log-hdr{background:var(--card2);padding:12px 18px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border)}
.log-hdr-l{font-size:12px;font-weight:700;color:var(--muted);display:flex;align-items:center;gap:8px}
.log-scroll{height:520px;overflow-y:auto;padding:10px}
.log-scroll::-webkit-scrollbar{width:5px}
.log-scroll::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
.ll{font-family:var(--mono);font-size:11px;padding:3px 7px;border-radius:4px;margin-bottom:2px;line-height:1.55;word-break:break-all}
.li{color:#6b6d8e}.le{color:var(--red);background:rgba(237,66,69,.07)}.lw{color:var(--yellow);background:rgba(254,231,92,.05)}.ls{color:var(--green)}

/* ── INFO CARDS ── */
.info-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px}
.ic{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:22px}
.ic h3{font-size:14px;font-weight:800;color:#fff;margin-bottom:14px;display:flex;align-items:center;gap:8px}
.ir{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:12px}
.ir:last-child{border-bottom:none}
.ik{color:var(--muted)}.iv{font-weight:700;color:#fff}
.iv.a{color:var(--accent2);font-family:var(--mono)}.iv.g{color:var(--green)}.iv.y{color:var(--yellow)}.iv.r{color:var(--red)}

/* ── PROGRESS BAR ── */
.prog-bar{height:6px;background:rgba(255,255,255,.08);border-radius:3px;overflow:hidden;margin-top:6px}
.prog-fill{height:100%;border-radius:3px;transition:width .8s ease}

/* ── PING CARD ── */
.ping-val{font-size:36px;font-weight:900;color:${pingColor};font-family:var(--mono)}

/* ── URL CARD ── */
.url-card{background:linear-gradient(135deg,rgba(88,101,242,.15),rgba(114,137,218,.08));border:1px solid rgba(88,101,242,.3);border-radius:14px;padding:22px;margin-bottom:28px;display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.url-card-ico{font-size:32px}
.url-card-text h3{font-size:15px;font-weight:800;color:#fff;margin-bottom:4px}
.url-card-text p{font-size:12px;color:var(--muted)}
.url-box{margin-top:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.url-input{background:rgba(0,0,0,.3);border:1px solid var(--border);border-radius:8px;padding:8px 14px;color:var(--accent2);font-family:var(--mono);font-size:12px;flex:1;min-width:200px;outline:none}
.copy-btn{padding:8px 14px;background:rgba(88,101,242,.2);border:1px solid rgba(88,101,242,.3);border-radius:8px;color:var(--accent2);font-size:12px;font-family:var(--font);font-weight:700;cursor:pointer;transition:.2s;white-space:nowrap}
.copy-btn:hover{background:rgba(88,101,242,.35)}

/* ── FOOTER ── */
.ftr{text-align:center;padding:28px 0;color:var(--muted);font-size:11px;border-top:1px solid var(--border);margin-top:36px}

/* ── RESPONSIVE ── */
@media(max-width:768px){.stats-g{grid-template-columns:repeat(2,1fr)}.hdr-in{flex-direction:column}.ntab{padding:11px 14px;font-size:11px}}
@media(max-width:480px){.stats-g{grid-template-columns:1fr}}
</style>
</head>
<body>

<!-- HEADER -->
<div class="hdr">
  <div class="wrap">
    <div class="hdr-in">
      <div class="logo">
        <div class="logo-ico">🤖</div>
        <div class="logo-txt">
          <h1>لوحة تحكم البوت</h1>
          <p>${esc(s.botTag)} • ${s.isRender ? '☁️ Render Cloud' : '💻 Local'}</p>
        </div>
      </div>
      <div class="hdr-right">
        <div class="hdr-meta">
          <span>⏱️ <strong>${fmtTime(s.uptime)}</strong></span>
          <span>${pingEmoji} <strong style="color:${pingColor}">${s.ping}ms</strong></span>
          <span>🌐 <strong>${s.discordGuilds}</strong> سيرفر</span>
          <span>👥 <strong>${s.discordUsers}</strong> مستخدم</span>
        </div>
        <div class="status-pill"><div class="status-dot"></div>Online</div>
        <button class="btn sm" onclick="location.reload()">↻ تحديث</button>
      </div>
    </div>
  </div>
</div>

<!-- NAV -->
<div class="nav">
  <div class="wrap">
    <div class="nav-in">
      <button class="ntab active" onclick="showTab('overview',this)">📊 نظرة عامة</button>
      <button class="ntab" onclick="showTab('commands',this)">⚡ الأوامر</button>
      <button class="ntab" onclick="showTab('economy',this)">💰 الاقتصاد</button>
      <button class="ntab" onclick="showTab('guilds',this)">🌐 السيرفرات</button>
      <button class="ntab" onclick="showTab('logs',this)">📋 السجلات</button>
      <button class="ntab" onclick="showTab('system',this)">⚙️ النظام</button>
      <button class="ntab" onclick="showTab('control',this)">🛠️ التحكم الكامل</button>
    </div>
  </div>
</div>

<!-- ═══ OVERVIEW ═══ -->
<div id="tab-overview" class="sec active">
  <div class="wrap">
    <div class="stats-g">
      <div class="sc blue"><div class="sc-ico">⚡</div><div class="sc-val">${s.totalCmds}</div><div class="sc-lbl">إجمالي الأوامر</div><div class="sc-sub">${Object.keys(s.cmdStats).length} فئات</div></div>
      <div class="sc green"><div class="sc-ico">👥</div><div class="sc-val">${s.totalUsers}</div><div class="sc-lbl">مستخدمو قاعدة البيانات</div><div class="sc-sub">${fmt(s.totalMoney)} 💰 إجمالي</div></div>
      <div class="sc cyan"><div class="sc-ico">🌐</div><div class="sc-val">${s.discordGuilds}</div><div class="sc-lbl">السيرفرات النشطة</div><div class="sc-sub">${s.totalGuilds} مُعدَّ</div></div>
      <div class="sc yellow"><div class="sc-ico">💰</div><div class="sc-val">${(s.totalMoney/1000).toFixed(1)}K</div><div class="sc-lbl">إجمالي الأموال</div><div class="sc-sub">في المحافظ والبنوك</div></div>
      <div class="sc red"><div class="sc-ico">⚠️</div><div class="sc-val">${s.totalWarnings}</div><div class="sc-lbl">إجمالي التحذيرات</div></div>
      <div class="sc orange"><div class="sc-ico">🎮</div><div class="sc-val">${s.totalGamesPlayed}</div><div class="sc-lbl">مجموع الألعاب</div><div class="sc-sub">${s.totalWins} انتصار</div></div>
      <div class="sc purple"><div class="sc-ico">👑</div><div class="sc-val">${s.discordUsers}</div><div class="sc-lbl">مستخدمون Discord</div></div>
      <div class="sc blue" style="--accent:#00bcd4"><div class="sc-ico">📡</div><div class="ping-val">${s.ping}ms</div><div class="sc-lbl">WebSocket Ping</div></div>
    </div>

    <h2 class="stitle">🏆 أغنى المستخدمين</h2>
    <div class="tw">
      <table>
        <thead><tr><th>#</th><th>معرف المستخدم</th><th>الرصيد الكلي</th><th>المستوى</th><th>الألعاب</th><th>تحذيرات</th></tr></thead>
        <tbody>${topRows}</tbody>
      </table>
    </div>
  </div>
</div>

<!-- ═══ COMMANDS ═══ -->
<div id="tab-commands" class="sec">
  <div class="wrap">
    <h2 class="stitle">⚡ فئات الأوامر (${s.totalCmds} أمر إجمالاً)</h2>
    <div class="cmds-g">${catCards}</div>
  </div>
</div>

<!-- ═══ ECONOMY ═══ -->
<div id="tab-economy" class="sec">
  <div class="wrap">
    <h2 class="stitle">💰 إحصائيات الاقتصاد</h2>
    <div class="stats-g">
      <div class="sc yellow"><div class="sc-ico">💰</div><div class="sc-val">${fmt(s.totalMoney)}</div><div class="sc-lbl">مجموع الأموال</div></div>
      <div class="sc green"><div class="sc-ico">👤</div><div class="sc-val">${s.totalUsers}</div><div class="sc-lbl">المستخدمون المسجلون</div></div>
      <div class="sc orange"><div class="sc-ico">🎮</div><div class="sc-val">${s.totalGamesPlayed}</div><div class="sc-lbl">الألعاب المُلعَبة</div></div>
      <div class="sc blue"><div class="sc-ico">🏆</div><div class="sc-val">${s.totalWins}</div><div class="sc-lbl">الانتصارات</div></div>
    </div>
    <h2 class="stitle">🏆 المتصدرون</h2>
    <div class="tw">
      <table>
        <thead><tr><th>#</th><th>معرف المستخدم</th><th>الرصيد الكلي 💰</th><th>المستوى</th><th>الألعاب</th><th>تحذيرات</th></tr></thead>
        <tbody>${topRows}</tbody>
      </table>
    </div>
  </div>
</div>

<!-- ═══ GUILDS ═══ -->
<div id="tab-guilds" class="sec">
  <div class="wrap">
    <h2 class="stitle">🌐 السيرفرات المُعدَّة (${s.guilds.length})</h2>
    <div class="tw">
      <table>
        <thead><tr><th>معرف السيرفر</th><th>حالة الإعداد</th><th>قناة اللوق</th><th>رتبة السجن</th><th>رتبة الكتم</th></tr></thead>
        <tbody>${guildRows}</tbody>
      </table>
    </div>
  </div>
</div>

<!-- ═══ LOGS ═══ -->
<div id="tab-logs" class="sec">
  <div class="wrap">
    <h2 class="stitle">📋 سجلات البوت المباشرة</h2>
    <div class="log-box">
      <div class="log-hdr">
        <div class="log-hdr-l">📁 ${esc(logPath)} <span class="badge yellow">${s.logs.length} سطر</span></div>
        <button class="btn sm" onclick="location.reload()">↻ تحديث</button>
      </div>
      <div class="log-scroll">${logLines||'<div class="ll li">لا توجد سجلات بعد...</div>'}</div>
    </div>
  </div>
</div>

<!-- ═══ SYSTEM ═══ -->
<div id="tab-system" class="sec">
  <div class="wrap">
    <div class="url-card">
      <div class="url-card-ico">🔗</div>
      <div style="flex:1">
        <div class="url-card-text"><h3>رابط لوحة التحكم</h3><p>شارك هذا الرابط الآمن مع المالك فقط — يحتوي على مفتاح الوصول</p></div>
        <div class="url-box">
          <input class="url-input" id="urlInput" value="${esc(BASE_URL+'/dashboard?key='+DASHBOARD_KEY)}" readonly>
          <button class="copy-btn" onclick="copyUrl()">📋 نسخ</button>
        </div>
      </div>
    </div>

    <h2 class="stitle">⚙️ معلومات النظام</h2>
    <div class="info-g">
      <div class="ic">
        <h3>🤖 معلومات البوت</h3>
        <div class="ir"><span class="ik">اسم البوت</span><span class="iv">${esc(s.botTag)}</span></div>
        <div class="ir"><span class="ik">عدد الأوامر</span><span class="iv a">${s.totalCmds}</span></div>
        <div class="ir"><span class="ik">عدد الفئات</span><span class="iv a">${Object.keys(s.cmdStats).length}</span></div>
        <div class="ir"><span class="ik">المستخدمون</span><span class="iv a">${s.totalUsers}</span></div>
        <div class="ir"><span class="ik">وقت التشغيل</span><span class="iv g">${fmtTime(s.uptime)}</span></div>
        <div class="ir"><span class="ik">Ping</span><span class="iv" style="color:${pingColor}">${pingEmoji} ${s.ping}ms</span></div>
      </div>
      <div class="ic">
        <h3>💻 Node.js & النظام</h3>
        <div class="ir"><span class="ik">إصدار Node</span><span class="iv a">${esc(s.nodeVersion)}</span></div>
        <div class="ir"><span class="ik">النظام</span><span class="iv">${esc(s.platform)}</span></div>
        <div class="ir"><span class="ik">Heap Used</span><span class="iv a">${s.heapMB} MB</span></div>
        <div class="ir"><span class="ik">RSS Memory</span><span class="iv a">${s.rssMB} MB</span></div>
        <div class="ir"><span class="ik">البيئة</span><span class="iv ${s.isRender?'g':'y'}">${s.isRender?'☁️ Render Cloud':'💻 Local'}</span></div>
      </div>
      <div class="ic">
        <h3>📊 الأوامر بالفئة</h3>
        ${Object.entries(s.cmdStats).map(([cat,files]) => `
          <div class="ir"><span class="ik">${CAT_ICONS[cat]||'📦'} ${cat}</span><span class="iv a">${files.length} أمر</span></div>
        `).join('')}
      </div>
      <div class="ic">
        <h3>📁 الملفات والمسارات</h3>
        <div class="ir"><span class="ik">قاعدة البيانات</span><span class="iv ${fs.existsSync(dbPath)?'g':'r'}">${fs.existsSync(dbPath)?'✅ موجودة':'❌ غير موجودة'}</span></div>
        <div class="ir"><span class="ik">ملف اللوق</span><span class="iv ${fs.existsSync(logPath)?'g':'y'}">${fs.existsSync(logPath)?'✅ موجود':'⚠️ لم يُنشأ بعد'}</span></div>
        <div class="ir"><span class="ik">نسخة احتياطية</span><span class="iv ${fs.existsSync(bakPath)?'g':'y'}">${fs.existsSync(bakPath)?'✅ موجودة':'⚠️ لا يوجد'}</span></div>
        <div class="ir"><span class="ik">منفذ الخادم</span><span class="iv a">${PORT}</span></div>
        <div class="ir"><span class="ik">مفتاح الأمان</span><span class="iv a">${DASHBOARD_KEY.slice(0,8)}...</span></div>
      </div>
    </div>
  </div>
</div>

<!-- ═══ CONTROL PANEL ═══ -->
<div id="tab-control" class="sec">
  <div class="wrap">
    <h2 class="stitle">🛠️ التحكم الشامل في البوت</h2>
    
    <div class="info-g">
      <!-- الردود التلقائية -->
      <div class="ic">
        <h3>💬 إضافة رد تلقائي</h3>
        <div style="display:flex;flex-direction:column;gap:10px;margin-top:10px;">
          <input type="text" id="ar-trigger" class="url-input" placeholder="الكلمة (مثال: السلام عليكم)">
          <input type="text" id="ar-response" class="url-input" placeholder="الرد (مثال: وعليكم السلام)">
          <label style="font-size:12px;color:var(--muted)"><input type="checkbox" id="ar-exact"> مطابقة الكلمة بالضبط فقط</label>
          <button class="btn success" onclick="submitForm('/api/control/response', { trigger: document.getElementById('ar-trigger').value, response: document.getElementById('ar-response').value, exactMatch: document.getElementById('ar-exact').checked }, 'تمت إضافة الرد!')">➕ إضافة الرد</button>
        </div>
      </div>

      <!-- إرسال هدية -->
      <div class="ic">
        <h3>🎁 إرسال هدية لعضو</h3>
        <div style="display:flex;flex-direction:column;gap:10px;margin-top:10px;">
          <input type="text" id="gift-userId" class="url-input" placeholder="ID المستخدم">
          <input type="number" id="gift-amount" class="url-input" placeholder="المبلغ (مثال: 10000)">
          <button class="btn" style="background:var(--purple)" onclick="submitForm('/api/control/gift', { userId: document.getElementById('gift-userId').value, amount: Number(document.getElementById('gift-amount').value) }, 'تم إرسال الهدية!')">💸 إرسال الهدية</button>
        </div>
      </div>

      <!-- إرسال إعلان -->
      <div class="ic">
        <h3>📢 إرسال إعلان للديسكورد</h3>
        <div style="display:flex;flex-direction:column;gap:10px;margin-top:10px;">
          <input type="text" id="ann-channel" class="url-input" placeholder="ID الروم">
          <textarea id="ann-msg" class="url-input" rows="3" placeholder="اكتب رسالتك هنا..."></textarea>
          <button class="btn" style="background:var(--orange)" onclick="submitForm('/api/control/announce', { channelId: document.getElementById('ann-channel').value, message: document.getElementById('ann-msg').value }, 'تم إرسال الإعلان!')">🚀 إرسال الرسالة</button>
        </div>
      </div>
    </div>
    
    <script>
    async function submitForm(url, data, successMsg) {
      if(!data) return;
      try {
        const res = await fetch(url + '?key=${DASHBOARD_KEY}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await res.json();
        if(result.success) {
          alert(successMsg);
          document.querySelectorAll('.url-input').forEach(i => { if(i.id.startsWith(url.split('/').pop())) i.value = ''; });
        } else {
          alert('❌ خطأ: ' + (result.error || 'حدث خطأ'));
        }
      } catch(e) {
        alert('❌ خطأ في الاتصال بالخادم');
      }
    }
    </script>
  </div>
</div>

<div class="ftr"><div class="wrap">🤖 My Real Bot Dashboard • يتجدد تلقائياً • <span id="clk"></span></div></div>

<script>
function showTab(name, btn) {
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.ntab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  btn.classList.add('active');
}
function filterCmds(cat) {
  const el = document.getElementById('files-' + cat);
  const card = el.closest('.cmd-card');
  const show = el.style.display === 'none';
  el.style.display = show ? 'flex' : 'none';
  card.classList.toggle('expanded', show);
}
function copyUrl() {
  const inp = document.getElementById('urlInput');
  inp.select(); navigator.clipboard.writeText(inp.value).catch(() => {});
  const btn = inp.nextElementSibling;
  btn.textContent = '✅ تم النسخ!';
  setTimeout(() => btn.textContent = '📋 نسخ', 2000);
}
function updateClock() {
  document.getElementById('clk').textContent = new Date().toLocaleString('ar-SA');
}
updateClock(); setInterval(updateClock, 1000);
setTimeout(() => location.reload(), 60000);
</script>
</body>
</html>`;
}

// ─── مرجع الـ Client ──────────────────────────────────────────────────────────
let _client = null;
module.exports.setClient = (c) => { _client = c; };

// ─── HTTP Server ──────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
    const [urlPath, query] = req.url.split('?');
    const params = new URLSearchParams(query || '');
    const reqKey = params.get('key');

    // Helper for JSON response
    const sendJson = (status, data) => {
        res.writeHead(status, {'Content-Type':'application/json;charset=utf-8'});
        res.end(JSON.stringify(data));
    };

    // Helper for reading JSON body
    const readBody = () => new Promise(resolve => {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve({}); } });
    });

    if (req.method === 'POST' && urlPath.startsWith('/api/control/')) {
        if (reqKey !== DASHBOARD_KEY) return sendJson(401, { success: false, error: 'Unauthorized' });
        const body = await readBody();

        if (urlPath === '/api/control/response') {
            if (!body.trigger || !body.response) return sendJson(400, { success: false, error: 'بيانات ناقصة' });
            dConf.addAutoResponse(body.trigger, body.response, !!body.exactMatch);
            return sendJson(200, { success: true });
        }
        
        if (urlPath === '/api/control/gift') {
            if (!body.userId || !body.amount) return sendJson(400, { success: false, error: 'بيانات ناقصة' });
            
            // Add money to database
            db.addMoney(body.userId, body.amount);
            
            // Send DM to the user
            if (_client) {
                try {
                    const user = await _client.users.fetch(body.userId);
                    if (user) {
                        await user.send(`🎁 **صاحب البوت ارسلك هدية يا فقير!**\nالمبلغ: **${body.amount.toLocaleString()}** 💰`);
                    }
                } catch (err) {
                    console.error('[Dashboard] Failed to send gift DM:', err.message);
                }
            }
            
            return sendJson(200, { success: true });
        }

        if (urlPath === '/api/control/announce') {
            if (!_client) return sendJson(500, { success: false, error: 'البوت غير متصل' });
            if (!body.channelId || !body.message) return sendJson(400, { success: false, error: 'بيانات ناقصة' });
            const channel = _client.channels.cache.get(body.channelId);
            if (!channel) return sendJson(404, { success: false, error: 'الروم غير موجود' });
            try {
                await channel.send(body.message);
                return sendJson(200, { success: true });
            } catch (e) {
                return sendJson(500, { success: false, error: e.message });
            }
        }
    }

    // ─ Health check (لا يحتاج مفتاح — مهم لـ Render)
    if (urlPath === '/health' || urlPath === '/') {
        const uptime = process.uptime();
        const h = Math.floor(uptime/3600), m = Math.floor((uptime%3600)/60);
        res.writeHead(200, {'Content-Type':'application/json;charset=utf-8'});
        return res.end(JSON.stringify({
            status:'online', uptime:`${h}h ${m}m`,
            guilds:_client?.guilds?.cache?.size??0,
            tag:_client?.user?.tag??'connecting...',
            dashboard:`${BASE_URL}/dashboard?key=${DASHBOARD_KEY}`,
        }));
    }

    // ─ API Stats (يحتاج مفتاح)
    if (urlPath === '/api/stats') {
        if (reqKey !== DASHBOARD_KEY) { res.writeHead(401); return res.end('Unauthorized'); }
        res.writeHead(200, {'Content-Type':'application/json;charset=utf-8','Access-Control-Allow-Origin':'*'});
        const s = buildStats(_client);
        return res.end(JSON.stringify({ status:'online', timestamp:new Date().toISOString(), stats:s }, null, 2));
    }

    // ─ API Logs (يحتاج مفتاح)
    if (urlPath === '/api/logs') {
        if (reqKey !== DASHBOARD_KEY) { res.writeHead(401); return res.end('Unauthorized'); }
        res.writeHead(200, {'Content-Type':'application/json;charset=utf-8'});
        return res.end(JSON.stringify(readLogs(300)));
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ─── Store & Auction Web API ───────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════════
    
    // Clean up expired tokens periodically
    if (Math.random() < 0.1) {
        const now = Date.now();
        for (const [t, data] of webTokens.entries()) {
            if (now > data.expiresAt) webTokens.delete(t);
        }
    }

    if (urlPath === '/api/store/data' || urlPath === '/api/store/buy' || urlPath === '/api/store/sell' || 
        urlPath === '/api/auction/data' || urlPath === '/api/auction/start' || urlPath === '/api/auction/bid') {
        
        const tokenStr = params.get('token') || (req.method === 'POST' ? (await readBody()).token : null);
        const session = webTokens.get(tokenStr);
        if (!session || Date.now() > session.expiresAt) {
            return sendJson(401, { success: false, error: 'انتهت صلاحية الجلسة، الرجاء كتابة الأمر في الديسكورد مجدداً' });
        }
        
        const userId = session.userId;
        const userData = db.getUserData(userId);

        if (req.method === 'GET' && urlPath === '/api/store/data') {
            return sendJson(200, {
                success: true,
                user: {
                    username: session.username,
                    avatar: session.avatar,
                    balance: userData.balance || 0,
                    bank: userData.bank || 0,
                    inventory: userData.inventory || {}
                },
                items: config.shopItems
            });
        }

        if (req.method === 'POST' && urlPath === '/api/store/buy') {
            const body = await readBody();
            const itemId = body.itemId;
            const item = config.shopItems[itemId];
            
            if (!item) return sendJson(400, { success: false, error: 'عنصر غير موجود' });
            if ((userData.balance || 0) < item.price) return sendJson(400, { success: false, error: 'رصيدك لا يكفي' });
            if (userData.inventory && userData.inventory[itemId]) return sendJson(400, { success: false, error: 'أنت تملك هذا العنصر بالفعل' });
            
            const removed = db.removeMoney(userId, item.price);
            if (!removed) return sendJson(400, { success: false, error: 'رصيدك لا يكفي' });
            
            db.addTransaction(userId, 'shop_buy_web', item.price, `Bought ${item.name} from Web`);
            
            const inv = userData.inventory || {};
            const now = Date.now();
            
            // Special items handling could go here, but for now we just add to inventory
            if (itemId !== 'bankextend') {
                inv[itemId] = { purchasedAt: now, expiresAt: item.duration === 999 ? null : now + (item.duration * 24 * 60 * 60 * 1000) };
            } else {
                db.updateFields(userId, { bankCap: (userData.bankCap || 0) + 50000 });
            }
            
            if (itemId === 'moneybag') {
                const cash = Math.floor(Math.random() * 5000) + 1000;
                db.addMoney(userId, cash);
                delete inv[itemId];
            }
            
            db.updateFields(userId, { inventory: inv });
            return sendJson(200, { success: true, newBalance: db.getUserData(userId).balance });
        }

        if (req.method === 'POST' && urlPath === '/api/store/sell') {
            const body = await readBody();
            const itemId = body.itemId;
            const item = config.shopItems[itemId];
            
            if (!item) return sendJson(400, { success: false, error: 'عنصر غير موجود' });
            if (!userData.inventory || !userData.inventory[itemId]) return sendJson(400, { success: false, error: 'أنت لا تملك هذا العنصر' });
            
            // Refund 50%
            const refund = Math.floor(item.price * 0.5);
            const inv = { ...userData.inventory };
            delete inv[itemId];
            
            db.updateFields(userId, { inventory: inv });
            db.addMoney(userId, refund);
            db.addTransaction(userId, 'shop_sell_web', refund, `Sold ${item.name} from Web`);
            
            return sendJson(200, { success: true, refund, newBalance: db.getUserData(userId).balance });
        }
        
        // --- Auction API ---
        if (req.method === 'GET' && urlPath === '/api/auction/data') {
            const now = Date.now();
            const active = [];
            for (const [id, auc] of activeAuctions.entries()) {
                if (now > auc.endsAt) {
                    // Process ended auction
                    if (auc.highestBidderId) {
                        // Transfer item
                        const buyerData = db.getUserData(auc.highestBidderId);
                        const buyerInv = buyerData.inventory || {};
                        buyerInv[auc.itemId] = { purchasedAt: now, expiresAt: config.shopItems[auc.itemId].duration === 999 ? null : now + (config.shopItems[auc.itemId].duration * 24 * 60 * 60 * 1000) };
                        db.updateFields(auc.highestBidderId, { inventory: buyerInv });
                        
                        // Give money to seller
                        db.addMoney(auc.sellerId, auc.highestBid);
                    } else {
                        // Return item to seller
                        const sellerData = db.getUserData(auc.sellerId);
                        const sellerInv = sellerData.inventory || {};
                        sellerInv[auc.itemId] = { purchasedAt: now, expiresAt: config.shopItems[auc.itemId].duration === 999 ? null : now + (config.shopItems[auc.itemId].duration * 24 * 60 * 60 * 1000) };
                        db.updateFields(auc.sellerId, { inventory: sellerInv });
                    }
                    activeAuctions.delete(id);
                } else {
                    active.push({ id, ...auc, itemDetails: config.shopItems[auc.itemId] });
                }
            }
            
            return sendJson(200, {
                success: true,
                user: { username: session.username, avatar: session.avatar, balance: userData.balance || 0, inventory: userData.inventory || {} },
                auctions: active,
                items: config.shopItems
            });
        }
        
        if (req.method === 'POST' && urlPath === '/api/auction/start') {
            const body = await readBody();
            const itemId = body.itemId;
            const startingBid = Number(body.startingBid);
            
            if (!itemId || !startingBid || startingBid < 1) return sendJson(400, { success: false, error: 'بيانات غير صالحة' });
            if (!userData.inventory || !userData.inventory[itemId]) return sendJson(400, { success: false, error: 'أنت لا تملك هذا العنصر لبيعه' });
            
            // Remove item from inventory
            const inv = { ...userData.inventory };
            delete inv[itemId];
            db.updateFields(userId, { inventory: inv });
            
            const auctionId = crypto.randomBytes(8).toString('hex');
            activeAuctions.set(auctionId, {
                itemId,
                sellerId: userId,
                sellerName: session.username,
                highestBid: startingBid,
                highestBidderId: null,
                highestBidderName: null,
                endsAt: Date.now() + (1000 * 60 * 15) // 15 minutes auction
            });
            
            return sendJson(200, { success: true });
        }
        
        if (req.method === 'POST' && urlPath === '/api/auction/bid') {
            const body = await readBody();
            const auctionId = body.auctionId;
            const bidAmount = Number(body.bidAmount);
            
            const auc = activeAuctions.get(auctionId);
            if (!auc) return sendJson(400, { success: false, error: 'المزاد غير موجود أو انتهى' });
            if (Date.now() > auc.endsAt) return sendJson(400, { success: false, error: 'لقد انتهى هذا المزاد' });
            if (auc.sellerId === userId) return sendJson(400, { success: false, error: 'لا يمكنك المزايدة على مزادك الخاص' });
            if (bidAmount <= auc.highestBid) return sendJson(400, { success: false, error: `يجب أن تكون المزايدة أكبر من ${auc.highestBid.toLocaleString()}` });
            if ((userData.balance || 0) < bidAmount) return sendJson(400, { success: false, error: 'رصيدك لا يكفي للمزايدة' });
            
            // Remove money from new bidder
            if (!db.removeMoney(userId, bidAmount)) return sendJson(400, { success: false, error: 'رصيدك لا يكفي' });
            
            // Refund previous bidder if exists
            if (auc.highestBidderId) {
                db.addMoney(auc.highestBidderId, auc.highestBid);
            }
            
            // Update auction state
            auc.highestBid = bidAmount;
            auc.highestBidderId = userId;
            auc.highestBidderName = session.username;
            
            return sendJson(200, { success: true });
        }
    }


    // ─ Dashboard (يحتاج مفتاح)
    if (urlPath === '/dashboard') {
        if (reqKey !== DASHBOARD_KEY) {
            res.writeHead(403, {'Content-Type':'text/html;charset=utf-8'});
            return res.end(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>❌ غير مصرح</title><style>body{font-family:Cairo,sans-serif;background:#0a0b1a;color:#ed4245;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px}h1{font-size:28px}p{color:#7b7d9e;font-size:14px}</style></head><body><h1>🔒 غير مصرح بالوصول</h1><p>يجب أن تمتلك مفتاح الوصول الصحيح</p></body></html>`);
        }
        res.writeHead(200, {'Content-Type':'text/html;charset=utf-8'});
        return res.end(buildHTML(_client));
    }

    // ─ Store & Auction Web Pages
    if (urlPath === '/store' || urlPath === '/auction') {
        const token = params.get('token');
        if (!token || !webTokens.has(token)) {
            res.writeHead(401, {'Content-Type':'text/html;charset=utf-8'});
            return res.end(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>❌ غير مصرح</title><style>body{font-family:Cairo,sans-serif;background:#0a0b1a;color:#ed4245;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px}h1{font-size:28px}p{color:#7b7d9e;font-size:14px}</style></head><body><h1>🔒 الرابط غير صالح أو منتهي الصلاحية</h1><p>يرجى كتابة الأمر مرة أخرى في الديسكورد</p></body></html>`);
        }
        
        // We serve a static HTML file that fetches data via API using the token
        const fs = require('fs');
        const path = require('path');
        const file = urlPath === '/store' ? 'store.html' : 'auction.html';
        const filePath = path.join(__dirname, 'web', file);
        
        try {
            if (fs.existsSync(filePath)) {
                res.writeHead(200, {'Content-Type':'text/html;charset=utf-8'});
                return res.end(fs.readFileSync(filePath, 'utf8'));
            } else {
                res.writeHead(404);
                return res.end('Web UI file not found.');
            }
        } catch (e) {
            res.writeHead(500);
            return res.end('Internal Server Error');
        }
    }

    res.writeHead(404); res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
    const L = '─'.repeat(50);
    const envEmoji = RENDER_URL ? '☁️ ' : '💻 ';
    console.log(`\n┌${L}┐`);
    console.log(`│  🎛️  لوحة التحكم تعمل بنجاح${' '.repeat(22)}│`);
    console.log(`├${L}┤`);
    console.log(`│  🌐  ${BASE_URL}/health`);
    console.log(`│  🔐  ${BASE_URL}/dashboard?key=${DASHBOARD_KEY.slice(0,8)}...`);
    console.log(`│  ${envEmoji} البيئة: ${RENDER_URL ? 'Render Cloud ☁️' : 'Local 💻'}${' '.repeat(10)}│`);
    console.log(`└${L}┘\n`);
});


// إصلاح المتغير s الذي لم يُعرَّف في console.log
const envLabel = RENDER_URL ? 'Render' : 'Local';

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') console.error(`❌ المنفذ ${PORT} مشغول`);
    else console.error('❌ خطأ في الداشبورد:', err.message);
});
