import Header from './Header'
import Footer from './Footer'
import { PropsWithChildren, useEffect, useRef } from 'react'

export default function Layout({ children }: PropsWithChildren) {
  const cosmosRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = cosmosRef.current
    if (!el) return

    // Smooth parallax values (unitless, multiplied by 1px in CSS)
    let tx = 0
    let ty = 0
    let vx = 0
    let vy = 0
    let raf = 0

    function onMove(e: MouseEvent) {
      const w = window.innerWidth
      const h = window.innerHeight
      const nx = (e.clientX - w / 2) / w // -0.5 .. 0.5
      const ny = (e.clientY - h / 2) / h
      tx = nx * 36
      ty = ny * 20
      startRaf()
    }

    function onScroll() {
      const s = window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight)
      // smaller permanent offset based on scroll
      el!.style.setProperty('--scroll', String((s - 0.5) * 12))
      startRaf()
    }

    function startRaf() {
      if (raf) return
      raf = requestAnimationFrame(loop)
    }

    function loop() {
      // simple spring / lerp
      vx += (tx - vx) * 0.12
      vy += (ty - vy) * 0.12
  el!.style.setProperty('--mx', String(vx.toFixed(2)))
  el!.style.setProperty('--my', String(vy.toFixed(2)))
      raf = 0
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    // seed
    onScroll()

  // --- Dynamic stars, meteors and realistic planets generation ---
  const random = (min: number, max: number) => Math.random() * (max - min) + min
  const enabledFlag = (() => { try { return localStorage.getItem('cosmos:enabled') !== '0' } catch { return true } })()
  // if disabled, hide cosmos visuals
  el.classList.toggle('cosmos-disabled', !enabledFlag)

    // create sparkling static stars across the viewport (only if enabled)
  let starLayer: HTMLDivElement | null = null
  if (enabledFlag) {
    starLayer = document.createElement('div')
    starLayer.className = 'sparkle-layer'
    el!.appendChild(starLayer)
  }
  const makeSpark = (i: number) => {
      const s = document.createElement('div')
      s.className = 'spark'
      const size = Math.round(random(1, 3))
      s.style.width = `${size}px`
      s.style.height = `${size}px`
      s.style.left = `${Math.random() * 100}%`
      s.style.top = `${Math.random() * 100}%`
      s.style.opacity = String(random(0.3, 1))
      s.style.animationDelay = `${random(0, 8)}s`
  if (starLayer) starLayer.appendChild(s)
    }

  // star count depends on intensity and mobile
  const isMobile = window.innerWidth < 720
  const storedIntensity = ((): any => { try{ return (localStorage.getItem('cosmos:intensity') as any) || 'med' }catch{return 'med'} })()
  const intensityFactor = (storedIntensity === 'low' || isMobile) ? 0.45 : (storedIntensity === 'med' ? 0.75 : 1)
  const baseStars = 180
  const starCount = Math.round(baseStars * intensityFactor)
  for (let i = 0; i < starCount; i++) makeSpark(i)

  // falling stars (meteors) periodically
    let meteorTimer = 0
      const meteors: HTMLElement[] = []
  let suppressEffects = false
      function spawnMeteor() {
        if (suppressEffects) return
        const m = document.createElement('div')
        m.className = 'meteor'
        // start from above or side outside viewport
        const startEdge = Math.random()
        if (startEdge < 0.6) {
          // top -> fall diagonally down-right
          m.style.left = `${random(-10, 110)}%`
          m.style.top = `-8%`
          m.style.transform = `rotate(${random(10, 40)}deg)`
        } else if (startEdge < 0.85) {
          // left -> move to bottom-right
          m.style.left = `-6%`
          m.style.top = `${random(-10, 50)}%`
          m.style.transform = `rotate(${random(10, 30)}deg)`
        } else {
          // right -> move to bottom-left
          m.style.left = `110%`
          m.style.top = `${random(-10, 50)}%`
          m.style.transform = `rotate(${random(-40, -10)}deg)`
        }
        el!.appendChild(m)
        meteors.push(m)
        // remove after animation (a bit longer for visibility)
        setTimeout(() => { m.remove(); meteors.splice(meteors.indexOf(m), 1) }, 9000)
    }
    if (enabledFlag) {
      // meteor frequency depends on intensity
      const baseInterval = isMobile ? 6000 : 2200
      const intervalAdj = storedIntensity === 'low' ? 1.8 : storedIntensity === 'med' ? 1.0 : 0.6
      meteorTimer = window.setInterval(() => {
        const r = Math.random()
        let count = 0
        if (r > 0.9) count = storedIntensity === 'high' ? 4 : 2
        else if (r > 0.7) count = 1
        for (let i=0;i<count;i++) spawnMeteor()
      }, baseInterval * intervalAdj + Math.random() * 3600)
  }

  // Suppress effects when hovering over UI
  const headerEl = document.querySelector('.header') as HTMLElement | null
  const containerEl = document.querySelector('.container') as HTMLElement | null
  function setSuppressed(v: boolean){ suppressEffects = v }
    let headerEnter: (()=>void) | null = null
    let headerLeave: (()=>void) | null = null
    let containerEnter: (()=>void) | null = null
    let containerLeave: (()=>void) | null = null
    let touchStartHandler: (()=>void) | null = null
    let touchEndHandler: (()=>void) | null = null
    if (headerEl){
      headerEnter = ()=>setSuppressed(true)
      headerLeave = ()=>setSuppressed(false)
      headerEl.addEventListener('pointerenter', headerEnter)
      headerEl.addEventListener('pointerleave', headerLeave)
    }
    if (containerEl){
      containerEnter = ()=>setSuppressed(true)
      containerLeave = ()=>setSuppressed(false)
      containerEl.addEventListener('pointerenter', containerEnter)
      containerEl.addEventListener('pointerleave', containerLeave)
    }
    // mobile: touchstart -> suppress, touchend -> resume
    touchStartHandler = ()=>setSuppressed(true)
    touchEndHandler = ()=>setSuppressed(false)
    window.addEventListener('touchstart', touchStartHandler, { passive:true })
    window.addEventListener('touchend', touchEndHandler, { passive:true })

    // realistic-ish planets: spawn with unique random colors and sizes
    // real diameters (km) for normalization
    const real = {
      moon: 3474,
      mars: 6779,
      earth: 12742,
      saturn: 116460,
      jupiter: 139820
    }
    const planets: HTMLElement[] = []
    const usedHues: number[] = []
    function hueClose(h1: number, h2: number){
      const d = Math.abs(h1 - h2)
      return Math.min(d, 360 - d) < 18
    }
    function pickUniqueHue(){
      for(let i=0;i<30;i++){
        const h = Math.floor(random(0,360))
        if (!usedHues.some(u=>hueClose(u,h))){ usedHues.push(h); return h }
      }
      // fallback
      const h = Math.floor(random(0,360)); usedHues.push(h); return h
    }

    function planetGradient(h: number){
      const sat = Math.round(random(55,82))
      const light = Math.round(random(38,68))
      const h2 = (h + Math.round(random(10,50))) % 360
      return `radial-gradient(circle at 30% 30%, hsl(${h}, ${sat}%, ${Math.min(92, light+14)}%), hsl(${h2}, ${Math.max(48, sat-10)}%, ${Math.max(28, light-22)}%))`
    }

    // normalize diameters to [32..140] px
    const diameters = Object.values(real)
    const minD = Math.min(...diameters)
    const maxD = Math.max(...diameters)
    function normalize(d: number){
      const minPx = 32
      const maxPx = 140
      return Math.round(((d - minD) / (maxD - minD)) * (maxPx - minPx) + minPx)
    }

  function isInUI(xPerc: number, yPerc: number){
      try{
        const header = document.querySelector('.header') as HTMLElement | null
        const container = document.querySelector('.container') as HTMLElement | null
        const pad = 120 // px
        if (!header || !container) return false
        const hr = header.getBoundingClientRect()
        const cr = container.getBoundingClientRect()
        const w = window.innerWidth
        const h = window.innerHeight
        const x = (xPerc/100) * w
        const y = (yPerc/100) * h
        function inside(rect: DOMRect){ return x > rect.left - pad && x < rect.right + pad && y > rect.top - pad && y < rect.bottom + pad }
        return inside(hr) || inside(cr)
      }catch{ return false }
    }

    function isCoordInUI(x: number, y: number){
      try{
        const header = document.querySelector('.header') as HTMLElement | null
        const container = document.querySelector('.container') as HTMLElement | null
        const pad = 120
        if (!header || !container) return false
        const hr = header.getBoundingClientRect()
        const cr = container.getBoundingClientRect()
        function inside(rect: DOMRect){ return x > rect.left - pad && x < rect.right + pad && y > rect.top - pad && y < rect.bottom + pad }
        return inside(hr) || inside(cr)
      }catch{ return false }
    }

    function spawnPlanet(){
      // choose a real body and use its diameter, but randomize slightly
      const keys = Object.keys(real)
      let attempts = 0
      while(attempts < 30){
        attempts++
        const key = keys[Math.floor(random(0, keys.length))]
        const dia = real[key as keyof typeof real]
        const size = normalize(dia)
        const left = random(4, 92)
        const top = random(6, 82)
        // avoid UI
        if (isInUI(left, top)) continue
        const p = document.createElement('div')
        p.className = `planet planet--${key}`
        p.style.width = `${size}px`
        p.style.height = `${size}px`
        p.style.left = `${left}%`
        p.style.top = `${top}%`
        const hue = pickUniqueHue()
        p.style.background = planetGradient(hue)
        p.style.opacity = String(random(0.8, 1))
        p.style.border = '1px solid rgba(255,255,255,0.03)'
        if (size > 80 && Math.random() > 0.6) p.classList.add('ring')
        el!.appendChild(p)
        planets.push(p)
        break
      }
    }
    // spawn non-duplicating planets (less on mobile / low intensity)
    const planetCount = isMobile ? 1 : (storedIntensity === 'low' ? 2 : 3)
  // respect user toggle
  const enabled2 = (() => { try{ return localStorage.getItem('cosmos:enabled') !== '0' }catch{ return true } })()
  if (enabled2) for(let i=0;i<planetCount;i++) spawnPlanet()

    // black smoke trail container
    const smokeRoot = document.createElement('div')
    smokeRoot.className = 'black-smoke'
    el!.appendChild(smokeRoot)

    // spawn puff at x/y relative to viewport
    let lastPuff = 0
    function spawnPuff(x: number, y: number) {
      const now = Date.now()
      // throttle puffs for performance
      const puffThrottle = isMobile ? 220 : (storedIntensity === 'low' ? 140 : 80)
      if (now - lastPuff < puffThrottle) return
      lastPuff = now
      // don't spawn puffs over UI
      if (isCoordInUI(x,y)) return
      const puff = document.createElement('div')
      puff.className = 'puff'
      puff.style.left = `${x}px`
      puff.style.top = `${y}px`
      smokeRoot.appendChild(puff)
      setTimeout(() => puff.remove(), isMobile ? 2600 : 3800)
    }

    function onPointerMove(e: PointerEvent) {
      // only desktop pointer moves
      if (e.pointerType === 'mouse') spawnPuff(e.clientX, e.clientY)
    }

    function onTouchMove(e: TouchEvent) {
      // mobile: create fewer, larger puffs
      const t = e.touches[0]
      if (t) spawnPuff(t.clientX, t.clientY)
    }

  if (enabledFlag) {
      window.addEventListener('pointermove', onPointerMove, { passive: true })
      window.addEventListener('touchmove', onTouchMove, { passive: true })
    }

    // --- Tab hover particles ---
    const navAnchors = Array.from(document.querySelectorAll('.nav a')) as HTMLElement[]
    const sparkRoot = document.createElement('div')
    sparkRoot.className = 'tab-spark-container'
    // attach to header container so it sits above content
    const headerRoot = document.querySelector('.header') || document.body
    headerRoot.appendChild(sparkRoot)

    // intensity levels influence particle count
    let intensity: 'low'|'med'|'high' = ((): any => { try{ return (localStorage.getItem('cosmos:intensity') as any) || 'med' }catch{return 'med'} })()
    function onIntensity(e: Event){ try{ const d = (e as CustomEvent).detail; if (d==='low' || d==='med' || d==='high') intensity = d }catch{} }
    window.addEventListener('cosmos:intensity', onIntensity as EventListener)

    const spawnSpark = (x:number, y:number) => {
      const s = document.createElement('div')
      s.className = 'tab-spark'
      s.style.left = `${x}px`
      s.style.top = `${y}px`
      sparkRoot.appendChild(s)
      setTimeout(()=> s.remove(), 1200)
    }

    function attachAnchor(a: HTMLElement){
      let moveHandler: ((ev: PointerEvent)=>void) | null = null
      let enterHandler = (ev: PointerEvent) => {
        // spawn a few sparks based on intensity
        const rect = a.getBoundingClientRect()
        const count = intensity === 'low' ? 3 : intensity === 'med' ? 6 : 10
        for(let i=0;i<count;i++){
          const x = rect.left + Math.random() * rect.width
          const y = rect.top + Math.random() * rect.height
          spawnSpark(x, y)
        }
        moveHandler = (e)=>{
          // occasional follow sparks
          if (Math.random() > 0.7) spawnSpark(e.clientX, e.clientY)
        }
        a.addEventListener('pointermove', moveHandler as EventListener)
      }
      let leaveHandler = ()=>{
        // nothing special
        if (moveHandler) a.removeEventListener('pointermove', moveHandler as EventListener)
        moveHandler = null
      }
      a.addEventListener('pointerenter', enterHandler)
      a.addEventListener('pointerleave', leaveHandler)
      // store references for cleanup
      return { a, enterHandler, leaveHandler, moveHandler }
    }

    const anchorHandlers = navAnchors.map(attachAnchor)

    // --- Magical green eye ---
  let eyeTimer = 0
  let eyeEl: HTMLElement | null = null
  let eyeFollow: ((ev: PointerEvent)=>void) | null = null
    function spawnEye(){
      if (suppressEffects) return
      if (eyeEl) return
      const isMobileLocal = window.innerWidth < 720
      const storedIntensityLocal = ((): any => { try{ return (localStorage.getItem('cosmos:intensity') as any) || 'med' }catch{return 'med'} })()
      // spawn chance based on intensity
      const chance = storedIntensityLocal === 'high' ? 0.9 : storedIntensityLocal === 'med' ? 0.55 : 0.28
      if (Math.random() > chance) return
      // random position not overlapping UI
      let attempts = 0
      let x = 0, y = 0
      while(attempts++ < 40){
        x = Math.random() * (window.innerWidth - 160) + 80
        y = Math.random() * (window.innerHeight - 160) + 80
        if (!isCoordInUI(x, y)) break
      }
      const g = document.createElement('div')
      g.className = 'green-eye'
      g.style.left = `${x}px`
      g.style.top = `${y}px`
      const core = document.createElement('div')
      core.className = 'eye-core'
      const iris = document.createElement('div')
      iris.className = 'iris'
      const pupil = document.createElement('div')
      pupil.className = 'pupil'
      const sparkle = document.createElement('div')
      sparkle.className = 'sparkle'
      core.appendChild(iris)
      core.appendChild(pupil)
      core.appendChild(sparkle)
      g.appendChild(core)
      // blink occasionally
      let blinkInterval = window.setInterval(()=>{
        core.classList.add('blink')
        setTimeout(()=> core.classList.remove('blink'), 300)
      }, 4200 + Math.random()*3600)
      
      // pupil follows cursor within ellipse bounds
  const pupilEl = pupil
  // make pupil movement smooth
  try{ pupilEl.style.transition = 'transform 0.08s cubic-bezier(.2,.9,.3,1)'; }catch{}
      const follow = (ev: PointerEvent) => {
        try{
          const rect = g.getBoundingClientRect()
          // center of eye
          const cx = rect.left + rect.width/2
          const cy = rect.top + rect.height/2
          const dx = ev.clientX - cx
          const dy = ev.clientY - cy
          // normalized within -1..1 by ellipse radii
          const rx = rect.width/2 - 18
          const ry = rect.height/2 - 10
          const nx = Math.max(-1, Math.min(1, dx / rx))
          const ny = Math.max(-1, Math.min(1, dy / ry))
          // move pupil more expressively: increased to be more aggressive
          const px = nx * 40
          const py = ny * 28
          pupilEl.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`
        }catch{}
      }
  window.addEventListener('pointermove', follow)
  eyeFollow = follow
      
      // eye container follows cursor slightly (small parallax/inclination)
      let eyeTx = 0, eyeTy = 0, eyeVx = 0, eyeVy = 0, eyeRaf = 0
      function eyeLoop(){
        eyeVx += (eyeTx - eyeVx) * 0.16
        eyeVy += (eyeTy - eyeVy) * 0.16
        g.style.transform = `translate(calc(-50% + ${eyeVx}px), calc(-50% + ${eyeVy}px)) rotate(${eyeVx * 0.018}deg)`
        eyeRaf = 0
      }
    const eyeFollowHandler = (ev: PointerEvent) => {
        try{
          const rect = g.getBoundingClientRect()
          const cx = rect.left + rect.width/2
          const cy = rect.top + rect.height/2
          const dx = (ev.clientX - cx) / Math.max(1, window.innerWidth)
          const dy = (ev.clientY - cy) / Math.max(1, window.innerHeight)
          // small movement scaled by viewport
      // increase movement multipliers for aggressive follow
      eyeTx = dx * 160
      eyeTy = dy * 80
      if (!eyeRaf) eyeRaf = requestAnimationFrame(eyeLoop)
        }catch{}
      }
      window.addEventListener('pointermove', eyeFollowHandler)
      
  // squint reaction when cursor near eye edge
      const squintCheck = (ev: PointerEvent) => {
        try{
          const rect = g.getBoundingClientRect()
          const mx = ev.clientX - (rect.left + rect.width/2)
          const my = ev.clientY - (rect.top + rect.height/2)
          const nx = Math.abs(mx) / (rect.width/2)
          const ny = Math.abs(my) / (rect.height/2)
          if (Math.max(nx, ny) > 0.78) g.classList.add('squint')
          else g.classList.remove('squint')
        }catch{}
      }
  window.addEventListener('pointermove', squintCheck)
      

      // spawn flash and smoke at creation
      const flash = document.createElement('div')
      flash.className = 'eye-flash'
      flash.style.left = `${x}px`
      flash.style.top = `${y}px`
      document.body.appendChild(flash)
      setTimeout(()=>{ try{ flash.style.animation = 'eye-flash-in 480ms ease-out forwards' }catch{} }, 6)
      setTimeout(()=>{ try{ flash.remove() }catch{} }, 620)
      const smoke = document.createElement('div')
      smoke.className = 'eye-smoke'
      smoke.style.left = `${x}px`
      smoke.style.top = `${y}px`
      document.body.appendChild(smoke)
      setTimeout(()=>{ try{ smoke.style.animation = 'eye-smoke-rise 1500ms ease-out forwards' }catch{} }, 30)
      setTimeout(()=>{ try{ smoke.remove() }catch{} }, 1700)
      
      // remove on hover
      const onEnter = ()=>{
        g.classList.add('hidden')
        try{ if (eyeFollow) { window.removeEventListener('pointermove', eyeFollow); eyeFollow = null } }catch{}
        try{ window.removeEventListener('pointermove', squintCheck) }catch{}
  try{ window.removeEventListener('pointermove', eyeFollowHandler) }catch{}
  try{ if (eyeRaf) cancelAnimationFrame(eyeRaf) }catch{}
  setTimeout(()=> g.remove(), 260)
      }
  g.addEventListener('pointerenter', onEnter)
      document.body.appendChild(g)
      eyeEl = g
      // lifetime depends on intensity
      const life = storedIntensityLocal === 'high' ? 12000 : storedIntensityLocal === 'med' ? 9000 : 6000
      setTimeout(()=>{
        try{ g.classList.add('hidden') }catch{}
        setTimeout(()=>{ try{ g.remove(); if (blinkInterval) clearInterval(blinkInterval); if (eyeFollow) { window.removeEventListener('pointermove', eyeFollow); eyeFollow = null } try{ window.removeEventListener('pointermove', squintCheck) }catch{} try{ window.removeEventListener('pointermove', eyeFollowHandler) }catch{} try{ if (eyeRaf) cancelAnimationFrame(eyeRaf) }catch{} }catch{} }, 400)
        eyeEl = null
      }, life)
    }
    // periodic attempt to spawn eye
    eyeTimer = window.setInterval(()=> spawnEye(), 3500 + Math.random()*4200)


    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('scroll', onScroll)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('touchmove', onTouchMove)
  if (headerEl && headerEnter && headerLeave){ headerEl.removeEventListener('pointerenter', headerEnter); headerEl.removeEventListener('pointerleave', headerLeave) }
  if (containerEl && containerEnter && containerLeave){ containerEl.removeEventListener('pointerenter', containerEnter); containerEl.removeEventListener('pointerleave', containerLeave) }
  if (touchStartHandler) window.removeEventListener('touchstart', touchStartHandler)
  if (touchEndHandler) window.removeEventListener('touchend', touchEndHandler)
      if (raf) cancelAnimationFrame(raf)
  clearInterval(meteorTimer)
  if (starLayer) starLayer.remove()
  meteors.forEach(m=>m.remove())
  planets.forEach(p=>p.remove())
  smokeRoot.remove()
  // cleanup tab sparks
  try{ window.removeEventListener('cosmos:intensity', onIntensity as EventListener) }catch{}
  try{ anchorHandlers.forEach(h=>{ if (h && h.a){ h.a.removeEventListener('pointerenter', h.enterHandler); h.a.removeEventListener('pointerleave', h.leaveHandler); if (h.moveHandler) h.a.removeEventListener('pointermove', h.moveHandler as EventListener) } }) }catch{}
  try{ sparkRoot.remove() }catch{}
  // cleanup eye
  try{ clearInterval(eyeTimer) }catch{}
  try{ if (eyeEl) { if (eyeFollow) { window.removeEventListener('pointermove', eyeFollow); eyeFollow = null } eyeEl.remove() } }catch{}
    }
  }, [])

  return (
    <div className="app">
      <div className="cosmos" ref={cosmosRef} aria-hidden="true">
        <div className="stars"></div>
        <div className="stars two"></div>
        <div className="stars three"></div>
        <div className="nebula"></div>
        <div className="milkyway"></div>
        <div className="blackhole" aria-hidden="true"></div>
        <div className="comet comet--one"></div>
        <div className="comet comet--two"></div>
        <div className="noise"></div>
      </div>
      <Header />
      <main className="container">{children}</main>
      <Footer />
    </div>
  )
}
