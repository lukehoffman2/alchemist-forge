// src/game/Game.ts

import * as THREE from 'three';
import GameState, { Tool, ActionTarget } from './GameState'; // Import the Tool type
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import Renderer from './Renderer';
import InputHandler from './InputHandler';
import { GameHudComponent, ToolInfo } from '../components/hud/game-hud';
import { ForgeUiComponent } from '../components/forge/forge-ui';
import { EquipmentUiComponent } from '../components/equipment/equipment-ui';

// This interface ensures that every ore type you define has the correct properties.
interface OreType {
    name: string;
    color: number;
    value: number;
    size: number;
    count: number;
}


// It's good practice to define types for complex userData structures
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
    private forgeUi: ForgeUiComponent | null = null;
    private equipmentUi: EquipmentUiComponent | null = null;

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
    private hud: GameHudComponent | null = null;

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
    private wasPointerLockedBeforePopup: boolean = false;


    constructor() {
        this.gameState = new GameState();
    }

    public async init(): Promise<void> {
        this.initScene();

        await Promise.all([
            customElements.whenDefined('game-hud'),
            customElements.whenDefined('forge-ui'),
            customElements.whenDefined('equipment-ui')
        ]);

        // THE BELOW COMMENTS MAY BE USEFUL FOR DEBUGGING LATER
        // console.log("Waiting for UI components to be defined...");
        //
        // await customElements.whenDefined('game-hud');
        // console.log("✅ Game HUD is ready.");
        //
        // await customElements.whenDefined('equipment-ui');
        // console.log("✅ Equipment UI is ready.");
        //
        // console.log("⏳ Waiting for Forge UI...");
        // await customElements.whenDefined('forge-ui');
        // console.log("✅ Forge UI is ready."); // <--- My guess is you will NOT see this log message.
        //
        // console.log("All UI components are ready!");

        // Find the HUD component in the DOM
        this.hud = document.querySelector<GameHudComponent>('game-hud');
        if (!this.hud) {
            console.error("Fatal: <game-hud> element not found in DOM!");
            return;
        }

        // Find the ForgeUI component in the DOM
        this.forgeUi = document.querySelector<ForgeUiComponent>('forge-ui');
        if (!this.forgeUi) {
            console.error("Fatal: <forge-ui> element not found in DOM! Make sure it's in index.html.");
        }

        this.equipmentUi = document.querySelector<EquipmentUiComponent>('equipment-ui');
        if (!this.equipmentUi) {
            console.error("Fatal: <equipment-ui> element not found in DOM! Make sure it's in index.html.");
        } else {
            // Listen to events from the component to manage pointer lock
            this.equipmentUi.addEventListener('equipment-ui-opened', () => {
                if (document.pointerLockElement) {
                    this.wasPointerLockedBeforePopup = true; // Remember state
                    document.exitPointerLock();
                } else {
                    this.wasPointerLockedBeforePopup = false;
                }
            });
            this.equipmentUi.addEventListener('equipment-ui-closed', () => {
                if (this.wasPointerLockedBeforePopup && !this.gameState.isPaused) {
                    document.body.requestPointerLock();
                }
                this.wasPointerLockedBeforePopup = false; // Reset flag
            });
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

        this.updatePlayerStatsDisplay();
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
            onToggleTool: this.handleQuickToggleTool.bind(this),
            onToggleForgeUI: this.toggleForgeUI.bind(this),
            onToggleEquipmentUI: this.toggleEquipmentUI.bind(this),
            onWindowResize: this.handleWindowResize.bind(this),
            onToggleToolPopup: () => {
                if (this.hud?.isPopupVisible()) {
                    this.hud.hideToolPopup();
                    this.gameState.isToolPopupVisible = false;
                    if (this.wasPointerLockedBeforePopup && !this.gameState.isPaused) {
                        document.body.requestPointerLock();
                    }
                    this.wasPointerLockedBeforePopup = false;
                } else {
                    if (document.pointerLockElement) {
                        this.wasPointerLockedBeforePopup = true;
                        document.exitPointerLock();
                    } else {
                        this.wasPointerLockedBeforePopup = false;
                    }
                    this.hud?.showToolPopup();
                    this.gameState.isToolPopupVisible = true;
                }
            },
            onToggleInventory: () => {
                if (this.hud) {
                    const newVisibility = this.gameState.toggleInventoryVisibility();
                    this.hud.toggleInventoryDisplay(newVisibility);
                    if (newVisibility) {
                        this.hud.setInventory(this.gameState.getStructuredInventory());
                    }
                }
            }
        });

        if (this.hud) {
            this.hud.addEventListener('tool-selected', (event: Event) => {
                const customEvent = event as CustomEvent<{ toolId: Tool }>;
                if (customEvent.detail && customEvent.detail.toolId) {
                    this.handleToolSelectionFromPopup(customEvent.detail.toolId);
                }
            });
        }
    }

    private handleToolSelectionFromPopup(selectedToolId: Tool): void {
        this.gameState.toggleTool(selectedToolId, true);

        if (this.hud) {
            this.hud.setActiveTool(selectedToolId);
        }

        if (this.pickaxe && this.axe) {
            this.pickaxe.visible = (selectedToolId === 'pickaxe');
            this.axe.visible = (selectedToolId === 'axe');
        }

        if (this.hud) {
            this.hud.hideToolPopup();
        }

        this.gameState.isToolPopupVisible = false;

        if (this.wasPointerLockedBeforePopup && !this.gameState.isPaused) {
            document.body.requestPointerLock();
        }
        this.wasPointerLockedBeforePopup = false;

        this.showGameMessage(`Equipped ${selectedToolId}`, 1000);
    }

    // --- World Creation Methods ---
    private addLights(): void {
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
                ore.userData = { type: type.name, resourceType: 'ore', respawnTimer: null } as ResourceUserData;

                this.scene!.add(ore);
                this.ores.push(ore);
            }
        });

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
            undefined, // onProgress callback is not used
            (error) => {
                console.error('An error happened loading the forge model:', error);
                this.createFallbackForge();
            }
        );
    }

    private createFallbackForge(): void {
        console.log('Creating fallback forge');
        if (!this.forge) return;

        // FIX 1: Safely remove all children to prevent an infinite loop.
        for (let i = this.forge.children.length - 1; i >= 0; i--) {
            this.forge.remove(this.forge.children[i]);
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

        const resources = this.gameState.inventory.resources
        resources.copper = 20;
        resources.iron = 20;
        resources.gold = 10;
        resources.silver = 10;
        resources.coal = 15;

        console.log('Test equipment added');
        this.updatePlayerStatsDisplay(); // Update stats display after adding equipment
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
            // Re-lock pointer only if no other major UI panel is open
            if (!this.forgeUi?.isVisible() && !this.equipmentUi?.isVisible()) {
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
            this.showGameMessage(`Equipped ${newTool}`, 1000);
        }
    }

    private startAction(): void {
        if (this.gameState.isInteracting || !this.player) return;

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

        for (const res of resourceList) {
            if (res.visible) {
                const distSq = this.player.position.distanceToSquared(res.position);
                if (distSq < closestDistSq) {
                    closestDistSq = distSq;
                    target = res as unknown as ActionTarget;
                }
            }
        }

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

    // --- (FIX 3) Centralized UI Panel Management ---
    private setActiveUIPanel(panel: 'forge' | 'equipment' | 'none'): void {
        const wasForgeVisible = this.forgeUi?.isVisible() ?? false;
        const wasEquipmentVisible = this.equipmentUi?.isVisible() ?? false;
        const wasAnyPanelVisible = wasForgeVisible || wasEquipmentVisible;

        // Hide all panels first
        this.forgeUi?.hide();
        this.equipmentUi?.hide();
        if (this.hud && this.gameState.isInventoryVisible) {
            this.gameState.toggleInventoryVisibility();
            this.hud.toggleInventoryDisplay(false);
        }

        let isAPanelVisible = false;

        // Show the requested panel
        if (panel === 'forge') {
            this.forgeUi?.show();
            this.forgeUi?.update(this.gameState); // Update content when opened
            isAPanelVisible = true;
        } else if (panel === 'equipment') {
            this.equipmentUi?.show();
            this.equipmentUi?.update(this.gameState); // Update content when opened
            isAPanelVisible = true;
        }

        // Manage pointer lock
        if (isAPanelVisible && !wasAnyPanelVisible) {
            // A panel was just opened
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }
        } else if (!isAPanelVisible && wasAnyPanelVisible) {
            // The last panel was just closed
            if (!this.gameState.isPaused) {
                document.body.requestPointerLock();
            }
        }
    }

    private toggleForgeUI(): void {
        if (!this.player || !this.forge) return;

        const isVisible = this.forgeUi?.isVisible() ?? false;

        if (!isVisible) {
            const distSq = this.player.position.distanceToSquared(this.forge.position);
            if (distSq < (this.INTERACTION_DISTANCE * this.INTERACTION_DISTANCE)) {
                this.setActiveUIPanel('forge');
            }
        } else {
            this.setActiveUIPanel('none');
        }
    }

    private toggleEquipmentUI(): void {
        const isVisible = this.equipmentUi?.isVisible() ?? false;
        this.setActiveUIPanel(isVisible ? 'none' : 'equipment');
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
        const actionTarget = this.gameState.currentActionTarget;

        this.renderSystem.updateToolAnimation(tool, this.gameState.actionProgress, duration);
        const result = this.gameState.updateAction(deltaTime, duration);

        if (result?.completed) {
            // FIX 2: Capture userData before the target object state might change.
            const userData = actionTarget.userData as ResourceUserData;

            this.showGameMessage(`+1 ${result.resourceKey}!`, 2000);

            // FIX 4: Update inventory display only when it changes.
            if (this.hud && this.gameState.isInventoryVisible) {
                this.hud.setInventory(this.gameState.getStructuredInventory());
            }

            this.renderSystem.hideResource(actionTarget);

            if (userData.respawnTimer === null) {
                userData.respawnTimer = window.setTimeout(() => {
                    this.renderSystem!.showResource(actionTarget);
                    userData.respawnTimer = null;
                }, 20000 + Math.random() * 10000);
            }
            this.renderSystem.resetToolPosition(tool);
        }
    }

    private updateSmelting(deltaTime: number): void {
        const result = this.gameState.updateSmelting(deltaTime, this.SMELT_DURATION);
        if (result?.completed) {
            this.showGameMessage(`+1 ${result.oreType} Ingot!`, 2000);

            // FIX 4: Update UIs only when data changes.
            if (this.forgeUi?.isVisible()) {
                this.forgeUi.update(this.gameState);
            }
            // CORRECTED: Check the GameState, which is the single source of truth.
            if (this.gameState.isInventoryVisible && this.hud) {
                this.hud.setInventory(this.gameState.getStructuredInventory());
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
            this.messageTimeout = window.setTimeout(() => {
                box.style.opacity = '0';
            }, duration);
        }
    }

    private updatePlayerStatsDisplay(): void {
        if (!this.hud) return;
        const playerStats = this.gameState.getPlayerStats();
        const healthPercent = (playerStats.health / playerStats.maxHealth) * 100;
        this.hud.setHealth(healthPercent);
        this.hud.setArmor(playerStats.armor, playerStats.maxHealth);
    }

    // FIX 6: Removed obsolete UI methods like showEquipmentDetails, showEquipmentForSlot, etc.
    // Component-based UI handles its own internal logic.

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

        // FIX 4: Removed per-frame UI updates from the game loop.
        // Updates are now triggered by events (e.g., gathering, smelting, opening UI).

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