// Game.js - Main game class that ties everything together

import GameState from './GameState.js';
import Renderer from './Renderer.js';
import InputHandler from './InputHandler.js';

class Game {
    constructor() {
        // Core components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.player = null;
        this.pickaxe = null;
        this.axe = null;
        this.forge = null;
        this.forgeLight = null;
        this.ores = [];
        this.trees = [];

        // Constants
        this.playerSpeed = 0.12;
        this.playerRotationSpeed = 0.04;
        this.playerHeight = 1.8;
        this.playerRadius = 0.4;
        this.cameraOffset = new THREE.Vector3(0, 2.5, 5);
        this.maxPitch = Math.PI / 3;
        this.minPitch = -Math.PI / 12;
        this.WORLD_UP = new THREE.Vector3(0, 1, 0);
        this.MINE_DURATION = 2000;
        this.CHOP_DURATION = 2000;
        this.SMELT_DURATION = 5000;
        this.INTERACTION_DISTANCE = 3.5;
        this.MAP_SIZE = 80;
        this.ORE_TYPES = {
            COPPER: { name: 'copper', color: 0xb87333, value: 1, size: 0.8, count: 25 },
            IRON: { name: 'iron', color: 0x808080, value: 1, size: 1, count: 20 },
            GOLD: { name: 'gold', color: 0xFFD700, value: 1, size: 0.6, count: 15 }
        };
        this.TREE_COUNT = 40;

        // Game systems
        this.gameState = new GameState();
        this.renderer = null; // Will be initialized in init()
        this.inputHandler = null; // Will be initialized in init()

        // Animation frame ID for cancellation if needed
        this.animationFrameId = null;
    }

    init() {
        this.initScene();
        this.initRenderer();
        this.initInputHandler();
        this.setupCallbacks();

        // Start the game loop
        this.lastTime = performance.now();
        this.animate();
    }

    initScene() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);
        this.scene.fog = new THREE.Fog(0x87ceeb, this.MAP_SIZE * 0.5, this.MAP_SIZE * 1.8);

        // Create camera
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

        // Create WebGL renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        // Create world
        this.addLights();
        this.createGround();
        this.createPlayerAndTools();
        this.createWorldResources();

        // Update UI
        this.updateInventoryDisplay();
    }

    initRenderer() {
        this.renderSystem = new Renderer(this.scene, this.camera, this.renderer);
        this.renderSystem.setForgeLight(this.forgeLight);
    }

    initInputHandler() {
        this.inputHandler = new InputHandler(this.gameState, this.player, this.playerRotationSpeed);
        this.inputHandler.setupEventListeners();
    }

    setupCallbacks() {
        this.inputHandler.setCallbacks({
            onPause: this.togglePause.bind(this),
            onAction: this.startAction.bind(this),
            onToggleTool: this.toggleTool.bind(this),
            onToggleForgeUI: this.toggleForgeUI.bind(this),
            onWindowResize: this.handleWindowResize.bind(this)
        });
    }

    // World creation methods
    addLights() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
        dirLight.position.set(20, 40, 15);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.set(2048, 2048);
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 150;
        Object.assign(dirLight.shadow.camera, { 
            left: -this.MAP_SIZE/2, 
            right: this.MAP_SIZE/2, 
            top: this.MAP_SIZE/2, 
            bottom: -this.MAP_SIZE/2 
        });
        this.scene.add(dirLight);
    }

    createGround() {
        const groundGeo = new THREE.PlaneGeometry(this.MAP_SIZE, this.MAP_SIZE);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x556B2F, roughness: 0.8 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }

    createPlayerAndTools() {
        const playerGroup = new THREE.Group();
        const bodyGeo = new THREE.CylinderGeometry(
            this.playerRadius, this.playerRadius, this.playerHeight - this.playerRadius * 2, 16
        );
        const playerMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.6 });
        const body = new THREE.Mesh(bodyGeo, playerMat);
        body.position.y = this.playerHeight / 2 - this.playerRadius; 
        body.castShadow = true;
        playerGroup.add(body);

        const headGeo = new THREE.SphereGeometry(this.playerRadius, 16, 8);
        const head = new THREE.Mesh(headGeo, playerMat);
        head.position.y = this.playerHeight - this.playerRadius;
        playerGroup.add(head);

        this.player = playerGroup;
        this.player.position.y = this.playerRadius;
        this.scene.add(this.player);

        this.pickaxe = this.createTool(0x718096, 0.8);
        this.player.add(this.pickaxe);

        this.axe = this.createTool(0xdb2777, 1.0, true);
        this.player.add(this.axe);

        this.toggleTool(this.gameState.equippedTool, true);
    }

    createTool(color, handleLength, isAxe = false) {
        const tool = new THREE.Group();
        const handleGeom = new THREE.CylinderGeometry(0.05, 0.05, handleLength, 8);
        const handleMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const handle = new THREE.Mesh(handleGeom, handleMat);
        handle.position.y = handleLength / 2;
        tool.add(handle);

        const headMat = new THREE.MeshStandardMaterial({ color: color });
        let headGeom;
        if (isAxe) {
            headGeom = new THREE.BoxGeometry(0.1, 0.4, 0.3);
        } else {
            headGeom = new THREE.BoxGeometry(0.1, 0.3, 0.1);
        }

        const head = new THREE.Mesh(headGeom, headMat);
        head.position.set(0, handleLength, isAxe ? 0.0 : 0.05);
        head.rotation.z = isAxe ? 0 : Math.PI / 2.5;
        tool.add(head);

        tool.position.set(this.playerRadius, this.playerHeight * 0.6, this.playerRadius * 0.5);
        tool.rotation.x = Math.PI / 2; 
        tool.rotation.y = -0.5;

        return tool;
    }

    createWorldResources() {
        // Create ores
        Object.values(this.ORE_TYPES).forEach(type => {
            for (let i = 0; i < type.count; i++) {
                const oreGeo = new THREE.DodecahedronGeometry(type.size * 0.6, 0);
                const ore = new THREE.Mesh(
                    oreGeo, 
                    new THREE.MeshStandardMaterial({ 
                        color: type.color, 
                        metalness: 0.4, 
                        roughness: 0.7 
                    })
                );

                ore.position.set(
                    (Math.random() - 0.5) * this.MAP_SIZE, 
                    type.size * 0.5, 
                    (Math.random() * 0.5) * this.MAP_SIZE - this.MAP_SIZE * 0.45
                );

                ore.castShadow = true; 
                ore.receiveShadow = true;
                ore.userData = { type: type.name, resourceType: 'ore', respawnTimer: null };

                this.scene.add(ore); 
                this.ores.push(ore);
            }
        });

        // Create trees
        const forestX = -this.MAP_SIZE / 2 + 10; 
        const forestZ = this.MAP_SIZE / 2 - 10;

        for (let i = 0; i < this.TREE_COUNT; i++) {
            const trunkHeight = 3 + Math.random() * 2;
            const trunk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.2, 0.3, trunkHeight, 8), 
                new THREE.MeshStandardMaterial({ color: 0x8B4513 })
            );

            const leaves = new THREE.Mesh(
                new THREE.DodecahedronGeometry(1.2, 0), 
                new THREE.MeshStandardMaterial({ color: 0x22c55e })
            );

            const tree = new THREE.Group();
            trunk.castShadow = true; 
            trunk.position.y = trunkHeight / 2;

            leaves.castShadow = true; 
            leaves.position.y = trunkHeight + 0.5;

            tree.add(trunk); 
            tree.add(leaves);
            tree.position.set(
                Math.random() * 20 - 10 + forestX, 
                0, 
                Math.random() * 20 - 10 + forestZ
            );

            tree.userData = { type: 'tree', resourceType: 'wood', respawnTimer: null };

            this.scene.add(tree); 
            this.trees.push(tree);
        }

        this.createDetailedForge();
    }

    createDetailedForge() {
        // Create a temporary group to hold the forge while it's loading
        this.forge = new THREE.Group();
        this.forge.position.set(0, 0, -10);
        this.scene.add(this.forge);

        // Create forge light
        this.forgeLight = new THREE.PointLight(0xffaa33, 2, 100);
        this.forgeLight.castShadow = true;

        // Load the glTF model
        const loader = new THREE.GLTFLoader();
        loader.load(
            'assets/forge.glb', // Assuming you've changed this to forge.glb
            (gltf) => {
                const modelScene = gltf.scene;

                // --- Add these lines to scale and position the model ---
                // Example: Scale the model (e.g., make it 5 times larger)
                // You might need to experiment with these values
                const desiredScale = 10; // Adjust this value as needed
                modelScene.scale.set(desiredScale, desiredScale, desiredScale);

                // Example: Adjust the model's vertical position
                // If the model's pivot is at its base, 0 would put it on the ground.
                // If its pivot is in the center, you might need to lift it by half its scaled height.
                // You might need to experiment with this value.
                modelScene.position.y = 7; // Adjust this value as needed
                // For example, if ground is at y=0 and model pivot is at its base:
                // modelScene.position.y = 0;
                // Or, if you want its base to be slightly above ground, e.g. y = 0.5:
                // modelScene.position.y = 0.5;
                // ---------------------------------------------------------

                // Add the loaded model to the forge group
                this.forge.add(modelScene);

                // Apply shadows to all meshes in the model
                modelScene.traverse((node) => {
                    if (node.isMesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                    }
                });

                // Find the forge fire to add the light
                const forgeFire = modelScene.getObjectByName('ForgeFire');
                if (forgeFire) {
                    forgeFire.add(this.forgeLight);
                } else {
                    // If fire not found, add light to the main group
                    this.forgeLight.position.set(0, 1.5, 0); // This might also need adjustment based on new model
                    this.forge.add(this.forgeLight);
                }

                console.log('Forge model loaded successfully');
            },
            (xhr) => {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            (error) => {
                console.error('An error happened loading the forge model:', error);
                // Fallback to create a simple placeholder if loading fails
                this.createFallbackForge();
            }
        );
    }

    createFallbackForge() {
        console.log('Creating fallback forge');

        // Clear the forge group
        while(this.forge.children.length > 0) {
            this.forge.remove(this.forge.children[0]);
        }

        // Create simple placeholder meshes
        const forgeBase = new THREE.Mesh(
            new THREE.BoxGeometry(4, 1, 4),
            new THREE.MeshStandardMaterial({ color: 0x888888 })
        );
        forgeBase.position.y = 0.5;
        forgeBase.castShadow = true;
        this.forge.add(forgeBase);

        const forgeFire = new THREE.Mesh(
            new THREE.BoxGeometry(2, 1, 2),
            new THREE.MeshBasicMaterial({ color: 0xffaa33 })
        );
        forgeFire.position.y = 1.5;
        this.forge.add(forgeFire);

        // Add the light to the fire
        this.forgeLight.position.set(0, 0, 0);
        forgeFire.add(this.forgeLight);

        this.scene.add(this.forge);
    }

    // Game action methods
    togglePause() {
        const isPaused = this.gameState.togglePause();
        document.getElementById('pause-menu').style.display = isPaused ? 'flex' : 'none';

        if (isPaused) {
            if (document.pointerLockElement) document.exitPointerLock();
        } else {
            document.body.requestPointerLock();
            this.lastTime = performance.now();
        }
    }

    toggleTool(tool, force = false) {
        const newTool = this.gameState.toggleTool(tool, force);
        if (newTool) {
            this.pickaxe.visible = (newTool === 'pickaxe');
            this.axe.visible = (newTool === 'axe');
            this.updateInventoryDisplay();
            this.showGameMessage(`Equipped ${newTool}`, 1000);
        }
    }

    startAction() {
        if (this.gameState.isInteracting) return;

        let target, duration;
        const resourceList = this.gameState.equippedTool === 'pickaxe' ? this.ores : this.trees;

        let closestDistSq = this.INTERACTION_DISTANCE * this.INTERACTION_DISTANCE;
        resourceList.forEach(res => {
            if (res.visible) {
                const distSq = this.player.position.distanceToSquared(res.position);
                if (distSq < closestDistSq) { 
                    closestDistSq = distSq; 
                    target = res; 
                }
            }
        });

        if (target) {
            this.gameState.startAction(target);
            duration = this.gameState.equippedTool === 'pickaxe' ? this.MINE_DURATION : this.CHOP_DURATION;

            const resourceName = target.userData.resourceType === 'ore' 
                ? target.userData.type 
                : target.userData.resourceType;

            this.showGameMessage(`Gathering ${resourceName}...`, duration + 100);
        } else {
            this.showGameMessage(
                `No ${this.gameState.equippedTool === 'pickaxe' ? 'ore' : 'trees'} in range.`, 
                1500
            );
        }
    }

    toggleForgeUI() {
        const forgeUI = document.getElementById('forge-ui');
        const distSq = this.player.position.distanceToSquared(this.forge.position);

        if (forgeUI.style.display === 'none' && distSq < (this.INTERACTION_DISTANCE * this.INTERACTION_DISTANCE)) {
            forgeUI.style.display = 'block';
            if (document.pointerLockElement) document.exitPointerLock();
        } else {
            forgeUI.style.display = 'none';
        }
    }

    // Update methods
    updatePlayer(deltaTime) {
        if (this.gameState.isInteracting) return;

        const moveSpeed = this.playerSpeed * (deltaTime / (1000/60));
        const forward = new THREE.Vector3(); 
        this.player.getWorldDirection(forward);
        const right = new THREE.Vector3().crossVectors(this.WORLD_UP, forward).normalize();

        if (this.gameState.isKeyPressed('w') || this.gameState.isKeyPressed('arrowup')) { 
            this.player.position.addScaledVector(forward, -moveSpeed); 
        }

        if (this.gameState.isKeyPressed('s') || this.gameState.isKeyPressed('arrowdown')) { 
            this.player.position.addScaledVector(forward, moveSpeed); 
        }

        if (this.gameState.isKeyPressed('a') || this.gameState.isKeyPressed('arrowleft')) { 
            this.player.position.addScaledVector(right, -moveSpeed);
        }

        if (this.gameState.isKeyPressed('d') || this.gameState.isKeyPressed('arrowright')) { 
            this.player.position.addScaledVector(right, moveSpeed);
        }

        // Constrain player to map boundaries
        this.player.position.x = Math.max(
            -this.MAP_SIZE / 2 + this.playerRadius, 
            Math.min(this.MAP_SIZE / 2 - this.playerRadius, this.player.position.x)
        );

        this.player.position.z = Math.max(
            -this.MAP_SIZE / 2 + this.playerRadius, 
            Math.min(this.MAP_SIZE / 2 - this.playerRadius, this.player.position.z)
        );
    }

    updateAction(deltaTime) {
        if (!this.gameState.isInteracting || !this.gameState.currentActionTarget) return;

        const tool = this.gameState.equippedTool === 'pickaxe' ? this.pickaxe : this.axe;
        const duration = this.gameState.equippedTool === 'pickaxe' ? this.MINE_DURATION : this.CHOP_DURATION;

        // Update tool animation
        this.renderSystem.updateToolAnimation(tool, this.gameState.actionProgress, duration);

        // Update action progress
        const result = this.gameState.updateAction(deltaTime, duration);

        if (result && result.completed) {
            this.showGameMessage(`+1 ${result.resourceKey}!`, 2000);
            this.updateInventoryDisplay();

            // Hide the resource and set up respawn
            this.renderSystem.hideResource(this.gameState.currentActionTarget);
            const targetToRespawn = this.gameState.currentActionTarget;

            if (targetToRespawn.userData.respawnTimer === null) {
                targetToRespawn.userData.respawnTimer = setTimeout(() => {
                    this.renderSystem.showResource(targetToRespawn);
                    targetToRespawn.userData.respawnTimer = null;
                }, 20000 + Math.random() * 10000);
            }

            // Reset tool position
            this.renderSystem.resetToolPosition(tool);
        }
    }

    updateSmelting(deltaTime) {
        const result = this.gameState.updateSmelting(deltaTime, this.SMELT_DURATION);

        if (result) {
            if (result.completed) {
                this.showGameMessage(`+1 ${result.oreType} Ingot!`, 2000);
                this.updateInventoryDisplay();
            }

            if (document.getElementById('forge-ui').style.display === 'block') {
                this.updateForgeUI();
            }
        }
    }

    // UI methods
    messageTimeout = null;
    showGameMessage(message, duration = 3000) {
        const box = document.getElementById('message-box');
        box.textContent = message; 
        box.style.opacity = '1';
        clearTimeout(this.messageTimeout);
        this.messageTimeout = setTimeout(() => { box.style.opacity = '0'; }, duration);
    }

    updateInventoryDisplay() {
        const container = document.getElementById('inventory-display');
        const inventory = this.gameState.getInventory();
        const equippedTool = this.gameState.getEquippedTool();

        container.innerHTML = `
            <div class="inventory-category">Tools</div>
            <div class="inventory-slot bg-slate-700">
                <div class="icon-placeholder">T</div> <span>${equippedTool.charAt(0).toUpperCase() + equippedTool.slice(1)}</span>
            </div>
            <div class="inventory-category">Resources</div>
            <div class="inventory-slot"><div class="icon-placeholder" style="background-color:#A0522D;">W</div> <span>Wood: ${inventory.wood}</span></div>
            <div class="inventory-slot"><div class="icon-placeholder" style="background-color:#b87333;">Cu</div> <span>Copper: ${inventory.copper}</span></div>
            <div class="inventory-slot"><div class="icon-placeholder" style="background-color:#808080;">Fe</div> <span>Iron: ${inventory.iron}</span></div>
            <div class="inventory-slot"><div class="icon-placeholder" style="background-color:#FFD700;">Au</div> <span>Gold: ${inventory.gold}</span></div>
            <div class="inventory-category">Ingots</div>
            <div class="inventory-slot"><div class="icon-placeholder" style="background-color:#f97316;"></div> <span>Copper: ${inventory.copperIngot}</span></div>
            <div class="inventory-slot"><div class="icon-placeholder" style="background-color:#9ca3af;"></div> <span>Iron: ${inventory.ironIngot}</span></div>
            <div class="inventory-slot"><div class="icon-placeholder" style="background-color:#facc15;"></div> <span>Gold: ${inventory.goldIngot}</span></div>
        `;
    }

    updateForgeUI() {
        const forgeState = this.gameState.getForgeState();
        const inventory = this.gameState.getInventory();

        document.getElementById('forge-fuel-display').textContent = `${forgeState.fuel}`;
        document.getElementById('forge-fuel-bar').style.width = `${(forgeState.fuel / forgeState.maxFuel) * 100}%`;

        const statusDisplay = document.getElementById('smelting-status-display');
        const progressBar = document.getElementById('smelting-progress-bar');

        if (forgeState.isSmelting) {
            statusDisplay.textContent = `Smelting ${forgeState.oreToSmelt}...`;
            progressBar.style.width = `${forgeState.smeltingProgress * 100}%`;
        } else {
            statusDisplay.textContent = 'Idle';
            progressBar.style.width = '0%';
        }

        document.querySelectorAll('.smelt-button[data-ore]').forEach(btn => {
            const ore = btn.dataset.ore;
            btn.classList.toggle(
                'disabled', 
                forgeState.isSmelting || forgeState.fuel < 5 || inventory[ore] < 1
            );
        });

        document.getElementById('add-fuel-button').classList.toggle(
            'disabled', 
            inventory.wood < 10 || forgeState.fuel >= forgeState.maxFuel
        );
    }

    handleWindowResize() {
        this.renderSystem.handleWindowResize();
    }

    // Main game loop
    animate() {
        this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        if (this.gameState.isPaused) {
            this.renderSystem.render();
            return;
        }

        // Update forge light flicker
        this.renderSystem.updateForgeLight();

        // Update game state
        this.updatePlayer(deltaTime);
        this.updateAction(deltaTime);
        this.updateSmelting(deltaTime);

        // Update camera
        this.renderSystem.updateCameraPosition(
            this.player, 
            this.cameraOffset, 
            this.gameState.cameraPitch
        );

        // Render the scene
        this.renderSystem.render();
    }
}

export default Game;