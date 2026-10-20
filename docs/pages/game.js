(() => {
  'use strict';
  const SAVE_KEY = 'mo-rpg-hero-pages-v1';
  const classes = [
    {id:'guardian',name:'Aldric',role:'Guardian',icon:'🛡️',color:'#8cb9ea',hp:170,atk:12,def:7,rate:1.25,desc:'Armored frontline fighter. Steady damage and the toughest defenses.'},
    {id:'ranger',name:'Nyx',role:'Ranger',icon:'🏹',color:'#88d6a4',hp:105,atk:19,def:3,rate:1.05,desc:'Swift ranged attacker with high single-target damage.'},
    {id:'cleric',name:'Sera',role:'Cleric',icon:'✨',color:'#f0d087',hp:115,atk:9,def:4,rate:1.5,desc:'Restores a portion of the most wounded ally’s health.'},
    {id:'mage',name:'Mira',role:'Mage',icon:'🔮',color:'#d3a1ff',hp:92,atk:23,def:2,rate:1.7,desc:'Fragile arcane caster whose spell damages every foe.'},
    {id:'berserker',name:'Bram',role:'Berserker',icon:'🪓',color:'#f09b7d',hp:145,atk:21,def:3,rate:1.35,desc:'Heavy hitter with increased attack power and a larger health pool.'},
    {id:'paladin',name:'Elyra',role:'Paladin',icon:'⚔️',color:'#efcf83',hp:155,atk:14,def:6,rate:1.4,desc:'A durable striker combining damage with reliable protection.'}
  ];
  const items = [
    {name:'Oakguard Buckler',icon:'🛡️',rarity:'Common',power:2,kind:'Armor'},
    {name:'Quickstring Bow',icon:'🏹',rarity:'Rare',power:5,kind:'Weapon'},
    {name:'Moonstone Focus',icon:'🔮',rarity:'Epic',power:8,kind:'Weapon'},
    {name:'Sunforged Blade',icon:'⚔️',rarity:'Legendary',power:12,kind:'Weapon'}
  ];
  const zones = ['Thornwatch Frontier','Goldenroad','Dunesea','Frostmarch','Blackfen','Emberfall','Tempest Isles','Aether Crown','Voidscar'];
  const fresh = () => ({wave:1,party:['guardian','ranger','cleric'],gold:120,xp:0,level:1,kills:0,streak:0,loot:[],gear:{},running:true,totals:{gold:0,xp:0}});
  let state;
  try { const parsed=JSON.parse(localStorage.getItem(SAVE_KEY)||'null'); state=parsed&&Array.isArray(parsed.party)&&Number.isFinite(parsed.wave)?{...fresh(),...parsed}:fresh(); }
  catch { state=fresh(); }
  state.party=state.party.filter(id=>classes.some(c=>c.id===id)).slice(0,5);
  if(!state.party.length) state.party=['guardian','ranger','cleric'];
  state.wave=safeInt(state.wave,1,10000);
  state.gold=safeInt(state.gold,0,999999999);
  state.level=safeInt(state.level,1,1000);
  state.xp=safeInt(state.xp,0,999999999);
  state.kills=safeInt(state.kills,0,999999999);
  state.streak=safeInt(state.streak,0,999999999);
  let enemies=[], lastTick=0, tickAccumulator=0, toastTimer=null, nextEnemyId=1, displayedDamage=new Map();
  let logLines=[];
  const $=id=>document.getElementById(id);
  const safeInt=(n,min,max)=>Math.max(min,Math.min(max,Math.floor(Number(n)||0)));
  const def=id=>classes.find(c=>c.id===id)||classes[0];
  const party=()=>state.party.map(id=>def(id));
  const maxPartyLevel=()=>state.level;
  const save=()=>{try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));$('save-status').textContent='SAVED LOCALLY';}catch{$('save-status').textContent='SAVE UNAVAILABLE';}};
  const toast=message=>{const el=$('toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),2000)};
  function log(message){logLines.unshift(message);logLines=logLines.slice(0,9);$('combat-log').innerHTML=logLines.map(x=>'<div class="log-line">'+x+'</div>').join('');}
  const zone=()=>zones[Math.min(zones.length-1,Math.floor((state.wave-1)/10))];
  const isBossWave=()=>state.wave%10===0;
  function spawnWave(){const count=Math.min(5,2+Math.floor(state.wave/3));enemies=[];for(let i=0;i<count;i++){const boss=isBossWave()&&i===0;enemies.push({id:nextEnemyId++,name:boss?['Ashwood Ogre','Dune Warden','Frostfang Captain'][Math.floor(state.wave/10)%3]:['Murk Slime','Thorn Wolf','Wild Sprite','Bone Scout'][((state.wave+i)%4)],icon:boss?'👹':['🟢','🐺','🧚','💀'][(state.wave+i)%4],hp:Math.floor((36+state.wave*10)*(boss?5:1)),maxHp:Math.floor((36+state.wave*10)*(boss?5:1)),atk:Math.floor(5+state.wave*1.3+(boss?5:0)),defeated:false,boss});} $('wave-tag').textContent='WAVE '+state.wave;$('encounter-title').textContent=zone();$('objective-title').textContent=isBossWave()?'Defeat the boss':'Clear the wave';logLines=[];log('<strong>Wave '+state.wave+'</strong> — '+(isBossWave()?'A boss blocks the trail.':'Hostiles approach from the forest.'));$('combat-banner').textContent=isBossWave()?'BOSS ENCOUNTER':'AUTO-BATTLE ENGAGED';renderBattlefield();}
  function powerOf(hero){return hero.atk + (state.gear[hero.id]?.power||0)+(state.level-1)*2;}
  function hurtHero(hero,enemy){const hpMax=hero.hp+(state.level-1)*12;const key=hero.id;const current=heroCurrentHp(key);const dmg=Math.max(1,enemy.atk-hero.def-Math.floor((state.level-1)/2));setHeroHp(key,Math.max(0,current-dmg),hpMax);floatingDamage('hero-'+key,dmg);if(heroCurrentHp(key)===0){log('<strong>'+hero.name+'</strong> is knocked out.');}return dmg;}
  let heroHps={};
  function heroMaxHp(hero){return hero.hp+(state.level-1)*12;}
  function heroCurrentHp(id){const hero=def(id);if(!Number.isFinite(heroHps[id]))heroHps[id]=heroMaxHp(hero);return heroHps[id];}
  function setHeroHp(id,hp,max){heroHps[id]=Math.max(0,Math.min(max,hp));}
  function floatingDamage(id,amount){displayedDamage.set(id,amount);setTimeout(()=>displayedDamage.delete(id),650);}
  function allEnemiesDead(){return enemies.every(e=>e.defeated||e.hp<=0);}
  function allHeroesDown(){return party().every(h=>heroCurrentHp(h.id)<=0);}
  function attack(){if(!state.running||!enemies.length||allEnemiesDead())return;const alive=party().filter(h=>heroCurrentHp(h.id)>0);if(!alive.length){state.running=false;toast('Party defeated — press Next Wave to recover.');return;}const living=enemies.filter(e=>!e.defeated&&e.hp>0);if(!living.length)return;
    for(const hero of alive){if(hero.id==='cleric'){const target=alive.slice().sort((a,b)=>heroCurrentHp(a.id)/heroMaxHp(a)-heroCurrentHp(b.id)/heroMaxHp(b))[0];if(target&&heroCurrentHp(target.id)<heroMaxHp(target)){const heal=Math.min(12+state.level*2,heroMaxHp(target)-heroCurrentHp(target.id));setHeroHp(target.id,heroCurrentHp(target.id)+heal,heroMaxHp(target));log('<strong>'+hero.name+'</strong> heals '+target.name+' for '+heal+'.');}continue;}
      const targets=hero.id==='mage'?living.slice():[living[0]];
      for(const enemy of targets){const crit=Math.random()<.1;const raw=powerOf(hero);const damage=Math.max(1,Math.floor((raw-enemy.def/3)*(crit?1.8:1)));enemy.hp=Math.max(0,enemy.hp-damage);floatingDamage('enemy-'+enemy.id,damage);log('<strong>'+hero.name+'</strong> hits '+enemy.name+' for '+damage+(crit?' <strong>CRIT!</strong>':'')+'.');if(enemy.hp<=0&&!enemy.defeated){enemy.defeated=true;state.kills++;state.gold+=5+Math.floor(state.wave*1.8)+(enemy.boss?35:0);state.totals.gold+=5+Math.floor(state.wave*1.8)+(enemy.boss?35:0);const xp=10+state.wave*3+(enemy.boss?70:0);state.xp+=xp;state.totals.xp+=xp;log('<strong>'+enemy.name+'</strong> defeated. +'+xp+' XP.');if(Math.random()<.32||enemy.boss){const drop=items[Math.floor(Math.random()*items.length)];state.loot.unshift({...drop,id:Date.now()+Math.random(),wave:state.wave});$('reward-title').textContent=drop.name;$('reward-description').textContent=drop.rarity+' '+drop.kind+' · +'+drop.power+' power';if(enemy.boss||!state.gear[hero.id]||drop.power>state.gear[hero.id].power){state.gear[hero.id]=drop;log('Loot found: <strong>'+drop.name+'</strong>.');}else{log('Loot found: '+drop.name+'.');}}checkLevel();}}
    }
    if(Math.random()<.6){const enemy=living[Math.floor(Math.random()*living.length)];if(enemy&&!enemy.defeated){const target=alive.filter(h=>heroCurrentHp(h.id)>0).sort((a,b)=>a.hp-b.hp)[0];if(target){const d=hurtHero(target,enemy);log(enemy.name+' strikes <strong>'+target.name+'</strong> for '+d+'.');}}}
    if(allHeroesDown()){state.running=false;$('combat-banner').textContent='PARTY DEFEATED — RECOVER TO CONTINUE';}else if(allEnemiesDead()){state.streak++;state.wave++;state.running=true;party().forEach(h=>setHeroHp(h.id,heroMaxHp(h),heroMaxHp(h)));spawnWave();toast('Wave cleared! Party recovered.');}
    updateAll();
  }
  function checkLevel(){while(state.xp>=state.level*100){state.xp-=state.level*100;state.level++;log('<strong>PARTY LEVEL UP!</strong> Level '+state.level);party().forEach(h=>setHeroHp(h.id,heroMaxHp(h),heroMaxHp(h)));}}
  function renderBattlefield(){const field=$('battlefield');field.innerHTML='';const heroes=party();heroes.forEach((h,i)=>{const x=Math.max(4,7+i*13);field.appendChild(combatant(h,'hero',x,i));});enemies.forEach((e,i)=>{const x=Math.max(55,78-i*13);field.appendChild(combatant(e,'enemy',x,i));});}
  function combatant(entity,type,x){const e=type==='enemy';const key=e?'enemy-'+entity.id:'hero-'+entity.id;const max=e?entity.maxHp:heroMaxHp(entity);const hp=e?entity.hp:heroCurrentHp(entity.id);const pct=Math.max(0,Math.min(100,hp/max*100));const node=document.createElement('div');node.className='combatant '+type+(e&&entity.defeated?' dead':'');node.style.left='calc('+x+'% - 31px)';node.innerHTML='<div class="sprite">'+entity.icon+'</div><div class="name">'+entity.name+'</div><div class="hpbar"><span style="width:'+pct+'%"></span></div>'+(displayedDamage.has(key)?'<span class="damage">-'+displayedDamage.get(key)+'</span>':'');return node;}
  function renderBattlefieldOnly(){const field=$('battlefield');const heroes=party();field.innerHTML='';heroes.forEach((h,i)=>field.appendChild(combatant(h,'hero',7+i*13,i)));enemies.forEach((e,i)=>field.appendChild(combatant(e,'enemy',78-i*13,i)));}
  function renderParty(){const target=$('party-summary');target.innerHTML=party().map(h=>{const hp=heroCurrentHp(h.id),max=heroMaxHp(h);return '<div class="mini-hero"><span class="avatar">'+h.icon+'</span><div><strong>'+h.name+'</strong><small>'+h.role+' · Lv '+state.level+'</small><div class="hpbar"><span style="width:'+hp/max*100+'%"></span></div></div><span class="hero-hp">'+hp+'/'+max+'</span></div>'}).join('');}
  function renderHeroes(){ $('hero-roster').innerHTML=party().map(h=>'<article class="card hero-card"><div class="hero-card-head"><span class="avatar">'+h.icon+'</span><div><h3>'+h.name+'</h3><span class="role">'+h.role+'</span></div></div><p class="description">'+h.desc+'</p><div class="stat-row"><div class="stat"><span>Health</span><strong>'+heroMaxHp(h)+'</strong></div><div class="stat"><span>Attack</span><strong>'+powerOf(h)+'</strong></div><div class="stat"><span>Defense</span><strong>'+h.def+'</strong></div></div><div class="hpbar"><span style="width:'+heroCurrentHp(h.id)/heroMaxHp(h)*100+'%"></span></div></article>').join('');const recruit=classes.filter(c=>!state.party.includes(c.id));$('recruit-list').innerHTML=recruit.map(h=>'<div class="recruit-row"><span class="avatar">'+h.icon+'</span><div class="recruit-copy"><strong>'+h.name+' · '+h.role+'</strong><small>Recruit fee: 60 gold</small></div><button data-recruit="'+h.id+'" '+(state.gold<60||state.party.length>=5?'disabled':'')+'>Recruit</button></div>').join('');$('recruit-list').querySelectorAll('[data-recruit]').forEach(btn=>btn.addEventListener('click',()=>recruit(btn.dataset.recruit)));$('hero-gold').textContent=state.gold;$('hero-count').textContent=state.party.length; }
  function recruit(id){const h=def(id);if(state.gold<60||state.party.length>=5||state.party.includes(id))return toast('Cannot recruit this hero.');state.gold-=60;state.party.push(id);setHeroHp(id,heroMaxHp(h),heroMaxHp(h));log('Welcome <strong>'+h.name+'</strong>, the '+h.role+'!');renderBattlefield();updateAll();toast(h.name+' joined the party.');}
  function renderLoot(){ $('loot-count').textContent=state.loot.length;$('stash-count').textContent=state.loot.length+' ITEMS';$('loot-grid').innerHTML=state.loot.length?state.loot.map(i=>'<article class="card loot-item"><span class="item-icon">'+i.icon+'</span><strong>'+i.name+'</strong><p>'+i.kind+' · +'+i.power+' power</p><span class="rarity '+i.rarity.toLowerCase()+'">'+i.rarity+'</span><p>Dropped on wave '+i.wave+'</p></article>').join(''):'<article class="card loot-item"><span class="item-icon">📦</span><strong>Your stash is empty</strong><p>Fight battles and defeat bosses to discover equipment.</p></article>'; }
  function updateAll(){ $('party-level').textContent=state.level;$('party-xp').textContent=state.xp+' / '+(state.level*100)+' XP';$('kill-count').textContent=state.kills;$('gold-count').textContent=state.totals.gold;$('streak-count').textContent=state.streak;renderParty();renderHeroes();renderLoot();renderBattlefieldOnly();save(); }
  function switchPanel(name){document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.panel===name));document.querySelectorAll('.panel').forEach(p=>p.hidden=p.id!==name+'-panel');if(name==='heroes')renderHeroes();}
  document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>switchPanel(b.dataset.panel)));document.querySelectorAll('[data-jump]').forEach(b=>b.addEventListener('click',()=>switchPanel(b.dataset.jump)));
  $('toggle-battle').addEventListener('click',()=>{state.running=!state.running;$('toggle-battle').textContent=state.running?'Ⅱ Pause':'▶ Resume';$('combat-banner').textContent=state.running?'AUTO-BATTLE ENGAGED':'BATTLE PAUSED';save();});
  $('next-wave').addEventListener('click',()=>{state.wave=Math.max(1,state.wave);party().forEach(h=>setHeroHp(h.id,heroMaxHp(h),heroMaxHp(h)));state.running=true;spawnWave();$('toggle-battle').textContent='Ⅱ Pause';updateAll();toast('Party recovered for the next wave.');});
  $('speed').addEventListener('change',()=>{tickAccumulator=0;});
  let speed=1;$('speed').addEventListener('change',e=>{speed=Number(e.target.value)||1;});
  function loop(now){if(!lastTick)lastTick=now;const dt=Math.min(.1,(now-lastTick)/1000);lastTick=now;if(state.running){tickAccumulator+=dt*speed;while(tickAccumulator>=1.15){tickAccumulator-=1.15;attack();}}if(now%200<30)renderBattlefieldOnly();requestAnimationFrame(loop);}
  const originalUpdate=updateAll;
  function initialize(){spawnWave();updateAll();$('toggle-battle').textContent=state.running?'Ⅱ Pause':'▶ Resume';log('Party prepared. Auto-battle awaits your command.');requestAnimationFrame(loop);}
  initialize();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){lastTick=performance.now();}});
 })();