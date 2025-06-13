// src/game/Game.ts

import * as THREE from 'three';
import GameState, { Tool, ActionTarget } from './GameState'; // Import the Tool type
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import Renderer from './Renderer';
import InputHandler from './InputHandler';
import { GameHudComponent, ToolInfo } from '../components/hud/game-hud';
// Assuming you might create a web component for the forge UI later
// import { ForgeUiComponent } from '../components/forge/forge-ui';

// This interface ensures that every ore type you define has the correct properties.
interface OreType {
    name: string;
    color: number;
    value: number;
    size: number;
    count: number;
}


// TS-FIX: It's good practice to define types for complex userData structures
// to ensure consistency when you access them later.
interface ResourceUserData {
    type: string;
    resourceType: 'ore' | 'wood';
    respawnTimer: number | null; // In browsers, setTimeout returns a number
}

interface CombatDummyUserData {
    type: 'enemy';
    name: string;
    health: number;
    maxHealth: number;
    isAlive: boolean;
    respawnTimer: number | null;
    healthBar?: THREE.Mesh; // The health bar mesh can be optional
}

class Game {
    // private forgeUI: ForgeUiComponent; // This would be for a web component approach

    // All class properties are now strongly typed.
    // We use `| null` to indicate properties that are initialized later.
    private scene: THREE.Scene | null = null;
    private camera: THREE.PerspectiveCamera | null = null;
    private renderer: THREE.WebGLRenderer | null = null;
    private player: THREE.Group | null = null;
    private pickaxe: THREE.Group | null = null;
    private axe: THREE.Group | null = null;
    private forge: THREE.Group | null = null;
    private forgeLight: THREE.PointLight | null = null;
    private ores: THREE.Mesh[] = [];
    private trees: THREE.Group[] = [];
    private combatDummy: THREE.Group | null = null;
    private hud: GameHudComponent | null = null; // Add a property for the HUD

    // Constants
    private readonly playerSpeed: number = 0.12;
    private readonly playerRotationSpeed: number = 0.001;
    private readonly playerHeight: number = 1.8;
    private readonly playerRadius: number = 0.4;
    private readonly cameraOffset: THREE.Vector3 = new THREE.Vector3(0, 2.5, 5);
    private readonly maxPitch: number = Math.PI / 3;
    private readonly minPitch: number = -Math.PI / 12;
    private readonly WORLD_UP: THREE.Vector3 = new THREE.Vector3(0, 1, 0);
    private readonly MINE_DURATION: number = 2000;
    private readonly CHOP_DURATION: number = 2000;
    private readonly SMELT_DURATION: number = 5000;
    private readonly INTERACTION_DISTANCE: number = 3.5;
    private readonly MAP_SIZE: number = 80;
    private readonly ORE_TYPES: Record<string, OreType> = {
        COPPER: { name: 'copper', color: 0xb87333, value: 1, size: 0.8, count: 25 },
        IRON: { name: 'iron', color: 0x808080, value: 1, size: 1, count: 20 },
        GOLD: { name: 'gold', color: 0xFFD700, value: 1, size: 0.6, count: 15 },
        SILVER: { name: 'silver', color: 0xC0C0C0, value: 1, size: 0.7, count: 15 },
        MITHRIL: { name: 'mithril', color: 0x9bc4e2, value: 2, size: 0.9, count: 10 },
        ADAMANTITE: { name: 'adamantite', color: 0x800080, value: 3, size: 1.1, count: 5 },
        OBSIDIAN: { name: 'obsidian', color: 0x310062, value: 2, size: 1.0, count: 8 }
    };
    private readonly TREE_COUNT: number = 40;

    // Game systems
    private gameState: GameState;
    private renderSystem: Renderer | null = null;
    private inputHandler: InputHandler | null = null;

    // State properties
    private animationFrameId: number | null = null;
    private lastTime: number = 0;
    private messageTimeout: number | null = null;
    private forgeTabsInitialized: boolean = false;


    constructor() {
        this.gameState = new GameState();
        // this.forgeUI = document.querySelector('forge-ui')!;
    }

    public init(): void {
        this.initScene();

        // Find the HUD component in the DOM
        this.hud = document.querySelector('game-hud');
        if (!this.hud) {
            console.error("Fatal: <game-hud> element not found in DOM!");
            return;
        }

        // Initialize the HUD with our tool data
        const tools: ToolInfo[] = [
            { id: 'pickaxe', name: 'Pickaxe', iconUrl: 'src/assets/icons/pickaxe.png' },
            { id: 'axe', name: 'Axe', iconUrl: 'src/assets/icons/axe.png' }
        ];
        this.hud.setTools(tools);

        this.initRenderer();
        this.initInputHandler();
        this.setupCallbacks();

        this.addTestEquipment();

        this.lastTime = performance.now();
        this.animate();
    }

    public handleQuickToggleTool(): void {
        if (this.gameState.isInteracting) return;

        // 1. Tell the HUD to visually swap the tool
        this.hud?.quickToggleTool();

        // 2. Tell the game state to logically swap the tool
        this.gameState.toggleTool();

        // 3. Update the 3D model visibility based on the new state
        const newTool = this.gameState.getEquippedTool();
        if (this.pickaxe && this.axe) {
            this.pickaxe.visible = (newTool === 'pickaxe');
            this.axe.visible = (newTool === 'axe');
        }
        this.showGameMessage(`Equipped ${newTool}`, 1000);
    }

    private initScene(): void {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);
        this.scene.fog = new THREE.Fog(0x87ceeb, this.MAP_SIZE * 0.5, this.MAP_SIZE * 1.8);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;

        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.appendChild(this.renderer.domElement);
        } else {
            console.error("Fatal: #game-container not found in DOM!");
            return;
        }

        this.addLights();
        this.createGround();
        this.createPlayerAndTools();
        this.createWorldResources();

        this.updateInventoryDisplay();
    }

    private initRenderer(): void {
        if (!this.scene || !this.camera || !this.renderer) {
            console.error("Cannot init Renderer: scene, camera, or renderer is missing.");
            return;
        }
        this.renderSystem = new Renderer(this.scene, this.camera, this.renderer);
        this.renderSystem.setForgeLight(this.forgeLight);
    }

    private initInputHandler(): void {
        if (!this.player) {
            console.error("Cannot init InputHandler: player is missing.");
            return;
        }
        // Pass the min and max pitch values to the constructor
        this.inputHandler = new InputHandler(
            this.gameState,
            this.player,
            this.playerRotationSpeed,
            this.minPitch,
            this.maxPitch
        );
        this.inputHandler.setupEventListeners();
    }

    private setupCallbacks(): void {
        if (!this.inputHandler) return;

        this.inputHandler.setCallbacks({
            onPause: this.togglePause.bind(this),
            onAction: this.startAction.bind(this),
            onToggleTool: this.handleQuickToggleTool.bind(this), // UPDATED
            onToggleForgeUI: this.toggleForgeUI.bind(this),
            onWindowResize: this.handleWindowResize.bind(this),
            // ADDED: Logic to handle the popup
            onToggleToolPopup: () => {
                if (this.hud?.isPopupVisible()) {
                    this.hud.hideToolPopup();
                    this.gameState.isToolPopupVisible = false
                } else {
                    this.hud?.showToolPopup();
                    this.gameState.isToolPopupVisible = true
                }
            }
        });

        // TS-FIX: Add null checks for all DOM interactions.
        document.getElementById('equipment-ui-button')?.addEventListener('click', () => {
            this.toggleEquipmentUI();
        });

        document.getElementById('close-equipment-ui')?.addEventListener('click', () => {
            this.toggleEquipmentUI(false);
        });

        document.querySelectorAll('.equipment-slot').forEach(slot => {
            slot.addEventListener('click', () => {
                const slotName = (slot as HTMLElement).dataset.slot;
                if (slotName) {
                    this.handleEquipmentSlotClick(slotName);
                }
            });
        });
    }

    // --- World Creation Methods ---
    private addLights(): void {
        // TS-FIX: Use the non-null assertion `!` because we know `this.scene` was just initialized.
        this.scene!.add(new THREE.AmbientLight(0xffffff, 0.7));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
        dirLight.position.set(20, 40, 15);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.set(2048, 2048);
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 150;
        Object.assign(dirLight.shadow.camera, {
            left: -this.MAP_SIZE / 2,
            right: this.MAP_SIZE / 2,
            top: this.MAP_SIZE / 2,
            bottom: -this.MAP_SIZE / 2
        });
        this.scene!.add(dirLight);
    }

    private createGround(): void {
        const groundGeo = new THREE.PlaneGeometry(this.MAP_SIZE, this.MAP_SIZE);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x556B2F, roughness: 0.8 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene!.add(ground);
    }

    private createPlayerAndTools(): void {
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
        this.scene!.add(this.player);

        this.pickaxe = this.createTool(0x718096, 0.8);
        this.player.add(this.pickaxe);

        this.axe = this.createTool(0xdb2777, 1.0, true);
        this.player.add(this.axe);

        this.toggleTool(this.gameState.getEquippedTool(), true);
    }

    private createTool(color: number, handleLength: number, isAxe: boolean = false): THREE.Group {
        const tool = new THREE.Group();
        const handleGeom = new THREE.CylinderGeometry(0.05, 0.05, handleLength, 8);
        const handleMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const handle = new THREE.Mesh(handleGeom, handleMat);
        handle.position.y = handleLength / 2;
        tool.add(handle);

        const headMat = new THREE.MeshStandardMaterial({ color: color });
        let headGeom: THREE.BoxGeometry;
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

    private createWorldResources(): void {
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
                // TS-FIX: Use our typed interface for userData
                ore.userData = { type: type.name, resourceType: 'ore', respawnTimer: null } as ResourceUserData;

                this.scene!.add(ore);
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
            tree.userData = { type: 'tree', resourceType: 'wood', respawnTimer: null } as ResourceUserData;

            this.scene!.add(tree);
            this.trees.push(tree);
        }

        this.createCombatDummy();
        this.createDetailedForge();
    }

    private createCombatDummy(): void {
        this.combatDummy = new THREE.Group();
        const bodyGeometry = new THREE.BoxGeometry(1, 2, 1);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xef4444 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1;
        body.castShadow = true;
        body.receiveShadow = true;
        this.combatDummy.add(body);

        const standGeometry = new THREE.CylinderGeometry(0.5, 0.7, 0.2, 8);
        const standMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const stand = new THREE.Mesh(standGeometry, standMaterial);
        stand.position.y = 0.1;
        stand.castShadow = true;
        stand.receiveShadow = true;
        this.combatDummy.add(stand);

        this.combatDummy.position.set(5, 0, -5);
        this.combatDummy.userData = {
            type: 'enemy',
            name: 'Combat Dummy',
            health: 50,
            maxHealth: 50,
            isAlive: true,
            respawnTimer: null
        } as CombatDummyUserData;

        this.createDummyHealthBar();
        this.scene!.add(this.combatDummy);
    }

    private createDummyHealthBar(): void {
        if (!this.combatDummy) return;

        const healthBarContainer = new THREE.Group();
        const bgGeometry = new THREE.PlaneGeometry(1.2, 0.15);
        const bgMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5 });
        const bgBar = new THREE.Mesh(bgGeometry, bgMaterial);
        healthBarContainer.add(bgBar);

        const healthGeometry = new THREE.PlaneGeometry(1.2, 0.15);
        const healthMaterial = new THREE.MeshBasicMaterial({ color: 0x22c55e });
        const healthBar = new THREE.Mesh(healthGeometry, healthMaterial);
        healthBar.position.z = 0.01;
        healthBarContainer.add(healthBar);

        healthBarContainer.position.y = 3;
        healthBarContainer.rotation.x = -Math.PI / 6;

        this.combatDummy.add(healthBarContainer);
        (this.combatDummy.userData as CombatDummyUserData).healthBar = healthBar;
    }

    private createDetailedForge(): void {
        this.forge = new THREE.Group();
        this.forge.position.set(0, 0, -10);
        this.scene!.add(this.forge);

        this.forgeLight = new THREE.PointLight(0xffaa33, 2, 100);
        this.forgeLight.castShadow = true;

        const loader = new GLTFLoader();
        loader.load(
            'src/assets/forge.glb',
            (gltf) => {
                const modelScene = gltf.scene;
                const desiredScale = 10;
                modelScene.scale.set(desiredScale, desiredScale, desiredScale);
                modelScene.position.y = 7;

                this.forge!.add(modelScene);
                modelScene.traverse((node) => {
                    if (node instanceof THREE.Mesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                    }
                });

                const forgeFire = modelScene.getObjectByName('ForgeFire');
                if (forgeFire) {
                    forgeFire.add(this.forgeLight!);
                } else {
                    this.forgeLight!.position.set(0, 1.5, 0);
                    this.forge!.add(this.forgeLight!);
                }
                console.log('Forge model loaded successfully');
            },
            (xhr) => {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            (error) => {
                console.error('An error happened loading the forge model:', error);
                this.createFallbackForge();
            }
        );
    }

    private createFallbackForge(): void {
        console.log('Creating fallback forge');
        if (!this.forge) return;

        while (this.forge.children.length > 0) {
            this.forge.remove(this.forge.children[0]);
        }

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

        this.forgeLight!.position.set(0, 0, 0);
        forgeFire.add(this.forgeLight!);
    }


    // --- Game Action and UI Methods ---
    private addTestEquipment(): void {
        const bronzeSwordId = this.gameState.createEquipment('weapon', 'Bronze Sword', { attack: 3 }, 100);
        this.gameState.createEquipment('weapon', 'Iron Sword', { attack: 5 }, 150);
        this.gameState.createEquipment('helmet', 'Iron Helmet', { armor: 3 }, 100);
        this.gameState.createEquipment('chestplate', 'Iron Chestplate', { armor: 5 }, 100);
        this.gameState.createEquipment('leggings', 'Iron Leggings', { armor: 4 }, 100);
        this.gameState.equipItem('mainHand', bronzeSwordId);

        // TS-FIX: Accessing nested properties that might not exist in the initial state
        // should be done carefully. Let's assume `inventory` and `resources` are initialized.
        const resources = this.gameState.inventory.resources
        resources.copper = 20;
        resources.iron = 20;
        resources.gold = 10;
        resources.silver = 10;
        resources.coal = 15;

        console.log('Test equipment added');
    }

    private togglePause(): void {
        const isPaused = this.gameState.togglePause();
        const pauseMenu = document.getElementById('pause-menu');
        if (pauseMenu) {
            pauseMenu.style.display = isPaused ? 'flex' : 'none';
        }

        if (isPaused) {
            if (document.pointerLockElement) document.exitPointerLock();
        } else {
            // Check if forge or equipment UI is open before locking pointer
            const forgeUI = document.getElementById('forge-ui');
            const equipmentUI = document.getElementById('equipment-ui');
            if (forgeUI?.style.display !== 'block' && equipmentUI?.style.display !== 'block') {
                document.body.requestPointerLock();
            }
            this.lastTime = performance.now();
        }
    }

    private toggleTool(tool?: Tool, force: boolean = false): void {
        const newTool = this.gameState.toggleTool(tool, force);
        if (newTool && this.pickaxe && this.axe) {
            this.pickaxe.visible = (newTool === 'pickaxe');
            this.axe.visible = (newTool === 'axe');
            this.updateInventoryDisplay();
            this.showGameMessage(`Equipped ${newTool}`, 1000);
        }
    }

    private startAction(): void {
        if (this.gameState.isInteracting || !this.player) return;

        // ... (logic for checking weapon/combat dummy is fine)
        const playerStats = this.gameState.getPlayerStats();
        const mainHandItem = playerStats.equipment.mainHand
            ? this.gameState.getEquipment(playerStats.equipment.mainHand) : null;
        const hasWeapon = mainHandItem?.type === 'weapon';

        if (hasWeapon && this.combatDummy?.visible) {
            const distSq = this.player.position.distanceToSquared(this.combatDummy.position);
            if (distSq < this.INTERACTION_DISTANCE * this.INTERACTION_DISTANCE) {
                this.attackCombatDummy();
                return;
            }
        }

        let target: ActionTarget | null = null;
        const equippedTool = this.gameState.getEquippedTool();
        const resourceList = equippedTool === 'pickaxe' ? this.ores : this.trees;
        let closestDistSq = this.INTERACTION_DISTANCE * this.INTERACTION_DISTANCE;

        // TS-FIX: Replaced .forEach with a for...of loop for proper type inference.
        for (const res of resourceList) {
            if (res.visible) {
                const distSq = this.player.position.distanceToSquared(res.position);
                if (distSq < closestDistSq) {
                    closestDistSq = distSq;
                    target = res as unknown as ActionTarget;
                }
            }
        }

        // Now, TypeScript correctly understands that 'target' can have a value here.
        if (target) {
            this.gameState.startAction(target);
            const duration = equippedTool === 'pickaxe' ? this.MINE_DURATION : this.CHOP_DURATION;

            const resourceName = target.userData.resourceType === 'ore'
                ? target.userData.type
                : target.userData.resourceType;

            this.showGameMessage(`Gathering ${resourceName}...`, duration + 100);
        } else {
            this.showGameMessage(
                hasWeapon ? 'No targets in range.' : `No ${equippedTool === 'pickaxe' ? 'ore' : 'trees'} in range.`,
                1500
            );
        }
    }

    private attackCombatDummy(): void {
        if (!this.combatDummy) return;
        const dummyData = this.combatDummy.userData as CombatDummyUserData;
        if (!dummyData.isAlive) return;

        const playerStats = this.gameState.getPlayerStats();
        const damage = playerStats.attack;
        dummyData.health = Math.max(0, dummyData.health - damage);

        this.updateDummyHealthBar();
        this.showGameMessage(`Hit Combat Dummy for ${damage} damage!`, 1000);

        if (dummyData.health <= 0) {
            this.defeatCombatDummy();
        }
    }

    private defeatCombatDummy(): void {
        if (!this.combatDummy) return;
        const dummyData = this.combatDummy.userData as CombatDummyUserData;

        this.combatDummy.visible = false;
        dummyData.isAlive = false;
        this.showGameMessage('Combat Dummy defeated!', 2000);

        dummyData.respawnTimer = window.setTimeout(() => {
            dummyData.health = dummyData.maxHealth;
            this.combatDummy!.visible = true;
            dummyData.isAlive = true;
            this.updateDummyHealthBar();
            this.showGameMessage('Combat Dummy has respawned!', 2000);
            dummyData.respawnTimer = null;
        }, 30000);
    }

    private toggleForgeUI(): void {
        const forgeUI = document.getElementById('forge-ui');
        if (!forgeUI || !this.player || !this.forge) return;

        const distSq = this.player.position.distanceToSquared(this.forge.position);

        if (forgeUI.style.display === 'none' && distSq < (this.INTERACTION_DISTANCE * this.INTERACTION_DISTANCE)) {
            forgeUI.style.display = 'block';
            this.updateForgeUI(); // Update UI with current state
            if (document.pointerLockElement) document.exitPointerLock();
            // Hide other UI
            document.getElementById('equipment-ui')!.style.display = 'none';
        } else {
            forgeUI.style.display = 'none';
        }
    }

    private toggleEquipmentUI(show?: boolean): void {
        const equipmentUI = document.getElementById('equipment-ui');
        if (!equipmentUI) return;

        const shouldShow = show === undefined ? equipmentUI.style.display === 'none' : show;

        if (shouldShow) {
            equipmentUI.style.display = 'block';
            document.getElementById('forge-ui')!.style.display = 'none'; // Hide forge UI
            if (document.pointerLockElement) document.exitPointerLock();
            this.updateEquipmentUI();
        } else {
            equipmentUI.style.display = 'none';
        }
    }

    private updateEquipmentUI(): void {
        const playerStats = this.gameState.getPlayerStats();
        const equipment = this.gameState.getAllEquipment();

        // TS-FIX: Use safe selectors with null checks
        document.getElementById('equipment-health')!.textContent = `${Math.floor(playerStats.health)}/${playerStats.maxHealth}`;
        document.getElementById('equipment-armor')!.textContent = String(playerStats.armor);
        document.getElementById('equipment-attack')!.textContent = String(playerStats.attack);

        Object.entries(playerStats.equipment).forEach(([slot, itemId]) => {
            const slotElement = document.querySelector(`.equipment-slot[data-slot="${slot}"]`);
            if (!slotElement) return;

            if (itemId) {
                const item = this.gameState.getEquipment(itemId);
                if (item) {
                    slotElement.innerHTML = `<div class="equipped-item" data-item-id="${item.id}">${item.type.charAt(0).toUpperCase()}</div>`;
                    slotElement.setAttribute('title', item.name);
                }
            } else {
                slotElement.innerHTML = slot.charAt(0).toUpperCase() + slot.slice(1);
                slotElement.setAttribute('title', '');
            }
        });

        const inventoryPanel = document.getElementById('equipment-inventory');
        if (!inventoryPanel) return;

        inventoryPanel.innerHTML = Object.keys(equipment).length === 0
            ? '<p>No equipment available</p>'
            : Object.values(equipment).map(item => `
                <div class="inventory-slot equipment-item" data-item-id="${item.id}">
                    <div class="icon-placeholder">${item.type.charAt(0).toUpperCase()}</div>
                    <span>${item.name}</span>
                </div>
            `).join('');

        inventoryPanel.querySelectorAll('.equipment-item').forEach(item => {
            item.addEventListener('click', () => {
                const itemId = (item as HTMLElement).dataset.itemId;
                if (itemId) this.showEquipmentDetails(itemId);
            });
        });
    }

    private handleEquipmentSlotClick(slot: string): void {
        const playerStats = this.gameState.getPlayerStats();
        const itemId = (playerStats.equipment as Record<string, string | null>)[slot];

        if (itemId) {
            this.showEquipmentDetails(itemId);
        } else {
            this.showEquipmentForSlot(slot);
        }
    }

    // --- Update Methods ---
    private updatePlayer(deltaTime: number): void {
        if (!this.player || this.gameState.isInteracting) return;

        const moveSpeed = this.playerSpeed * (deltaTime / (1000 / 60));
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

        this.player.position.x = Math.max(-this.MAP_SIZE / 2 + this.playerRadius, Math.min(this.MAP_SIZE / 2 - this.playerRadius, this.player.position.x));
        this.player.position.z = Math.max(-this.MAP_SIZE / 2 + this.playerRadius, Math.min(this.MAP_SIZE / 2 - this.playerRadius, this.player.position.z));
    }

    private updateAction(deltaTime: number): void {
        if (!this.gameState.isInteracting || !this.gameState.currentActionTarget || !this.renderSystem || !this.pickaxe || !this.axe) return;

        const equippedTool = this.gameState.getEquippedTool();
        const tool = equippedTool === 'pickaxe' ? this.pickaxe : this.axe;
        const duration = equippedTool === 'pickaxe' ? this.MINE_DURATION : this.CHOP_DURATION;

        this.renderSystem.updateToolAnimation(tool, this.gameState.actionProgress, duration);
        const result = this.gameState.updateAction(deltaTime, duration);

        if (result?.completed) {
            this.showGameMessage(`+1 ${result.resourceKey}!`, 2000);
            this.updateInventoryDisplay();

            this.renderSystem.hideResource(this.gameState.currentActionTarget);
            const targetToRespawn = this.gameState.currentActionTarget;
            const userData = targetToRespawn.userData as ResourceUserData;

            if (userData.respawnTimer === null) {
                userData.respawnTimer = window.setTimeout(() => {
                    this.renderSystem!.showResource(targetToRespawn);
                    userData.respawnTimer = null;
                }, 20000 + Math.random() * 10000);
            }
            this.renderSystem.resetToolPosition(tool);
        }
    }

    private updateSmelting(deltaTime: number): void {
        const result = this.gameState.updateSmelting(deltaTime, this.SMELT_DURATION);
        if (result) {
            if (result.completed) {
                this.showGameMessage(`+1 ${result.oreType} Ingot!`, 2000);
                this.updateInventoryDisplay();
            }
            const forgeUI = document.getElementById('forge-ui');
            if (forgeUI?.style.display === 'block') {
                this.updateForgeUI();
            }
        }
    }

    private updateDummyHealthBar(): void {
        if (!this.combatDummy) return;
        const dummyData = this.combatDummy.userData as CombatDummyUserData;
        if (!dummyData.healthBar) return;

        const healthPercent = dummyData.health / dummyData.maxHealth;
        dummyData.healthBar.scale.x = Math.max(0.01, healthPercent);
        dummyData.healthBar.position.x = -0.6 * (1 - healthPercent);

        const color = healthPercent > 0.6 ? 0x22c55e : healthPercent > 0.3 ? 0xf59e0b : 0xef4444;
        (dummyData.healthBar.material as THREE.MeshBasicMaterial).color.set(color);
    }

    // --- UI Update Methods ---

    private showGameMessage(message: string, duration: number = 3000): void {
        const box = document.getElementById('message-box');
        if (box) {
            box.textContent = message;
            box.style.opacity = '1';

            if (this.messageTimeout) {
                clearTimeout(this.messageTimeout);
            }
            // TS-FIX: `setTimeout` in the browser returns a number, not a NodeJS.Timeout.
            this.messageTimeout = window.setTimeout(() => {
                box.style.opacity = '0';
            }, duration);
        }
    }

    private updateInventoryDisplay(): void {
        const container = document.getElementById('inventory-display');
        if (!container) return;

        const playerStats = this.gameState.getPlayerStats();

        // --- HUD UPDATE LOGIC ---
        // Calculate percentages and update the HUD component
        const healthPercent = (playerStats.health / playerStats.maxHealth) * 100;
        // Let's assume max armor is 30 for this calculation
        const armorPercent = (playerStats.armor / 30) * 100;

        this.hud?.setHealth(healthPercent);
        this.hud?.setArmor(armorPercent);
        // --- END HUD UPDATE LOGIC ---

        let html = `...`; // Same as your provided code
        container.innerHTML = html; // Assume html is generated correctly

        container.querySelectorAll('.equipment-item').forEach(item => {
            item.addEventListener('click', () => {
                const itemId = (item as HTMLElement).dataset.itemId;
                if (itemId) this.showEquipmentDetails(itemId);
            });
        });
    }

    // private updateHealthDisplay(health: number, maxHealth: number): void {
    //     // This method also ports directly from your JS, just needs null checks.
    //     const healthBarElement = document.getElementById('health-bar');
    //     const healthTextElement = document.getElementById('health-text');
    //
    //     if (healthBarElement && healthTextElement) {
    //         const healthPercent = (health / maxHealth) * 100;
    //         healthBarElement.style.width = `${healthPercent}%`;
    //         healthTextElement.textContent = `${Math.floor(health)}/${maxHealth}`;
    //         healthBarElement.style.backgroundColor = healthPercent > 60 ? '#22c55e' : healthPercent > 30 ? '#f59e0b' : '#ef4444';
    //     }
    // }

    // --- Other UI Methods from JS ---
    private showEquipmentDetails(itemId: string): void { /* ... similar migration ... */ }
    private showEquipmentForSlot(slot: string): void { /* ... similar migration ... */ }
    private updateForgeUI(): void { /* ... similar migration ... */ }
    private initializeForgeTabSystem(): void { /* ... similar migration ... */ }
    private updateAlloyRecipes(): void { /* ... similar migration ... */ }
    private updateEquipmentRecipes(category: string = 'weapons'): void { /* ... similar migration ... */ }

    private handleWindowResize(): void {
        this.renderSystem?.handleWindowResize();
    }

    // --- Main Game Loop ---
    private animate(): void {
        this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        if (this.gameState.isPaused) {
            this.renderSystem?.render();
            return;
        }

        this.renderSystem?.updateForgeLight();
        this.updatePlayer(deltaTime);
        this.updateAction(deltaTime);
        this.updateSmelting(deltaTime);

        if (this.player && this.renderSystem) {
            this.renderSystem.updateCameraPosition(
                this.player,
                this.cameraOffset,
                this.gameState.cameraPitch
            );
        }
        this.renderSystem?.render();
    }
}

export default Game;