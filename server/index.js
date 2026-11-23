const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { sign, authRequired, adminRequired } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 静态托管：客户端 /client，后台 /admin
app.use('/client', express.static(path.join(__dirname, '..', 'public', 'client')));
app.use('/admin', express.static(path.join(__dirname, '..', 'public', 'admin')));
app.get('/', (req, res) => res.redirect('/client/index.html'));

// ============ 认证 ============
app.post('/api/register', (req, res) => {
  const { username, password, nickname } = req.body || {};
  if (!username || !password) return res.json({ ok: false, error: '请填写账号和密码' });
  if (username.length < 3 || password.length < 6) return res.json({ ok: false, error: '账号至少3位，密码至少6位' });
  const exist = db.prepare('SELECT id FROM users WHERE username=?').get(username);
  if (exist) return res.json({ ok: false, error: '账号已被注册' });
  const hash = bcrypt.hashSync(password, 10);
  const nick = nickname || username;
  const info = db.prepare('INSERT INTO users (username, password_hash, nickname, role) VALUES (?,?,?,?)')
    .run(username, hash, nick, 'user');
  const user = { id: info.lastInsertRowid, username, nickname: nick, role: 'user' };
  res.json({ ok: true, token: sign(user), user });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const row = db.prepare('SELECT * FROM users WHERE username=?').get(username);
  if (!row || !bcrypt.compareSync(password || '', row.password_hash)) {
    return res.json({ ok: false, error: '账号或密码错误' });
  }
  const user = { id: row.id, username: row.username, nickname: row.nickname, role: row.role };
  res.json({ ok: true, token: sign(user), user });
});

app.get('/api/me', authRequired, (req, res) => {
  const row = db.prepare('SELECT id, username, nickname, role, created_at FROM users WHERE id=?').get(req.user.id);
  res.json({ ok: true, user: row });
});

// ============ 游戏 / 商品（公开） ============
app.get('/api/games', (req, res) => {
  const games = db.prepare(`SELECT * FROM games WHERE active=1 ORDER BY sort, id`).all();
  const goods = db.prepare(`SELECT * FROM goods WHERE active=1 ORDER BY sort, id`).all();
  games.forEach(g => { g.goods = goods.filter(x => x.game_id === g.id); });
  res.json({ ok: true, games });
});

// ============ 订单（用户） ============
app.post('/api/orders', authRequired, (req, res) => {
  const { game_id, good_id, server, role_id, contact } = req.body || {};
  const game = db.prepare('SELECT * FROM games WHERE id=? AND active=1').get(game_id);
  const good = db.prepare('SELECT * FROM goods WHERE id=? AND game_id=? AND active=1').get(good_id, game_id);
  if (!game || !good) return res.json({ ok: false, error: '商品不存在或已下架' });
  if (!server || !role_id) return res.json({ ok: false, error: '请填写区服和角色 ID' });

  const orderNo = 'YA' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 90 + 10);
  const info = db.prepare(`INSERT INTO orders (order_no, user_id, game_id, good_id, game_name, good_name, price, server, role_id, contact)
    VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(orderNo, req.user.id, game_id, good_id, game.name, good.name, good.price, server, role_id, contact || '');
  const order = db.prepare('SELECT * FROM orders WHERE id=?').get(info.lastInsertRowid);
  res.json({ ok: true, order });
});

app.get('/api/orders/mine', authRequired, (req, res) => {
  const rows = db.prepare('SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC').all(req.user.id);
  res.json({ ok: true, orders: rows });
});

// ============ 后台：订单管理 ============
app.get('/api/admin/orders', authRequired, adminRequired, (req, res) => {
  const { status } = req.query;
  let rows;
  if (status && status !== 'all') {
    rows = db.prepare(`SELECT o.*, u.username, u.nickname FROM orders o LEFT JOIN users u ON o.user_id=u.id WHERE o.status=? ORDER BY o.created_at DESC`).all(status);
  } else {
    rows = db.prepare(`SELECT o.*, u.username, u.nickname FROM orders o LEFT JOIN users u ON o.user_id=u.id ORDER BY o.created_at DESC`).all();
  }
  res.json({ ok: true, orders: rows });
});

app.patch('/api/admin/orders/:id/status', authRequired, adminRequired, (req, res) => {
  const { status, note } = req.body || {};
  const allowed = ['pending', 'processing', 'done', 'cancelled'];
  if (!allowed.includes(status)) return res.json({ ok: false, error: '无效状态' });
  db.prepare(`UPDATE orders SET status=?, note=?, updated_at=datetime('now','localtime') WHERE id=?`)
    .run(status, note || '', req.params.id);
  const order = db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);
  res.json({ ok: true, order });
});

// ============ 后台：游戏 / 商品管理 ============
app.get('/api/admin/games', authRequired, adminRequired, (req, res) => {
  const games = db.prepare('SELECT * FROM games ORDER BY sort, id').all();
  const goods = db.prepare('SELECT * FROM goods ORDER BY sort, id').all();
  games.forEach(g => { g.goods = goods.filter(x => x.game_id === g.id); });
  res.json({ ok: true, games });
});

app.post('/api/admin/games', authRequired, adminRequired, (req, res) => {
  const { name, icon, color, description, sort } = req.body || {};
  if (!name) return res.json({ ok: false, error: '请填写游戏名' });
  const info = db.prepare('INSERT INTO games (name, icon, color, description, sort) VALUES (?,?,?,?,?)')
    .run(name, icon || '🎮', color || '#2563eb', description || '', sort || 0);
  res.json({ ok: true, game: db.prepare('SELECT * FROM games WHERE id=?').get(info.lastInsertRowid) });
});

app.patch('/api/admin/games/:id', authRequired, adminRequired, (req, res) => {
  const g = db.prepare('SELECT * FROM games WHERE id=?').get(req.params.id);
  if (!g) return res.json({ ok: false, error: '游戏不存在' });
  const { name, icon, color, description, sort, active } = req.body || {};
  db.prepare('UPDATE games SET name=?, icon=?, color=?, description=?, sort=?, active=? WHERE id=?')
    .run(name ?? g.name, icon ?? g.icon, color ?? g.color, description ?? g.description, sort ?? g.sort, active ?? g.active, req.params.id);
  res.json({ ok: true, game: db.prepare('SELECT * FROM games WHERE id=?').get(req.params.id) });
});

app.post('/api/admin/goods', authRequired, adminRequired, (req, res) => {
  const { game_id, name, description, price, orig_price, badge, sort } = req.body || {};
  if (!game_id || !name || price == null) return res.json({ ok: false, error: '请填写完整商品信息' });
  const info = db.prepare('INSERT INTO goods (game_id, name, description, price, orig_price, badge, sort) VALUES (?,?,?,?,?,?,?)')
    .run(game_id, name, description || '', price, orig_price || 0, badge || '', sort || 0);
  res.json({ ok: true, good: db.prepare('SELECT * FROM goods WHERE id=?').get(info.lastInsertRowid) });
});

app.patch('/api/admin/goods/:id', authRequired, adminRequired, (req, res) => {
  const gd = db.prepare('SELECT * FROM goods WHERE id=?').get(req.params.id);
  if (!gd) return res.json({ ok: false, error: '商品不存在' });
  const { name, description, price, orig_price, badge, sort, active } = req.body || {};
  db.prepare('UPDATE goods SET name=?, description=?, price=?, orig_price=?, badge=?, sort=?, active=? WHERE id=?')
    .run(name ?? gd.name, description ?? gd.description, price ?? gd.price, orig_price ?? gd.orig_price, badge ?? gd.badge, sort ?? gd.sort, active ?? gd.active, req.params.id);
  res.json({ ok: true, good: db.prepare('SELECT * FROM goods WHERE id=?').get(req.params.id) });
});

// ============ 后台：看板统计 ============
app.get('/api/admin/stats', authRequired, adminRequired, (req, res) => {
  const totalOrders = db.prepare('SELECT COUNT(*) c FROM orders').get().c;
  const doneOrders = db.prepare("SELECT COUNT(*) c FROM orders WHERE status='done'").get().c;
  const pendingOrders = db.prepare("SELECT COUNT(*) c FROM orders WHERE status='pending'").get().c;
  const revenue = db.prepare("SELECT COALESCE(SUM(price),0) s FROM orders WHERE status='done'").get().s;
  const users = db.prepare("SELECT COUNT(*) c FROM users WHERE role='user'").get().c;
  res.json({ ok: true, stats: { totalOrders, doneOrders, pendingOrders, revenue, users } });
});

// 启动时：若库为空则自动初始化演示账号与占位游戏（不覆盖已有数据）
try {
  const userCount = db.prepare('SELECT COUNT(*) c FROM users').get().c;
  if (userCount === 0) {
    require('./seed');
  }
} catch (e) {
  console.warn('自动初始化跳过：', e.message);
}

app.listen(PORT, () => console.log(`屿安代充服务已启动: http://localhost:${PORT}`));
