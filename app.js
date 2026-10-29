'use strict';
/* ===== CONFIG: edit numbers here ===== */
const CONFIG = {
  KEY: 'pushups_pvp_v1',
  GOLD_PER_REP: 1,            // gold per rep logged
  SESSION_BONUS_PER_10: 5,    // bonus gold per 10 reps, paid once when a session ends
  // Lifetime reps needed for rank 1,2,3... (each universe uses the first N entries)
  THRESHOLDS: [0, 50, 200, 500, 1000, 2000, 4000, 7000]
};
const U = (id, name, r) => ({ id, name, ranks: r.split('|') });
const UNIVERSES = [
  U('naruto','Naruto','Academy Student|Genin|Chūnin|Jōnin|ANBU|Kage|Six Paths'),
  U('bleach','Bleach','Academy Student|Seated Officer|Lieutenant|Captain|Bankai Master|Transcendent'),
  U('dbz','Dragon Ball','Martial Artist|Elite Fighter|Super Saiyan|Super Saiyan God|Super Saiyan Blue|Ultra Instinct'),
  U('op','One Piece','Rookie Pirate|Notorious Pirate|Grand Line Veteran|New World Raider|Commander|Emperor|Pirate Legend'),
  U('jjk','Jujutsu Kaisen','Grade 4|Grade 3|Grade 2|Semi-Grade 1|Grade 1|Special Grade'),
  U('solo','Solo Leveling','E-Rank|D-Rank|C-Rank|B-Rank|A-Rank|S-Rank|National Level|Monarch'),
  U('origin','TRUE ORIGIN','Mortal Realm|Tempering Realm|Meridian Realm|Master Realm|Grandmaster Realm|Transcendent Realm|True Origin Realm')
];
// slot, id, name, price (gold), req = lifetime reps needed (0 = none)
const ITEMS = [
  ['hair','buzz','Buzz cut',0,0],['hair','spiky','Spiky hair',150,0],['hair','long','Long hair',300,0],['hair','mohawk','Mohawk',400,200],
  ['face','stubble','Rough stubble',0,0],['face','clean','Clean shaven',0,0],['face','beard','Full beard',200,0],
  ['top','tank','White tank top',0,0],['top','tee','Black tee',120,0],['top','hoodie','Violet hoodie',350,50],['top','gi','Prestige gi',1000,1000],
  ['pants','sweat','Grey sweatpants',0,0],['pants','shorts','Blue shorts',100,0],['pants','jogger','Black joggers',200,0],['pants','royal','Prestige hakama',800,500],
  ['shoes','flip','Black flip-flops',0,0],['shoes','sneak','White sneakers',150,0],['shoes','boots','Combat boots',300,50],
  ['acc','none','No accessory',0,0],['acc','band','Red headband',80,0],['acc','glasses','Shades',120,0],['acc','scarf','Long scarf',250,200],
  ['fx','none','No effect',0,0],['fx','spark','Spark ring',300,200],['fx','aura','Power aura',500,1000]
].map(a => ({ slot:a[0], id:a[1], name:a[2], price:a[3], req:a[4], key:a[0]+':'+a[1] }));
const STARTER = ['hair:buzz','face:stubble','face:clean','top:tank','pants:sweat','shoes:flip','acc:none','fx:none'];
const HAIRCOLORS = ['#1a1a1a','#5a3a22','#c9a24a','#7c5cff','#e5e5e5','#d33f49'];
const SLOTS = [['hair','Hair'],['face','Face'],['top','Top'],['pants','Pants'],['shoes','Shoes'],['acc','Accessory'],['fx','Effect']];
const ACH = [
  ['first','First workout',s=>s.sessions.length>=1],
  ['r100','100 total reps',s=>s.reps>=100],
  ['r1000','1,000 total reps',s=>s.reps>=1000],
  ['pvp','First PvP match (needs Phase 2)',s=>false]
];

/* ===== STATE ===== */
const fresh = () => ({ setup:false, guest:true, profile:{username:'',age:'',height:'',weight:''}, uni:'naruto',
  reps:0, gold:0, owned:STARTER.slice(), eq:{hair:'buzz',face:'stubble',top:'tank',pants:'sweat',shoes:'flip',acc:'none',fx:'none'},
  hairColor:HAIRCOLORS[0], events:[], sessions:[], cur:null, tab:'home' });
let S = fresh(), shopCat = 'hair';
function load(){ try{ const r = localStorage.getItem(CONFIG.KEY); if(r) S = Object.assign(fresh(), JSON.parse(r)); }catch(e){ S = fresh(); } }
function save(){ try{ localStorage.setItem(CONFIG.KEY, JSON.stringify(S)); }catch(e){ toast('Could not save: storage is full or blocked', 1); } }

/* ===== HELPERS ===== */
const h = (t, p = {}, ...k) => { const e = document.createElement(t);
  for(const [a,v] of Object.entries(p)){ if(a==='on'){ for(const [ev,f] of Object.entries(v)) e.addEventListener(ev,f); } else if(a==='class') e.className=v; else if(v!==false&&v!=null) e.setAttribute(a,v); }
  k.flat(9).filter(c=>c!=null&&c!==false).forEach(c=>e.append(c instanceof Node?c:String(c))); return e; };
const btn = (label, fn, cls='', extra={}) => h('button',Object.assign({class:cls,type:'button',on:{click:fn}},extra),label);
function toast(msg, bad){ const t=document.getElementById('toast'); const d=h('div',{class:bad?'e':''},msg); t.append(d); setTimeout(()=>d.remove(),2600); }
function showErr(m){ const e=document.getElementById('err'); e.hidden=false; e.textContent='Error: '+m; }
window.addEventListener('error', ev => showErr(ev.message+' (line '+ev.lineno+')'));
window.addEventListener('unhandledrejection', ev => showErr(String(ev.reason)));
const uni = () => UNIVERSES.find(u=>u.id===S.uni)||UNIVERSES[0];
function rankInfo(u){ const th=CONFIG.THRESHOLDS.slice(0,u.ranks.length); let i=0; th.forEach((t,j)=>{ if(S.reps>=t) i=j; });
  const next=th[i+1]; return { i, th, name:u.ranks[i], nextName:u.ranks[i+1], left:next==null?0:next-S.reps, pct:next==null?100:Math.floor((S.reps-th[i])/(next-th[i])*100) }; }
const dayKey = t => { const d=new Date(t); return d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate(); };
function totals(){ const start=new Date().setHours(0,0,0,0); let day=0,week=0;
  S.events.forEach(e=>{ if(e.t>=start) day+=e.n; if(e.t>=start-6*864e5) week+=e.n; });
  const days=new Set(S.events.map(e=>dayKey(e.t))); let streak=0, d=Date.now(); if(!days.has(dayKey(d))) d-=864e5;
  while(days.has(dayKey(d))){ streak++; d-=864e5; }
  return { day, week, streak, pr:Math.max(0,...S.sessions.map(s=>s.reps)) }; }

/* ===== GAME LOGIC ===== */
function addReps(n){
  const u=uni(), before=rankInfo(u).i;
  if(!S.cur) S.cur={id:Date.now()+'-'+Math.random().toString(36).slice(2,7),start:Date.now(),reps:0,bonus:false};
  const g=n*CONFIG.GOLD_PER_REP; S.cur.reps+=n; S.reps+=n; S.gold+=g;
  S.events.push({t:Date.now(),n,sid:S.cur.id}); if(S.events.length>3000) S.events.splice(0,S.events.length-3000);
  save(); render(); toast('+'+g+' gold');
  const after=rankInfo(u); if(after.i>before) rankUp(after.name);
}
function removeLast(all){
  if(!S.cur) return;
  const take = e => { S.cur.reps-=e.n; S.reps-=e.n; S.gold=Math.max(0,S.gold-e.n*CONFIG.GOLD_PER_REP); };
  if(all){ S.events=S.events.filter(e=>{ if(e.sid===S.cur.id){ take(e); return false; } return true; }); }
  else { for(let i=S.events.length-1;i>=0;i--){ if(S.events[i].sid===S.cur.id){ take(S.events[i]); S.events.splice(i,1); break; } } }
  save(); render();
}
function endSession(){
  if(!S.cur) return;
  if(S.cur.reps>0){ const bonus = S.cur.bonus?0:Math.floor(S.cur.reps/10)*CONFIG.SESSION_BONUS_PER_10;
    S.gold+=bonus; S.cur.bonus=true; S.sessions.push({id:S.cur.id,start:S.cur.start,end:Date.now(),reps:S.cur.reps,bonus});
    toast('Workout saved: '+S.cur.reps+' reps'+(bonus?' +'+bonus+' bonus gold':'')); }
  S.cur=null; save(); render();
}
function rankUp(name){ const o=h('div',{class:'rankup',on:{click:()=>o.remove()}},h('div',{},'RANK UP'),h('b',{},name),h('p',{class:'muted'},'Tap to continue')); document.body.append(o); setTimeout(()=>o.remove(),3500); }
function lockReason(it){ if(S.owned.includes(it.key)) return ''; return S.reps<it.req?'Reach '+it.req+' lifetime reps':''; }
function buy(it){
  if(S.owned.includes(it.key)) return toast('Already owned',1);
  if(S.reps<it.req) return toast('Locked: '+lockReason(it),1);
  if(S.gold<it.price) return toast('Not enough gold ('+it.price+' needed)',1);
  S.gold-=it.price; S.owned.push(it.key); save(); render(); toast('Bought '+it.name);
}
function equip(it){ if(!S.owned.includes(it.key)) return toast('You do not own this item',1); S.eq[it.slot]=it.id; save(); render(); }

/* ===== AVATAR (original layered SVG; fixed strings only) ===== */
function avatarSVG(){
  const e=S.eq, hc=S.hairColor, skin='#d9a77e';
  const topC={tank:'#f4f4f4',tee:'#1b1b22',hoodie:'#6a4ae0',gi:'#e8e2d0'}[e.top]||'#f4f4f4';
  const sleeve=e.top!=='tank'; const pc={sweat:'#8a8a94',shorts:'#2f6fd0',jogger:'#191920',royal:'#3a2a6a'}[e.pants]||'#8a8a94';
  const short=e.pants==='shorts';
  let s='<svg class="av" viewBox="0 0 120 200" role="img" aria-label="Your avatar">';
  if(e.fx==='aura') s+='<ellipse cx="60" cy="110" rx="52" ry="86" fill="#7c5cff" opacity=".22"/><ellipse cx="60" cy="110" rx="42" ry="76" fill="none" stroke="#38bdf8" stroke-width="2" opacity=".8"/>';
  if(e.fx==='spark') s+='<circle cx="60" cy="110" r="56" fill="none" stroke="#38bdf8" stroke-width="2" stroke-dasharray="3 9"/>';
  s+='<rect x="38" y="118" width="20" height="'+(short?24:52)+'" rx="5" fill="'+pc+'"/><rect x="62" y="118" width="20" height="'+(short?24:52)+'" rx="5" fill="'+pc+'"/>';
  if(short) s+='<rect x="41" y="142" width="14" height="28" fill="'+skin+'"/><rect x="65" y="142" width="14" height="28" fill="'+skin+'"/>';
  const sh={flip:['#111',6],sneak:['#fff',11],boots:['#2a2018',16]}[e.shoes]||['#111',6];
  s+='<rect x="36" y="'+(176-sh[1]+6)+'" width="24" height="'+sh[1]+'" rx="4" fill="'+sh[0]+'"/><rect x="60" y="'+(176-sh[1]+6)+'" width="24" height="'+sh[1]+'" rx="4" fill="'+sh[0]+'"/>';
  s+='<rect x="22" y="72" width="14" height="46" rx="7" fill="'+(sleeve?topC:skin)+'"/><rect x="84" y="72" width="14" height="46" rx="7" fill="'+(sleeve?topC:skin)+'"/>';
  s+='<rect x="34" y="70" width="52" height="54" rx="10" fill="'+topC+'"/><rect x="52" y="60" width="16" height="14" fill="'+skin+'"/>';
  if(e.top==='gi') s+='<path d="M60 70 L48 124 M60 70 L72 124" stroke="#8a7f5a" stroke-width="3"/>';
  if(e.acc==='scarf') s+='<rect x="46" y="64" width="28" height="9" rx="4" fill="#d33f49"/><rect x="68" y="68" width="8" height="30" rx="3" fill="#d33f49"/>';
  s+='<circle cx="60" cy="44" r="22" fill="'+skin+'"/><ellipse cx="51" cy="46" rx="3" ry="4" fill="#111"/><ellipse cx="69" cy="46" rx="3" ry="4" fill="#111"/><path d="M54 58 Q60 61 66 58" stroke="#7a4a35" fill="none" stroke-width="1.5"/>';
  if(e.face==='stubble') s+='<path d="M40 48 Q60 76 80 48 Q76 62 60 66 Q44 62 40 48Z" fill="#2a1d15" opacity=".35"/>';
  if(e.face==='beard') s+='<path d="M38 46 Q40 78 60 80 Q80 78 82 46 Q74 62 60 62 Q46 62 38 46Z" fill="'+hc+'"/>';
  const hp={buzz:'<path d="M38 40 Q60 12 82 40 Q60 28 38 40Z"/>',spiky:'<path d="M37 42 L40 18 L50 30 L58 10 L66 30 L78 16 L83 42 Q60 26 37 42Z"/>',
    long:'<path d="M36 46 Q36 12 60 14 Q84 12 84 46 L88 90 L76 90 L78 42 Q60 30 42 42 L44 90 L32 90Z"/>',mohawk:'<path d="M54 30 L56 4 L64 4 L66 30Z"/>'}[e.hair];
  s+='<g fill="'+hc+'">'+(hp||'')+'</g>';
  if(e.acc==='band') s+='<rect x="38" y="31" width="44" height="6" rx="3" fill="#d33f49"/>';
  if(e.acc==='glasses') s+='<rect x="42" y="41" width="15" height="9" rx="3" fill="#111"/><rect x="63" y="41" width="15" height="9" rx="3" fill="#111"/><rect x="57" y="44" width="6" height="2" fill="#111"/>';
  return s+'</svg>';
}
const avatarBox = () => { const d=h('div'); d.innerHTML=avatarSVG(); return d; };

/* ===== VIEWS ===== */
function bar(p){ return h('div',{class:'bar',role:'progressbar','aria-valuenow':p,'aria-valuemin':0,'aria-valuemax':100},h('i',{style:'width:'+p+'%'})); }
function rankCard(){ const u=uni(), r=rankInfo(u);
  return h('div',{class:'card'},h('div',{class:'row sp'},h('b',{},u.name+': '+r.name),h('span',{class:'muted'},r.pct+'%')),bar(r.pct),
    h('p',{class:'muted'},r.nextName?r.left+' reps to '+r.nextName:'Top rank reached')); }
function incRow(){ return h('div',{class:'row'},[1,5,10].map(n=>btn('+'+n,()=>addReps(n),n===1?'pri':'',{style:'flex:1'}))); }

function vHome(){ const t=totals();
  return [h('h1',{},'Hey, '+(S.profile.username||'Fighter')), h('div',{class:'card'},avatarBox()),
    rankCard(),
    h('div',{class:'grid'},h('div',{class:'card stat'},h('b',{},S.gold),'Gold'),h('div',{class:'card stat'},h('b',{},t.day),'Reps today')),
    h('div',{class:'card'},h('p',{class:'muted'},'Quick log (your own count)'),incRow())]; }

function vWorlds(){ return [h('h1',{},'Worlds'),h('p',{class:'muted'},'Ranks come from your lifetime reps. Switching worlds keeps all reps, gold and items.'),
  UNIVERSES.map(u=>{ const sel=u.id===S.uni; const cur=rankInfo(u);
    return h('div',{class:'card'},h('div',{class:'row sp'},h('b',{},u.name),btn(sel?'Active':'Switch',()=>{S.uni=u.id;save();render();toast('World: '+u.name);},sel?'':'pri',{disabled:sel})),
      u.ranks.map((n,i)=>h('div',{class:'rank '+(i<cur.i?'on':i===cur.i?'cur':'lock')},(i<=cur.i?'✔ ':'🔒 ')+n+' ',h('span',{class:'muted'},CONFIG.THRESHOLDS[i]+' reps')))); })]; }

function vTrain(){ const t=totals(), c=S.cur;
  return [h('h1',{},'Training'),
    h('div',{class:'card'},h('p',{class:'muted'},c?'Session in progress':'No session yet. Your first rep starts one.'),h('h2',{},'This session: '+(c?c.reps:0)),
      btn('+1 Rep',()=>addReps(1),'pri big'),h('div',{style:'height:10px'}),incRow(),h('div',{style:'height:10px'}),
      h('div',{class:'row'},btn('Undo last',()=>{ if(!c||!c.reps) return toast('Nothing to undo',1); removeLast(false); },'',{style:'flex:1'}),
        btn('End workout',()=>{ if(!c) return toast('No active session',1); endSession(); },'',{style:'flex:1'}),
        btn('Reset',()=>{ if(c&&c.reps&&confirm('Reset this session and remove its reps and gold?')) removeLast(true); },'dng')),
      h('p',{class:'muted'},'All reps are counted by you. No automatic detection.')),
    h('div',{class:'grid'},[['Lifetime',S.reps],['Today',t.day],['Last 7 days',t.week],['Streak (days)',t.streak],['Best session',t.pr]].map(a=>h('div',{class:'card stat'},h('b',{},a[1]),a[0]))),
    h('h2',{},'History'),
    S.sessions.length?S.sessions.slice().reverse().slice(0,30).map(s=>h('div',{class:'card row sp'},h('span',{},new Date(s.start).toLocaleString()),h('b',{},s.reps+' reps'))):h('div',{class:'card muted'},'No finished workouts yet.')]; }

function vPvp(){ return [h('h1',{},'PvP'),h('div',{class:'card'},h('p',{},'Online matches are not set up yet.'),
  h('p',{class:'muted'},'This build is Phase 1 (offline). Creating and joining rooms needs Supabase sign-in and secure SQL, which is Phase 2. Nothing here is faked.'),
  btn('Create room',()=>toast('Needs Phase 2 (sign-in + SQL)',1),'',{disabled:true}),' ',btn('Join room',()=>toast('Needs Phase 2',1),'',{disabled:true})),
  h('h2',{},'Match history'),h('div',{class:'card muted'},'No matches yet.')]; }

function itemCard(it){ const own=S.owned.includes(it.key), eqd=S.eq[it.slot]===it.id, lock=lockReason(it);
  return h('div',{class:'card row sp'},h('div',{},h('b',{},it.name),h('div',{class:'muted'},own?'Owned':lock?'🔒 '+lock:it.price+' gold')),
    own?btn(eqd?'Equipped':'Equip',()=>equip(it),eqd?'':'pri',{disabled:eqd}):btn(lock?'Locked':'Buy '+it.price,()=>buy(it),'pri',{disabled:!!lock})); }
function vShop(){ return [h('h1',{},'Shop'),h('div',{class:'card'},avatarBox(),h('div',{class:'row sp'},h('b',{},S.gold+' gold'),h('div',{class:'row'},HAIRCOLORS.map(c=>btn('',()=>{S.hairColor=c;save();render();},'sw'+(S.hairColor===c?' sel':''),{style:'background:'+c,'aria-label':'Hair color '+c}))))),
  h('div',{class:'chips'},SLOTS.map(s=>btn(s[1],()=>{shopCat=s[0];render();},shopCat===s[0]?'sel':''))),
  ITEMS.filter(i=>i.slot===shopCat).map(itemCard)]; }

function field(id,label,val,type){ return [h('label',{for:id},label),h('input',{id,type:type||'text',value:val||'',autocomplete:'off'})]; }
const val = id => document.getElementById(id).value.trim();
function readProfile(){ const un=val('f-user'); if(!/^[A-Za-z0-9_]{3,20}$/.test(un)){ toast('Username: 3 to 20 letters, numbers or _',1); return null; }
  const num=(id,lo,hi,name)=>{ const v=val(id); if(v==='') return ''; const n=Number(v); if(!(n>=lo&&n<=hi)){ toast(name+' must be '+lo+' to '+hi,1); return null; } return String(n); };
  const age=num('f-age',5,120,'Age'); if(age===null) return null; const ht=num('f-ht',50,260,'Height (cm)'); if(ht===null) return null; const wt=num('f-wt',15,400,'Weight (kg)'); if(wt===null) return null;
  return { username:un, age, height:ht, weight:wt }; }
function vProfile(){ const done=ACH.filter(a=>a[2](S));
  return [h('h1',{},'Profile'),h('div',{class:'grid'},[['Total reps',S.reps],['Gold',S.gold],['World',uni().name],['Rank',rankInfo(uni()).name]].map(a=>h('div',{class:'card stat'},h('b',{},a[1]),a[0]))),
  h('h2',{},'Achievements ('+done.length+'/'+ACH.length+')'),ACH.map(a=>h('div',{class:'rank '+(a[2](S)?'on':'lock')},(a[2](S)?'✔ ':'🔒 ')+a[1])),
  h('h2',{},'Edit profile'),h('div',{class:'card'},field('f-user','Username',S.profile.username),field('f-age','Age',S.profile.age,'number'),field('f-ht','Height (cm)',S.profile.height,'number'),field('f-wt','Weight (kg)',S.profile.weight,'number'),
    btn('Save profile',()=>{ const p=readProfile(); if(!p) return; S.profile=p; save(); render(); toast('Profile saved'); },'pri'),
    h('p',{class:'muted'},'Everything is stored only on this phone. Nothing is sent online in this version. Account sign-in comes in Phase 2.')),
  h('div',{class:'card'},h('p',{class:'muted'},'Reset deletes all local progress on this device.'),btn('Reset local data',()=>{ if(confirm('Delete ALL local progress? This cannot be undone.')){ localStorage.removeItem(CONFIG.KEY); S=fresh(); render(); } },'dng'))]; }

function vOnboard(){ return [h('h1',{},'Push Ups PvP'),h('div',{class:'card'},avatarBox()),
  h('div',{class:'card'},h('p',{class:'muted'},'Set up your fighter. Age, height and weight are optional and stay on this device.'),
    field('f-user','Username (3-20 letters, numbers, _)',''),field('f-age','Age (optional)','','number'),field('f-ht','Height in cm (optional)','','number'),field('f-wt','Weight in kg (optional)','','number'),
    btn('Start',()=>{ const p=readProfile(); if(!p) return; S.profile=p; S.setup=true; save(); render(); },'pri',{style:'width:100%'}),h('div',{style:'height:8px'}),
    btn('Continue as guest',()=>{ S.profile.username='Guest'; S.setup=true; save(); render(); },'',{style:'width:100%'}))]; }

/* ===== ROUTER ===== */
const TABS=[['home','Home',vHome],['worlds','Worlds',vWorlds],['train','Train',vTrain],['pvp','PvP',vPvp],['shop','Shop',vShop],['profile','Profile',vProfile]];
function render(){
  const main=document.getElementById('main'), nav=document.getElementById('nav'); main.replaceChildren();
  if(!S.setup){ nav.hidden=true; main.append(...[vOnboard()].flat(9)); return; }
  const tab=TABS.find(t=>t[0]===S.tab)||TABS[0]; main.append(...[tab[2]()].flat(9));
  nav.hidden=false; nav.replaceChildren(...TABS.map(t=>btn(t[1],()=>{ S.tab=t[0]; save(); render(); scrollTo(0,0); },S.tab===t[0]?'sel':'')));
}
try{ load(); render(); }catch(e){ showErr(e.message); }
