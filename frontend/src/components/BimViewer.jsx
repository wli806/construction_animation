import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// Building dimensions
const B = { w: 8, d: 6, wallH: 3.5 }

export default function BimViewer({ tasks = [], currentDay = 1 }) {
  const containerRef = useRef(null)
  const stateRef = useRef(null)

  // Init Three.js once
  useEffect(() => {
    const container = containerRef.current
    if (!container || stateRef.current) return

    const state = initScene(container)
    stateRef.current = state
    buildDay(state, tasks, currentDay)
    state.rafId = requestAnimationFrame(function loop() {
      tick(state)
      state.rafId = requestAnimationFrame(loop)
    })

    const ro = new ResizeObserver(() => {
      const w = container.clientWidth, h = container.clientHeight
      state.renderer.setSize(w, h)
      state.camera.aspect = w / h
      state.camera.updateProjectionMatrix()
    })
    ro.observe(container)

    return () => {
      cancelAnimationFrame(state.rafId)
      ro.disconnect()
      state.renderer.dispose()
      stateRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Rebuild scene when tasks or day changes
  useEffect(() => {
    if (stateRef.current) buildDay(stateRef.current, tasks, currentDay)
  }, [tasks, currentDay])

  return <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#0a1628' }} />
}

// ─── Scene init ────────────────────────────────────────────────────────────

function initScene(container) {
  const w = container.clientWidth, h = container.clientHeight

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(w, h)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.85
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.fog = new THREE.Fog(0xb0cce0, 35, 120)
  scene.background = new THREE.Color(0x87ceeb)

  const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 500)
  camera.position.set(18, 14, 22)
  camera.lookAt(0, 2, 0)

  // Lights
  const ambient = new THREE.AmbientLight(0xffeedd, 0.4)
  scene.add(ambient)
  const sun = new THREE.DirectionalLight(0xfff5e0, 1.2)
  sun.position.set(20, 30, 15)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.left = -25; sun.shadow.camera.right = 25
  sun.shadow.camera.top = 25; sun.shadow.camera.bottom = -25
  sun.shadow.camera.far = 100
  scene.add(sun)
  const fillLight = new THREE.DirectionalLight(0xaaccff, 0.3)
  fillLight.position.set(-15, 10, -10)
  scene.add(fillLight)

  // Static environment
  addEnvironment(scene)

  // Orbit via mouse/touch
  const orbit = { theta: 0.7, phi: 0.5, r: 32, down: false, lx: 0, ly: 0 }
  const onDown = (x, y) => { orbit.down = true; orbit.lx = x; orbit.ly = y }
  const onMove = (x, y) => {
    if (!orbit.down) return
    orbit.theta -= (x - orbit.lx) * 0.005
    orbit.phi = Math.max(0.1, Math.min(1.4, orbit.phi - (y - orbit.ly) * 0.005))
    orbit.lx = x; orbit.ly = y
    updateCam(camera, orbit)
  }
  const onUp = () => { orbit.down = false }

  renderer.domElement.addEventListener('mousedown', e => onDown(e.clientX, e.clientY))
  window.addEventListener('mousemove', e => onMove(e.clientX, e.clientY))
  window.addEventListener('mouseup', onUp)
  renderer.domElement.addEventListener('wheel', e => {
    e.preventDefault()
    orbit.r = Math.max(8, Math.min(70, orbit.r + e.deltaY * 0.05))
    updateCam(camera, orbit)
  }, { passive: false })
  renderer.domElement.addEventListener('touchstart', e => { if (e.touches.length === 1) onDown(e.touches[0].clientX, e.touches[0].clientY) }, { passive: true })
  renderer.domElement.addEventListener('touchmove', e => { if (e.touches.length === 1) onMove(e.touches[0].clientX, e.touches[0].clientY) }, { passive: true })
  renderer.domElement.addEventListener('touchend', onUp)
  updateCam(camera, orbit)

  const clock = new THREE.Clock()
  const buildingGroup = new THREE.Group()
  scene.add(buildingGroup)

  return { renderer, scene, camera, clock, sun, ambient, buildingGroup, workers: [], machines: [], clouds: [] }
}

function updateCam(camera, o) {
  camera.position.set(
    Math.sin(o.phi) * Math.sin(o.theta) * o.r,
    Math.cos(o.phi) * o.r + 2,
    Math.sin(o.phi) * Math.cos(o.theta) * o.r,
  )
  camera.lookAt(0, 2, 0)
}

// ─── Environment (static, created once) ───────────────────────────────────

function addEnvironment(scene) {
  // Ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshLambertMaterial({ color: 0x5a7a3a }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  // Dirt patch
  const dirt = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 16),
    new THREE.MeshLambertMaterial({ color: 0x7a5c20 }),
  )
  dirt.rotation.x = -Math.PI / 2
  dirt.position.y = 0.01
  scene.add(dirt)

  // Fence (orange construction fence)
  const postM = new THREE.MeshLambertMaterial({ color: 0xf5a623 })
  for (let x = -10; x <= 10; x += 2.5) {
    [[-9], [9]].forEach(([z]) => addPost(scene, x, z, postM))
  }
  for (let z = -9; z <= 9; z += 2.5) {
    [[-10], [10]].forEach(([x]) => addPost(scene, x, z, postM))
  }

  // Trees
  const trunkM = new THREE.MeshLambertMaterial({ color: 0x5c3317 })
  const leafM = new THREE.MeshLambertMaterial({ color: 0x2d5a27 })
  ;[[-14,-6],[-14,4],[-14,12],[14,-6],[14,4],[14,12],[0,-13],[7,-13],[-7,-13]].forEach(([x,z]) => {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.3,2,6), trunkM)
    trunk.position.set(x,1,z); trunk.castShadow = true; scene.add(trunk)
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(1.2,2.5,7), leafM)
    leaves.position.set(x,3.2,z); leaves.castShadow = true; scene.add(leaves)
  })

  // Clouds
  const cloudM = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.82 })
  for (let i = 0; i < 5; i++) {
    const g = new THREE.Group()
    for (let j = 0; j < 4; j++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(1.5+Math.random(),7,5), cloudM)
      s.position.set(j*2.5-3, Math.random()*1.5, Math.random()*1.5-0.75)
      g.add(s)
    }
    g.position.set((Math.random()-0.5)*70, 24+Math.random()*14, (Math.random()-0.5)*70)
    g.userData.drift = (Math.random()-0.5)*0.004
    scene.add(g)
    scene.userData = scene.userData || {}
    ;(scene.userData.clouds = scene.userData.clouds || []).push(g)
  }
}

function addPost(scene, x, z, mat) {
  const p = new THREE.Mesh(new THREE.BoxGeometry(0.15,1.6,0.15), mat)
  p.position.set(x,0.8,z); scene.add(p)
}

// ─── Build scene for a given day ──────────────────────────────────────────

function buildDay(state, tasks, day) {
  const { buildingGroup, scene } = state

  // Clear previous building & actors
  while (buildingGroup.children.length) buildingGroup.remove(buildingGroup.children[0])
  state.workers.forEach(w => scene.remove(w.group))
  state.machines.forEach(m => scene.remove(m.group))
  state.workers = []
  state.machines = []

  // Determine phase progress based on task types up to current day
  const phases = { excavation: 0, foundation: 0, walls: 0, roof: 0, finishing: 0 }
  tasks.filter(t => t.day <= day).forEach(t => {
    if (t.type === 'excavation') phases.excavation = Math.min(1, phases.excavation + 1)
    if (t.type === 'foundation') phases.foundation = Math.min(1, phases.foundation + 1)
    if (t.type === 'walls' || t.type === 'structure') phases.walls = Math.min(1, phases.walls + 0.5)
    if (t.type === 'roof') phases.roof = Math.min(1, phases.roof + 1)
    if (t.type === 'finishing') phases.finishing = Math.min(1, phases.finishing + 1)
  })
  phases.walls = Math.min(phases.walls, 1)

  addBuilding(buildingGroup, phases)
  spawnActors(state, tasks, day)
}

function addBuilding(g, phases) {
  const matWall = new THREE.MeshLambertMaterial({ color: 0xe0d4c4 })
  const matConcrete = new THREE.MeshLambertMaterial({ color: 0xb8a898 })
  const matDirt = new THREE.MeshLambertMaterial({ color: 0x4a3010 })
  const matRoof = new THREE.MeshLambertMaterial({ color: 0x8b3520 })
  const matWindow = new THREE.MeshLambertMaterial({ color: 0x87ceeb, transparent: true, opacity: 0.55 })
  const matColumn = new THREE.MeshLambertMaterial({ color: 0xd0c0b0 })

  // Excavation pit
  if (phases.excavation > 0) {
    const depth = 1.8 * phases.excavation
    mesh(g, new THREE.BoxGeometry(B.w+1, depth, B.d+1), matDirt, [0, -(depth/2)+0.01, 0])
  }

  // Foundation
  if (phases.foundation > 0) {
    mesh(g, new THREE.BoxGeometry(B.w, 0.4, B.d), matConcrete, [0, -1.2, 0])
    // Footings
    ;[[-B.w/2+0.5,-B.d/2+0.5],[B.w/2-0.5,-B.d/2+0.5],[-B.w/2+0.5,B.d/2-0.5],[B.w/2-0.5,B.d/2-0.5]].forEach(([x,z]) => {
      mesh(g, new THREE.BoxGeometry(1,0.8,1), matConcrete, [x,-1.4,z])
    })
    // Floor slab
    mesh(g, new THREE.BoxGeometry(B.w-0.2, 0.2, B.d-0.2), matConcrete, [0,-0.08,0])
  }

  // Walls
  if (phases.walls > 0) {
    const wh = B.wallH * phases.walls
    const y = wh / 2
    ;[
      [[0,y,B.d/2],[B.w,wh,0.3]],
      [[0,y,-B.d/2],[B.w,wh,0.3]],
      [[-B.w/2,y,0],[0.3,wh,B.d]],
      [[B.w/2,y,0],[0.3,wh,B.d]],
    ].forEach(([pos,size]) => {
      const m = mesh(g, new THREE.BoxGeometry(...size), matWall, pos)
      m.castShadow = true
    })

    // Columns at corners
    ;[[-B.w/2,-B.d/2],[B.w/2,-B.d/2],[-B.w/2,B.d/2],[B.w/2,B.d/2]].forEach(([x,z]) => {
      mesh(g, new THREE.BoxGeometry(0.45,wh,0.45), matColumn, [x,y,z])
    })

    // Windows (only once walls are > half height)
    if (wh > 1.8) {
      ;[[-2.2,2.2]].forEach(x => {
        mesh(g, new THREE.BoxGeometry(1.2,1.0,0.06), matWindow, [x, 1.8, B.d/2+0.01])
      })
      ;[-1.5,1.5].forEach(z => {
        mesh(g, new THREE.BoxGeometry(0.06,1.0,1.0), matWindow, [B.w/2+0.01, 1.8, z])
        mesh(g, new THREE.BoxGeometry(0.06,1.0,1.0), matWindow, [-B.w/2-0.01, 1.8, z])
      })
    }
  }

  // Roof
  if (phases.roof > 0) {
    const roofGeo = makeRoof(B.w+0.5, B.d+0.5, 2.2)
    const rm = new THREE.Mesh(roofGeo, matRoof)
    rm.position.set(0, B.wallH, 0)
    rm.castShadow = true
    g.add(rm)
    mesh(g, new THREE.BoxGeometry(B.w+0.7, 0.12, B.d+0.7), new THREE.MeshLambertMaterial({ color: 0xa0522d }), [0, B.wallH-0.04, 0])
  }
}

function mesh(group, geo, mat, pos) {
  const m = new THREE.Mesh(geo, mat)
  m.position.set(...pos)
  m.receiveShadow = true
  group.add(m)
  return m
}

function makeRoof(w, d, h) {
  const hw = w/2, hd = d/2
  const verts = new Float32Array([
    -hw,0,-hd,  hw,0,-hd,  0,h,0,   // back
     hw,0,-hd,  hw,0, hd,  0,h,0,   // right
     hw,0, hd, -hw,0, hd,  0,h,0,   // front
    -hw,0, hd, -hw,0,-hd,  0,h,0,   // left
    -hw,0,-hd,  hw,0, hd,  hw,0,-hd,
    -hw,0,-hd, -hw,0, hd,  hw,0, hd,
  ])
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(verts, 3))
  geo.computeVertexNormals()
  return geo
}

// ─── Spawn workers & machines ──────────────────────────────────────────────

function spawnActors(state, tasks, day) {
  const today = tasks.filter(t => t.day === day)
  let workerCount = 0
  const machineNames = []
  today.forEach(t => {
    (t.resources || []).forEach(r => {
      if (r.type === 'worker') workerCount += (r.count || 1)
      if (r.type === 'machine') machineNames.push(r.name || '挖掘机')
    })
  })

  const COLORS = [0xff6b35,0xf7c35e,0x00b4d8,0x06d6a0,0xffd166,0x118ab2,0xef476f,0x26a69a]
  for (let i = 0; i < Math.min(workerCount, 8); i++) {
    const w = makeWorker(COLORS[i % COLORS.length], i)
    state.workers.push(w)
    state.scene.add(w.group)
  }

  machineNames.slice(0, 3).forEach((name, i) => {
    const m = makeMachine(name, i)
    state.machines.push(m)
    state.scene.add(m.group)
  })
}

function makeWorker(color, idx) {
  const g = new THREE.Group()
  const bodyM = new THREE.MeshLambertMaterial({ color })
  const skinM = new THREE.MeshLambertMaterial({ color: 0xfdd9a0 })
  const helmM = new THREE.MeshLambertMaterial({ color: 0xffd700 })

  // body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.35,0.5,0.2), bodyM); body.position.y = 0.85; body.castShadow = true; g.add(body)
  // head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.28,0.28,0.28), skinM); head.position.y = 1.24; head.castShadow = true; g.add(head)
  // helmet
  const helm = new THREE.Mesh(new THREE.BoxGeometry(0.33,0.13,0.33), helmM); helm.position.y = 1.38; g.add(helm)
  // legs (index 3, 4)
  const leg0 = new THREE.Mesh(new THREE.BoxGeometry(0.13,0.42,0.13), bodyM); leg0.position.set(-0.09,0.41,0); g.add(leg0)
  const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.13,0.42,0.13), bodyM); leg1.position.set(0.09,0.41,0); g.add(leg1)
  // arms (index 5, 6)
  const arm0 = new THREE.Mesh(new THREE.BoxGeometry(0.1,0.42,0.1), bodyM); arm0.position.set(-0.26,0.84,0); g.add(arm0)
  const arm1 = new THREE.Mesh(new THREE.BoxGeometry(0.1,0.42,0.1), bodyM); arm1.position.set(0.26,0.84,0); g.add(arm1)

  const angle = (idx / 8) * Math.PI * 2
  const r = 3.5 + Math.random() * 3
  g.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r)
  g.rotation.y = Math.random() * Math.PI * 2

  return {
    group: g, leg0, leg1, arm0, arm1,
    phase: Math.random() * Math.PI * 2,
    speed: 0.8 + Math.random() * 0.5,
    targetX: (Math.random()-0.5)*7, targetZ: (Math.random()-0.5)*5,
    nextTarget: 2 + Math.random() * 3,
  }
}

function makeMachine(name, idx) {
  const n = (name || '').toLowerCase()
  if (n.includes('挖') || n.includes('excavat')) return makeExcavator(idx)
  if (n.includes('吊') || n.includes('crane') || n.includes('起重')) return makeCrane(idx)
  if (n.includes('混凝土') || n.includes('搅拌') || n.includes('concrete')) return makeConcreteTruck(idx)
  return makeExcavator(idx)
}

function makeExcavator(idx) {
  const g = new THREE.Group()
  const yM = new THREE.MeshLambertMaterial({ color: 0xf5a623 })
  const dM = new THREE.MeshLambertMaterial({ color: 0x333 })

  ;[-0.7,0.7].forEach(x => { const t = new THREE.Mesh(new THREE.BoxGeometry(0.38,0.32,2.1),dM); t.position.set(x,0.16,0); t.castShadow=true; g.add(t) })
  const lb = new THREE.Mesh(new THREE.BoxGeometry(1.1,0.38,1.7),yM); lb.position.y=0.54; lb.castShadow=true; g.add(lb)

  const upper = new THREE.Group(); upper.position.y = 0.74; g.add(upper)
  upper.add(new THREE.Mesh(new THREE.BoxGeometry(1.0,0.48,1.4),yM))
  upper.add(new THREE.Mesh(new THREE.BoxGeometry(0.7,0.68,0.7), new THREE.MeshLambertMaterial({color:0xd4941a})))

  const arm = new THREE.Group(); arm.position.set(0.1,0.28,0.75); upper.add(arm)
  const boom = new THREE.Mesh(new THREE.BoxGeometry(0.18,0.14,1.6),yM); boom.position.z=0.8; arm.add(boom)
  const bucket = new THREE.Mesh(new THREE.BoxGeometry(0.48,0.28,0.28),dM); bucket.position.set(0,-0.12,1.7); arm.add(bucket)

  g.position.set(idx===0 ? -5 : 5, 0, -2.5)
  g.scale.setScalar(1.15)
  return { group: g, upper, arm, phase: 0, isExcavator: true }
}

function makeCrane(idx) {
  const g = new THREE.Group()
  const yM = new THREE.MeshLambertMaterial({ color: 0xf5a623 })
  const dM = new THREE.MeshLambertMaterial({ color: 0x555 })

  const tower = new THREE.Mesh(new THREE.BoxGeometry(0.5,10,0.5),yM); tower.position.y=5; tower.castShadow=true; g.add(tower)
  const jib = new THREE.Mesh(new THREE.BoxGeometry(9,0.28,0.28),yM); jib.position.set(2.5,10,0); g.add(jib)
  const cjib = new THREE.Mesh(new THREE.BoxGeometry(3,0.22,0.22),dM); cjib.position.set(-2,10,0); g.add(cjib)
  const cable = new THREE.Mesh(new THREE.BoxGeometry(0.05,2.8,0.05),dM); cable.position.set(5,8.6,0); g.add(cable)
  const hook = new THREE.Mesh(new THREE.BoxGeometry(0.28,0.28,0.28),dM); hook.position.set(5,7.2,0); g.add(hook)

  g.position.set(idx===0 ? 7 : -7, 0, 4)
  return { group: g, isCrane: true, rotSpeed: 0.003 }
}

function makeConcreteTruck(idx) {
  const g = new THREE.Group()
  const bM = new THREE.MeshLambertMaterial({ color: 0xcc4400 })
  const dM = new THREE.MeshLambertMaterial({ color: 0xbbbbbb })
  const wM = new THREE.MeshLambertMaterial({ color: 0x222 })

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0,1.0,3.8),bM); body.position.y=0.72; body.castShadow=true; g.add(body)
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.8,0.8,1.1),bM); cab.position.set(0,1.3,-1.6); g.add(cab)
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.7,0.7,2.2,10),dM); drum.position.set(0,1.55,0.5); drum.rotation.z=0.3; g.add(drum)
  ;[[-0.8,0,-1.5],[0.8,0,-1.5],[-0.8,0,1.2],[0.8,0,1.2]].forEach(([x,y,z]) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.34,0.24,10),wM); w.rotation.z=Math.PI/2; w.position.set(x,0.34,z); g.add(w)
  })
  g.position.set(idx%2===0 ? -7 : 7, 0, idx*2-1)
  return { group: g, drum: g.children[2], isTruck: true }
}

// ─── Animation tick ────────────────────────────────────────────────────────

function tick(state) {
  const dt = state.clock.getDelta()

  // Cloud drift
  ;(state.scene.userData.clouds || []).forEach(c => {
    c.position.x += c.userData.drift * 60 * dt
    if (c.position.x > 65) c.position.x = -65
    if (c.position.x < -65) c.position.x = 65
  })

  // Workers
  state.workers.forEach(w => {
    w.phase += dt * w.speed * 3
    const dx = w.targetX - w.group.position.x
    const dz = w.targetZ - w.group.position.z
    const dist = Math.sqrt(dx*dx + dz*dz)
    if (dist > 0.3) {
      w.group.position.x += dx * dt * 1.5
      w.group.position.z += dz * dt * 1.5
      w.group.rotation.y = Math.atan2(dx, dz)
      w.leg0.rotation.x = Math.sin(w.phase) * 0.55
      w.leg1.rotation.x = -Math.sin(w.phase) * 0.55
      w.arm0.rotation.x = -Math.sin(w.phase) * 0.5
      w.arm1.rotation.x = Math.sin(w.phase) * 0.5
    } else {
      w.nextTarget -= dt
      if (w.nextTarget <= 0) {
        w.targetX = (Math.random()-0.5)*8
        w.targetZ = (Math.random()-0.5)*6
        w.nextTarget = 2 + Math.random() * 4
      }
    }
  })

  // Machines
  state.machines.forEach(m => {
    if (m.isExcavator) {
      m.phase += dt * 0.8
      if (m.upper) m.upper.rotation.y = Math.sin(m.phase * 0.5) * 0.65
      if (m.arm) m.arm.rotation.x = Math.sin(m.phase) * 0.38 - 0.15
    }
    if (m.isCrane) m.group.rotation.y += m.rotSpeed
    if (m.drum) m.drum.rotation.x += dt * 1.6
  })

  state.renderer.render(state.scene, state.camera)
}
