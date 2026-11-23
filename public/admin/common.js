const API = '/api';
function getToken(){return localStorage.getItem('admin_token')}
async function api(path, opts={}){
  const headers={'Content-Type':'application/json',...(opts.headers||{})};
  const token=getToken();
  if(token) headers['Authorization']='Bearer '+token;
  const res=await fetch(API+path,{method:opts.method||'GET',headers,body:opts.body?JSON.stringify(opts.body):undefined});
  const data=await res.json();
  if(data.ok===false) throw new Error(data.error||'请求失败');
  return data;
}
function adminGuard(){
  if(!getToken()) location.href='/admin/login.html';
}
function logout(){localStorage.removeItem('admin_token');location.href='/admin/login.html';}
const STATUS_TEXT={pending:'待处理',processing:'充值中',done:'已完成',cancelled:'已取消'};
