// core.js - Core game variables and initialization

// --- Core Components ---
let scene, camera, renderer, player, pickaxe, axe, forge, forgeLight;
let ores = [], trees = [];
let playerSpeed = 0.12, playerRotationSpeed = 0.04;
const playerHeight = 1.8, playerRadius = 0.4;
let inventory = {
    wood: 10, copper: 1, iron: 1, gold: 1,
    copperIngot: 0, ironIngot: 0, goldIngot: 0
};

// --- Camera & Controls ---
let keysPressed = {};
const cameraOffset = new THREE.Vector3(0, 2.5, 5);
let cameraPitch = 0.2;
const maxPitch = Math.PI / 3, minPitch = -Math.PI / 12;
let pointerLocked = false;
let equippedTool = 'pickaxe';

// --- Game State ---
let isPaused = false, isInteracting = false, lastTime = performance.now();
const MINE_DURATION = 2000, CHOP_DURATION = 2000, SMELT_DURATION = 5000;
let actionProgress = 0, currentActionTarget = null;
const WORLD_UP = new THREE.Vector3(0, 1, 0);

// --- Forge State ---
let forgeState = {
    fuel: 0,
    maxFuel: 100,
    isSmelting: false,
    smeltingProgress: 0,
    oreToSmelt: null
};
const flickerClock = new THREE.Clock();

// --- Game Constants ---
const ORE_TYPES = {
    COPPER: { name: 'copper', color: 0xb87333, value: 1, size: 0.8, count: 25 },
    IRON: { name: 'iron', color: 0x808080, value: 1, size: 1, count: 20 },
    GOLD: { name: 'gold', color: 0xFFD700, value: 1, size: 0.6, count: 15 }
};
const TREE_COUNT = 40;
const INTERACTION_DISTANCE = 3.5;
const MAP_SIZE = 80;

// --- Initialization ---
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, MAP_SIZE * 0.5, MAP_SIZE * 1.8);
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);
    addLights();
    createGround();
    createPlayerAndTools();
    createWorldResources();
    setupEventListeners();
    updateInventoryDisplay();
    updateCameraPosition();
    animate();
}

// Export functions and variables to be used in other modules
export {
    scene, camera, renderer, player, pickaxe, axe, forge, forgeLight,
    ores, trees, playerSpeed, playerRotationSpeed, playerHeight, playerRadius,
    inventory, keysPressed, cameraOffset, cameraPitch, maxPitch, minPitch,
    pointerLocked, equippedTool, isPaused, isInteracting, lastTime,
    MINE_DURATION, CHOP_DURATION, SMELT_DURATION, actionProgress, currentActionTarget,
    WORLD_UP, forgeState, flickerClock, ORE_TYPES, TREE_COUNT, INTERACTION_DISTANCE, MAP_SIZE,
    init
};