const SPEEDS = [
  { name: 'Low', output: 38 },
  { name: 'Medium', output: 68 },
  { name: 'High', output: 100 }
];

const HEATS = [
  { name: 'Cool', target: 24, output: 0 },
  { name: 'Low heat', target: 42, output: 34 },
  { name: 'Medium heat', target: 58, output: 66 },
  { name: 'High heat', target: 76, output: 100 }
];

const state = {
  plugged: true,
  power: false,
  speed: 1,
  heat: 2,
  coolShot: false,
  overheat: false,
  acknowledged: false,
  stress: false,
  actualTemp: 24,
  elapsed: 0,
  logStart: performance.now()
};

const $ = (id) => document.getElementById(id);
const elements = {
  powerButton: $('powerButton'), coolButton: $('coolButton'), plugButton: $('plugButton'),
  speedControl: $('speedControl'), heatControl: $('heatControl'), speedLabel: $('speedLabel'), heatLabel: $('heatLabel'),
  stateLabel: $('stateLabel'), statusDot: $('statusDot'), actualTemp: $('actualTemp'), targetTemp: $('targetTemp'),
  temperatureFill: $('temperatureFill'), fanOutput: $('fanOutput'), heaterOutput: $('heaterOutput'),
  fanBars: $('fanBars'), heaterBars: $('heaterBars'), fanState: $('fanState'), heaterState: $('heaterState'),
  safetyState: $('safetyState'), fanIcon: $('fanIcon'), heaterIcon: $('heaterIcon'), airStream: $('airStream'),
  thermalHalo: $('thermalHalo'), deviceHint: $('deviceHint'), connectionBadge: $('connectionBadge'),
  protectionOverlay: $('protectionOverlay'), acknowledgeButton: $('acknowledgeButton'), stressToggle: $('stressToggle'),
  resetButton: $('resetButton'), eventLog: $('eventLog')
};

function getOperationalState() {
  if (state.overheat) return state.plugged ? 'protection-cooling' : 'protection-passive';
  if (!state.plugged || !state.power) return state.actualTemp > 50 ? 'residual' : 'off';
  if (state.coolShot) return 'cool-shot';
  if (state.heat === 0) return 'cool';
  return 'hot';
}

function currentTarget() {
  const mode = getOperationalState();
  if (mode === 'hot') return HEATS[state.heat].target;
  return 24;
}

function addLog(message) {
  const seconds = Math.floor((performance.now() - state.logStart) / 1000);
  const time = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const li = document.createElement('li');
  const timeEl = document.createElement('time');
  const span = document.createElement('span');
  timeEl.textContent = time;
  span.textContent = message;
  li.append(timeEl, span);
  elements.eventLog.prepend(li);
  while (elements.eventLog.children.length > 4) elements.eventLog.lastElementChild.remove();
}

function setBars(container, count) {
  [...container.children].forEach((bar, index) => bar.classList.toggle('active', index < count));
}

function render() {
  const mode = getOperationalState();
  const protectionActive = mode === 'protection-cooling' || mode === 'protection-passive';
  const fanRunning = mode === 'hot' || mode === 'cool' || mode === 'cool-shot' || mode === 'protection-cooling';
  const heating = mode === 'hot';
  const target = currentTarget();
  const modeLabels = {
    off: 'Off',
    residual: 'Cooling down',
    cool: 'Cool airflow',
    hot: 'Heated airflow',
    'cool-shot': 'Cool Shot',
    'protection-cooling': 'Protection: Fan cooling',
    'protection-passive': 'Unplugged: Passive cooling'
  };

  elements.stateLabel.textContent = modeLabels[mode];
  elements.speedLabel.textContent = SPEEDS[state.speed].name;
  elements.heatLabel.textContent = HEATS[state.heat].name;
  elements.actualTemp.textContent = Math.round(state.actualTemp);
  elements.targetTemp.textContent = `Target ${target}°C`;
  elements.temperatureFill.style.width = `${Math.max(4, Math.min(100, ((state.actualTemp - 20) / 70) * 100))}%`;
  elements.temperatureFill.style.background = state.actualTemp < 32 ? '#4b8cb1' : state.actualTemp > 75 ? '#b82e25' : '#b65f2a';

  const fanOutput = fanRunning ? SPEEDS[state.speed].output : 0;
  const heatOutput = heating ? HEATS[state.heat].output : 0;
  elements.fanOutput.textContent = `${fanOutput}%`;
  elements.heaterOutput.textContent = heatOutput ? `${heatOutput}%` : 'Off';
  setBars(elements.fanBars, fanRunning ? state.speed + 1 : 0);
  setBars(elements.heaterBars, heating ? state.heat : 0);

  elements.statusDot.className = `status-dot ${protectionActive ? 'danger' : (mode === 'cool' || mode === 'cool-shot') ? 'cool' : (mode === 'hot' || mode === 'residual') ? 'running' : ''}`;
  elements.powerButton.classList.toggle('active', state.power && state.plugged);
  elements.powerButton.disabled = protectionActive;
  elements.powerButton.setAttribute('aria-pressed', String(state.power && state.plugged));
  elements.powerButton.setAttribute('aria-label', protectionActive ? 'Overheat lockout active; power unavailable' : state.power ? 'Turn off' : 'Turn on');
  elements.coolButton.disabled = !state.power || !state.plugged || state.overheat;
  elements.coolButton.classList.toggle('pressed', state.coolShot);
  elements.coolButton.setAttribute('aria-pressed', String(state.coolShot));
  elements.airStream.classList.toggle('active', fanRunning);
  elements.airStream.style.transform = `scaleX(${.7 + state.speed * .15})`;
  elements.thermalHalo.style.boxShadow = heating ? `inset 0 0 ${14 + state.heat * 8}px rgba(236,93,28,${.2 + state.heat * .12})` : 'inset 0 0 16px rgba(67,153,201,.16)';
  document.querySelectorAll('[data-heat-light]').forEach(light => {
    light.classList.toggle('active', fanRunning && !protectionActive && Number(light.dataset.heatLight) === (state.coolShot ? 0 : state.heat));
  });

  elements.fanState.textContent = mode === 'protection-cooling' ? `${SPEEDS[state.speed].name} · Cooling` : fanRunning ? SPEEDS[state.speed].name : 'Stopped';
  elements.heaterState.textContent = heating ? `${HEATS[state.heat].name} output` : protectionActive ? 'Safety off' : 'Off';
  elements.safetyState.textContent = mode === 'protection-cooling' ? 'Protection · Fan cooling' : mode === 'protection-passive' ? 'Protection · Passive cooling' : mode === 'residual' ? 'Residual heat' : state.power && state.plugged ? 'Monitoring' : 'Standby';
  elements.fanIcon.classList.toggle('active', fanRunning);
  elements.heaterIcon.classList.toggle('active', heating);
  const safetyIcon = document.querySelector('.safety-icon');
  safetyIcon.classList.toggle('active', state.power && state.plugged && !protectionActive);
  safetyIcon.classList.toggle('danger', protectionActive || mode === 'residual');

  elements.deviceHint.textContent = mode === 'protection-cooling' ? 'Protection active: fan cooling in progress' : mode === 'protection-passive' ? 'Unplugged: cooling naturally' : mode === 'residual' ? 'Residual heat: do not touch the outlet' : !state.plugged ? 'Connect power to begin' : mode === 'off' ? 'Press the power button to begin' : mode === 'cool-shot' ? 'Release to restore the selected heat' : `${SPEEDS[state.speed].name} · ${HEATS[state.heat].name}`;
  elements.connectionBadge.classList.toggle('disconnected', !state.plugged);
  elements.connectionBadge.innerHTML = `<i></i>${state.plugged ? 'Power connected' : 'Unplugged'}`;
  elements.plugButton.textContent = state.plugged ? 'Unplug' : 'Plug in';
  elements.plugButton.setAttribute('aria-pressed', String(state.plugged));
  elements.protectionOverlay.setAttribute('aria-hidden', String(!state.overheat || state.acknowledged));
  elements.protectionOverlay.classList.toggle('visible', state.overheat && !state.acknowledged);

  elements.speedControl.querySelectorAll('button').forEach(button => button.classList.toggle('active', Number(button.dataset.speed) === state.speed));
  elements.heatControl.querySelectorAll('button').forEach(button => button.classList.toggle('active', Number(button.dataset.heat) === state.heat));
}

function powerToggle() {
  if (!state.plugged) {
    addLog('Power is disconnected; unable to start');
    return;
  }
  if (state.overheat) return;
  state.power = !state.power;
  state.coolShot = false;
  addLog(state.power ? `Power on: ${SPEEDS[state.speed].name} · ${HEATS[state.heat].name}` : 'Power turned off');
  render();
}

function startCoolShot(event) {
  if (event) event.preventDefault();
  if (!state.power || !state.plugged || state.overheat || state.coolShot) return;
  state.coolShot = true;
  elements.coolButton.setPointerCapture?.(event?.pointerId);
  addLog(`Cool Shot: temporarily overriding ${HEATS[state.heat].name}`);
  render();
}

function endCoolShot(event) {
  if (!state.coolShot) return;
  if (event) event.preventDefault();
  state.coolShot = false;
  addLog(`Cool Shot released: restored ${HEATS[state.heat].name}`);
  render();
}

elements.powerButton.addEventListener('click', powerToggle);
elements.plugButton.addEventListener('click', () => {
  state.plugged = !state.plugged;
  if (!state.plugged) {
    state.power = false;
    state.coolShot = false;
    addLog(state.overheat ? 'Unplugged: protection locked, passive cooling' : 'Unplugged: immediate shutdown');
  } else {
    addLog(state.overheat ? 'Power connected: protection locked, fan cooling started' : 'Power connected');
  }
  render();
});
elements.coolButton.addEventListener('pointerdown', startCoolShot);
elements.coolButton.addEventListener('pointerup', endCoolShot);
elements.coolButton.addEventListener('pointercancel', endCoolShot);
elements.coolButton.addEventListener('lostpointercapture', endCoolShot);
elements.coolButton.addEventListener('keydown', event => {
  if ((event.code === 'Space' || event.code === 'Enter') && !event.repeat) startCoolShot(event);
});
elements.coolButton.addEventListener('keyup', event => {
  if (event.code === 'Space' || event.code === 'Enter') endCoolShot(event);
});
window.addEventListener('blur', () => endCoolShot());

elements.speedControl.addEventListener('click', event => {
  const button = event.target.closest('[data-speed]');
  if (!button) return;
  state.speed = Number(button.dataset.speed);
  addLog(`Airflow set to ${SPEEDS[state.speed].name}`);
  render();
});
elements.heatControl.addEventListener('click', event => {
  const button = event.target.closest('[data-heat]');
  if (!button) return;
  state.heat = Number(button.dataset.heat);
  addLog(`Heat set to ${HEATS[state.heat].name}`);
  render();
});
elements.stressToggle.addEventListener('change', () => {
  state.stress = elements.stressToggle.checked;
  addLog(state.stress ? 'Accelerated overheat test enabled' : 'Accelerated overheat test disabled');
});
elements.acknowledgeButton.addEventListener('click', () => {
  state.acknowledged = true;
  render();
});
elements.resetButton.addEventListener('click', () => {
  Object.assign(state, { plugged: true, power: false, speed: 1, heat: 2, coolShot: false, overheat: false, acknowledged: false, stress: false, actualTemp: 24, elapsed: 0, logStart: performance.now() });
  elements.stressToggle.checked = false;
  elements.eventLog.replaceChildren();
  addLog('Simulation reset');
  render();
});

function tick() {
  const mode = getOperationalState();
  const target = state.stress && mode === 'hot' && state.heat === 3 ? 94 : currentTarget();
  let rate;
  if (mode === 'hot') {
    const baseRate = state.stress && state.heat === 3 ? 1.8 : .22;
    const airflowCooling = state.speed * .025;
    rate = Math.max(.05, baseRate - airflowCooling);
    if (state.actualTemp < target) state.actualTemp = Math.min(target, state.actualTemp + rate);
    else state.actualTemp += (target - state.actualTemp) * .05;
  } else {
    const fanCooling = mode === 'cool' || mode === 'cool-shot' || mode === 'protection-cooling';
    const coolingRate = fanCooling ? .34 + state.speed * .09 : .16;
    state.actualTemp = Math.max(24, state.actualTemp - coolingRate);
  }

  if (!state.overheat && state.actualTemp >= 87) {
    state.overheat = true;
    state.acknowledged = false;
    state.coolShot = false;
    addLog('Temperature exceeded 87°C: overheat protection started');
  }
  if (state.overheat && state.actualTemp <= 53) {
    state.overheat = false;
    state.power = false;
    state.acknowledged = false;
    addLog('Safe temperature reached: protection released; restart manually');
  }
  render();
}

render();
setInterval(tick, 250);
