// 客户端公共工具
const API = '/api';

function getToken() { return localStorage.getItem('yc_token'); }
function getUser() { try { return JSON.parse(localStorage.getItem('yc_user')); } catch { return null; } }

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(API + path, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await res.json();
  if (data.ok === false) throw new Error(data.error || '请求失败');
  return data;
}

function requireAuth() {
  if (!getToken()) { location.href = '/client/login.html'; }
}

function logout() {
  localStorage.removeItem('yc_token');
  localStorage.removeItem('yc_user');
  location.href = '/client/login.html';
}

function renderNav() {
  const user = getUser();
  const box = document.getElementById('navRight');
  if (!box) return;
  if (user) {
    box.innerHTML = `
      <a href="/client/profile.html">个人中心</a>
      <a href="/client/orders.html">我的订单</a>
      <span class="user-chip">👤 ${user.nickname || user.username}</span>
      <button class="btn small ghost" onclick="logout()">退出</button>`;
  } else {
    box.innerHTML = `
      <a href="/client/login.html">登录</a>
      <a href="/client/register.html"><button class="btn small">注册</button></a>`;
  }
}

const STATUS_TEXT = { pending: '待处理', processing: '充值中', done: '已完成', cancelled: '已取消' };
