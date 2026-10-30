// Canvas coordinates are independent of the browser viewport.
const $ = id => document.getElementById(id);
const canvas = $('game'), ctx = canvas.getContext('2d');
const angle = $('angle'), power = $('power');
const W = canvas.width, H = canvas.height;
const LINE_Y = 348, CAN_POS = {x:400,y:177};
const keys = new Set();
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
let state, lastTime = 0;
function setMessage(message) { $('message').textContent = message; }
function syncControls() { $('angleVal').textContent = angle.value+'°'; $('powerVal').textContent = power.value+'%'; }
function reset() {
  state = {player:{x:400,y:425},guard:{x:620,y:155},slipper:null,flight:null,
    phase:'positioning',canDown:false,can:{...CAN_POS},guardTask:'idle',
    shots:0,hits:0,round:1,swaps:0,userRole:'thrower',aiTimer:1.5,
    throwerHasSlipper:true,guardHasCan:false};
  keys.clear(); angle.value=0; power.value=70; syncControls();
  $('hint').textContent='Move to choose your throwing position.';
  setMessage('You are the Thrower. Aim and knock down the can!'); updateUI();
}
function updateUI() {
  $('score').textContent=state.hits; $('attempts').textContent=state.shots;
  $('round').textContent=state.round; $('swaps').textContent=state.swaps;
  $('role').textContent=state.userRole.toUpperCase();
  $('phase').textContent=state.phase.toUpperCase().replaceAll('_',' ');
  const canThrow=state.userRole==='thrower' && state.phase==='positioning';
  $('throwBtn').disabled=!canThrow;
  $('throwBtn').textContent=canThrow?'🩴 THROW!':state.userRole==='guard'?'🛡️ YOU ARE THE GUARD':'🩴 SLIPPER UNAVAILABLE';
  angle.disabled=!canThrow;power.disabled=!canThrow;
}
function startFlight(from,to) {
  state.flight={from:{...from},to:{x:clamp(to.x,25,W-25),y:clamp(to.y,30,H-25)},elapsed:0,duration:.58};
  state.slipper={...from}; state.throwerHasSlipper=false; state.phase='flying'; state.shots++;
  setMessage('Slipper in the air. You can move immediately!');
  $('hint').textContent='Retrieve the slipper after it lands and reach safety.';updateUI();
}
function throwSlipper() {
  if(state.userRole!=='thrower'||state.phase!=='positioning')return;
  const radians=Number(angle.value)*Math.PI/180, range=100+Number(power.value)*2.35;
  startFlight(state.player,{x:state.player.x+Math.sin(radians)*range,y:state.player.y-Math.cos(radians)*range});
}
function moveTowards(point,target,step) {
  const d=distance(point,target);if(d<.001)return;
  const amount=Math.min(d,step);point.x+=(target.x-point.x)/d*amount;point.y+=(target.y-point.y)/d*amount;
}
function roleSwap(reason) {
  state.swaps++;state.userRole=state.userRole==='thrower'?'guard':'thrower';
  beginRound(reason+' Roles swapped!');
}
function beginRound(message) {
  state.round++;
  // The human always starts at the spawn point corresponding to their role.
  state.player=state.userRole==='thrower'?{x:400,y:425}:{x:620,y:155};
  state.guard=state.userRole==='thrower'?{x:620,y:155}:{x:400,y:425};
  state.slipper=null;state.flight=null;state.can={...CAN_POS};state.canDown=false;
  state.guardHasCan=false;state.throwerHasSlipper=true;state.guardTask='idle';
  state.phase='positioning';state.aiTimer=1.4;keys.clear();
  $('hint').textContent=state.userRole==='thrower'?'Move, aim and throw again.':'Protect the can and tag the Thrower after collecting the slipper.';
  setMessage(message+' You are now the '+(state.userRole==='thrower'?'Thrower.':'Guard.'));
  updateUI();
}
function landed() {
  state.flight=null;
  state.canDown=distance(state.slipper,CAN_POS)<51;
  if(state.canDown) {
    state.hits++;state.can={x:CAN_POS.x+44,y:CAN_POS.y+24};
    state.guardTask='get_can';state.phase='can_down';
    setMessage('Can down! The Guard must restore it. Retrieve your slipper and escape.');
  } else {
    state.guardTask='chase';state.phase='can_standing';
    setMessage('Miss! Retrieve your slipper and return to safety before the Guard tags you.');
  }
  $('hint').textContent='Retrieve the slipper, then get behind the safe line.';
  updateUI();
}
function canBeTagged(thrower) {
  return !state.canDown && state.guardTask==='chase' &&
    state.throwerHasSlipper && state.phase!=='positioning' &&
    state.phase!=='flying' && thrower.y<LINE_Y+23;
}
function retrieveSlipper(thrower) {
  if(state.slipper && !state.flight && distance(thrower,state.slipper)<27) {
    state.slipper=null;state.throwerHasSlipper=true;
    setMessage('Slipper retrieved! Return behind the safe line.');
    $('hint').textContent='Escape to the safe line without being tagged.';
  }
}
function reachedSafety(thrower) {
  return state.throwerHasSlipper && !state.flight &&
    state.phase!=='positioning' && thrower.y>=LINE_Y+23;
}
function restoreCan() {
  state.guardHasCan=false;state.canDown=false;state.can={...CAN_POS};
  state.guardTask='chase';state.phase='chase';
  setMessage('Can restored! The Guard can tag the Thrower if they carry the slipper outside safety.');
  updateUI();
}
function moveControlled(dt) {
  const dx=Number(keys.has('right'))-Number(keys.has('left'));
  const dy=Number(keys.has('down'))-Number(keys.has('up'));
  const length=Math.hypot(dx,dy)||1, p=state.player;
  const minY=state.userRole==='thrower' && state.phase==='positioning'?LINE_Y+24:28;
  p.x=clamp(p.x+dx/length*230*dt,22,W-22);
  p.y=clamp(p.y+dy/length*230*dt,minY,H-24);
}
function updateThrowerMode(dt) {
  const g=state.guard,p=state.player;
  // The Guard first restores a knocked-down can; no tagging is allowed before that.
  if(state.guardTask==='get_can') {
    moveTowards(g,state.can,140*dt);
    if(distance(g,state.can)<25){state.guardHasCan=true;state.guardTask='return_can';}
  } else if(state.guardTask==='return_can') {
    moveTowards(g,CAN_POS,140*dt);
    if(distance(g,CAN_POS)<20)restoreCan();
  }
  retrieveSlipper(p);
  // Check safety before collision so the line grants immediate protection.
  if(reachedSafety(p)){beginRound('Safe! You returned with your slipper.');return;}
  if(state.guardTask==='chase' && state.throwerHasSlipper) {
    moveTowards(g,p,148*dt);
    if(canBeTagged(p) && distance(g,p)<32) {
      roleSwap('Guard tagged the Thrower carrying the slipper.');return;
    }
  }
}
function updateGuardMode(dt) {
  // Human controls Guard; AI is Thrower.
  const g=state.player,t=state.guard;
  if(state.phase==='positioning') {
    state.aiTimer-=dt;
    if(state.aiTimer<=0) {
      const hit=(state.round%2===0);
      const target=hit?{x:CAN_POS.x+8,y:CAN_POS.y+4}:{x:CAN_POS.x+150,y:CAN_POS.y+38};
      startFlight(t,target);
      setMessage('AI Thrower tossed the slipper. Protect the can!');
    }
    return;
  }
  // AI retrieves its slipper on BOTH hits and misses.
  if(!state.throwerHasSlipper && !state.flight && state.slipper) {
    moveTowards(t,state.slipper,115*dt);
    retrieveSlipper(t);
  } else if(state.throwerHasSlipper && !state.flight) {
    moveTowards(t,{x:t.x,y:LINE_Y+42},112*dt);
  }
  if(state.guardTask==='get_can' && distance(g,state.can)<30) {
    state.guardHasCan=true;state.guardTask='return_can';
    setMessage('Can picked up! Carry it to the circle.');
  }
  if(state.guardTask==='return_can' && distance(g,CAN_POS)<32)restoreCan();
  if(reachedSafety(t)){beginRound('AI Thrower reached safety.');return;}
  if(canBeTagged(t) && distance(g,t)<32) {
    roleSwap('You tagged the AI Thrower carrying the slipper.');return;
  }
}
function update(dt) {
  moveControlled(dt);
  if(state.phase==='flying') {
    const f=state.flight;f.elapsed+=dt;
    const t=Math.min(1,f.elapsed/f.duration);
    state.slipper.x=f.from.x+(f.to.x-f.from.x)*t;
    state.slipper.y=f.from.y+(f.to.y-f.from.y)*t;
    if(t>=1)landed();
    return;
  }
  if(state.userRole==='thrower')updateThrowerMode(dt);
  else updateGuardMode(dt);
}
function emoji(symbol,x,y,size) {
  ctx.font=`${size}px 'Apple Color Emoji','Segoe UI Emoji',sans-serif`;
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(symbol,x,y);
}
function draw() {
  ctx.clearRect(0,0,W,H);
  const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#a7bf7d');grad.addColorStop(1,'#77a460');
  ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#c1a16e';ctx.globalAlpha=.72;ctx.beginPath();ctx.moveTo(0,270);ctx.lineTo(W,240);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();ctx.globalAlpha=1;
  ctx.strokeStyle='#fff7d4';ctx.lineWidth=4;ctx.setLineDash([12,9]);
  ctx.beginPath();ctx.ellipse(CAN_POS.x,CAN_POS.y,87,49,0,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(56,LINE_Y);ctx.lineTo(W-56,LINE_Y);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#fff8dd';ctx.textAlign='right';ctx.font='bold 15px Nunito, sans-serif';ctx.fillText('SAFE / THROW LINE',W-58,LINE_Y+24);
  emoji('🌿',72,125,29);emoji('🌼',729,294,31);emoji('🍃',130,286,29);
  if(!state.guardHasCan) {
    ctx.save();ctx.translate(state.can.x,state.can.y);if(state.canDown)ctx.rotate(Math.PI/2);
    emoji('🥫',0,0,58);ctx.restore();
  }
  if(state.userRole==='thrower'&&state.phase==='positioning') {
    const r=Number(angle.value)*Math.PI/180;
    ctx.strokeStyle='#fffbe0';ctx.lineWidth=3;ctx.setLineDash([8,6]);ctx.beginPath();
    ctx.moveTo(state.player.x,state.player.y-16);ctx.lineTo(state.player.x+Math.sin(r)*105,state.player.y-16-Math.cos(r)*105);ctx.stroke();ctx.setLineDash([]);
  }
  if(state.slipper) {
    if(!state.flight){ctx.fillStyle='#fff9bc70';ctx.beginPath();ctx.arc(state.slipper.x,state.slipper.y,29,0,Math.PI*2);ctx.fill();}
    const lift=state.flight?Math.sin(Math.min(1,state.flight.elapsed/state.flight.duration)*Math.PI)*27:0;
    emoji('🩴',state.slipper.x,state.slipper.y-lift,42);
  }
  const human=state.player,ai=state.guard;
  emoji(state.userRole==='guard'?'🛡️':'🏃',human.x,human.y,51);
  emoji(state.userRole==='guard'?'🏃':'🧍',ai.x,ai.y,54);
  if(state.guardHasCan)emoji('🥫',state.userRole==='guard'?human.x+22:ai.x+22,(state.userRole==='guard'?human.y:ai.y)-22,30);
  ctx.fillStyle='#25432b';ctx.textAlign='center';ctx.font='bold 13px Nunito, sans-serif';
  ctx.fillText('YOU · '+state.userRole.toUpperCase(),human.x,human.y+39);
  ctx.fillText('AI · '+(state.userRole==='guard'?'THROWER':'GUARD'),ai.x,ai.y+39);
}
function frame(time) {
  const dt=Math.min((time-lastTime)/1000||0,.04);lastTime=time;update(dt);draw();requestAnimationFrame(frame);
}
const keyMap={arrowup:'up',w:'up',arrowdown:'down',s:'down',arrowleft:'left',a:'left',arrowright:'right',d:'right'};
window.addEventListener('keydown',event=>{
  const key=event.key.toLowerCase();if(['input','textarea','select'].includes(document.activeElement.tagName.toLowerCase()))return;
  if(keyMap[key]){event.preventDefault();keys.add(keyMap[key]);}
  if(event.code==='Space'&&!event.repeat){event.preventDefault();throwSlipper();}
});
window.addEventListener('keyup',event=>{if(keyMap[event.key.toLowerCase()])keys.delete(keyMap[event.key.toLowerCase()]);});
window.addEventListener('blur',()=>keys.clear());
document.querySelectorAll('[data-move]').forEach(button=>{
  const dir=button.dataset.move;
  button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);keys.add(dir);});
  ['pointerup','pointercancel','lostpointercapture'].forEach(name=>button.addEventListener(name,()=>keys.delete(dir)));
});
angle.addEventListener('input',syncControls);power.addEventListener('input',syncControls);
$('throwBtn').addEventListener('click',throwSlipper);$('resetBtn').addEventListener('click',reset);
reset();requestAnimationFrame(frame);
