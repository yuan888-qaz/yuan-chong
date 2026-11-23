const db = require('./db');
const bcrypt = require('bcryptjs');

const games = [
  { name: '星途天城', icon: '✨', color: '#e8a13a', description: '神话卡牌 · 公测中', goods: [
    { name: '月卡（30天）', description: '每日领取钻石与体力', price: 25, orig: 30, badge: '热销' },
    { name: '6480 钻石', description: '首充双倍档，快速养成', price: 528, orig: 648, badge: '' },
    { name: '新手成长礼包', description: '含招募券与养成材料', price: 68, orig: 88, badge: '' },
    { name: '终身特权卡', description: '永久每日福利，长期保值', price: 108, orig: 128, badge: '推荐' }
  ]},
  { name: '王者荣耀', icon: '👑', color: '#2563eb', description: 'MOBA · 点券代充', goods: [
    { name: '680 点券', description: '首充双倍，买皮肤首选', price: 58, orig: 68, badge: '热销' },
    { name: '6480 点券', description: '大额点券，性价比高', price: 568, orig: 648, badge: '' },
    { name: '战令进阶卡', description: '赛季战令奖励全开', price: 32, orig: 38, badge: '' },
    { name: '荣耀积分礼包', description: '积分夺宝专用', price: 98, orig: 118, badge: '' }
  ]},
  { name: '原神', icon: '🌠', color: '#16a34a', description: '开放世界 · 创世结晶', goods: [
    { name: '空月祝福（月卡）', description: '每日 90 原石，30天', price: 28, orig: 30, badge: '热销' },
    { name: '6480 创世结晶', description: '首充双倍，抽卡必备', price: 528, orig: 648, badge: '' },
    { name: '纪行宝匣（大月卡）', description: '纪行等级奖励拉满', price: 65, orig: 68, badge: '' }
  ]},
  { name: '梦幻西游手游', icon: '🐉', color: '#8b5cf6', description: '回合制 · 仙玉代充', goods: [
    { name: '月卡（30天）', description: '每日仙玉与福利', price: 25, orig: 30, badge: '' },
    { name: '6480 仙玉', description: '大额仙玉，买外观', price: 528, orig: 648, badge: '热销' },
    { name: '成长礼包', description: '新手养成助力', price: 48, orig: 68, badge: '' }
  ]},
  { name: '金铲铲之战', icon: '♟️', color: '#f59e0b', description: '自走棋 · 点券代充', goods: [
    { name: '680 点券', description: '小小英雄 / 棋盘', price: 58, orig: 68, badge: '' },
    { name: '宝典进阶卡', description: '赛季宝典奖励全开', price: 32, orig: 38, badge: '热销' },
    { name: '6480 点券', description: '大额点券囤货', price: 568, orig: 648, badge: '' }
  ]}
];

function seed() {
  // 清表（重新种子）
  db.exec('DELETE FROM orders; DELETE FROM goods; DELETE FROM games; DELETE FROM users;');

  const adminHash = bcrypt.hashSync('admin123', 10);
  const userHash = bcrypt.hashSync('123456', 10);
  db.prepare(`INSERT INTO users (username, password_hash, nickname, role) VALUES (?,?,?,?)`)
    .run('admin', adminHash, '管理员', 'admin');
  db.prepare(`INSERT INTO users (username, password_hash, nickname, role) VALUES (?,?,?,?)`)
    .run('demo', userHash, '演示用户', 'user');

  const insGame = db.prepare(`INSERT INTO games (name, icon, color, description, sort) VALUES (?,?,?,?,?)`);
  const insGood = db.prepare(`INSERT INTO goods (game_id, name, description, price, orig_price, badge, sort) VALUES (?,?,?,?,?,?,?)`);

  games.forEach((g, gi) => {
    const info = insGame.run(g.name, g.icon, g.color, g.description, gi);
    g.goods.forEach((gd, i) => {
      insGood.run(info.lastInsertRowid, gd.name, gd.description, gd.price, gd.orig, gd.badge, i);
    });
  });

  console.log('种子完成：管理员 admin / admin123，演示用户 demo / 123456');
}

// 模式：
//   默认 / npm run seed   —— 清表全量重建
//   SEED_IF_EMPTY=1       —— 仅当库内无用户时才初始化（生产首次启动自动建账号，不覆盖已有数据）
if (process.env.SEED_IF_EMPTY === '1') {
  const count = db.prepare('SELECT COUNT(*) c FROM users').get().c;
  if (count === 0) {
    seed();
  } else {
    console.log('检测到已有用户，跳过种子初始化。');
  }
} else {
  seed();
}
