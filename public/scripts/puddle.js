const CONFIG = {
  DEFAULT_UPDATE_INTERVAL: 42,
  MIN_NODE_SIZE: 10,
  MAX_NODE_SIZE: 18,
  MAX_RIPPLE_STRENGTH: 96.0,
  FORCE_DAMPENING_RATIO: 0.88,
  FORCE_CUTOFF: 1.35,
  DIAGONAL_WEIGHT: 0.55,
  ASCII_SHADES: [...' .,:-=+*#%@'],
  MOUSE_DELAY: 220,
  AMBIENT_INTERVAL: 2400,
  AMBIENT_STRENGTH: 16,
  IDLE_DELAY: 1400,
  SPLASH_INTERVAL_MIN: 2400,
  SPLASH_INTERVAL_MAX: 5200,
  SPLASH_STRENGTH_MIN: 18,
  SPLASH_STRENGTH_MAX: 34,
  SPLASH_RADIUS: 1,
  RAIN_STORAGE_KEY: 'puddle-rain-enabled',
  RAIN_DROPS_PER_SECOND_MIN: 12,
  RAIN_DROPS_PER_SECOND_MAX: 58,
  RAIN_AREA_FACTOR: 180,
  RAIN_RIPPLE_STRENGTH_MIN: 6,
  RAIN_RIPPLE_STRENGTH_MAX: 16,
  RAIN_SPLASH_CHANCE: 0.11,
  RAIN_BIG_DROP_CHANCE: 0.08,
  RAIN_BIG_DROP_STRENGTH_MIN: 18,
  RAIN_BIG_DROP_STRENGTH_MAX: 30,
  RAIN_BIG_DROP_RADIUS: 1,
  LIGHTNING_INTERVAL_MIN: 7000,
  LIGHTNING_INTERVAL_MAX: 17000,
  LIGHTNING_FLASH_MIN: 0.12,
  LIGHTNING_FLASH_MAX: 0.28,
  LIGHTNING_SURGE_STRENGTH: 22
}

function randomInRange(min, max) {
  return min + Math.random() * (max - min)
}

function forceToShade(forceMagnitude) {
  const clampedForce = Math.max(0, Math.min(100, Math.abs(forceMagnitude)))
  const normalized = clampedForce / 100
  const eased = Math.pow(normalized, 0.82)
  const index = Math.min(CONFIG.ASCII_SHADES.length - 1, Math.round(eased * (CONFIG.ASCII_SHADES.length - 1)))
  return CONFIG.ASCII_SHADES[index]
}

const RAIN_STYLE_ID = 'puddle-rain-style'

function ensureRainStyles() {
  if (document.getElementById(RAIN_STYLE_ID)) return

  const style = document.createElement('style')
  style.id = RAIN_STYLE_ID
  style.textContent = `
    .puddle-rain-layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: 0;
      transition: opacity 320ms ease;
      color: var(--text-tertiary);
      overflow: hidden;
      will-change: opacity;
      z-index: 2;
    }

    .puddle-rain-layer::before,
    .puddle-rain-layer::after {
      content: '';
      position: absolute;
      inset: -35% -16%;
      opacity: 0;
      background-repeat: repeat;
      will-change: transform, opacity;
    }

    .puddle-rain-layer::before {
      background-image:
        repeating-linear-gradient(103deg, transparent 0 20px, currentColor 20px 20.8px, transparent 21px 46px),
        repeating-linear-gradient(101deg, transparent 0 30px, currentColor 30px 30.7px, transparent 31px 58px);
      background-size: 220px 240px, 260px 260px;
      animation: puddle-rain-fall-soft 2.1s linear infinite;
      filter: blur(0.2px);
    }

    .puddle-rain-layer::after {
      background-image: repeating-linear-gradient(102deg, transparent 0 28px, currentColor 28px 28.7px, transparent 29px 64px);
      background-size: 290px 300px;
      animation: puddle-rain-fall-soft 2.8s linear infinite reverse;
      filter: blur(0.25px);
    }

    .puddle-rain-layer.is-active {
      opacity: 0.18;
    }

    .puddle-rain-layer.is-active::before {
      opacity: 0.28;
    }

    .puddle-rain-layer.is-active::after {
      opacity: 0.16;
    }

    html.dark .puddle-rain-layer.is-active {
      opacity: 0.16;
    }

    html.dark .puddle-rain-layer.is-active::before {
      opacity: 0.24;
    }

    html.dark .puddle-rain-layer.is-active::after {
      opacity: 0.14;
    }

    @keyframes puddle-rain-fall-soft {
      from {
        transform: translate3d(0, -14%, 0);
      }
      to {
        transform: translate3d(-3%, 14%, 0);
      }
    }

    .puddle-lightning-layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: 0;
      z-index: 1;
      mix-blend-mode: screen;
      --flash-x: 50%;
      --flash-y: 18%;
      --flash-alpha: 0.18;
      background:
        radial-gradient(58% 42% at var(--flash-x) var(--flash-y), rgba(255, 255, 255, var(--flash-alpha)), rgba(255, 255, 255, 0) 72%),
        linear-gradient(180deg, rgba(255, 255, 255, calc(var(--flash-alpha) * 0.55)), rgba(255, 255, 255, 0) 60%);
    }

    .puddle-lightning-layer.is-flashing {
      animation: puddle-lightning-flash 640ms ease-out;
    }

    @keyframes puddle-lightning-flash {
      0% {
        opacity: 0;
      }
      12% {
        opacity: 0.95;
      }
      26% {
        opacity: 0.28;
      }
      36% {
        opacity: 0.74;
      }
      58% {
        opacity: 0.14;
      }
      100% {
        opacity: 0;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .puddle-rain-layer::before,
      .puddle-rain-layer::after,
      .puddle-lightning-layer.is-flashing {
        animation: none;
      }
    }
  `

  document.head.appendChild(style)
}

class AsciiNode {
  constructor(xx, yy, data) {
    this.xx = xx
    this.yy = yy
    this.data = data
    this.currentForce = 0
    this.nextForce = 0
    this.isAddedToUpdate = false
    this.lastMoveForceAt = 0
    this.element = this.#createNodeElement()
  }

  #createNodeElement() {
    const element = document.createElement('span')
    this.#drawNode(0, element)
    return element
  }

  startRipple(rippleStrength = this.data.maxRippleStrength) {
    this.currentForce = rippleStrength
    this.#drawNode(rippleStrength, this.element)
    this.#updateNeighbors()
  }

  triggerMoveRipple(rippleStrength = this.data.maxRippleStrength) {
    const now = performance.now()
    if (now - this.lastMoveForceAt < CONFIG.MOUSE_DELAY) return
    this.lastMoveForceAt = now
    this.startRipple(rippleStrength)
  }

  #updateNeighbors() {
    this.data.addToUpdateQueue(this.xx - 1, this.yy - 1)
    this.data.addToUpdateQueue(this.xx, this.yy - 1)
    this.data.addToUpdateQueue(this.xx + 1, this.yy - 1)
    this.data.addToUpdateQueue(this.xx - 1, this.yy)
    this.data.addToUpdateQueue(this.xx + 1, this.yy)
    this.data.addToUpdateQueue(this.xx - 1, this.yy + 1)
    this.data.addToUpdateQueue(this.xx, this.yy + 1)
    this.data.addToUpdateQueue(this.xx + 1, this.yy + 1)
  }

  updateNode() {
    const { forceDampeningRatio, diagonalWeight } = this.data
    const { cardinalSum, diagonalSum } = this.#getNeighborForces()
    const weightedAverage = (cardinalSum + diagonalSum * diagonalWeight) / (4 + 4 * diagonalWeight)

    this.nextForce = (weightedAverage * 2 - this.nextForce) * forceDampeningRatio
    this.data.addToDrawQueue(this.xx, this.yy)
  }

  #getNeighborForces() {
    const north = this.#getNodeForce(this.xx, this.yy - 1)
    const south = this.#getNodeForce(this.xx, this.yy + 1)
    const east = this.#getNodeForce(this.xx + 1, this.yy)
    const west = this.#getNodeForce(this.xx - 1, this.yy)

    const northEast = this.#getNodeForce(this.xx + 1, this.yy - 1)
    const northWest = this.#getNodeForce(this.xx - 1, this.yy - 1)
    const southEast = this.#getNodeForce(this.xx + 1, this.yy + 1)
    const southWest = this.#getNodeForce(this.xx - 1, this.yy + 1)

    return {
      cardinalSum: north + south + east + west,
      diagonalSum: northEast + northWest + southEast + southWest
    }
  }

  #getNodeForce(xx, yy) {
    const node = this.data.getNode(xx, yy)
    return node?.currentForce || 0
  }

  #drawNode(forceMagnitude, element) {
    element.textContent = forceToShade(forceMagnitude)
  }

  computeForceAndDrawNode() {
    if (Math.abs(this.nextForce) < this.data.forceCutOff) {
      this.nextForce = 0
    }

    this.#drawNode(this.nextForce, this.element)
    ;[this.currentForce, this.nextForce] = [this.nextForce, this.currentForce]
    this.#updateNeighbors()
  }
}

class PuddleData {
  constructor(numRows, numCols) {
    this.nodeList = new Array(numRows * numCols)
    this.updateQueue = new Set()
    this.drawQueue = new Set()
    this.numRows = numRows
    this.numCols = numCols
    this.maxRippleStrength = CONFIG.MAX_RIPPLE_STRENGTH
    this.forceDampeningRatio = CONFIG.FORCE_DAMPENING_RATIO
    this.forceCutOff = CONFIG.FORCE_CUTOFF
    this.diagonalWeight = CONFIG.DIAGONAL_WEIGHT
  }

  refresh(numRows, numCols) {
    this.nodeList = new Array(numRows * numCols)
    this.updateQueue.clear()
    this.drawQueue.clear()
    this.numRows = numRows
    this.numCols = numCols
  }

  isValidCoordinate(xx, yy) {
    return xx >= 0 && xx < this.numCols && yy >= 0 && yy < this.numRows
  }

  getIndex(xx, yy) {
    return yy * this.numCols + xx
  }

  appendNode(node, index) {
    this.nodeList[index] = node
  }

  getNode(xx, yy) {
    return this.isValidCoordinate(xx, yy) ? this.nodeList[this.getIndex(xx, yy)] : null
  }

  addToUpdateQueue(xx, yy) {
    if (!this.isValidCoordinate(xx, yy)) return

    const index = this.getIndex(xx, yy)
    const node = this.nodeList[index]

    if (!node.isAddedToUpdate) {
      this.updateQueue.add(index)
      node.isAddedToUpdate = true
    }
  }

  addToDrawQueue(xx, yy) {
    this.drawQueue.add(this.getIndex(xx, yy))
  }

  drawElements() {
    for (const index of this.drawQueue) {
      this.nodeList[index].computeForceAndDrawNode()
    }
    this.drawQueue.clear()
  }

  updateElements() {
    if (this.updateQueue.size === 0 && this.drawQueue.size === 0) {
      return false
    }

    for (const index of this.updateQueue) {
      this.nodeList[index].isAddedToUpdate = false
      this.nodeList[index].updateNode()
    }
    this.updateQueue.clear()

    this.drawElements()
    return true
  }
}

class Puddle {
  constructor(queryElement, updateInterval = CONFIG.DEFAULT_UPDATE_INTERVAL) {
    this.parentNode = typeof queryElement === 'string' ? document.querySelector(queryElement) : queryElement
    if (!this.parentNode) {
      throw new Error(`Element ${queryElement} not found`)
    }

    this.updateInterval = updateInterval
    this.nodeSize = CONFIG.MIN_NODE_SIZE
    const now = performance.now()
    this.lastInteractionAt = now
    this.lastAmbientAt = now
    this.nextSplashAt = now + randomInRange(CONFIG.SPLASH_INTERVAL_MIN, CONFIG.SPLASH_INTERVAL_MAX)
    this.rainDropAccumulator = 0
    this.rainEnabled = false
    this.rainLayer = null
    this.lightningLayer = null
    this.nextLightningAt = Infinity

    this.resizeHandler = this.#resizeHandler.bind(this)
    window.addEventListener('resize', this.resizeHandler)

    this.#initialize()
  }

  handlePointer(clientX, clientY, options = {}) {
    const { rippleStrength = this.data?.maxRippleStrength, respectDelay = false } = options
    if (!this.parentNode || !this.data) return
    const rect = this.parentNode.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top

    if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return
    const xx = Math.floor(x / this.nodeSize)
    const yy = Math.floor(y / this.nodeSize)
    const node = this.data.getNode(xx, yy)
    if (!node) return

    this.lastInteractionAt = performance.now()

    if (respectDelay) {
      node.triggerMoveRipple(rippleStrength)
    } else {
      node.startRipple(rippleStrength)
    }
  }

  #initialize() {
    this.#setupDimensions()
    this.data = new PuddleData(this.numRows, this.numCols)
    this.setupGrid()
  }

  #setupDimensions() {
    const { clientWidth, clientHeight } = this.parentNode
    const lesserDimension = Math.min(clientHeight, clientWidth)
    const adaptiveNodeSize = lesserDimension * 0.022
    this.nodeSize = Math.max(CONFIG.MIN_NODE_SIZE, Math.min(CONFIG.MAX_NODE_SIZE, adaptiveNodeSize))

    this.numRows = Math.max(1, Math.floor(clientHeight / this.nodeSize))
    this.numCols = Math.max(1, Math.floor(clientWidth / this.nodeSize))
  }

  #resizeHandler() {
    this.#setupDimensions()
    this.setupGrid()
  }

  setupGrid() {
    this.stop()
    this.data.refresh(this.numRows, this.numCols)
    this.rainDropAccumulator = 0

    const fragment = document.createDocumentFragment()
    this.parentNode.innerHTML = ''

    this.parentNode.style.gridTemplateColumns = `repeat(${this.numCols}, ${this.nodeSize}px)`
    this.parentNode.style.gridTemplateRows = `repeat(${this.numRows}, ${this.nodeSize}px)`

    const totalNodes = this.numRows * this.numCols
    for (let i = 0; i < totalNodes; i++) {
      const yy = Math.floor(i / this.numCols)
      const xx = i % this.numCols

      const node = new AsciiNode(xx, yy, this.data)
      this.data.appendNode(node, i)
      fragment.appendChild(node.element)
    }

    this.parentNode.appendChild(fragment)
    this.ensureRainLayer()
    this.ensureLightningLayer()
    this.setRainEnabled(this.rainEnabled)
    const now = performance.now()
    this.lastAmbientAt = now
    this.nextSplashAt = now + randomInRange(CONFIG.SPLASH_INTERVAL_MIN, CONFIG.SPLASH_INTERVAL_MAX)
    this.start()
  }

  ensureRainLayer() {
    if (this.rainLayer?.isConnected) return

    const rainLayer = document.createElement('div')
    rainLayer.className = 'puddle-rain-layer'
    this.parentNode.appendChild(rainLayer)
    this.rainLayer = rainLayer
  }

  ensureLightningLayer() {
    if (this.lightningLayer?.isConnected) return

    const lightningLayer = document.createElement('div')
    lightningLayer.className = 'puddle-lightning-layer'
    this.parentNode.appendChild(lightningLayer)
    this.lightningLayer = lightningLayer
  }

  scheduleNextLightning(referenceTime) {
    this.nextLightningAt = referenceTime + randomInRange(CONFIG.LIGHTNING_INTERVAL_MIN, CONFIG.LIGHTNING_INTERVAL_MAX)
  }

  triggerLightningFlash(referenceTime) {
    if (!this.lightningLayer || !this.rainEnabled) return

    const flashX = `${Math.round(randomInRange(8, 92))}%`
    const flashY = `${Math.round(randomInRange(6, 36))}%`
    const flashAlpha = randomInRange(CONFIG.LIGHTNING_FLASH_MIN, CONFIG.LIGHTNING_FLASH_MAX)

    this.lightningLayer.style.setProperty('--flash-x', flashX)
    this.lightningLayer.style.setProperty('--flash-y', flashY)
    this.lightningLayer.style.setProperty('--flash-alpha', flashAlpha.toFixed(3))
    this.lightningLayer.classList.remove('is-flashing')
    void this.lightningLayer.offsetWidth
    this.lightningLayer.classList.add('is-flashing')

    const surgeDrops = Math.max(3, Math.min(12, Math.round((this.numCols * this.numRows) / 820)))
    for (let index = 0; index < surgeDrops; index++) {
      const xx = Math.floor(Math.random() * this.numCols)
      const yy = Math.floor(Math.random() * this.numRows)
      const strength = randomInRange(CONFIG.LIGHTNING_SURGE_STRENGTH * 0.7, CONFIG.LIGHTNING_SURGE_STRENGTH * 1.2)
      this.triggerSplashAt(xx, yy, strength, Math.random() < 0.35 ? 1 : 0)
    }

    this.scheduleNextLightning(referenceTime)
  }

  setRainEnabled(enabled) {
    this.rainEnabled = Boolean(enabled)

    if (this.rainLayer) {
      this.rainLayer.classList.toggle('is-active', this.rainEnabled)
    }

    if (this.lightningLayer) {
      this.lightningLayer.classList.remove('is-flashing')
    }

    if (this.rainEnabled) {
      const now = performance.now()
      this.scheduleNextLightning(now)
    } else {
      this.nextLightningAt = Infinity
    }

    if (!this.rainEnabled) {
      this.rainDropAccumulator = 0
    }

    return this.rainEnabled
  }

  triggerAmbientRipple(rippleStrength = CONFIG.AMBIENT_STRENGTH) {
    if (!this.data || this.numCols < 1 || this.numRows < 1) return

    const xx = Math.floor(Math.random() * this.numCols)
    const yy = Math.floor(Math.random() * this.numRows)
    const node = this.data.getNode(xx, yy)
    if (!node) return

    node.startRipple(rippleStrength)
  }

  triggerSplashAt(xx, yy, baseStrength, radius = CONFIG.SPLASH_RADIUS) {
    if (!this.data || !this.data.isValidCoordinate(xx, yy)) return

    for (let offsetY = -radius; offsetY <= radius; offsetY++) {
      for (let offsetX = -radius; offsetX <= radius; offsetX++) {
        const targetX = xx + offsetX
        const targetY = yy + offsetY
        const node = this.data.getNode(targetX, targetY)
        if (!node) continue

        const distance = Math.hypot(offsetX, offsetY)
        const falloff = Math.max(0.35, 1 - distance / (radius + 1))
        node.startRipple(baseStrength * falloff)
      }
    }
  }

  triggerRandomSplash() {
    if (!this.data || this.numCols < 3 || this.numRows < 3) return

    const xx = Math.floor(randomInRange(1, this.numCols - 1))
    const yy = Math.floor(randomInRange(1, this.numRows - 1))
    const strength = randomInRange(CONFIG.SPLASH_STRENGTH_MIN, CONFIG.SPLASH_STRENGTH_MAX)
    this.triggerSplashAt(xx, yy, strength, CONFIG.SPLASH_RADIUS)
  }

  scheduleNextSplash(referenceTime) {
    this.nextSplashAt = referenceTime + randomInRange(CONFIG.SPLASH_INTERVAL_MIN, CONFIG.SPLASH_INTERVAL_MAX)
  }

  emitRainRipples(deltaMs, referenceTime = performance.now()) {
    if (!this.rainEnabled || !this.data || this.numCols < 1 || this.numRows < 1) return

    const area = this.numCols * this.numRows
    const baseDropsPerSecond = Math.min(
      CONFIG.RAIN_DROPS_PER_SECOND_MAX,
      Math.max(CONFIG.RAIN_DROPS_PER_SECOND_MIN, area / CONFIG.RAIN_AREA_FACTOR)
    )
    const cadence = 0.88 + 0.18 * Math.sin(referenceTime * 0.00034)
    const dropsPerSecond = baseDropsPerSecond * cadence

    this.rainDropAccumulator += (deltaMs / 1000) * dropsPerSecond

    const maxDropsPerTick = 44
    let emittedDrops = 0

    while (this.rainDropAccumulator >= 1 && emittedDrops < maxDropsPerTick) {
      this.rainDropAccumulator -= 1
      emittedDrops += 1

      const xx = Math.floor(Math.random() * this.numCols)
      const yy = Math.floor(Math.random() * this.numRows)

      const variant = Math.random()
      if (variant < CONFIG.RAIN_BIG_DROP_CHANCE) {
        const strength = randomInRange(CONFIG.RAIN_BIG_DROP_STRENGTH_MIN, CONFIG.RAIN_BIG_DROP_STRENGTH_MAX)
        this.triggerSplashAt(xx, yy, strength, CONFIG.RAIN_BIG_DROP_RADIUS)
        continue
      }

      if (variant < CONFIG.RAIN_BIG_DROP_CHANCE + CONFIG.RAIN_SPLASH_CHANCE) {
        const strength = randomInRange(CONFIG.RAIN_RIPPLE_STRENGTH_MIN * 1.2, CONFIG.RAIN_RIPPLE_STRENGTH_MAX * 1.12)
        this.triggerSplashAt(xx, yy, strength, 1)
        continue
      }

      const node = this.data.getNode(xx, yy)
      if (node) {
        const strength = randomInRange(CONFIG.RAIN_RIPPLE_STRENGTH_MIN, CONFIG.RAIN_RIPPLE_STRENGTH_MAX)
        node.startRipple(strength)
      }
    }

    if (this.rainDropAccumulator > 6) {
      this.rainDropAccumulator = 6
    }
  }

  start() {
    if (this.isRunning) return
    this.isRunning = true
    let lastTime = 0

    const loop = (time) => {
      if (!this.isRunning) return

      const hasWaveActivity = this.data.updateQueue.size > 0 || this.data.drawQueue.size > 0
      const frameInterval = hasWaveActivity ? this.updateInterval : this.updateInterval * 2.5

      if (time - lastTime >= frameInterval) {
        const elapsed = lastTime === 0 ? frameInterval : time - lastTime
        this.emitRainRipples(elapsed, time)

        if (this.rainEnabled && time >= this.nextLightningAt) {
          this.triggerLightningFlash(time)
        }

        const didUpdate = this.data.updateElements()
        const isIdle = time - this.lastInteractionAt > CONFIG.IDLE_DELAY

        if (!didUpdate && isIdle && time - this.lastAmbientAt > CONFIG.AMBIENT_INTERVAL) {
          this.triggerAmbientRipple()
          this.lastAmbientAt = time
        }

        if (isIdle && time >= this.nextSplashAt) {
          this.triggerRandomSplash()
          this.scheduleNextSplash(time)
        }

        lastTime = time
      }

      this.rafId = requestAnimationFrame(loop)
    }

    this.rafId = requestAnimationFrame(loop)
  }

  stop() {
    this.isRunning = false
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  destroy() {
    this.stop()

    if (this.rainLayer?.isConnected) {
      this.rainLayer.remove()
      this.rainLayer = null
    }

    if (this.lightningLayer?.isConnected) {
      this.lightningLayer.remove()
      this.lightningLayer = null
    }

    window.removeEventListener('resize', this.resizeHandler)
  }
}

const runtimeKey = '__puddleRuntime'

if (!window[runtimeKey]) {
  const runtime = {
    puddles: [],
    lastMoveAt: 0,
    moveInterval: 16,
    reducedMotionQuery: window.matchMedia('(prefers-reduced-motion: reduce)'),
    rainEnabled: false
  }

  function readStoredRainPreference() {
    try {
      return localStorage.getItem(CONFIG.RAIN_STORAGE_KEY) === '1'
    } catch {
      return false
    }
  }

  function persistRainPreference(enabled) {
    try {
      localStorage.setItem(CONFIG.RAIN_STORAGE_KEY, enabled ? '1' : '0')
    } catch {
      // ignore storage errors
    }
  }

  function dispatchRainChange() {
    window.dispatchEvent(
      new CustomEvent('puddle:rain-change', {
        detail: { enabled: runtime.rainEnabled }
      })
    )
  }

  function applyRainToPuddles() {
    runtime.puddles.forEach((puddle) => {
      puddle.setRainEnabled(runtime.rainEnabled)
    })
  }

  function setRainEnabled(enabled) {
    runtime.rainEnabled = Boolean(enabled)
    persistRainPreference(runtime.rainEnabled)
    applyRainToPuddles()
    dispatchRainChange()
    return runtime.rainEnabled
  }

  function toggleRain() {
    return setRainEnabled(!runtime.rainEnabled)
  }

  function getRainEnabled() {
    return runtime.rainEnabled
  }

  function recreatePuddles() {
    runtime.puddles.forEach((puddle) => puddle.destroy())
    runtime.puddles = []

    if (runtime.reducedMotionQuery.matches) {
      dispatchRainChange()
      return
    }

    const containers = document.querySelectorAll('.puddle-container')
    containers.forEach((container) => {
      const puddle = new Puddle(container)
      puddle.setRainEnabled(runtime.rainEnabled)
      runtime.puddles.push(puddle)
    })

    dispatchRainChange()
  }

  function handleVisibility() {
    if (document.hidden) {
      runtime.puddles.forEach((puddle) => puddle.stop())
      return
    }

    runtime.puddles.forEach((puddle) => puddle.start())
  }

  function handlePointerMove(event) {
    if (event.pointerType === 'touch') return
    if (runtime.puddles.length === 0) return

    const now = performance.now()
    if (now - runtime.lastMoveAt < runtime.moveInterval) return
    runtime.lastMoveAt = now

    runtime.puddles.forEach((puddle) => {
      puddle.handlePointer(event.clientX, event.clientY, {
        rippleStrength: puddle.data.maxRippleStrength * 0.9,
        respectDelay: true
      })
    })
  }

  function handlePointerDown(event) {
    if (runtime.puddles.length === 0) return

    runtime.puddles.forEach((puddle) => {
      puddle.handlePointer(event.clientX, event.clientY, {
        rippleStrength: puddle.data.maxRippleStrength,
        respectDelay: false
      })
    })
  }

  function init() {
    try {
      runtime.rainEnabled = readStoredRainPreference()
      ensureRainStyles()
      recreatePuddles()
    } catch (error) {
      console.error('Failed to initialize puddle:', error)
    }
  }

  window[runtimeKey] = runtime
  window.PuddleRuntime = {
    toggleRain,
    setRainEnabled,
    getRainEnabled
  }

  init()

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  }

  document.addEventListener('astro:page-load', init)
  document.addEventListener('visibilitychange', handleVisibility)
  window.addEventListener('pointermove', handlePointerMove, { passive: true })
  window.addEventListener('pointerdown', handlePointerDown, { passive: true })

  if (typeof runtime.reducedMotionQuery.addEventListener === 'function') {
    runtime.reducedMotionQuery.addEventListener('change', init)
  } else {
    runtime.reducedMotionQuery.addListener(init)
  }
}

export default Puddle
