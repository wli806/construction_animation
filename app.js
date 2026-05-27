// =============================================
// 4D BIM Construction Animation - Core Engine
// =============================================

// ---- State ----
let tasks = [];
let editingTaskId = null;
let currentDay = 1;
let maxDay = 1;
let isPlaying = false;
let playSpeed = 1;
let animTime = 0; // 0..1 within current day
let clock;
let animFrameId = null;

// ---- Three.js scene objects ----
let scene, camera, renderer, controls;
let buildingGroup, groundMesh, skyDome;
let excavationPit, foundationSlab;
let wallMeshes = [], roofMesh;
let workerObjects = [], machineObjects = [];
let sunLight, ambientLight;
let dustParticles = [];

// Building dimensions
const BLDG = { w: 8, d: 6, h: 7, wallH: 3.5 };
const FLOOR_Y = 0;

// ---- Init ----
window.addEventListener('load', () => {
  initThree();
  initDefaultScene();
  loadSampleData();
  animate();
});

// ===== THREE.JS SETUP =====

function initThree() {
  const canvas = document.getElementById('three-canvas');
  const viewport = document.getElementById('viewport');

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.setClearColor(0x87ceeb);

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xc8e8f8, 30, 120);

  // Camera
  camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
  camera.position.set(18, 14, 22);
  camera.lookAt(0, 2, 0);

  // Simple orbit via mouse
  setupOrbitControls();

  // Lights
  ambientLight = new THREE.AmbientLight(0xffeedd, 0.4);
  scene.add(ambientLight);

  sunLight = new THREE.DirectionalLight(0xfff5e0, 1.2);
  sunLight.position.set(20, 30, 15);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 100;
  sunLight.shadow.camera.left = -25;
  sunLight.shadow.camera.right = 25;
  sunLight.shadow.camera.top = 25;
  sunLight.shadow.camera.bottom = -25;
  scene.add(sunLight);

  const fillLight = new THREE.DirectionalLight(0xaaccff, 0.3);
  fillLight.position.set(-15, 10, -10);
  scene.add(fillLight);

  clock = new THREE.Clock();

  // Resize
  resizeRenderer();
  window.addEventListener('resize', resizeRenderer);
}

function resizeRenderer() {
  const vp = document.getElementById('viewport');
  const w = vp.clientWidth;
  const h = vp.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function initDefaultScene() {
  buildingGroup = new THREE.Group();
  scene.add(buildingGroup);

  // Ground
  const groundGeo = new THREE.PlaneGeometry(80, 80, 20, 20);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x6b8e4e });
  groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  // Construction site dirt area
  const dirtGeo = new THREE.PlaneGeometry(16, 14);
  const dirtMat = new THREE.MeshLambertMaterial({ color: 0x8b6914 });
  const dirtMesh = new THREE.Mesh(dirtGeo, dirtMat);
  dirtMesh.rotation.x = -Math.PI / 2;
  dirtMesh.position.y = 0.01;
  scene.add(dirtMesh);

  // Site fence
  createFence();

  // Sky gradient using a large sphere
  const skyGeo = new THREE.SphereGeometry(90, 16, 8);
  const skyMat = new THREE.MeshBasicMaterial({ color: 0x87ceeb, side: THREE.BackSide });
  skyDome = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyDome);

  // Clouds
  createClouds();

  // Trees around site
  createTrees();
}

function createFence() {
  const postMat = new THREE.MeshLambertMaterial({ color: 0xf5a623 });
  const panelMat = new THREE.MeshLambertMaterial({ color: 0xe8a020 });
  const fencePositions = [];
  const hw = 9, hd = 8;
  for (let x = -hw; x <= hw; x += 2) {
    fencePositions.push([x, -hd], [x, hd]);
  }
  for (let z = -hd; z <= hd; z += 2) {
    fencePositions.push([-hw, z], [hw, z]);
  }
  fencePositions.forEach(([x, z]) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.5, 0.15), postMat);
    post.position.set(x, 0.75, z);
    post.castShadow = true;
    scene.add(post);
  });
}

function createClouds() {
  for (let i = 0; i < 6; i++) {
    const cloudGroup = new THREE.Group();
    const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    for (let j = 0; j < 4; j++) {
      const r = 2 + Math.random() * 2;
      const s = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), cloudMat);
      s.position.set(j * 2.5 - 3, Math.random() * 1.5, Math.random() * 1.5 - 0.75);
      cloudGroup.add(s);
    }
    cloudGroup.position.set(
      (Math.random() - 0.5) * 60,
      25 + Math.random() * 15,
      (Math.random() - 0.5) * 60
    );
    cloudGroup.userData.drift = (Math.random() - 0.5) * 0.005;
    scene.add(cloudGroup);
    dustParticles.push(cloudGroup); // reuse array for cloud animation
  }
}

function createTrees() {
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b3a2a });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2d6a2d });
  const positions = [[-14, -5], [-14, 5], [-14, 12], [14, -5], [14, 5], [14, 12], [0, -12], [6, -12], [-6, -12]];
  positions.forEach(([x, z]) => {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2, 6), trunkMat);
    trunk.position.set(x, 1, z);
    trunk.castShadow = true;
    scene.add(trunk);
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.5, 7), leafMat);
    leaves.position.set(x, 3.2, z);
    leaves.castShadow = true;
    scene.add(leaves);
  });
}

// ===== BUILDING CONSTRUCTION =====

function clearBuilding() {
  // Remove all building-specific meshes
  while (buildingGroup.children.length > 0) {
    buildingGroup.remove(buildingGroup.children[0]);
  }
  // Remove workers and machines from scene
  workerObjects.forEach(w => scene.remove(w.group));
  workerObjects = [];
  machineObjects.forEach(m => scene.remove(m.group));
  machineObjects = [];
  excavationPit = null;
  foundationSlab = null;
  wallMeshes = [];
  roofMesh = null;
}

function rebuildScene(day) {
  clearBuilding();
  const dayTasks = getSortedTasks();
  const totalDays = maxDay;

  // Determine what's been built up to this day
  let phases = {
    excavation: 0,
    foundation: 0,
    walls: 0,
    roof: 0,
    finishing: 0
  };

  dayTasks.forEach(t => {
    if (t.day <= day) {
      if (t.type === 'excavation') phases.excavation = Math.min(1, phases.excavation + 1);
      if (t.type === 'foundation') phases.foundation = Math.min(1, phases.foundation + 1);
      if (t.type === 'structure' || t.type === 'walls') phases.walls = Math.min(1, phases.walls + 0.5);
      if (t.type === 'roof') phases.roof = Math.min(1, phases.roof + 1);
      if (t.type === 'finishing') phases.finishing = Math.min(1, phases.finishing + 1);
    }
  });
  phases.walls = Math.min(phases.walls, 1);

  // Current day tasks for partial animation
  const todayTasks = dayTasks.filter(t => t.day === day);
  const prevDayTasks = dayTasks.filter(t => t.day === day - 1);

  // --- Excavation pit ---
  if (phases.excavation > 0) {
    const depth = 1.5 * phases.excavation;
    const pitGeo = new THREE.BoxGeometry(BLDG.w + 1, depth, BLDG.d + 1);
    const pitMat = new THREE.MeshLambertMaterial({ color: 0x4a3018 });
    excavationPit = new THREE.Mesh(pitGeo, pitMat);
    excavationPit.position.set(0, -(depth / 2) + 0.01, 0);
    excavationPit.receiveShadow = true;
    buildingGroup.add(excavationPit);

    // Pit walls (inner darker)
    const innerMat = new THREE.MeshLambertMaterial({ color: 0x3a2510 });
    [-1, 1].forEach(side => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.2, depth, BLDG.d + 1), innerMat);
      wall.position.set(side * (BLDG.w / 2 + 0.5), -(depth / 2) + 0.01, 0);
      buildingGroup.add(wall);
    });
  }

  // --- Foundation ---
  if (phases.foundation > 0) {
    const slabGeo = new THREE.BoxGeometry(BLDG.w, 0.4, BLDG.d);
    const slabMat = new THREE.MeshLambertMaterial({ color: 0xb0a090 });
    foundationSlab = new THREE.Mesh(slabGeo, slabMat);
    foundationSlab.position.set(0, -1.3, 0);
    foundationSlab.castShadow = true;
    foundationSlab.receiveShadow = true;
    buildingGroup.add(foundationSlab);

    // Footings
    const footMat = new THREE.MeshLambertMaterial({ color: 0x9a8878 });
    [[-BLDG.w/2+0.5, -BLDG.d/2+0.5], [BLDG.w/2-0.5, -BLDG.d/2+0.5],
     [-BLDG.w/2+0.5, BLDG.d/2-0.5], [BLDG.w/2-0.5, BLDG.d/2-0.5]].forEach(([x, z]) => {
      const foot = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 1), footMat);
      foot.position.set(x, -1.5, z);
      buildingGroup.add(foot);
    });
  }

  // --- Floor slab ---
  if (phases.foundation > 0) {
    const floorGeo = new THREE.BoxGeometry(BLDG.w - 0.2, 0.25, BLDG.d - 0.2);
    const floorMat = new THREE.MeshLambertMaterial({ color: 0xccbfb0 });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.set(0, FLOOR_Y - 0.1, 0);
    floorMesh.receiveShadow = true;
    buildingGroup.add(floorMesh);
  }

  // --- Walls ---
  if (phases.walls > 0) {
    const wh = BLDG.wallH * phases.walls;
    const wallMat = new THREE.MeshLambertMaterial({ color: 0xe8ddd0 });
    const wallPositions = [
      { pos: [0, wh/2, BLDG.d/2], size: [BLDG.w, wh, 0.3] },   // front
      { pos: [0, wh/2, -BLDG.d/2], size: [BLDG.w, wh, 0.3] },  // back
      { pos: [-BLDG.w/2, wh/2, 0], size: [0.3, wh, BLDG.d] },  // left
      { pos: [BLDG.w/2, wh/2, 0], size: [0.3, wh, BLDG.d] },   // right
    ];

    wallPositions.forEach(({ pos, size }) => {
      const geo = new THREE.BoxGeometry(...size);
      const mesh = new THREE.Mesh(geo, wallMat);
      mesh.position.set(...pos);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      buildingGroup.add(mesh);
      wallMeshes.push(mesh);
    });

    // Door opening (front wall cutout via separate pieces)
    if (phases.walls > 0.5) {
      addDoorWindow(phases.walls);
    }

    // Column/pillar details
    const colMat = new THREE.MeshLambertMaterial({ color: 0xd0c4b4 });
    [[-BLDG.w/2, -BLDG.d/2], [BLDG.w/2, -BLDG.d/2], [-BLDG.w/2, BLDG.d/2], [BLDG.w/2, BLDG.d/2]].forEach(([x, z]) => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.4, wh, 0.4), colMat);
      col.position.set(x, wh/2, z);
      col.castShadow = true;
      buildingGroup.add(col);
    });
  }

  // --- Roof ---
  if (phases.roof > 0) {
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x8b3a2a });
    // Gable roof using custom geometry
    const roofGeo = createRoofGeometry(BLDG.w + 0.4, BLDG.d + 0.4, 2.5);
    roofMesh = new THREE.Mesh(roofGeo, roofMat);
    roofMesh.position.set(0, BLDG.wallH, 0);
    roofMesh.castShadow = true;
    buildingGroup.add(roofMesh);

    // Roof eaves
    const eaveMat = new THREE.MeshLambertMaterial({ color: 0xa0522d });
    const eaveGeo = new THREE.BoxGeometry(BLDG.w + 0.8, 0.15, BLDG.d + 0.8);
    const eave = new THREE.Mesh(eaveGeo, eaveMat);
    eave.position.set(0, BLDG.wallH - 0.05, 0);
    buildingGroup.add(eave);
  }

  // --- Spawn workers and machines for today ---
  spawnResources(day);
}

function addDoorWindow(wallProgress) {
  // Windows on side walls
  const winMat = new THREE.MeshLambertMaterial({ color: 0x87ceeb, transparent: true, opacity: 0.6 });
  const frameMat = new THREE.MeshLambertMaterial({ color: 0xc0a080 });
  const wh = BLDG.wallH * wallProgress;

  if (wh > 1.5) {
    // Front windows
    [-2.5, 2.5].forEach(x => {
      const win = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 0.05), winMat);
      win.position.set(x, 1.8, BLDG.d / 2 + 0.01);
      buildingGroup.add(win);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 0.2), frameMat);
      frame.position.set(x, 1.8, BLDG.d / 2);
      buildingGroup.add(frame);
    });

    // Side windows
    [-1.5, 1.5].forEach(z => {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.0, 1.0), winMat);
      win.position.set(BLDG.w / 2 + 0.01, 1.8, z);
      buildingGroup.add(win);
    });
  }
}

function createRoofGeometry(w, d, h) {
  const geo = new THREE.BufferGeometry();
  const hw = w / 2, hd = d / 2;
  const vertices = new Float32Array([
    -hw, 0, -hd,   hw, 0, -hd,   0, h, 0,  // back triangle
    hw, 0, -hd,    hw, 0, hd,    0, h, 0,   // right side
    hw, 0, hd,     -hw, 0, hd,   0, h, 0,   // front triangle
    -hw, 0, hd,    -hw, 0, -hd,  0, h, 0,   // left side
    // bottom cap
    -hw, 0, -hd,   hw, 0, hd,   hw, 0, -hd,
    -hw, 0, -hd,  -hw, 0, hd,   hw, 0, hd,
  ]);
  geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geo.computeVertexNormals();
  return geo;
}

// ===== WORKERS & MACHINES =====

function spawnResources(day) {
  const todayTasks = getSortedTasks().filter(t => t.day === day);
  let workerCount = 0;
  const machines = [];

  todayTasks.forEach(task => {
    (task.resources || []).forEach(res => {
      if (res.type === 'worker') workerCount += (res.count || 1);
      if (res.type === 'machine') machines.push(res.name);
    });
  });

  // Spawn workers
  for (let i = 0; i < Math.min(workerCount, 8); i++) {
    const w = createWorker(i);
    workerObjects.push(w);
    scene.add(w.group);
  }

  // Spawn machines
  machines.forEach((machineName, i) => {
    const m = createMachine(machineName, i);
    machineObjects.push(m);
    scene.add(m.group);
  });
}

function createWorker(index) {
  const group = new THREE.Group();
  const colors = [0xff6b35, 0xf7931e, 0xffcd05, 0x00b4d8, 0x0077b6, 0x48cae4, 0x90e0ef, 0x06d6a0];
  const bodyColor = colors[index % colors.length];
  const mat = new THREE.MeshLambertMaterial({ color: bodyColor });
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xfdd9a0 });
  const helmetMat = new THREE.MeshLambertMaterial({ color: 0xffcd05 });

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.2), mat);
  body.position.y = 0.85;
  body.castShadow = true;
  group.add(body);

  // Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), skinMat);
  head.position.y = 1.24;
  head.castShadow = true;
  group.add(head);

  // Helmet
  const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.32), helmetMat);
  helmet.position.y = 1.38;
  group.add(helmet);

  // Legs
  [-0.09, 0.09].forEach((x, i) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.4, 0.13), mat);
    leg.position.set(x, 0.42, 0);
    leg.castShadow = true;
    group.add(leg);
  });

  // Arms
  [-0.26, 0.26].forEach((x, i) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), mat);
    arm.position.set(x, 0.85, 0);
    arm.castShadow = true;
    group.add(arm);
  });

  // Initial position - workers enter from site entrance
  const angle = (index / 8) * Math.PI * 2;
  const r = 4 + Math.random() * 3;
  group.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
  group.rotation.y = Math.random() * Math.PI * 2;

  return {
    group,
    walkPhase: Math.random() * Math.PI * 2,
    walkSpeed: 0.8 + Math.random() * 0.4,
    targetX: (Math.random() - 0.5) * 6,
    targetZ: (Math.random() - 0.5) * 4,
    nextTargetTime: Math.random() * 3,
    arms: [group.children[5], group.children[6]],
    legs: [group.children[3], group.children[4]]
  };
}

function createMachine(machineName, index) {
  const name = (machineName || '').toLowerCase();
  if (name.includes('挖') || name.includes('excavat') || name.includes('挖掘机')) {
    return createExcavator(index);
  } else if (name.includes('吊') || name.includes('crane') || name.includes('起重')) {
    return createCrane(index);
  } else if (name.includes('混凝土') || name.includes('concrete') || name.includes('搅拌')) {
    return createConcreteTruck(index);
  } else if (name.includes('卡车') || name.includes('truck') || name.includes('车')) {
    return createTruck(index);
  }
  return createExcavator(index);
}

function createExcavator(index) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xf5a623 });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
  const cabMat = new THREE.MeshLambertMaterial({ color: 0xd4941a });

  // Tracks
  [-0.7, 0.7].forEach(x => {
    const track = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 2.0), darkMat);
    track.position.set(x, 0.18, 0);
    track.castShadow = true;
    group.add(track);
  });

  // Lower body
  const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 1.6), bodyMat);
  lowerBody.position.y = 0.55;
  lowerBody.castShadow = true;
  group.add(lowerBody);

  // Upper body (rotates)
  const upperGroup = new THREE.Group();
  upperGroup.position.y = 0.75;

  const upperBody = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 1.4), bodyMat);
  upperGroup.add(upperBody);

  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), cabMat);
  cab.position.set(-0.1, 0.6, -0.2);
  upperGroup.add(cab);

  // Arm (boom)
  const armGroup = new THREE.Group();
  armGroup.position.set(0.1, 0.3, 0.7);

  const boom = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 1.5), bodyMat);
  boom.position.z = 0.75;
  armGroup.add(boom);

  const stick = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 1.0), bodyMat);
  stick.position.set(0, -0.1, 1.6);
  armGroup.add(stick);

  const bucket = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.3), darkMat);
  bucket.position.set(0, -0.2, 2.15);
  armGroup.add(bucket);

  upperGroup.add(armGroup);
  group.add(upperGroup);

  const startX = index === 0 ? -5 : 5;
  group.position.set(startX, 0, -3);
  group.scale.set(1.2, 1.2, 1.2);

  return {
    group,
    upperGroup,
    armGroup,
    armPhase: 0,
    isExcavator: true
  };
}

function createCrane(index) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xf5a623 });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x333333 });

  // Tower
  const tower = new THREE.Mesh(new THREE.BoxGeometry(0.5, 10, 0.5), bodyMat);
  tower.position.y = 5;
  tower.castShadow = true;
  group.add(tower);

  // Jib (horizontal arm)
  const jib = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 0.3), bodyMat);
  jib.position.set(2, 10, 0);
  group.add(jib);

  // Counter jib
  const counterjib = new THREE.Mesh(new THREE.BoxGeometry(3, 0.25, 0.25), darkMat);
  counterjib.position.set(-2, 10, 0);
  group.add(counterjib);

  // Hook cable
  const hookLine = new THREE.Mesh(new THREE.BoxGeometry(0.05, 3, 0.05), darkMat);
  hookLine.position.set(4, 8.5, 0);
  group.add(hookLine);

  const hook = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), darkMat);
  hook.position.set(4, 7, 0);
  group.add(hook);

  group.position.set(index === 0 ? 6 : -6, 0, 4);

  return { group, isCrane: true, rotSpeed: 0.003 };
}

function createConcreteTruck(index) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xcc4400 });
  const drumMat = new THREE.MeshLambertMaterial({ color: 0xbbbbbb });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.0, 3.5), bodyMat);
  body.position.y = 0.7;
  body.castShadow = true;
  group.add(body);

  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 1.0), bodyMat);
  cab.position.set(0, 1.3, -1.5);
  group.add(cab);

  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 2.0, 12), drumMat);
  drum.position.set(0, 1.5, 0.5);
  drum.rotation.z = 0.3;
  group.add(drum);

  [[-0.8, 0, -1.5], [0.8, 0, -1.5], [-0.8, 0, 1.2], [0.8, 0, 1.2]].forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.25, 10), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.35, z);
    group.add(wheel);
  });

  group.position.set(index % 2 === 0 ? -7 : 7, 0, index * 2 - 2);

  return { group, drum: group.children[2], isTruck: true };
}

function createTruck(index) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x4a90d9 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 3.5), bodyMat);
  body.position.y = 0.65;
  body.castShadow = true;
  group.add(body);

  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.75, 1.2), bodyMat);
  cab.position.set(0, 1.2, -1.5);
  group.add(cab);

  group.position.set(index % 2 === 0 ? -7 : 7, 0, index);
  return { group, isTruck: true };
}

// ===== ANIMATION LOOP =====

function animate() {
  animFrameId = requestAnimationFrame(animate);
  const delta = clock.getDelta();

  // Cloud drift
  dustParticles.forEach(cloud => {
    if (cloud.userData.drift !== undefined) {
      cloud.position.x += cloud.userData.drift * 60 * delta;
      if (cloud.position.x > 60) cloud.position.x = -60;
    }
  });

  // Sun rotation (day cycle)
  const sunAngle = (currentDay / Math.max(maxDay, 1)) * Math.PI;
  sunLight.position.set(
    Math.cos(sunAngle) * 30,
    Math.sin(sunAngle) * 25 + 5,
    15
  );
  sunLight.intensity = Math.max(0.2, Math.sin(sunAngle) * 1.2);
  ambientLight.intensity = 0.2 + Math.sin(sunAngle) * 0.3;

  // Animate workers
  workerObjects.forEach((w, i) => {
    w.walkPhase += delta * w.walkSpeed * 3;
    const dx = w.targetX - w.group.position.x;
    const dz = w.targetZ - w.group.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 0.3) {
      w.group.position.x += dx * delta * 1.2;
      w.group.position.z += dz * delta * 1.2;
      w.group.rotation.y = Math.atan2(dx, dz);
      // Walk animation - arm/leg swing
      if (w.legs[0]) {
        w.legs[0].rotation.x = Math.sin(w.walkPhase) * 0.5;
        w.legs[1].rotation.x = -Math.sin(w.walkPhase) * 0.5;
      }
      if (w.arms[0]) {
        w.arms[0].rotation.x = -Math.sin(w.walkPhase) * 0.5;
        w.arms[1].rotation.x = Math.sin(w.walkPhase) * 0.5;
      }
    } else {
      w.nextTargetTime -= delta;
      if (w.nextTargetTime <= 0) {
        w.targetX = (Math.random() - 0.5) * 7;
        w.targetZ = (Math.random() - 0.5) * 5;
        w.nextTargetTime = 2 + Math.random() * 4;
      }
    }
  });

  // Animate machines
  machineObjects.forEach(m => {
    if (m.isExcavator) {
      m.armPhase += delta * 0.8;
      if (m.armGroup) {
        m.armGroup.rotation.x = Math.sin(m.armPhase) * 0.4 - 0.2;
      }
      if (m.upperGroup) {
        m.upperGroup.rotation.y = Math.sin(m.armPhase * 0.5) * 0.6;
      }
    }
    if (m.isCrane) {
      m.group.rotation.y += m.rotSpeed;
    }
    if (m.drum) {
      m.drum.rotation.x += delta * 1.5;
    }
  });

  // Play mode: advance day
  if (isPlaying) {
    animTime += delta * playSpeed * 0.3;
    if (animTime >= 1) {
      animTime = 0;
      currentDay++;
      if (currentDay > maxDay) {
        currentDay = maxDay;
        isPlaying = false;
        document.getElementById('btn-play').textContent = '▶';
      }
      rebuildScene(currentDay);
    }
    updateSliderAndHUD();
  }

  renderer.render(scene, camera);
}

// ===== CONTROLS =====

let isMouseDown = false, lastMX = 0, lastMY = 0;
let camTheta = 0.7, camPhi = 0.5, camRadius = 30;
const camTarget = new THREE.Vector3(0, 2, 0);

function setupOrbitControls() {
  const canvas = document.getElementById('three-canvas');

  canvas.addEventListener('mousedown', e => {
    isMouseDown = true;
    lastMX = e.clientX;
    lastMY = e.clientY;
  });

  window.addEventListener('mouseup', () => { isMouseDown = false; });

  window.addEventListener('mousemove', e => {
    if (!isMouseDown) return;
    const dx = e.clientX - lastMX;
    const dy = e.clientY - lastMY;
    lastMX = e.clientX;
    lastMY = e.clientY;
    camTheta -= dx * 0.005;
    camPhi = Math.max(0.1, Math.min(1.4, camPhi - dy * 0.005));
    updateCamera();
  });

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    camRadius = Math.max(8, Math.min(80, camRadius + e.deltaY * 0.05));
    updateCamera();
  }, { passive: false });

  // Touch support
  let lastTouchDist = 0;
  canvas.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      isMouseDown = true;
      lastMX = e.touches[0].clientX;
      lastMY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      lastTouchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  });

  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (e.touches.length === 1 && isMouseDown) {
      const dx = e.touches[0].clientX - lastMX;
      const dy = e.touches[0].clientY - lastMY;
      lastMX = e.touches[0].clientX;
      lastMY = e.touches[0].clientY;
      camTheta -= dx * 0.005;
      camPhi = Math.max(0.1, Math.min(1.4, camPhi - dy * 0.005));
      updateCamera();
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      camRadius = Math.max(8, Math.min(80, camRadius - (dist - lastTouchDist) * 0.1));
      lastTouchDist = dist;
      updateCamera();
    }
  }, { passive: false });

  canvas.addEventListener('touchend', () => { isMouseDown = false; });
  updateCamera();
}

function updateCamera() {
  camera.position.set(
    camTarget.x + camRadius * Math.sin(camPhi) * Math.sin(camTheta),
    camTarget.y + camRadius * Math.cos(camPhi),
    camTarget.z + camRadius * Math.sin(camPhi) * Math.cos(camTheta)
  );
  camera.lookAt(camTarget);
}

// ===== PLAYBACK =====

function togglePlay() {
  isPlaying = !isPlaying;
  document.getElementById('btn-play').textContent = isPlaying ? '⏸' : '▶';
  document.getElementById('btn-play').classList.toggle('active', isPlaying);
  if (isPlaying && currentDay >= maxDay) {
    currentDay = 1;
    animTime = 0;
    rebuildScene(currentDay);
  }
}

function rewindAnim() {
  isPlaying = false;
  currentDay = 1;
  animTime = 0;
  document.getElementById('btn-play').textContent = '▶';
  document.getElementById('btn-play').classList.remove('active');
  rebuildScene(currentDay);
  updateSliderAndHUD();
}

function stepDay(dir) {
  isPlaying = false;
  currentDay = Math.max(1, Math.min(maxDay, currentDay + dir));
  rebuildScene(currentDay);
  updateSliderAndHUD();
}

function onSliderChange(val) {
  isPlaying = false;
  currentDay = parseInt(val);
  document.getElementById('btn-play').textContent = '▶';
  rebuildScene(currentDay);
  updateSliderAndHUD();
}

function changeSpeed(val) {
  playSpeed = parseFloat(val);
}

function updateSliderAndHUD() {
  const slider = document.getElementById('day-slider');
  slider.value = currentDay;

  // Day display
  document.getElementById('hud-day').textContent = `第 ${currentDay} 天`;

  // Today's tasks
  const todayTasks = getSortedTasks().filter(t => t.day === currentDay);
  if (todayTasks.length > 0) {
    document.getElementById('hud-task').textContent = todayTasks.map(t => t.name).join(' / ');
  } else {
    document.getElementById('hud-task').textContent = '无施工任务';
  }

  // Resources HUD
  let workersToday = 0, machinesToday = [];
  todayTasks.forEach(t => {
    (t.resources || []).forEach(r => {
      if (r.type === 'worker') workersToday += (r.count || 1);
      if (r.type === 'machine') machinesToday.push(r.name);
      if (r.type === 'material') {}
    });
  });
  const resHud = document.getElementById('hud-resources');
  resHud.innerHTML = '';
  if (workersToday > 0) {
    resHud.innerHTML += `<div class="res-row"><span class="res-icon">👷</span><span>工人 × ${workersToday}</span></div>`;
  }
  machinesToday.slice(0, 3).forEach(m => {
    resHud.innerHTML += `<div class="res-row"><span class="res-icon">🚧</span><span>${m}</span></div>`;
  });
  if (workersToday === 0 && machinesToday.length === 0) {
    resHud.innerHTML = '<div style="color:#6e7681;font-size:11px">暂无资源进场</div>';
  }

  // Progress
  const pct = maxDay > 0 ? ((currentDay - 1) / (maxDay - 1)) * 100 : 0;
  document.getElementById('progress-fill').style.width = Math.min(100, pct) + '%';

  // Highlight active task card
  document.querySelectorAll('.task-card').forEach(card => {
    card.classList.remove('active');
    if (parseInt(card.dataset.day) === currentDay) card.classList.add('active');
  });
}

// ===== TASK DATA =====

function getSortedTasks() {
  return [...tasks].sort((a, b) => a.day - b.day);
}

function computeMaxDay() {
  if (tasks.length === 0) return 1;
  return Math.max(...tasks.map(t => t.day));
}

function refreshAll() {
  maxDay = computeMaxDay();
  currentDay = Math.min(currentDay, maxDay);

  const slider = document.getElementById('day-slider');
  slider.max = maxDay;
  document.getElementById('slider-max-label').textContent = `第${maxDay}天`;

  // Phase markers
  const phases = document.getElementById('phase-markers');
  const markerDays = [1, Math.ceil(maxDay * 0.25), Math.ceil(maxDay * 0.5), Math.ceil(maxDay * 0.75), maxDay];
  phases.innerHTML = markerDays.map(d => `<span class="phase-marker">第${d}天</span>`).join('');

  renderTaskList();
  rebuildScene(currentDay);
  updateSliderAndHUD();
}

function renderTaskList() {
  const list = document.getElementById('task-list');
  const sorted = getSortedTasks();
  list.innerHTML = '';
  if (sorted.length === 0) {
    list.innerHTML = '<div style="padding:16px;color:#6e7681;font-size:12px;text-align:center">暂无施工任务<br>点击右上角"添加任务"开始</div>';
    return;
  }
  sorted.forEach(task => {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.dataset.day = task.day;
    card.dataset.id = task.id;

    const typeColors = {
      excavation: '#f85149', foundation: '#79c0ff', structure: '#d29922',
      walls: '#3fb950', roof: '#a371f7', finishing: '#58a6ff', other: '#8b949e'
    };
    const typeNames = {
      excavation: '挖掘', foundation: '基础', structure: '结构',
      walls: '墙体', roof: '屋顶', finishing: '装修', other: '其他'
    };

    let chipsHtml = '';
    (task.resources || []).forEach(r => {
      if (r.type === 'worker') chipsHtml += `<span class="chip chip-worker">👷 工人×${r.count}</span>`;
      if (r.type === 'machine') chipsHtml += `<span class="chip chip-machine">🚧 ${r.name}</span>`;
      if (r.type === 'material') chipsHtml += `<span class="chip chip-material">📦 ${r.name}</span>`;
    });

    card.innerHTML = `
      <div class="task-card-header" onclick="jumpToDay(${task.day})">
        <span class="day-badge">D${task.day}</span>
        <span class="task-name">${task.name}</span>
        <span style="font-size:10px;padding:1px 6px;border-radius:3px;background:${typeColors[task.type] || '#8b949e'}22;color:${typeColors[task.type] || '#8b949e'};margin-right:4px">${typeNames[task.type] || task.type}</span>
        <button class="task-delete" onclick="deleteTask('${task.id}',event)">✕</button>
      </div>
      ${chipsHtml ? `<div class="task-card-body"><div class="resource-chips">${chipsHtml}</div></div>` : ''}
    `;
    list.appendChild(card);
  });
}

function jumpToDay(day) {
  isPlaying = false;
  currentDay = day;
  rebuildScene(currentDay);
  updateSliderAndHUD();
}

function deleteTask(id, e) {
  e.stopPropagation();
  tasks = tasks.filter(t => t.id !== id);
  refreshAll();
}

// ===== MODAL / FORM =====

let tempResources = [];

function openAddTaskModal(taskId) {
  editingTaskId = taskId || null;
  tempResources = [];

  if (editingTaskId) {
    const t = tasks.find(t => t.id === editingTaskId);
    document.getElementById('f-day').value = t.day;
    document.getElementById('f-name').value = t.name;
    document.getElementById('f-type').value = t.type;
    document.getElementById('f-notes').value = t.notes || '';
    tempResources = JSON.parse(JSON.stringify(t.resources || []));
    document.getElementById('modal-title').textContent = '编辑施工任务';
  } else {
    document.getElementById('f-day').value = maxDay + 1;
    document.getElementById('f-name').value = '';
    document.getElementById('f-type').value = 'excavation';
    document.getElementById('f-notes').value = '';
    document.getElementById('modal-title').textContent = '添加施工任务';
  }
  renderResourcesEditor();
  document.getElementById('modal-overlay').classList.add('show');
  document.getElementById('f-name').focus();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('show');
}

function closeModalIfBg(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

function renderResourcesEditor() {
  const container = document.getElementById('resources-editor');
  container.innerHTML = '';
  tempResources.forEach((res, i) => {
    const row = document.createElement('div');
    row.className = 'res-edit-row';
    if (res.type === 'worker') {
      row.innerHTML = `
        <select onchange="updateResource(${i},'type',this.value)" style="flex:0 0 80px">
          <option value="worker" selected>工人</option>
          <option value="machine">机械</option>
          <option value="material">材料</option>
        </select>
        <input type="number" value="${res.count || 1}" min="1" max="100" style="width:60px" oninput="updateResource(${i},'count',parseInt(this.value)||1)" placeholder="数量">
        <span style="font-size:12px;color:#8b949e">人</span>
        <button class="res-remove-btn" onclick="removeResource(${i})">✕</button>
      `;
    } else {
      row.innerHTML = `
        <select onchange="updateResource(${i},'type',this.value)" style="flex:0 0 80px">
          <option value="worker" ${res.type==='worker'?'selected':''}>工人</option>
          <option value="machine" ${res.type==='machine'?'selected':''}>机械</option>
          <option value="material" ${res.type==='material'?'selected':''}>材料</option>
        </select>
        <input type="text" value="${res.name || ''}" style="flex:1" oninput="updateResource(${i},'name',this.value)" placeholder="${res.type==='machine'?'机械名称（挖掘机...）':'材料名称'}">
        <button class="res-remove-btn" onclick="removeResource(${i})">✕</button>
      `;
    }
    container.appendChild(row);
  });
  const addBtn = document.createElement('button');
  addBtn.className = 'res-add-btn';
  addBtn.textContent = '+ 添加资源';
  addBtn.onclick = addResourceRow;
  container.appendChild(addBtn);
}

function addResourceRow() {
  tempResources.push({ type: 'worker', count: 2 });
  renderResourcesEditor();
}

function updateResource(i, key, val) {
  tempResources[i][key] = val;
  if (key === 'type') renderResourcesEditor();
}

function removeResource(i) {
  tempResources.splice(i, 1);
  renderResourcesEditor();
}

function saveTask() {
  const day = parseInt(document.getElementById('f-day').value);
  const name = document.getElementById('f-name').value.trim();
  const type = document.getElementById('f-type').value;
  const notes = document.getElementById('f-notes').value.trim();

  if (!name) { document.getElementById('f-name').focus(); return; }
  if (!day || day < 1) { document.getElementById('f-day').focus(); return; }

  if (editingTaskId) {
    const t = tasks.find(t => t.id === editingTaskId);
    Object.assign(t, { day, name, type, notes, resources: tempResources });
  } else {
    tasks.push({ id: Date.now().toString(), day, name, type, notes, resources: tempResources });
  }

  closeModal();
  refreshAll();
}

// ===== SAMPLE DATA =====

function loadSampleData() {
  tasks = [
    {
      id: '1', day: 1, name: '场地平整 & 土方挖掘', type: 'excavation', notes: '清理场地，挖掘基础坑',
      resources: [{ type: 'worker', count: 4 }, { type: 'machine', name: '挖掘机' }, { type: 'machine', name: '推土机' }]
    },
    {
      id: '2', day: 2, name: '基础挖掘完成', type: 'excavation', notes: '继续挖掘至设计标高',
      resources: [{ type: 'worker', count: 3 }, { type: 'machine', name: '挖掘机' }]
    },
    {
      id: '3', day: 3, name: '浇筑混凝土基础', type: 'foundation', notes: '垫层混凝土浇筑',
      resources: [{ type: 'worker', count: 6 }, { type: 'machine', name: '混凝土搅拌车' }, { type: 'material', name: 'C30混凝土 20m³' }]
    },
    {
      id: '4', day: 4, name: '基础养护 & 模板支护', type: 'foundation', notes: '养护基础，支设模板',
      resources: [{ type: 'worker', count: 4 }, { type: 'material', name: '模板及支撑' }]
    },
    {
      id: '5', day: 5, name: '一层墙体砌筑', type: 'walls', notes: '砌筑240mm砖墙',
      resources: [{ type: 'worker', count: 8 }, { type: 'material', name: '红砖 5000块' }, { type: 'machine', name: '吊车' }]
    },
    {
      id: '6', day: 6, name: '墙体砌筑继续', type: 'walls', notes: '继续砌墙，预留门窗洞口',
      resources: [{ type: 'worker', count: 8 }, { type: 'material', name: '水泥砂浆' }]
    },
    {
      id: '7', day: 7, name: '墙体完成 & 过梁安装', type: 'structure', notes: '安装门窗过梁',
      resources: [{ type: 'worker', count: 6 }, { type: 'machine', name: '吊车' }, { type: 'material', name: '预制过梁' }]
    },
    {
      id: '8', day: 8, name: '屋顶桁架安装', type: 'roof', notes: '安装木质屋顶桁架',
      resources: [{ type: 'worker', count: 5 }, { type: 'machine', name: '吊车' }, { type: 'material', name: '木材桁架' }]
    },
    {
      id: '9', day: 9, name: '屋面瓦铺设', type: 'roof', notes: '铺设陶瓦',
      resources: [{ type: 'worker', count: 4 }, { type: 'material', name: '陶瓦 500块' }]
    },
    {
      id: '10', day: 10, name: '外墙抹灰 & 收尾', type: 'finishing', notes: '外墙抹灰，安装门窗',
      resources: [{ type: 'worker', count: 5 }, { type: 'material', name: '抹灰砂浆' }]
    }
  ];
  refreshAll();
}
