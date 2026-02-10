
const CONFIG = {
	DEFAULT_UPDATE_INTERVAL: 100,
	MIN_NODE_SIZE: 10,
	MAX_RIPPLE_STRENGTH: 100.0,
	FORCE_DAMPENING_RATIO: 0.85,
	FORCE_CUTOFF: 2,
	ASCII_SHADES: [..." .,:-=+*#%@"],
	MOUSE_DELAY: 500,
};

const ASCII_THRESHOLDS = CONFIG.ASCII_SHADES.map((_, index) => (index * 100.0) / (CONFIG.ASCII_SHADES.length - 1));

class AsciiNode {
	constructor(xx, yy, data) {
		this.xx = xx;
		this.yy = yy;
		this.data = data;
		this.currentForce = 0;
		this.nextForce = 0;
		this.isAddedToUpdate = false;
		this.isMoveForceDelayComplete = true;
		this.moveTimeout = null;
		this.element = this.#createNodeElement();
	}

	#createNodeElement() {
		const element = document.createElement("span");
		this.#drawNode(0, element);
		this.#applyListeners(element);
		return element;
	}

	#applyListeners(element) {
		element.addEventListener("click", () => this.startRipple());

		element.addEventListener("mousemove", () => {
			this.triggerMoveRipple();
		});
	}

	startRipple(rippleStrength = this.data.maxRippleStrength) {
		this.currentForce = rippleStrength;
		this.#drawNode(rippleStrength, this.element);
		this.#updateNeighbors();
	}

	triggerMoveRipple(rippleStrength = this.data.maxRippleStrength) {
		if (!this.isMoveForceDelayComplete) return;
		this.isMoveForceDelayComplete = false;
		this.startRipple(rippleStrength);
		clearTimeout(this.moveTimeout);
		this.moveTimeout = setTimeout(() => {
			this.isMoveForceDelayComplete = true;
		}, CONFIG.MOUSE_DELAY);
	}

	#updateNeighbors() {
		this.data.addToUpdateQueue(this.xx - 1, this.yy - 1);
		this.data.addToUpdateQueue(this.xx, this.yy - 1);
		this.data.addToUpdateQueue(this.xx + 1, this.yy - 1);
		this.data.addToUpdateQueue(this.xx - 1, this.yy);
		this.data.addToUpdateQueue(this.xx + 1, this.yy);
		this.data.addToUpdateQueue(this.xx - 1, this.yy + 1);
		this.data.addToUpdateQueue(this.xx, this.yy + 1);
		this.data.addToUpdateQueue(this.xx + 1, this.yy + 1);
	}

	updateNode() {
		const { forceDampeningRatio } = this.data;
		const neighborSum = this.#getNeighborForces();

		this.nextForce = (neighborSum / 2 - this.nextForce) * forceDampeningRatio;
		this.data.addToDrawQueue(this.xx, this.yy);
	}

	#getNeighborForces() {
		return this.#getNodeForce(this.xx, this.yy - 1) + this.#getNodeForce(this.xx, this.yy + 1) + this.#getNodeForce(this.xx + 1, this.yy) + this.#getNodeForce(this.xx - 1, this.yy);
	}

	#getNodeForce(xx, yy) {
		const node = this.data.getNode(xx, yy);
		return node?.currentForce || 0;
	}

	#drawNode(forceMagnitude, element) {
		const clampedForce = Math.max(0, Math.min(100, forceMagnitude));
		const index = ASCII_THRESHOLDS.findIndex((threshold) => threshold >= clampedForce);
		element.textContent = CONFIG.ASCII_SHADES[index];
	}

	computeForceAndDrawNode() {
		if (Math.abs(this.nextForce) < this.data.forceCutOff) {
			this.nextForce = 0;
		}

		this.#drawNode(this.nextForce, this.element);
		[this.currentForce, this.nextForce] = [this.nextForce, this.currentForce];
		this.#updateNeighbors();
	}
}

class PuddleData {
	constructor(numRows, numCols) {
		this.nodeList = new Array(numRows * numCols);
		this.updateQueue = new Set();
		this.drawQueue = new Set();
		this.numRows = numRows;
		this.numCols = numCols;
		this.isUpdateDone = true;
		this.maxRippleStrength = CONFIG.MAX_RIPPLE_STRENGTH;
		this.forceDampeningRatio = CONFIG.FORCE_DAMPENING_RATIO;
		this.forceCutOff = CONFIG.FORCE_CUTOFF;
	}

	refresh(numRows, numCols) {
		this.nodeList = new Array(numRows * numCols);
		this.updateQueue.clear();
		this.drawQueue.clear();
		this.numRows = numRows;
		this.numCols = numCols;
		this.isUpdateDone = true;
	}

	isValidCoordinate(xx, yy) {
		return xx >= 0 && xx < this.numCols && yy >= 0 && yy < this.numRows;
	}

	getIndex(xx, yy) {
		return yy * this.numCols + xx;
	}

	appendNode(node, index) {
		this.nodeList[index] = node;
	}

	getNode(xx, yy) {
		return this.isValidCoordinate(xx, yy) ? this.nodeList[this.getIndex(xx, yy)] : null;
	}

	addToUpdateQueue(xx, yy) {
		if (!this.isValidCoordinate(xx, yy)) return;

		const index = this.getIndex(xx, yy);
		const node = this.nodeList[index];

		if (!node.isAddedToUpdate) {
			this.updateQueue.add(index);
			node.isAddedToUpdate = true;
		}
	}

	addToDrawQueue(xx, yy) {
		this.drawQueue.add(this.getIndex(xx, yy));
	}

	drawElements() {
		for (const index of this.drawQueue) {
			this.nodeList[index].computeForceAndDrawNode();
		}
		this.drawQueue.clear();
	}

	updateElements() {
		if (this.updateQueue.size === 0 && this.drawQueue.size === 0) {
			return;
		}

		if (!this.isUpdateDone) {
			console.warn("Previous update not completed, skipping update");
			return;
		}

		this.isUpdateDone = false;

		for (const index of this.updateQueue) {
			this.nodeList[index].isAddedToUpdate = false;
			this.nodeList[index].updateNode();
		}
		this.updateQueue.clear();

		this.drawElements();
		this.isUpdateDone = true;
	}
}

class Puddle {
	constructor(queryElement, updateInterval = CONFIG.DEFAULT_UPDATE_INTERVAL) {
		this.parentNode = typeof queryElement === "string" ? document.querySelector(queryElement) : queryElement;
		if (!this.parentNode) {
			throw new Error(`Element ${queryElement} not found`);
		}

		this.updateInterval = updateInterval;
		this.nodeSize = CONFIG.MIN_NODE_SIZE;

		this.resizeHandler = this.#resizeHandler.bind(this);
		window.addEventListener("resize", this.resizeHandler);

		this.#initialize();
	}

	handlePointer(clientX, clientY, options = {}) {
		const { rippleStrength = this.data?.maxRippleStrength, respectDelay = false } = options;
		if (!this.parentNode || !this.data) return;
		const rect = this.parentNode.getBoundingClientRect();
		const x = clientX - rect.left;
		const y = clientY - rect.top;

		if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return;
		const xx = Math.floor(x / this.nodeSize);
		const yy = Math.floor(y / this.nodeSize);
		const node = this.data.getNode(xx, yy);
		if (!node) return;
		if (respectDelay) {
			node.triggerMoveRipple(rippleStrength);
		} else {
			node.startRipple(rippleStrength);
		}
	}

	#initialize() {
		this.#setupDimensions();
		this.data = new PuddleData(this.numRows, this.numCols);
		this.setupGrid();
	}

	#setupDimensions() {
		const { clientWidth, clientHeight } = this.parentNode;
		const lesserDimension = Math.min(clientHeight, clientWidth);
		this.nodeSize = Math.max(CONFIG.MIN_NODE_SIZE, (lesserDimension * 3) / 100);

		if (clientHeight) {
			this.numRows = Math.floor(clientHeight / this.nodeSize);
			this.numCols = Math.floor(clientWidth / this.nodeSize);
		}
	}

	#resizeHandler() {
		this.#setupDimensions();
		this.setupGrid();
	}

	setupGrid() {
		this.stop();
		this.data.refresh(this.numRows, this.numCols);

		const fragment = document.createDocumentFragment();
		this.parentNode.innerHTML = "";

		this.parentNode.style.cssText = `
      grid-template-columns: repeat(${this.numCols}, ${this.nodeSize}px);
      grid-template-rows: repeat(${this.numRows}, ${this.nodeSize}px);
    `;

		const totalNodes = this.numRows * this.numCols;
		for (let i = 0; i < totalNodes; i++) {
			const yy = Math.floor(i / this.numCols);
			const xx = i % this.numCols;

			const node = new AsciiNode(xx, yy, this.data);
			this.data.appendNode(node, i);
			fragment.appendChild(node.element);
		}

		this.parentNode.appendChild(fragment);
		this.start();
	}

	start() {
		if (this.isRunning) return;
		this.isRunning = true;
		let lastTime = 0;
		const loop = (time) => {
			if (!this.isRunning) return;
			if (time - lastTime >= this.updateInterval) {
				this.data.updateElements();
				lastTime = time;
			}
			this.rafId = requestAnimationFrame(loop);
		};
		this.rafId = requestAnimationFrame(loop);
	}

	stop() {
		this.isRunning = false;
		if (this.rafId) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}
	}
}

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
	try {
		const containers = document.querySelectorAll(".puddle-container");
		const puddles = [];
		containers.forEach((container) => puddles.push(new Puddle(container)));

		const handleVisibility = () => {
			if (document.hidden) {
				puddles.forEach((puddle) => puddle.stop());
			} else {
				puddles.forEach((puddle) => puddle.start());
			}
		};
		document.addEventListener("visibilitychange", handleVisibility);

		let lastMove = 0;
		const moveInterval = 16;
		window.addEventListener("pointermove", (event) => {
			if (event.pointerType === "touch") return;
			const now = performance.now();
			if (now - lastMove < moveInterval) return;
			lastMove = now;
			puddles.forEach((puddle) => {
				puddle.handlePointer(event.clientX, event.clientY, {
					rippleStrength: puddle.data.maxRippleStrength * 0.9,
					respectDelay: true,
				});
			});
		});

		window.addEventListener("click", (event) => {
			puddles.forEach((puddle) => {
				puddle.handlePointer(event.clientX, event.clientY, {
					rippleStrength: puddle.data.maxRippleStrength,
					respectDelay: false,
				});
			});
		});
	} catch (error) {
		console.error("Failed to initialize puddle:", error);
	}
}

export default Puddle;
