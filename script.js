<script>
let habits = JSON.parse(localStorage.getItem("hf_habits_v11")) || [];
let xp = parseInt(localStorage.getItem("hf_xp_v11")) || 0;
let bestMonthData = JSON.parse(localStorage.getItem("hf_echo")) || Array.from({length:30},(_,i)=>Math.round(20+Math.sin(i*0.4)*30+Math.random()*20));
let voidMode = false;
let chartInst = null;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// ---- AUDIO ----
function tone(freq, type, dur, vol=0.06) {
  try {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, audioCtx.currentTime);
    g.gain.setValueAtTime(vol, audioCtx.currentTime);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime+dur);
    o.stop(audioCtx.currentTime+dur);
  } catch(e){}
}
function playCheck()  { tone(880,'sine',0.1,0.05); setTimeout(()=>tone(1200,'sine',0.15,0.04),60); }
function playUncheck(){ tone(300,'sawtooth',0.12,0.04); }
function playForge()  { tone(300,'sine',0.08); setTimeout(()=>tone(500,'sine',0.1),80); setTimeout(()=>tone(700,'sine',0.15),160); }

// ---- TOAST ----
function toast(msg, type='') {
  const el = document.createElement('div');
  el.className = 'toast' + (type?' '+type:'');
  el.textContent = msg;
  document.getElementById('toastZone').appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

// ---- RIPPLE ----
function ripple(e) {
  const r = document.createElement('div');
  r.className = 'ripple';
  r.style.left = e.clientX + 'px';
  r.style.top = e.clientY + 'px';
  document.body.appendChild(r);
  setTimeout(() => r.remove(), 600);
}
document.addEventListener('click', ripple);

// ---- WELCOME ----
function igniteForge() {
  const wp = document.getElementById('welcomePage');
  wp.classList.add('exit');
  setTimeout(() => {
    wp.style.display = 'none';
    document.getElementById('appPage').style.display = 'block';
  }, 800);
  updateMortality();
  render();
}

// ---- MORTALITY ----
function updateMortality() {
  const now = new Date();
  const start = new Date(now.getFullYear(),0,1);
  const end   = new Date(now.getFullYear()+1,0,1);
  const pct   = ((now-start)/(end-start)*100);
  const remaining = 100 - pct;
  const daysLeft = Math.round((end-now)/(1000*60*60*24));
  document.getElementById('mFill').style.width = remaining + '%';
  document.getElementById('mortPct').textContent = remaining.toFixed(3) + '% of year';
  document.getElementById('mortDays').textContent = daysLeft + ' days remaining';
  setTimeout(updateMortality, 5000);
}

// ---- VOID ----
function toggleVoid() {
  voidMode = !voidMode;
  document.getElementById('appLayout').classList.toggle('void-mode', voidMode);
  document.getElementById('voidBanner').style.display = voidMode ? 'flex' : 'none';
  document.getElementById('voidBtn').textContent = voidMode ? 'EXIT VOID' : 'VOID MODE';
  tone(voidMode ? 80 : 200, 'square', 0.15, 0.04);
}

// ---- HABITS ----
function addHabit(e) {
  const name = document.getElementById('hName').value.trim().toUpperCase();
  if (!name) return;
  const cat = document.getElementById('hCat').value;
  habits.push({ id: Date.now(), name, cat, logs: {} });
  document.getElementById('hName').value = '';
  save(); playForge();
  toast('Protocol forged: ' + name);
  render();
}

function deleteHabit(id) {
  const h = habits.find(x=>x.id===id);
  habits = habits.filter(x=>x.id!==id);
  save(); tone(200,'sawtooth',0.1);
  toast('Protocol removed: ' + (h?h.name:''), 'danger');
  render();
}

function toggleLog(hid, date) {
  const h = habits.find(x=>x.id===hid);
  if (!h) return;
  h.logs[date] = !h.logs[date];
  if (h.logs[date]) { xp+=25; playCheck(); }
  else { xp=Math.max(0,xp-25); playUncheck(); }
  save(); renderStats(); renderTable(); renderChart();
}

function save() {
  localStorage.setItem("hf_habits_v11", JSON.stringify(habits));
  localStorage.setItem("hf_xp_v11", xp);
}

// ---- STREAK ----
function getStreak(h) {
  let s = 0, d = new Date();
  while(true) {
    const key = d.toISOString().slice(0,10);
    if (h.logs[key]) { s++; d.setDate(d.getDate()-1); }
    else break;
  }
  return s;
}
function getBestStreak(h) {
  let best=0, cur=0;
  const keys = Object.keys(h.logs).sort();
  keys.forEach(k => { if(h.logs[k]) { cur++; best=Math.max(best,cur); } else cur=0; });
  return best;
}
function globalBestStreak() {
  return habits.reduce((m,h) => Math.max(m, getBestStreak(h)), 0);
}

// ---- DATES ----
function getDates(n=30) {
  const arr=[]; const now=new Date();
  now.setHours(0,0,0,0);
  for(let i=0;i<n;i++){
    const d=new Date(now); d.setDate(d.getDate()+i);
    arr.push(d.toISOString().slice(0,10));
  }
  return arr;
}
const TODAY = new Date().toISOString().slice(0,10);

// ---- RENDER ----
function render() { renderStats(); renderHeatmap(); renderTable(); renderChart(); }

function renderStats() {
  const done = habits.filter(h=>h.logs[TODAY]).length;
  const eff  = habits.length ? Math.round(done/habits.length*100) : 0;
  document.getElementById('sXP').textContent   = xp;
  document.getElementById('sEff').textContent  = eff+'%';
  document.getElementById('sCount').textContent= habits.length;
  document.getElementById('sBest').textContent = globalBestStreak();

  const ranks = ['INITIATIVE','SENTINEL','ELITE','GHOST'];
  const thresholds = [0,500,1500,3000];
  let rank=0;
  thresholds.forEach((t,i)=>{ if(xp>=t) rank=i; });
  document.getElementById('rankName').textContent = ranks[rank];

  const next = thresholds[rank+1] || (thresholds[rank]+1000);
  const prev = thresholds[rank];
  const pct  = Math.min(((xp-prev)/(next-prev))*100, 100);
  document.getElementById('xpBarFill').style.width = pct+'%';
}

function renderHeatmap() {
  const grid = document.getElementById('heatGrid');
  grid.innerHTML = '';
  const now = new Date(); now.setHours(0,0,0,0);
  const start = new Date(now); start.setDate(now.getDate()-89);

  for(let i=0;i<90;i++){
    const d = new Date(start); d.setDate(start.getDate()+i);
    const key = d.toISOString().slice(0,10);
    const done = habits.filter(h=>h.logs[key]).length;
    const total= habits.length||1;
    const ratio= done/total;
    let cls = '';
    if(ratio>0)      cls='h1';
    if(ratio>=0.33)  cls='h2';
    if(ratio>=0.66)  cls='h3';
    if(ratio>=1)     cls='h4';
    const cell=document.createElement('div');
    cell.className='heat-cell'+( cls?' '+cls:'');
    cell.setAttribute('data-tip', key+' · '+done+'/'+habits.length);
    grid.appendChild(cell);
  }
}

function renderTable() {
  const dates = getDates(30);
  const head = document.getElementById('mHead');
  const body = document.getElementById('mBody');
  const empty= document.getElementById('emptyState');
  const wrap = document.getElementById('matrixWrap');

  head.innerHTML = '<th>PROTOCOL</th>';
  dates.forEach(d=>{
    const date=new Date(d+'T00:00'); const isToday=d===TODAY;
    head.innerHTML += `<th class="${isToday?'today-col':''}">${isToday?'●':date.getDate()}</th>`;
  });

  if(!habits.length) { empty.style.display='block'; wrap.style.display='none'; return; }
  empty.style.display='none'; wrap.style.display='block';

  body.innerHTML='';
  habits.forEach(h=>{
    const streak=getStreak(h);
    const catCls='cat-'+h.cat;
    let row=`<tr class="fade-row">
      <td>
        <div class="habit-row-name">${h.name}</div>
        <div class="habit-row-meta">
          ${streak>0?`<span class="streak-badge">🔥 ${streak}</span>`:''}
          <span class="cat-badge ${catCls}">${(h.cat||'other').toUpperCase()}</span>
          <button class="delete-btn" onclick="deleteHabit(${h.id})" title="Remove">✕</button>
        </div>
      </td>`;
    dates.forEach(d=>{
      const isToday=d===TODAY;
      row+=`<td class="${isToday?'today-col':''}"><div class="cb-wrap"><input type="checkbox" ${h.logs[d]?'checked':''} onchange="toggleLog(${h.id},'${d}')"></div></td>`;
    });
    body.innerHTML+=row+'</tr>';
  });
}

function renderChart() {
  const dates=getDates(30);
  const labels=dates.map(d=>{ const dt=new Date(d+'T00:00'); return dt.getDate()+'/'+(dt.getMonth()+1); });
  const data=dates.map(d=>{
    if(!habits.length) return 0;
    return Math.round((habits.filter(h=>h.logs[d]).length/habits.length)*100);
  });

  const ctx=document.getElementById('lineChart');
  if(chartInst) chartInst.destroy();
  chartInst=new Chart(ctx,{
    type:'line',
    data:{
      labels,
      datasets:[
        {
          label:'Today\'s Arc',
          data,
          borderColor:'#c6a75e',
          backgroundColor:'rgba(198,167,94,0.06)',
          borderWidth:2.5,
          pointRadius:3,
          pointBackgroundColor:'#c6a75e',
          tension:0.4,
          fill:true,
        },
        {
          label:'Echo of Failure',
          data:bestMonthData,
          borderColor:'#2a2d40',
          borderDash:[5,5],
          borderWidth:1.5,
          pointRadius:0,
          tension:0.4,
          fill:false,
        }
      ]
    },
    options:{
      responsive:true,
      interaction:{ mode:'index', intersect:false },
      plugins:{
        legend:{ display:false },
        tooltip:{
          backgroundColor:'#0d0d10',
          borderColor:'#2a2d40',
          borderWidth:1,
          titleColor:'#94a3b8',
          bodyColor:'#cbd5e1',
          padding:12,
          titleFont:{ family:'Cinzel' },
        }
      },
      scales:{
        x:{
          grid:{ color:'#1a1a20' },
          ticks:{ color:'#4a5270', font:{ size:10 }, maxTicksLimit:15 }
        },
        y:{
          min:0, max:100,
          grid:{ color:'#1a1a20' },
          ticks:{ color:'#4a5270', font:{ size:10 }, callback:v=>v+'%' }
        }
      }
    }
  });
}

// ---- NAV ----
function showView(v) {
  document.querySelectorAll('.nav-item').forEach((el,i)=>{ el.classList.remove('active'); });
  const titles={'matrix':'HABIT MATRIX','chart':'PERFORMANCE WAVEFORM','heatmap':'YEAR HEATMAP'};
  document.getElementById('viewTitle').textContent = titles[v]||'';

  document.getElementById('heatmapSection').style.display = v==='heatmap'?'block':'block';
  document.getElementById('matrixSection').style.display  = v==='matrix'||v==='heatmap'?'block':'none';
  document.getElementById('chartSection').style.display   = v==='chart'||v==='matrix'?'block':'none';

  const navMap={'matrix':0,'chart':1,'heatmap':2};
  document.querySelectorAll('.nav-item')[navMap[v]||0].classList.add('active');
  if(v==='chart') renderChart();
}

// ---- KEYBOARD ----
document.addEventListener('keydown', e=>{
  if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT') {
    if(e.key==='Enter') addHabit();
    return;
  }
  if(e.key.toLowerCase()==='v') toggleVoid();
  if(e.key==='Escape' && voidMode) toggleVoid();
});

// Boot
if(document.readyState==='loading')
  document.addEventListener('DOMContentLoaded', ()=>{});
</script>
