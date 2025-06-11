// // Game.js - Main game class that ties everything together
//
// import GameState from './GameState.js';
// import Renderer from './Renderer.js';
// import InputHandler from './InputHandler.js';
//
// class Game {
//     constructor() {
//         // Core components
//         this.scene = null;
//         this.camera = null;
//         this.renderer = null;
//         this.player = null;
//         this.pickaxe = null;
//         this.axe = null;
//         this.forge = null;
//         this.forgeLight = null;
//         this.ores = [];
//         this.trees = [];
//         this.combatDummy = null;
//
//         // Constants
//         this.playerSpeed = 0.12;
//         this.playerRotationSpeed = 0.001;
//         this.playerHeight = 1.8;
//         this.playerRadius = 0.4;
//         this.cameraOffset = new THREE.Vector3(0, 2.5, 5);
//         this.maxPitch = Math.PI / 3;
//         this.minPitch = -Math.PI / 12;
//         this.WORLD_UP = new THREE.Vector3(0, 1, 0);
//         this.MINE_DURATION = 2000;
//         this.CHOP_DURATION = 2000;
//         this.SMELT_DURATION = 5000;
//         this.INTERACTION_DISTANCE = 3.5;
//         this.MAP_SIZE = 80;
//         this.ORE_TYPES = {
//             COPPER: { name: 'copper', color: 0xb87333, value: 1, size: 0.8, count: 25 },
//             IRON: { name: 'iron', color: 0x808080, value: 1, size: 1, count: 20 },
//             GOLD: { name: 'gold', color: 0xFFD700, value: 1, size: 0.6, count: 15 },
//             SILVER: { name: 'silver', color: 0xC0C0C0, value: 1, size: 0.7, count: 15 },
//             MITHRIL: { name: 'mithril', color: 0x9bc4e2, value: 2, size: 0.9, count: 10 },
//             ADAMANTITE: { name: 'adamantite', color: 0x800080, value: 3, size: 1.1, count: 5 },
//             OBSIDIAN: { name: 'obsidian', color: 0x310062, value: 2, size: 1.0, count: 8 }
//         };
//         this.TREE_COUNT = 40;
//
//         // Game systems
//         this.gameState = new GameState();
//         this.renderer = null; // Will be initialized in init()
//         this.inputHandler = null; // Will be initialized in init()
//
//         // Animation frame ID for cancellation if needed
//         this.animationFrameId = null;
//     }
//
//     init() {
//         this.initScene();
//         this.initRenderer();
//         this.initInputHandler();
//         this.setupCallbacks();
//
//         // Add some test equipment for development
//         this.addTestEquipment();
//
//         // Start the game loop
//         this.lastTime = performance.now();
//         this.animate();
//     }
//
//     addTestEquipment() {
//         // Create some test weapons
//         const bronzeSwordId = this.gameState.createEquipment(
//             'weapon', 'Bronze Sword', { attack: 3 }, 100
//         );
//
//         const ironSwordId = this.gameState.createEquipment(
//             'weapon', 'Iron Sword', { attack: 5 }, 150
//         );
//
//         // Create some test armor
//         const ironHelmetId = this.gameState.createEquipment(
//             'helmet', 'Iron Helmet', { armor: 3 }, 100
//         );
//
//         const ironChestplateId = this.gameState.createEquipment(
//             'chestplate', 'Iron Chestplate', { armor: 5 }, 100
//         );
//
//         const ironLeggingsId = this.gameState.createEquipment(
//             'leggings', 'Iron Leggings', { armor: 4 }, 100
//         );
//
//         // Equip the bronze sword by default
//         this.gameState.equipItem('mainHand', bronzeSwordId);
//
//         // Add some resources for crafting
//         this.gameState.inventory.resources.copper = 20;
//         this.gameState.inventory.resources.iron = 20;
//         this.gameState.inventory.resources.gold = 10;
//         this.gameState.inventory.resources.silver = 10;
//         this.gameState.inventory.resources.coal = 15;
//
//         console.log('Test equipment added');
//     }
//
//     initScene() {
//         // Create scene
//         this.scene = new THREE.Scene();
//         this.scene.background = new THREE.Color(0x87ceeb);
//         this.scene.fog = new THREE.Fog(0x87ceeb, this.MAP_SIZE * 0.5, this.MAP_SIZE * 1.8);
//
//         // Create camera
//         this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
//
//         // Create WebGL renderer
//         this.renderer = new THREE.WebGLRenderer({ antialias: true });
//         this.renderer.setSize(window.innerWidth, window.innerHeight);
//         this.renderer.shadowMap.enabled = true;
//         document.getElementById('game-container').appendChild(this.renderer.domElement);
//
//         // Create world
//         this.addLights();
//         this.createGround();
//         this.createPlayerAndTools();
//         this.createWorldResources();
//
//         // Update UI
//         this.updateInventoryDisplay();
//     }
//
//     initRenderer() {
//         this.renderSystem = new Renderer(this.scene, this.camera, this.renderer);
//         this.renderSystem.setForgeLight(this.forgeLight);
//     }
//
//     initInputHandler() {
//         this.inputHandler = new InputHandler(this.gameState, this.player, this.playerRotationSpeed);
//         this.inputHandler.setupEventListeners();
//     }
//
//     setupCallbacks() {
//         this.inputHandler.setCallbacks({
//             onPause: this.togglePause.bind(this),
//             onAction: this.startAction.bind(this),
//             onToggleTool: this.toggleTool.bind(this),
//             onToggleForgeUI: this.toggleForgeUI.bind(this),
//             onWindowResize: this.handleWindowResize.bind(this)
//         });
//
//         // Add event listeners for equipment UI
//         document.getElementById('equipment-ui-button').addEventListener('click', () => {
//             this.toggleEquipmentUI();
//         });
//
//         document.getElementById('close-equipment-ui').addEventListener('click', () => {
//             this.toggleEquipmentUI(false);
//         });
//
//         // Add event listeners for equipment slots
//         document.querySelectorAll('.equipment-slot').forEach(slot => {
//             slot.addEventListener('click', () => {
//                 this.handleEquipmentSlotClick(slot.dataset.slot);
//             });
//         });
//     }
//
//     // World creation methods
//     addLights() {
//         this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
//         const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
//         dirLight.position.set(20, 40, 15);
//         dirLight.castShadow = true;
//         dirLight.shadow.mapSize.set(2048, 2048);
//         dirLight.shadow.camera.near = 0.5;
//         dirLight.shadow.camera.far = 150;
//         Object.assign(dirLight.shadow.camera, {
//             left: -this.MAP_SIZE/2,
//             right: this.MAP_SIZE/2,
//             top: this.MAP_SIZE/2,
//             bottom: -this.MAP_SIZE/2
//         });
//         this.scene.add(dirLight);
//     }
//
//     createGround() {
//         const groundGeo = new THREE.PlaneGeometry(this.MAP_SIZE, this.MAP_SIZE);
//         const groundMat = new THREE.MeshStandardMaterial({ color: 0x556B2F, roughness: 0.8 });
//         const ground = new THREE.Mesh(groundGeo, groundMat);
//         ground.rotation.x = -Math.PI / 2;
//         ground.receiveShadow = true;
//         this.scene.add(ground);
//     }
//
//     createPlayerAndTools() {
//         const playerGroup = new THREE.Group();
//         const bodyGeo = new THREE.CylinderGeometry(
//             this.playerRadius, this.playerRadius, this.playerHeight - this.playerRadius * 2, 16
//         );
//         const playerMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.6 });
//         const body = new THREE.Mesh(bodyGeo, playerMat);
//         body.position.y = this.playerHeight / 2 - this.playerRadius;
//         body.castShadow = true;
//         playerGroup.add(body);
//
//         const headGeo = new THREE.SphereGeometry(this.playerRadius, 16, 8);
//         const head = new THREE.Mesh(headGeo, playerMat);
//         head.position.y = this.playerHeight - this.playerRadius;
//         playerGroup.add(head);
//
//         this.player = playerGroup;
//         this.player.position.y = this.playerRadius;
//         this.scene.add(this.player);
//
//         this.pickaxe = this.createTool(0x718096, 0.8);
//         this.player.add(this.pickaxe);
//
//         this.axe = this.createTool(0xdb2777, 1.0, true);
//         this.player.add(this.axe);
//
//         this.toggleTool(this.gameState.equippedTool, true);
//     }
//
//     createTool(color, handleLength, isAxe = false) {
//         const tool = new THREE.Group();
//         const handleGeom = new THREE.CylinderGeometry(0.05, 0.05, handleLength, 8);
//         const handleMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
//         const handle = new THREE.Mesh(handleGeom, handleMat);
//         handle.position.y = handleLength / 2;
//         tool.add(handle);
//
//         const headMat = new THREE.MeshStandardMaterial({ color: color });
//         let headGeom;
//         if (isAxe) {
//             headGeom = new THREE.BoxGeometry(0.1, 0.4, 0.3);
//         } else {
//             headGeom = new THREE.BoxGeometry(0.1, 0.3, 0.1);
//         }
//
//         const head = new THREE.Mesh(headGeom, headMat);
//         head.position.set(0, handleLength, isAxe ? 0.0 : 0.05);
//         head.rotation.z = isAxe ? 0 : Math.PI / 2.5;
//         tool.add(head);
//
//         tool.position.set(this.playerRadius, this.playerHeight * 0.6, this.playerRadius * 0.5);
//         tool.rotation.x = Math.PI / 2;
//         tool.rotation.y = -0.5;
//
//         return tool;
//     }
//
//     createWorldResources() {
//         // Create ores
//         Object.values(this.ORE_TYPES).forEach(type => {
//             for (let i = 0; i < type.count; i++) {
//                 const oreGeo = new THREE.DodecahedronGeometry(type.size * 0.6, 0);
//                 const ore = new THREE.Mesh(
//                     oreGeo,
//                     new THREE.MeshStandardMaterial({
//                         color: type.color,
//                         metalness: 0.4,
//                         roughness: 0.7
//                     })
//                 );
//
//                 ore.position.set(
//                     (Math.random() - 0.5) * this.MAP_SIZE,
//                     type.size * 0.5,
//                     (Math.random() * 0.5) * this.MAP_SIZE - this.MAP_SIZE * 0.45
//                 );
//
//                 ore.castShadow = true;
//                 ore.receiveShadow = true;
//                 ore.userData = { type: type.name, resourceType: 'ore', respawnTimer: null };
//
//                 this.scene.add(ore);
//                 this.ores.push(ore);
//             }
//         });
//
//         // Create trees
//         const forestX = -this.MAP_SIZE / 2 + 10;
//         const forestZ = this.MAP_SIZE / 2 - 10;
//
//         for (let i = 0; i < this.TREE_COUNT; i++) {
//             const trunkHeight = 3 + Math.random() * 2;
//             const trunk = new THREE.Mesh(
//                 new THREE.CylinderGeometry(0.2, 0.3, trunkHeight, 8),
//                 new THREE.MeshStandardMaterial({ color: 0x8B4513 })
//             );
//
//             const leaves = new THREE.Mesh(
//                 new THREE.DodecahedronGeometry(1.2, 0),
//                 new THREE.MeshStandardMaterial({ color: 0x22c55e })
//             );
//
//             const tree = new THREE.Group();
//             trunk.castShadow = true;
//             trunk.position.y = trunkHeight / 2;
//
//             leaves.castShadow = true;
//             leaves.position.y = trunkHeight + 0.5;
//
//             tree.add(trunk);
//             tree.add(leaves);
//             tree.position.set(
//                 Math.random() * 20 - 10 + forestX,
//                 0,
//                 Math.random() * 20 - 10 + forestZ
//             );
//
//             tree.userData = { type: 'tree', resourceType: 'wood', respawnTimer: null };
//
//             this.scene.add(tree);
//             this.trees.push(tree);
//         }
//
//         // Create combat dummy
//         this.createCombatDummy();
//
//         this.createDetailedForge();
//     }
//
//     createCombatDummy() {
//         // Create a group for the combat dummy
//         this.combatDummy = new THREE.Group();
//
//         // Create the body (red cube)
//         const bodyGeometry = new THREE.BoxGeometry(1, 2, 1);
//         const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xef4444 });
//         const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
//         body.position.y = 1; // Half height
//         body.castShadow = true;
//         body.receiveShadow = true;
//         this.combatDummy.add(body);
//
//         // Create a stand
//         const standGeometry = new THREE.CylinderGeometry(0.5, 0.7, 0.2, 8);
//         const standMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
//         const stand = new THREE.Mesh(standGeometry, standMaterial);
//         stand.position.y = 0.1; // Half height
//         stand.castShadow = true;
//         stand.receiveShadow = true;
//         this.combatDummy.add(stand);
//
//         // Position the dummy
//         this.combatDummy.position.set(5, 0, -5);
//
//         // Add user data
//         this.combatDummy.userData = {
//             type: 'enemy',
//             name: 'Combat Dummy',
//             health: 50,
//             maxHealth: 50,
//             isAlive: true,
//             respawnTimer: null
//         };
//
//         // Create health bar
//         this.createDummyHealthBar();
//
//         this.scene.add(this.combatDummy);
//     }
//
//     createDummyHealthBar() {
//         // Create a health bar container
//         const healthBarContainer = new THREE.Group();
//
//         // Create the background bar
//         const bgGeometry = new THREE.PlaneGeometry(1.2, 0.15);
//         const bgMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5 });
//         const bgBar = new THREE.Mesh(bgGeometry, bgMaterial);
//         healthBarContainer.add(bgBar);
//
//         // Create the health bar
//         const healthGeometry = new THREE.PlaneGeometry(1.2, 0.15);
//         const healthMaterial = new THREE.MeshBasicMaterial({ color: 0x22c55e });
//         const healthBar = new THREE.Mesh(healthGeometry, healthMaterial);
//         healthBar.position.z = 0.01; // Slightly in front of the background
//         healthBarContainer.add(healthBar);
//
//         // Position the health bar above the dummy
//         healthBarContainer.position.y = 3;
//         healthBarContainer.rotation.x = -Math.PI / 6; // Tilt slightly for better visibility
//
//         // Add to dummy
//         this.combatDummy.add(healthBarContainer);
//
//         // Store reference to the health bar for updates
//         this.combatDummy.userData.healthBar = healthBar;
//     }
//
//     updateDummyHealthBar() {
//         if (!this.combatDummy || !this.combatDummy.userData.healthBar) return;
//
//         const healthPercent = this.combatDummy.userData.health / this.combatDummy.userData.maxHealth;
//
//         // Update health bar scale
//         this.combatDummy.userData.healthBar.scale.x = Math.max(0.01, healthPercent);
//
//         // Update health bar position (keep it centered)
//         this.combatDummy.userData.healthBar.position.x = -0.6 * (1 - healthPercent);
//
//         // Update color based on health percentage
//         if (healthPercent > 0.6) {
//             this.combatDummy.userData.healthBar.material.color.set(0x22c55e); // Green
//         } else if (healthPercent > 0.3) {
//             this.combatDummy.userData.healthBar.material.color.set(0xf59e0b); // Yellow
//         } else {
//             this.combatDummy.userData.healthBar.material.color.set(0xef4444); // Red
//         }
//     }
//
//     attackCombatDummy() {
//         if (!this.combatDummy || !this.combatDummy.userData.isAlive) return false;
//
//         // Get player stats
//         const playerStats = this.gameState.getPlayerStats();
//
//         // Calculate damage based on player's attack stat
//         const damage = playerStats.attack;
//
//         // Apply damage to dummy
//         this.combatDummy.userData.health = Math.max(0, this.combatDummy.userData.health - damage);
//
//         // Update health bar
//         this.updateDummyHealthBar();
//
//         // Show damage message
//         this.showGameMessage(`Hit Combat Dummy for ${damage} damage!`, 1000);
//
//         // Check if dummy is defeated
//         if (this.combatDummy.userData.health <= 0) {
//             this.defeatCombatDummy();
//         }
//
//         return true;
//     }
//
//     defeatCombatDummy() {
//         // Hide the dummy
//         this.combatDummy.visible = false;
//         this.combatDummy.userData.isAlive = false;
//
//         // Show defeat message
//         this.showGameMessage('Combat Dummy defeated!', 2000);
//
//         // Set up respawn timer
//         this.combatDummy.userData.respawnTimer = setTimeout(() => {
//             // Reset health and show dummy again
//             this.combatDummy.userData.health = this.combatDummy.userData.maxHealth;
//             this.combatDummy.visible = true;
//             this.combatDummy.userData.isAlive = true;
//             this.updateDummyHealthBar();
//             this.showGameMessage('Combat Dummy has respawned!', 2000);
//             this.combatDummy.userData.respawnTimer = null;
//         }, 30000); // 30 seconds
//     }
//
//     createDetailedForge() {
//         // Create a temporary group to hold the forge while it's loading
//         this.forge = new THREE.Group();
//         this.forge.position.set(0, 0, -10);
//         this.scene.add(this.forge);
//
//         // Create forge light
//         this.forgeLight = new THREE.PointLight(0xffaa33, 2, 100);
//         this.forgeLight.castShadow = true;
//
//         // Load the glTF model
//         const loader = new THREE.GLTFLoader();
//         loader.load(
//             'assets/forge.glb', // Assuming you've changed this to forge.glb
//             (gltf) => {
//                 const modelScene = gltf.scene;
//
//                 // --- Add these lines to scale and position the model ---
//                 // Example: Scale the model (e.g., make it 5 times larger)
//                 // You might need to experiment with these values
//                 const desiredScale = 10; // Adjust this value as needed
//                 modelScene.scale.set(desiredScale, desiredScale, desiredScale);
//
//                 // Example: Adjust the model's vertical position
//                 // If the model's pivot is at its base, 0 would put it on the ground.
//                 // If its pivot is in the center, you might need to lift it by half its scaled height.
//                 // You might need to experiment with this value.
//                 modelScene.position.y = 7; // Adjust this value as needed
//                 // For example, if ground is at y=0 and model pivot is at its base:
//                 // modelScene.position.y = 0;
//                 // Or, if you want its base to be slightly above ground, e.g. y = 0.5:
//                 // modelScene.position.y = 0.5;
//                 // ---------------------------------------------------------
//
//                 // Add the loaded model to the forge group
//                 this.forge.add(modelScene);
//
//                 // Apply shadows to all meshes in the model
//                 modelScene.traverse((node) => {
//                     if (node.isMesh) {
//                         node.castShadow = true;
//                         node.receiveShadow = true;
//                     }
//                 });
//
//                 // Find the forge fire to add the light
//                 const forgeFire = modelScene.getObjectByName('ForgeFire');
//                 if (forgeFire) {
//                     forgeFire.add(this.forgeLight);
//                 } else {
//                     // If fire not found, add light to the main group
//                     this.forgeLight.position.set(0, 1.5, 0); // This might also need adjustment based on new model
//                     this.forge.add(this.forgeLight);
//                 }
//
//                 console.log('Forge model loaded successfully');
//             },
//             (xhr) => {
//                 console.log((xhr.loaded / xhr.total * 100) + '% loaded');
//             },
//             (error) => {
//                 console.error('An error happened loading the forge model:', error);
//                 // Fallback to create a simple placeholder if loading fails
//                 this.createFallbackForge();
//             }
//         );
//     }
//
//     createFallbackForge() {
//         console.log('Creating fallback forge');
//
//         // Clear the forge group
//         while(this.forge.children.length > 0) {
//             this.forge.remove(this.forge.children[0]);
//         }
//
//         // Create simple placeholder meshes
//         const forgeBase = new THREE.Mesh(
//             new THREE.BoxGeometry(4, 1, 4),
//             new THREE.MeshStandardMaterial({ color: 0x888888 })
//         );
//         forgeBase.position.y = 0.5;
//         forgeBase.castShadow = true;
//         this.forge.add(forgeBase);
//
//         const forgeFire = new THREE.Mesh(
//             new THREE.BoxGeometry(2, 1, 2),
//             new THREE.MeshBasicMaterial({ color: 0xffaa33 })
//         );
//         forgeFire.position.y = 1.5;
//         this.forge.add(forgeFire);
//
//         // Add the light to the fire
//         this.forgeLight.position.set(0, 0, 0);
//         forgeFire.add(this.forgeLight);
//
//         this.scene.add(this.forge);
//     }
//
//     // Game action methods
//     togglePause() {
//         const isPaused = this.gameState.togglePause();
//         document.getElementById('pause-menu').style.display = isPaused ? 'flex' : 'none';
//
//         if (isPaused) {
//             if (document.pointerLockElement) document.exitPointerLock();
//         } else {
//             document.body.requestPointerLock();
//             this.lastTime = performance.now();
//         }
//     }
//
//     toggleTool(tool, force = false) {
//         const newTool = this.gameState.toggleTool(tool, force);
//         if (newTool) {
//             this.pickaxe.visible = (newTool === 'pickaxe');
//             this.axe.visible = (newTool === 'axe');
//             this.updateInventoryDisplay();
//             this.showGameMessage(`Equipped ${newTool}`, 1000);
//         }
//     }
//
//     startAction() {
//         if (this.gameState.isInteracting) return;
//
//         // Get player stats and equipment
//         const playerStats = this.gameState.getPlayerStats();
//         const mainHandItem = playerStats.equipment.mainHand ?
//             this.gameState.getEquipment(playerStats.equipment.mainHand) : null;
//
//         // Check if player has a weapon equipped
//         const hasWeapon = mainHandItem && mainHandItem.type === 'weapon';
//
//         // If player has a weapon, check for combat dummy in range
//         if (hasWeapon && this.combatDummy && this.combatDummy.visible) {
//             const distSq = this.player.position.distanceToSquared(this.combatDummy.position);
//
//             if (distSq < this.INTERACTION_DISTANCE * this.INTERACTION_DISTANCE) {
//                 // Attack the combat dummy
//                 this.attackCombatDummy();
//                 return;
//             }
//         }
//
//         // If no weapon or no dummy in range, proceed with normal resource gathering
//         let target, duration;
//         const equippedTool = this.gameState.getEquippedTool();
//         const resourceList = equippedTool === 'pickaxe' ? this.ores : this.trees;
//
//         let closestDistSq = this.INTERACTION_DISTANCE * this.INTERACTION_DISTANCE;
//         resourceList.forEach(res => {
//             if (res.visible) {
//                 const distSq = this.player.position.distanceToSquared(res.position);
//                 if (distSq < closestDistSq) {
//                     closestDistSq = distSq;
//                     target = res;
//                 }
//             }
//         });
//
//         if (target) {
//             this.gameState.startAction(target);
//             duration = equippedTool === 'pickaxe' ? this.MINE_DURATION : this.CHOP_DURATION;
//
//             const resourceName = target.userData.resourceType === 'ore'
//                 ? target.userData.type
//                 : target.userData.resourceType;
//
//             this.showGameMessage(`Gathering ${resourceName}...`, duration + 100);
//         } else {
//             // If we have a weapon but no dummy in range
//             if (hasWeapon) {
//                 this.showGameMessage('No targets in range.', 1500);
//             } else {
//                 this.showGameMessage(
//                     `No ${equippedTool === 'pickaxe' ? 'ore' : 'trees'} in range.`,
//                     1500
//                 );
//             }
//         }
//     }
//
//     toggleForgeUI() {
//         const forgeUI = document.getElementById('forge-ui');
//         const distSq = this.player.position.distanceToSquared(this.forge.position);
//
//         if (forgeUI.style.display === 'none' && distSq < (this.INTERACTION_DISTANCE * this.INTERACTION_DISTANCE)) {
//             forgeUI.style.display = 'block';
//             if (document.pointerLockElement) document.exitPointerLock();
//         } else {
//             forgeUI.style.display = 'none';
//         }
//
//         // Hide equipment UI if forge UI is shown
//         if (forgeUI.style.display === 'block') {
//             document.getElementById('equipment-ui').style.display = 'none';
//         }
//     }
//
//     toggleEquipmentUI(show) {
//         const equipmentUI = document.getElementById('equipment-ui');
//         const forgeUI = document.getElementById('forge-ui');
//
//         // If show is undefined, toggle based on current state
//         if (show === undefined) {
//             show = equipmentUI.style.display === 'none';
//         }
//
//         if (show) {
//             equipmentUI.style.display = 'block';
//             forgeUI.style.display = 'none';
//             if (document.pointerLockElement) document.exitPointerLock();
//             this.updateEquipmentUI();
//         } else {
//             equipmentUI.style.display = 'none';
//         }
//     }
//
//     updateEquipmentUI() {
//         const playerStats = this.gameState.getPlayerStats();
//         const equipment = this.gameState.getAllEquipment();
//
//         // Update player stats
//         document.getElementById('equipment-health').textContent = `${Math.floor(playerStats.health)}/${playerStats.maxHealth}`;
//         document.getElementById('equipment-armor').textContent = playerStats.armor;
//         document.getElementById('equipment-attack').textContent = playerStats.attack;
//
//         // Update equipment slots
//         Object.entries(playerStats.equipment).forEach(([slot, itemId]) => {
//             const slotElement = document.querySelector(`.equipment-slot.${slot}`);
//             if (!slotElement) return;
//
//             if (itemId) {
//                 const item = this.gameState.getEquipment(itemId);
//                 if (item) {
//                     slotElement.innerHTML = `
//                         <div class="equipped-item" data-item-id="${item.id}">
//                             ${item.type.charAt(0).toUpperCase()}
//                         </div>
//                     `;
//                     slotElement.title = item.name;
//                 }
//             } else {
//                 slotElement.innerHTML = slot.charAt(0).toUpperCase() + slot.slice(1);
//                 slotElement.title = '';
//             }
//         });
//
//         // Update equipment inventory
//         const inventoryPanel = document.getElementById('equipment-inventory');
//         if (Object.keys(equipment).length === 0) {
//             inventoryPanel.innerHTML = '<p>No equipment available</p>';
//         } else {
//             let html = '';
//             Object.values(equipment).forEach(item => {
//                 html += `
//                     <div class="inventory-slot equipment-item" data-item-id="${item.id}">
//                         <div class="icon-placeholder" style="background-color:#4a5568;">${item.type.charAt(0).toUpperCase()}</div>
//                         <span>${item.name}</span>
//                     </div>
//                 `;
//             });
//             inventoryPanel.innerHTML = html;
//
//             // Add click event listeners to equipment items
//             document.querySelectorAll('#equipment-inventory .equipment-item').forEach(item => {
//                 item.addEventListener('click', () => {
//                     this.showEquipmentDetails(item.dataset.itemId);
//                 });
//             });
//         }
//     }
//
//     handleEquipmentSlotClick(slot) {
//         const playerStats = this.gameState.getPlayerStats();
//         const itemId = playerStats.equipment[slot];
//
//         if (itemId) {
//             // If there's an item in the slot, show its details
//             this.showEquipmentDetails(itemId);
//         } else {
//             // If the slot is empty, show a list of items that can be equipped in this slot
//             this.showEquipmentForSlot(slot);
//         }
//     }
//
//     showEquipmentForSlot(slot) {
//         const equipment = this.gameState.getAllEquipment();
//         const validTypes = {
//             head: ['helmet'],
//             chest: ['chestplate'],
//             legs: ['leggings'],
//             hands: ['gauntlets'],
//             feet: ['boots'],
//             mainHand: ['weapon'],
//             offHand: ['weapon', 'shield']
//         }[slot] || [];
//
//         // Filter equipment by valid types for this slot
//         const validEquipment = Object.values(equipment).filter(item =>
//             validTypes.includes(item.type)
//         );
//
//         if (validEquipment.length === 0) {
//             this.showGameMessage(`No equipment available for ${slot} slot`, 2000);
//             return;
//         }
//
//         // Create a modal to show valid equipment
//         let modal = document.getElementById('equipment-slot-modal');
//         if (!modal) {
//             modal = document.createElement('div');
//             modal.id = 'equipment-slot-modal';
//             modal.className = 'equipment-modal';
//             document.body.appendChild(modal);
//         }
//
//         // Create list of equipment items
//         let itemsHtml = '';
//         validEquipment.forEach(item => {
//             itemsHtml += `
//                 <div class="inventory-slot equipment-item" data-item-id="${item.id}" data-slot="${slot}">
//                     <div class="icon-placeholder" style="background-color:#4a5568;">${item.type.charAt(0).toUpperCase()}</div>
//                     <span>${item.name}</span>
//                     ${item.stats.attack ? `<span class="item-stat">ATK: ${item.stats.attack}</span>` : ''}
//                     ${item.stats.armor ? `<span class="item-stat">ARM: ${item.stats.armor}</span>` : ''}
//                 </div>
//             `;
//         });
//
//         // Show equipment list
//         modal.innerHTML = `
//             <div class="equipment-modal-content">
//                 <h3>Select Equipment for ${slot.charAt(0).toUpperCase() + slot.slice(1)}</h3>
//                 <div class="equipment-list">
//                     ${itemsHtml}
//                 </div>
//                 <button id="close-equipment-slot-modal" class="close-button">Close</button>
//             </div>
//         `;
//
//         modal.style.display = 'flex';
//
//         // Add event listeners
//         document.getElementById('close-equipment-slot-modal').addEventListener('click', () => {
//             modal.style.display = 'none';
//         });
//
//         document.querySelectorAll('#equipment-slot-modal .equipment-item').forEach(item => {
//             item.addEventListener('click', () => {
//                 const itemId = item.dataset.itemId;
//                 const slot = item.dataset.slot;
//                 this.gameState.equipItem(slot, itemId);
//                 this.updateEquipmentUI();
//                 this.updateInventoryDisplay();
//                 modal.style.display = 'none';
//             });
//         });
//     }
//
//     // Update methods
//     updatePlayer(deltaTime) {
//         if (this.gameState.isInteracting) return;
//
//         const moveSpeed = this.playerSpeed * (deltaTime / (1000/60));
//         const forward = new THREE.Vector3();
//         this.player.getWorldDirection(forward);
//         const right = new THREE.Vector3().crossVectors(this.WORLD_UP, forward).normalize();
//
//         if (this.gameState.isKeyPressed('w') || this.gameState.isKeyPressed('arrowup')) {
//             this.player.position.addScaledVector(forward, -moveSpeed);
//         }
//
//         if (this.gameState.isKeyPressed('s') || this.gameState.isKeyPressed('arrowdown')) {
//             this.player.position.addScaledVector(forward, moveSpeed);
//         }
//
//         if (this.gameState.isKeyPressed('a') || this.gameState.isKeyPressed('arrowleft')) {
//             this.player.position.addScaledVector(right, -moveSpeed);
//         }
//
//         if (this.gameState.isKeyPressed('d') || this.gameState.isKeyPressed('arrowright')) {
//             this.player.position.addScaledVector(right, moveSpeed);
//         }
//
//         // Constrain player to map boundaries
//         this.player.position.x = Math.max(
//             -this.MAP_SIZE / 2 + this.playerRadius,
//             Math.min(this.MAP_SIZE / 2 - this.playerRadius, this.player.position.x)
//         );
//
//         this.player.position.z = Math.max(
//             -this.MAP_SIZE / 2 + this.playerRadius,
//             Math.min(this.MAP_SIZE / 2 - this.playerRadius, this.player.position.z)
//         );
//     }
//
//     updateAction(deltaTime) {
//         if (!this.gameState.isInteracting || !this.gameState.currentActionTarget) return;
//
//         const equippedTool = this.gameState.getEquippedTool();
//         const tool = equippedTool === 'pickaxe' ? this.pickaxe : this.axe;
//         const duration = equippedTool === 'pickaxe' ? this.MINE_DURATION : this.CHOP_DURATION;
//
//         // Update tool animation
//         this.renderSystem.updateToolAnimation(tool, this.gameState.actionProgress, duration);
//
//         // Update action progress
//         const result = this.gameState.updateAction(deltaTime, duration);
//
//         if (result && result.completed) {
//             this.showGameMessage(`+1 ${result.resourceKey}!`, 2000);
//             this.updateInventoryDisplay();
//
//             // Hide the resource and set up respawn
//             this.renderSystem.hideResource(this.gameState.currentActionTarget);
//             const targetToRespawn = this.gameState.currentActionTarget;
//
//             if (targetToRespawn.userData.respawnTimer === null) {
//                 targetToRespawn.userData.respawnTimer = setTimeout(() => {
//                     this.renderSystem.showResource(targetToRespawn);
//                     targetToRespawn.userData.respawnTimer = null;
//                 }, 20000 + Math.random() * 10000);
//             }
//
//             // Reset tool position
//             this.renderSystem.resetToolPosition(tool);
//         }
//     }
//
//     updateSmelting(deltaTime) {
//         const result = this.gameState.updateSmelting(deltaTime, this.SMELT_DURATION);
//
//         if (result) {
//             if (result.completed) {
//                 this.showGameMessage(`+1 ${result.oreType} Ingot!`, 2000);
//                 this.updateInventoryDisplay();
//             }
//
//             if (document.getElementById('forge-ui').style.display === 'block') {
//                 this.updateForgeUI();
//             }
//         }
//     }
//
//     // UI methods
//     messageTimeout = null;
//     showGameMessage(message, duration = 3000) {
//         const box = document.getElementById('message-box');
//         box.textContent = message;
//         box.style.opacity = '1';
//         clearTimeout(this.messageTimeout);
//         this.messageTimeout = setTimeout(() => { box.style.opacity = '0'; }, duration);
//     }
//
//     updateInventoryDisplay() {
//         const container = document.getElementById('inventory-display');
//         const structuredInventory = this.gameState.getStructuredInventory();
//         const playerStats = this.gameState.getPlayerStats();
//         const equippedTool = this.gameState.getEquippedTool();
//
//         // Start with player stats
//         let html = `
//             <div class="inventory-category">Player Stats</div>
//             <div class="inventory-slot">
//                 <div class="icon-placeholder" style="background-color:#ef4444;">HP</div>
//                 <span>Health: ${Math.floor(playerStats.health)}/${playerStats.maxHealth}</span>
//             </div>
//             <div class="inventory-slot">
//                 <div class="icon-placeholder" style="background-color:#6b7280;">AR</div>
//                 <span>Armor: ${playerStats.armor}</span>
//             </div>
//             <div class="inventory-slot">
//                 <div class="icon-placeholder" style="background-color:#ef4444;">AT</div>
//                 <span>Attack: ${playerStats.attack}</span>
//             </div>
//
//             <div class="inventory-category">Tools</div>
//             <div class="inventory-slot bg-slate-700">
//                 <div class="icon-placeholder">T</div>
//                 <span>${equippedTool.charAt(0).toUpperCase() + equippedTool.slice(1)}</span>
//             </div>
//
//             <div class="inventory-category">Resources</div>
//         `;
//
//         // Add resources
//         const resources = structuredInventory.resources;
//         const resourceColors = {
//             wood: '#A0522D',
//             copper: '#b87333',
//             iron: '#808080',
//             gold: '#FFD700',
//             silver: '#C0C0C0',
//             mithril: '#9bc4e2',
//             adamantite: '#800080',
//             obsidian: '#310062',
//             coal: '#36454F'
//         };
//
//         Object.entries(resources).forEach(([key, value]) => {
//             if (value > 0 || ['wood', 'copper', 'iron', 'gold'].includes(key)) {
//                 const symbol = key.substring(0, 2).charAt(0).toUpperCase() + key.substring(0, 2).charAt(1);
//                 html += `
//                     <div class="inventory-slot">
//                         <div class="icon-placeholder" style="background-color:${resourceColors[key] || '#4a5568'};">${symbol}</div>
//                         <span>${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}</span>
//                     </div>
//                 `;
//             }
//         });
//
//         // Add materials
//         html += `<div class="inventory-category">Materials</div>`;
//         const materials = structuredInventory.materials;
//         const materialColors = {
//             copperIngot: '#f97316',
//             ironIngot: '#9ca3af',
//             goldIngot: '#facc15',
//             silverIngot: '#e5e7eb',
//             mithrilIngot: '#3b82f6',
//             adamantiteIngot: '#a855f7',
//             workedObsidian: '#4b5563',
//             bronzeIngot: '#d97706',
//             steelIngot: '#6b7280',
//             electrumIngot: '#fbbf24',
//             mithrilSteelIngot: '#2563eb',
//             adamantiteSteelIngot: '#7e22ce'
//         };
//
//         Object.entries(materials).forEach(([key, value]) => {
//             if (value > 0 || ['copperIngot', 'ironIngot', 'goldIngot'].includes(key)) {
//                 const displayName = key.replace('Ingot', '').charAt(0).toUpperCase() + key.replace('Ingot', '').slice(1);
//                 html += `
//                     <div class="inventory-slot">
//                         <div class="icon-placeholder" style="background-color:${materialColors[key] || '#4a5568'};"></div>
//                         <span>${displayName}: ${value}</span>
//                     </div>
//                 `;
//             }
//         });
//
//         // Add equipment
//         html += `<div class="inventory-category">Equipment</div>`;
//         const equipment = structuredInventory.equipment;
//
//         if (Object.keys(equipment).length === 0) {
//             html += `
//                 <div class="inventory-slot">
//                     <span>No equipment</span>
//                 </div>
//             `;
//         } else {
//             Object.values(equipment).forEach(item => {
//                 html += `
//                     <div class="inventory-slot equipment-item" data-item-id="${item.id}">
//                         <div class="icon-placeholder" style="background-color:#4a5568;">${item.type.charAt(0).toUpperCase()}</div>
//                         <span>${item.name}</span>
//                     </div>
//                 `;
//             });
//         }
//
//         container.innerHTML = html;
//
//         // Add click event listeners to equipment items
//         document.querySelectorAll('.equipment-item').forEach(item => {
//             item.addEventListener('click', () => {
//                 this.showEquipmentDetails(item.dataset.itemId);
//             });
//         });
//
//         // Update health bar in HUD
//         this.updateHealthDisplay(playerStats.health, playerStats.maxHealth);
//     }
//
//     updateHealthDisplay(health, maxHealth) {
//         let healthBarContainer = document.getElementById('health-bar-container');
//         let healthBarElement;
//         let healthTextElement;
//
//         if (!healthBarContainer) {
//             healthBarContainer = document.createElement('div');
//             healthBarContainer.id = 'health-bar-container';
//             healthBarContainer.className = 'health-bar-container';
//
//             healthBarElement = document.createElement('div');
//             healthBarElement.id = 'health-bar';
//             healthBarElement.className = 'health-bar';
//
//             healthTextElement = document.createElement('div');
//             healthTextElement.id = 'health-text';
//             healthTextElement.className = 'health-text';
//
//             healthBarContainer.appendChild(healthBarElement);
//             healthBarContainer.appendChild(healthTextElement);
//             document.getElementById('ui-overlay').appendChild(healthBarContainer);
//         } else {
//             // If the container already exists, find its child elements
//             healthBarElement = document.getElementById('health-bar');
//             healthTextElement = document.getElementById('health-text');
//         }
//
//         // Ensure elements are available before trying to update them
//         if (healthBarElement && healthTextElement) {
//             const healthPercent = (health / maxHealth) * 100;
//             healthBarElement.style.width = `${healthPercent}%`;
//             healthTextElement.textContent = `${Math.floor(health)}/${maxHealth}`;
//
//             // Update color based on health percentage
//             if (healthPercent > 60) {
//                 healthBarElement.style.backgroundColor = '#22c55e'; // Green
//             } else if (healthPercent > 30) {
//                 healthBarElement.style.backgroundColor = '#f59e0b'; // Yellow
//             } else {
//                 healthBarElement.style.backgroundColor = '#ef4444'; // Red
//             }
//         } else {
//             console.error('Health bar elements not found!');
//         }
//     }
//
//     showEquipmentDetails(itemId) {
//         const item = this.gameState.getEquipment(itemId);
//         if (!item) return;
//
//         // Create a modal to show equipment details
//         let modal = document.getElementById('equipment-modal');
//         if (!modal) {
//             modal = document.createElement('div');
//             modal.id = 'equipment-modal';
//             modal.className = 'equipment-modal';
//             document.body.appendChild(modal);
//         }
//
//         // Determine which slots this item can be equipped in
//         const validSlots = {
//             weapon: ['mainHand', 'offHand'],
//             shield: ['offHand'],
//             helmet: ['head'],
//             chestplate: ['chest'],
//             leggings: ['legs'],
//             gauntlets: ['hands'],
//             boots: ['feet']
//         }[item.type] || [];
//
//         // Create buttons for each valid slot
//         const slotButtons = validSlots.map(slot => {
//             const displayName = {
//                 head: 'Head',
//                 chest: 'Chest',
//                 legs: 'Legs',
//                 hands: 'Hands',
//                 feet: 'Feet',
//                 mainHand: 'Main Hand',
//                 offHand: 'Off Hand'
//             }[slot];
//
//             return `<button class="equip-slot-button" data-slot="${slot}" data-item-id="${itemId}">Equip to ${displayName}</button>`;
//         }).join('');
//
//         // Show item details and equip buttons
//         modal.innerHTML = `
//             <div class="equipment-modal-content">
//                 <h3>${item.name}</h3>
//                 <p>Type: ${item.type.charAt(0).toUpperCase() + item.type.slice(1)}</p>
//                 <p>Durability: ${item.durability}/${item.maxDurability}</p>
//                 ${item.stats.attack ? `<p>Attack: ${item.stats.attack}</p>` : ''}
//                 ${item.stats.armor ? `<p>Armor: ${item.stats.armor}</p>` : ''}
//                 <div class="equipment-actions">
//                     ${slotButtons}
//                 </div>
//                 <button id="close-equipment-modal" class="close-button">Close</button>
//             </div>
//         `;
//
//         modal.style.display = 'flex';
//
//         // Add event listeners
//         document.getElementById('close-equipment-modal').addEventListener('click', () => {
//             modal.style.display = 'none';
//         });
//
//         document.querySelectorAll('.equip-slot-button').forEach(button => {
//             button.addEventListener('click', () => {
//                 const slot = button.dataset.slot;
//                 const itemId = button.dataset.itemId;
//                 this.gameState.equipItem(slot, itemId);
//                 this.updateInventoryDisplay();
//                 modal.style.display = 'none';
//             });
//         });
//     }
//
//     updateForgeUI() {
//         const forgeState = this.gameState.getForgeState();
//         const structuredInventory = this.gameState.getStructuredInventory();
//         const inventory = this.gameState.getInventory(); // For backward compatibility
//
//         document.getElementById('forge-fuel-display').textContent = `${forgeState.fuel}`;
//         document.getElementById('forge-fuel-bar').style.width = `${(forgeState.fuel / forgeState.maxFuel) * 100}%`;
//
//         const statusDisplay = document.getElementById('smelting-status-display');
//         const progressBar = document.getElementById('smelting-progress-bar');
//
//         if (forgeState.isSmelting) {
//             statusDisplay.textContent = `Smelting ${forgeState.oreToSmelt}...`;
//             progressBar.style.width = `${forgeState.smeltingProgress * 100}%`;
//         } else {
//             statusDisplay.textContent = 'Idle';
//             progressBar.style.width = '0%';
//         }
//
//         // Update smelting buttons
//         document.querySelectorAll('.smelt-button[data-ore]').forEach(btn => {
//             const ore = btn.dataset.ore;
//             btn.classList.toggle(
//                 'disabled',
//                 forgeState.isSmelting ||
//                 forgeState.fuel < 5 ||
//                 structuredInventory.resources[ore] < 1
//             );
//         });
//
//         document.getElementById('add-fuel-button').classList.toggle(
//             'disabled',
//             structuredInventory.resources.wood < 10 || forgeState.fuel >= forgeState.maxFuel
//         );
//
//         // Update alloy recipes
//         this.updateAlloyRecipes();
//
//         // Update equipment recipes
//         this.updateEquipmentRecipes();
//
//         // Set up tab switching if not already done
//         if (!this.forgeTabsInitialized) {
//             this.initializeForgeTabSystem();
//         }
//     }
//
//     initializeForgeTabSystem() {
//         // Set up tab switching
//         document.querySelectorAll('.forge-tab-button').forEach(button => {
//             button.addEventListener('click', () => {
//                 // Deactivate all tabs
//                 document.querySelectorAll('.forge-tab-button').forEach(btn => {
//                     btn.classList.remove('active');
//                 });
//                 document.querySelectorAll('.forge-tab-content').forEach(content => {
//                     content.style.display = 'none';
//                 });
//
//                 // Activate selected tab
//                 button.classList.add('active');
//                 const tabId = button.dataset.tab;
//                 document.getElementById(`${tabId}-tab`).style.display = 'block';
//             });
//         });
//
//         // Set up craft category switching
//         document.querySelectorAll('.craft-category-button').forEach(button => {
//             button.addEventListener('click', () => {
//                 // Deactivate all category buttons
//                 document.querySelectorAll('.craft-category-button').forEach(btn => {
//                     btn.classList.remove('active');
//                 });
//
//                 // Activate selected category
//                 button.classList.add('active');
//                 this.updateEquipmentRecipes(button.dataset.category);
//             });
//         });
//
//         this.forgeTabsInitialized = true;
//     }
//
//     updateAlloyRecipes() {
//         const alloyRecipesContainer = document.getElementById('alloy-recipes');
//         const recipes = this.gameState.getRecipes().alloys;
//         const structuredInventory = this.gameState.getStructuredInventory();
//
//         let html = '';
//
//         recipes.forEach(recipe => {
//             // Check if player has materials
//             let canCraft = true;
//             let materialsHtml = '';
//
//             Object.entries(recipe.materials).forEach(([material, amount]) => {
//                 const materialType = material.includes('Ingot') ? 'materials' : 'resources';
//                 const materialName = material;
//                 const playerHas = structuredInventory[materialType][materialName] || 0;
//
//                 if (playerHas < amount) {
//                     canCraft = false;
//                 }
//
//                 const colorClass = playerHas >= amount ? 'text-green-400' : 'text-red-400';
//                 materialsHtml += `<span class="${colorClass}">${material.charAt(0).toUpperCase() + material.slice(1)}: ${playerHas}/${amount}</span>, `;
//             });
//
//             // Remove trailing comma and space
//             materialsHtml = materialsHtml.slice(0, -2);
//
//             html += `
//                 <div class="craft-item">
//                     <div class="craft-item-header">
//                         <div class="craft-item-name">${recipe.name}</div>
//                     </div>
//                     <div class="craft-item-materials">Materials: ${materialsHtml}</div>
//                     <button class="craft-button ${canCraft ? '' : 'disabled'}" data-alloy="${recipe.id}">
//                         Craft ${recipe.name}
//                     </button>
//                 </div>
//             `;
//         });
//
//         alloyRecipesContainer.innerHTML = html;
//
//         // Add event listeners to craft buttons
//         document.querySelectorAll('.craft-button[data-alloy]').forEach(button => {
//             if (button.classList.contains('disabled')) return;
//
//             button.addEventListener('click', () => {
//                 const alloyType = button.dataset.alloy;
//                 const success = this.gameState.craftAlloy(alloyType);
//
//                 if (success) {
//                     this.showGameMessage(`Crafted ${alloyType.replace('Ingot', '')} Ingot!`, 2000);
//                     this.updateInventoryDisplay();
//                     this.updateForgeUI();
//                 } else {
//                     this.showGameMessage('Crafting failed. Check materials.', 2000);
//                 }
//             });
//         });
//     }
//
//     updateEquipmentRecipes(category = 'weapons') {
//         const equipmentRecipesContainer = document.getElementById('equipment-recipes');
//         const recipes = this.gameState.getRecipes()[category];
//         const structuredInventory = this.gameState.getStructuredInventory();
//
//         let html = '';
//
//         recipes.forEach(recipe => {
//             // Check if player has materials
//             let canCraft = true;
//             let materialsHtml = '';
//
//             Object.entries(recipe.materials).forEach(([material, amount]) => {
//                 const materialType = material.includes('Ingot') ? 'materials' : 'resources';
//                 const materialName = material;
//                 const playerHas = structuredInventory[materialType][materialName] || 0;
//
//                 if (playerHas < amount) {
//                     canCraft = false;
//                 }
//
//                 const colorClass = playerHas >= amount ? 'text-green-400' : 'text-red-400';
//                 materialsHtml += `<span class="${colorClass}">${material.charAt(0).toUpperCase() + material.slice(1)}: ${playerHas}/${amount}</span>, `;
//             });
//
//             // Remove trailing comma and space
//             materialsHtml = materialsHtml.slice(0, -2);
//
//             // Build stats display
//             let statsHtml = '';
//             if (recipe.stats.attack) {
//                 statsHtml += `Attack: ${recipe.stats.attack}`;
//             }
//             if (recipe.stats.armor) {
//                 statsHtml += `Armor: ${recipe.stats.armor}`;
//             }
//
//             html += `
//                 <div class="craft-item">
//                     <div class="craft-item-header">
//                         <div class="craft-item-name">${recipe.name}</div>
//                         <div class="craft-item-stats">${statsHtml}</div>
//                     </div>
//                     <div class="craft-item-materials">Materials: ${materialsHtml}</div>
//                     <button class="craft-button ${canCraft ? '' : 'disabled'}" data-equipment="${recipe.id}">
//                         Craft ${recipe.name}
//                     </button>
//                 </div>
//             `;
//         });
//
//         equipmentRecipesContainer.innerHTML = html;
//
//         // Add event listeners to craft buttons
//         document.querySelectorAll('.craft-button[data-equipment]').forEach(button => {
//             if (button.classList.contains('disabled')) return;
//
//             button.addEventListener('click', () => {
//                 const equipmentType = button.dataset.equipment;
//                 const equipmentId = this.gameState.craftEquipment(equipmentType);
//
//                 if (equipmentId) {
//                     const equipment = this.gameState.getEquipment(equipmentId);
//                     this.showGameMessage(`Crafted ${equipment.name}!`, 2000);
//                     this.updateInventoryDisplay();
//                     this.updateForgeUI();
//                 } else {
//                     this.showGameMessage('Crafting failed. Check materials.', 2000);
//                 }
//             });
//         });
//     }
//
//     handleWindowResize() {
//         this.renderSystem.handleWindowResize();
//     }
//
//     // Main game loop
//     animate() {
//         this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
//
//         const currentTime = performance.now();
//         const deltaTime = currentTime - this.lastTime;
//         this.lastTime = currentTime;
//
//         if (this.gameState.isPaused) {
//             this.renderSystem.render();
//             return;
//         }
//
//         // Update forge light flicker
//         this.renderSystem.updateForgeLight();
//
//         // Update game state
//         this.updatePlayer(deltaTime);
//         this.updateAction(deltaTime);
//         this.updateSmelting(deltaTime);
//
//         // Update camera
//         this.renderSystem.updateCameraPosition(
//             this.player,
//             this.cameraOffset,
//             this.gameState.cameraPitch
//         );
//
//         // Render the scene
//         this.renderSystem.render();
//     }
// }
//
// export default Game;
