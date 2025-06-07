// controls.js - Event handling and player controls

import { 
    player, camera, keysPressed, cameraOffset, cameraPitch, maxPitch, minPitch,
    pointerLocked, equippedTool, isPaused, isInteracting, playerSpeed, WORLD_UP,
    MAP_SIZE, playerRadius
} from './core.js';

import { startAction } from './actions.js';
import { toggleForgeUI } from './forge.js';
import { updateInventoryDisplay, showGameMessage } from './ui.js';

// --- Event Listeners & Controls ---
function togglePause() {
    isPaused = !isPaused;
    document.getElementById('pause-menu').style.display = isPaused ? 'flex' : 'none';
    if (isPaused) {
        if (document.pointerLockElement) document.exitPointerLock();
        keysPressed = {};
    } else {
        document.body.requestPointerLock();
        lastTime = performance.now();
    }
}

function setupEventListeners() {
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onWindowResize);
    document.getElementById('game-container').addEventListener('click', () => { if (!isPaused) document.body.requestPointerLock(); });
    document.addEventListener('pointerlockchange', () => { pointerLocked = !!document.pointerLockElement; });
    document.getElementById('resume-button').addEventListener('click', togglePause);
    document.getElementById('exit-button').addEventListener('click', () => window.location.reload());
    document.getElementById('add-fuel-button').addEventListener('click', addForgeFuel);
    document.querySelectorAll('.smelt-button[data-ore]').forEach(btn => {
        btn.addEventListener('click', () => startSmelting(btn.dataset.ore));
    });
    document.getElementById('gemini-open-button').addEventListener('click', openGeminiModal);
    document.getElementById('gemini-close-button').addEventListener('click', closeGeminiModal);
    document.getElementById('gemini-submit-button').addEventListener('click', askGemini);
}

function onKeyDown(event) {
    const key = event.key.toLowerCase();
    if (key === 'escape') { togglePause(); return; }
    if (isPaused || isInteracting || document.getElementById('gemini-modal').style.display === 'flex') return;
    keysPressed[key] = true;
    if (key === 'e') startAction();
    if (key === 'q') toggleTool();
    if (key === 'f') toggleForgeUI();
}

function onKeyUp(event) {
    keysPressed[event.key.toLowerCase()] = false;
}

function onMouseMove(event) {
    if (isPaused || !pointerLocked) return;
    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;
    player.rotation.y -= movementX * playerRotationSpeed;
    cameraPitch -= movementY * playerRotationSpeed;
    cameraPitch = Math.max(minPitch, Math.min(maxPitch, cameraPitch));
}

function toggleTool(tool, force = false) {
    if (!force && isInteracting) return;
    equippedTool = tool || (equippedTool === 'pickaxe' ? 'axe' : 'pickaxe');
    pickaxe.visible = (equippedTool === 'pickaxe');
    axe.visible = (equippedTool === 'axe');
    updateInventoryDisplay();
    showGameMessage(`Equipped ${equippedTool}`, 1000);
}

// --- Player & Camera Update ---
function updatePlayer(deltaTime) {
    if (isInteracting) return;
    const moveSpeed = playerSpeed * (deltaTime / (1000/60));
    const forward = new THREE.Vector3(); player.getWorldDirection(forward);
    const right = new THREE.Vector3().crossVectors(WORLD_UP, forward).normalize();
    if (keysPressed['w'] || keysPressed['arrowup']) { player.position.addScaledVector(forward, -moveSpeed); }
    if (keysPressed['s'] || keysPressed['arrowdown']) { player.position.addScaledVector(forward, moveSpeed); }
    if (keysPressed['a'] || keysPressed['arrowleft']) { player.position.addScaledVector(right, -moveSpeed); }
    if (keysPressed['d'] || keysPressed['arrowright']) { player.position.addScaledVector(right, moveSpeed); }
    player.position.x = Math.max(-MAP_SIZE / 2 + playerRadius, Math.min(MAP_SIZE / 2 - playerRadius, player.position.x));
    player.position.z = Math.max(-MAP_SIZE / 2 + playerRadius, Math.min(MAP_SIZE / 2 - playerRadius, player.position.z));
}
function updateCameraPosition() {
    const lookAtPoint = player.position.clone().add(new THREE.Vector3(0, 1.5, 0));
    const relativeOffset = cameraOffset.clone();
    relativeOffset.applyQuaternion(player.quaternion);
    camera.position.copy(player.position).add(relativeOffset);
    const pitchAdjust = new THREE.Vector3(0, Math.tan(cameraPitch) * cameraOffset.z, 0);
    const finalLookAt = lookAtPoint.add(pitchAdjust);
    camera.lookAt(finalLookAt);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

export {
    togglePause,
    setupEventListeners,
    onKeyDown,
    onKeyUp,
    onMouseMove,
    toggleTool,
    updatePlayer,
    updateCameraPosition,
    onWindowResize
};