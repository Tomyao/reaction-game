'use strict';

/* ================================================================
   THREE.JS SCENE SETUP
================================================================ */
const canvas   = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x0F172A, 1);

const scene  = new THREE.Scene();
scene.fog    = new THREE.FogExp2(0x0F172A, 0.030);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 9;

/* ── Lights ── */
scene.add(new THREE.AmbientLight(0x1e293b, 3));

const light1 = new THREE.PointLight(0x3B82F6, 4, 26);
light1.position.set(6, 5, 4);
scene.add(light1);

const light2 = new THREE.PointLight(0x8B5CF6, 3, 22);
light2.position.set(-5, -3, 3);
scene.add(light2);

const rimLight = new THREE.PointLight(0x10B981, 0, 20);
rimLight.position.set(0, -6, -2);
scene.add(rimLight);

/* ── Core icosahedron ── */
const coreMat = new THREE.MeshPhongMaterial({
    color: 0x3B82F6, emissive: 0x0a1428,
    specular: 0x7aaeff, shininess: 70, flatShading: true,
});
const coreMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.9, 1), coreMat);
scene.add(coreMesh);

/* ── Wireframe shell ── */
const wireMat  = new THREE.MeshBasicMaterial({ color: 0x3d6aad, wireframe: true, transparent: true, opacity: 0.20 });
const wireMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.95, 1), wireMat);
scene.add(wireMesh);

/* ── Orbiting shapes ── */
const orbitGroup = new THREE.Group();
scene.add(orbitGroup);

const GEO_POOL = [
    new THREE.OctahedronGeometry(0.28),
    new THREE.TetrahedronGeometry(0.32),
    new THREE.IcosahedronGeometry(0.22, 0),
    new THREE.BoxGeometry(0.28, 0.28, 0.28),
];
const ORBIT_DATA = [];

for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2;
    const R     = 4.5 + (i % 2) * 0.9;
    const mat   = new THREE.MeshPhongMaterial({
        color: 0x4a7fc1, emissive: 0x0a1428,
        specular: 0x88aaff, shininess: 90,
        flatShading: true, transparent: true, opacity: 0.72,
    });
    const mesh = new THREE.Mesh(GEO_POOL[i % GEO_POOL.length], mat);
    mesh.position.set(Math.cos(angle) * R, Math.sin(angle) * R * 0.42, (Math.random() - 0.5) * 3);
    orbitGroup.add(mesh);
    ORBIT_DATA.push({
        mesh, mat, baseAngle: angle, R,
        spinX:     0.8  + Math.random() * 1.4,
        spinY:     1.2  + Math.random() * 1.4,
        floatAmp:  0.35 + Math.random() * 0.3,
        floatFreq: 0.45 + Math.random() * 0.4,
    });
}

/* ── Background particles ── */
const pPos = new Float32Array(300 * 3);
for (let i = 0; i < 300; i++) {
    pPos[i*3]   = (Math.random() - 0.5) * 38;
    pPos[i*3+1] = (Math.random() - 0.5) * 38;
    pPos[i*3+2] = (Math.random() - 0.5) * 24 - 6;
}
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0x2d4a6e, size: 0.065, transparent: true, opacity: 0.5 }));
scene.add(particles);

/* ── Pulse ring (fires on READY) ── */
const ringMat  = new THREE.MeshBasicMaterial({ color: 0x10B981, transparent: true, opacity: 0 });
const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(2, 0.045, 8, 52), ringMat);
scene.add(ringMesh);
let ringActive = false, ringT = 0;

/* ================================================================
   VISUAL STATE
================================================================ */
const V_COLOR = {
    idle:   new THREE.Color(0x3B82F6),
    wait:   new THREE.Color(0xF59E0B),
    ready:  new THREE.Color(0x10B981),
    error:  new THREE.Color(0xEF4444),
    result: new THREE.Color(0x3B82F6),
};

// Mutable current & target values
const vc = { color: new THREE.Color(0x3B82F6), scale: 1, rim: 0 };
let vTargetColor    = V_COLOR.idle.clone();
let vTargetScale    = 1;
let vTargetRim      = 0;
let vRotSpeed       = 0.4;
let vOrbitMult      = 1;
let shakeTimer      = 0;
let waitPulseTimer  = 0;

function setVisuals(key) {
    vTargetColor = V_COLOR[key].clone();
    switch (key) {
        case 'idle':
            vTargetScale = 1.0;  vTargetRim = 0;   vRotSpeed = 0.4; vOrbitMult = 1.0;
            light1.color.set(0x3B82F6); light2.color.set(0x8B5CF6); rimLight.color.set(0x10B981);
            break;
        case 'wait':
            vTargetScale = 0.88; vTargetRim = 0;   vRotSpeed = 0.7; vOrbitMult = 0.5;
            light1.color.set(0xF59E0B); light2.color.set(0xD97706);
            waitPulseTimer = 0;
            break;
        case 'ready':
            vTargetScale = 1.18; vTargetRim = 5.5; vRotSpeed = 3.2; vOrbitMult = 3.5;
            light1.color.set(0x10B981); light2.color.set(0x34D399); rimLight.color.set(0x10B981);
            ringMesh.scale.setScalar(1); ringMat.opacity = 1;
            ringActive = true; ringT = 0;
            break;
        case 'error':
            vTargetScale = 0.82; vTargetRim = 3.5; vRotSpeed = 0.5; vOrbitMult = 1.0;
            light1.color.set(0xEF4444); light2.color.set(0xDC2626); rimLight.color.set(0xEF4444);
            shakeTimer = 0.5;
            break;
        case 'result':
            vTargetScale = 1.0;  vTargetRim = 2.5; vRotSpeed = 0.9; vOrbitMult = 1.5;
            light1.color.set(0x3B82F6); light2.color.set(0x60A5FA); rimLight.color.set(0x3B82F6);
            break;
    }
}

/* ================================================================
   ANIMATION LOOP
================================================================ */
const clock = new THREE.Clock();

function tick() {
    requestAnimationFrame(tick);
    const dtRaw = clock.getDelta();
    const dt    = Math.min(dtRaw, 0.1);   // cap after tab-switch
    const t     = clock.getElapsedTime();

    // Lerp visual properties
    const lk = Math.min(dt * 5, 1);
    vc.color.lerp(vTargetColor, lk);
    vc.scale += (vTargetScale - vc.scale) * Math.min(dt * 7, 1);
    vc.rim   += (vTargetRim   - vc.rim)   * lk;

    coreMat.color.copy(vc.color);
    wireMat.color.copy(vc.color.clone().multiplyScalar(0.5));
    rimLight.intensity = vc.rim;

    // Core rotation
    coreMesh.rotation.x += dt * vRotSpeed * 0.65;
    coreMesh.rotation.y += dt * vRotSpeed;
    wireMesh.rotation.copy(coreMesh.rotation);

    // Shake
    if (shakeTimer > 0) {
        shakeTimer -= dt;
        const s = shakeTimer / 0.5;
        coreMesh.position.x = (Math.random() - 0.5) * 0.36 * s;
        coreMesh.position.y = (Math.random() - 0.5) * 0.26 * s;
    } else {
        coreMesh.position.x *= 0.85;
        coreMesh.position.y *= 0.85;
    }

    // Scale (+ waiting pulse on top)
    let sc = vc.scale;
    if (gameState === 'waiting') {
        waitPulseTimer += dt * 2.4;
        sc *= 1 + Math.sin(waitPulseTimer) * 0.038;
    }
    coreMesh.scale.setScalar(sc);
    wireMesh.scale.setScalar(sc);
    wireMesh.position.copy(coreMesh.position);

    // Pulse ring expand
    if (ringActive) {
        ringT += dt * 1.9;
        ringMesh.scale.setScalar(1 + ringT * 3.5);
        ringMat.opacity = Math.max(0, 1 - ringT);
        if (ringT >= 1) { ringActive = false; ringMat.opacity = 0; }
    }

    // Orbiting shapes
    orbitGroup.rotation.z += dt * 0.11 * vOrbitMult;
    ORBIT_DATA.forEach(o => {
        o.mesh.rotation.x += dt * o.spinX * vOrbitMult * 0.28;
        o.mesh.rotation.y += dt * o.spinY * vOrbitMult * 0.28;
        o.mesh.position.y  = Math.sin(t * o.floatFreq + o.baseAngle) * o.floatAmp * 2.6;
    });

    // Drifting lights
    light1.position.x = Math.sin(t * 0.38) * 7;
    light1.position.y = Math.cos(t * 0.28) * 5;
    light2.position.x = Math.cos(t * 0.48) * 6;
    light2.position.y = Math.sin(t * 0.42) * 4;

    // Particle drift
    particles.rotation.y += dt * 0.018;
    particles.rotation.x += dt * 0.009;

    renderer.render(scene, camera);
}

/* ================================================================
   GAME LOGIC
================================================================ */
let gameState = 'idle';   // idle | waiting | ready | false_start | result
let waitHandle = null;
let startTime  = null;
let lastMs     = null;
let attempts   = 0;
const times    = [];

function transition(next) {
    gameState = next;
    if (next === 'ready') {
        startTime = performance.now();
    } else if (next !== 'result') {
        startTime = null;
    }
    const inGame = next === 'waiting' || next === 'ready';
    setOverlayActive(!inGame);
    updateGameStatus(next);
    const vKey = { idle:'idle', waiting:'wait', ready:'ready', false_start:'error', result:'result' };
    setVisuals(vKey[next]);
    renderUI();
}

function startRound() {
    cancelWait();
    transition('waiting');
    const delay = 1000 + Math.random() * 4000;   // 1 – 5 s
    waitHandle = setTimeout(() => {
        if (gameState === 'waiting') transition('ready');
    }, delay);
}

function recordReact() {
    if (gameState !== 'ready' || startTime === null) return;
    lastMs = Math.round(performance.now() - startTime);
    attempts++;
    times.push(lastMs);
    transition('result');
    updateStats();
}

function falseStart() {
    cancelWait();
    transition('false_start');
}

function resetSession() {
    cancelWait();
    attempts = 0; times.length = 0; lastMs = null; startTime = null;
    transition('idle');
    updateStats();
}

function cancelWait() {
    if (waitHandle !== null) { clearTimeout(waitHandle); waitHandle = null; }
}

function interact() {
    switch (gameState) {
        case 'idle':
        case 'false_start':
        case 'result':    startRound();  break;
        case 'waiting':   falseStart();  break;
        case 'ready':     recordReact(); break;
    }
}

/* ================================================================
   UI RENDERING
================================================================ */
const elPanel      = document.getElementById('panel');
const elOverlay    = document.getElementById('overlay');
const elHeading    = document.getElementById('heading');
const elCaption    = document.getElementById('caption');
const elTimerBlk   = document.getElementById('timer-block');
const elTimerNum   = document.getElementById('timer-number');
const elBadge      = document.getElementById('badge-wrap');
const elMainBtn    = document.getElementById('main-btn');
const elResetBtn   = document.getElementById('reset-btn');
const elAttempts   = document.getElementById('stat-attempts');
const elAvg        = document.getElementById('stat-avg');
const elBest       = document.getElementById('stat-best');
const elEyebrow    = document.querySelector('.panel-eyebrow');
const elGameStatus = document.getElementById('game-status');

const PERF = [
    { max: 150,      label: 'Superhuman',      color: '#10B981' },
    { max: 200,      label: 'Elite',            color: '#34D399' },
    { max: 250,      label: 'Excellent',        color: '#60A5FA' },
    { max: 300,      label: 'Good',             color: '#3B82F6' },
    { max: 400,      label: 'Average',          color: '#F59E0B' },
    { max: Infinity, label: 'Keep Practicing',  color: '#94A3B8' },
];

function getPerf(ms) { return PERF.find(p => ms < p.max); }

function setOverlayActive(show) {
    elOverlay.style.opacity       = show ? '' : '0';
    elOverlay.style.pointerEvents = show ? '' : 'none';
}

function updateGameStatus(state) {
    if (state === 'waiting') {
        elGameStatus.textContent   = '● Waiting for signal…';
        elGameStatus.style.color   = '';
        elGameStatus.classList.add('active');
    } else if (state === 'ready') {
        elGameStatus.textContent   = '● React now!';
        elGameStatus.style.color   = 'var(--ready)';
        elGameStatus.classList.add('active');
    } else {
        elGameStatus.classList.remove('active');
        elGameStatus.style.color   = '';
    }
}

function setBtn(el, { text, bg, color = '#fff', border = 'none', shadow = '' }) {
    el.textContent      = text;
    el.style.background = bg;
    el.style.color      = color;
    el.style.border     = border;
    el.style.boxShadow  = shadow;
}

function renderUI() {
    // Reset
    elPanel.className     = 'panel';
    elHeading.className   = 'state-heading';
    elTimerBlk.className  = 'timer-block';
    elBadge.innerHTML     = '';
    elEyebrow.textContent = 'Tap anywhere on the panel to interact';

    const hasHistory = attempts > 0;

    switch (gameState) {
        case 'idle':
            elEyebrow.textContent = 'How to play';
            elHeading.textContent = 'Ready to Play?';
            elHeading.style.color = 'var(--text)';
            elCaption.textContent = 'Measure your visual reaction speed — milliseconds count.';
            elBadge.innerHTML = `
                <ol class="instructions">
                    <li class="instr-step">
                        <span class="instr-num">1</span>
                        <span>Press <strong>Start</strong> — the shape begins moving and changes color</span>
                    </li>
                    <li class="instr-step">
                        <span class="instr-num">2</span>
                        <span>Wait for it to flash <strong style="color:var(--ready)">green</strong> — clicking before = false start</span>
                    </li>
                    <li class="instr-step">
                        <span class="instr-num">3</span>
                        <span>Tap, click, or press <strong>Space</strong> the instant you see green</span>
                    </li>
                </ol>`;
            setBtn(elMainBtn, { text: 'Start Game', bg: 'var(--ready)' });
            elResetBtn.style.display = hasHistory ? '' : 'none';
            break;

        case 'waiting':
            elPanel.classList.add('s-wait');
            elHeading.textContent = 'Wait…';
            elHeading.style.color = 'var(--waiting)';
            elHeading.classList.add('anim-pulse');
            elCaption.textContent = 'React when the shape turns green!';
            setBtn(elMainBtn, {
                text: 'Waiting…',
                bg: 'rgba(245,158,11,0.10)',
                color: 'var(--waiting)',
                border: '1px solid rgba(245,158,11,0.25)',
            });
            elResetBtn.style.display = 'none';
            break;

        case 'ready':
            elPanel.classList.add('s-ready');
            elHeading.textContent = 'CLICK!';
            elHeading.style.color = 'var(--ready)';
            elCaption.textContent = 'Now! As fast as you can!';
            setBtn(elMainBtn, { text: 'REACT!', bg: 'var(--ready)', shadow: '0 0 24px rgba(16,185,129,0.55)' });
            elResetBtn.style.display = 'none';
            break;

        case 'false_start':
            elPanel.classList.add('s-error', 'anim-shake');
            elHeading.textContent = 'Too Early!';
            elHeading.style.color = 'var(--error)';
            elCaption.textContent = 'You clicked before the signal — wait for green!';
            setBtn(elMainBtn, { text: 'Try Again', bg: 'var(--error)', shadow: '0 0 20px rgba(239,68,68,0.4)' });
            elResetBtn.style.display = hasHistory ? '' : 'none';
            elPanel.addEventListener('animationend', () => elPanel.classList.remove('anim-shake'), { once: true });
            break;

        case 'result': {
            elPanel.classList.add('s-result');
            elHeading.textContent = 'Nice!';
            elHeading.style.color = 'var(--text)';
            elCaption.textContent = 'Your reaction time:';

            elTimerBlk.classList.add('visible');
            animateCount(elTimerNum, lastMs, 520);

            const perf = getPerf(lastMs);
            elBadge.innerHTML = `<div class="perf-badge" style="color:${perf.color}">${perf.label}</div>`;

            setBtn(elMainBtn, { text: 'Try Again', bg: 'var(--ready)' });
            elResetBtn.style.display = '';
            break;
        }
    }
}

function animateCount(el, target, duration) {
    const t0 = performance.now();
    (function frame(now) {
        const p = Math.min((now - t0) / duration, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(frame);
    })(performance.now());
}

function updateStats() {
    elAttempts.textContent = attempts;
    if (times.length === 0) {
        elAvg.textContent = '—';
        elBest.textContent = '—';
    } else {
        elAvg.textContent  = Math.round(times.reduce((a, b) => a + b, 0) / times.length) + 'ms';
        elBest.textContent = Math.min(...times) + 'ms';
    }
}

/* ================================================================
   EVENT HANDLERS
================================================================ */
elPanel.addEventListener('click', e => {
    if (e.target === elMainBtn || e.target === elResetBtn) return;
    e.stopPropagation();
    interact();
});

elMainBtn.addEventListener('click', e => {
    e.stopPropagation();
    interact();
});

elResetBtn.addEventListener('click', e => {
    e.stopPropagation();
    resetSession();
});

document.addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); interact(); }
    if (e.code === 'KeyR')  { resetSession(); }
});

// When the panel is hidden (waiting/ready), the whole screen is the tap target
document.addEventListener('click', () => {
    if (gameState === 'waiting' || gameState === 'ready') interact();
});
document.addEventListener('touchstart', e => {
    if (gameState === 'waiting' || gameState === 'ready') {
        e.preventDefault();
        interact();
    }
}, { passive: false });

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ================================================================
   INIT
================================================================ */
transition('idle');
updateStats();
tick();
