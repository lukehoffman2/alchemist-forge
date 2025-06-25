// src/game/Game.ts

import * as THREE from 'three';
import GameState, { Tool, ActionTarget } from './GameState';
// GLTFLoader might not be needed directly here if WorldManager handles all loading
import Renderer from './Renderer';
import InputHandler from './InputHandler';
import { WorldManager, ResourceUserData, CombatDummyUserData } from './WorldManager';
import { PlayerManager } from './PlayerManager';
import { UIManager, UIManagerCallbacks } from './UIManager'; // Import UIManager

class Game {
    // UI components (forgeUi, equipmentUi, loadingScreenComponent, hud) are now managed by UIManager.
    private loadingManager: THREE.LoadingManager | null = null;

    // All class properties are now strongly typed.
    // We use `| null` to indicate properties that are initialized later.
    private scene: THREE.Scene | null = null;
    private camera: THREE.PerspectiveCamera | null = null;
    private renderer: THREE.WebGLRenderer | null = null;
    // player, pickaxe, axe are in PlayerManager
    // forge, forgeLight, ores, trees, combatDummy are in WorldManager
    // hud is in UIManager
    private worldManager: WorldManager | null = null;
    private playerManager: PlayerManager | null = null;
    private uiManager: UIManager | null = null; // Add UIManager instance

    // Constants
    // playerSpeed, playerRotationSpeed, playerHeight, playerRadius, WORLD_UP moved to PlayerManager
    // UI-related constants/configs might be in UIManager if not passed.
    private readonly cameraOffset: THREE.Vector3 = new THREE.Vector3(0, 2.5, 5);
    private readonly maxPitch: number = Math.PI / 3;
    private readonly minPitch: number = -Math.PI / 12;
    // WORLD_UP might still be needed if camera calculations rely on it, otherwise remove.
    // For now, assuming it's only for player movement.
    private readonly MINE_DURATION: number = 2000;
    private readonly CHOP_DURATION: number = 2000;
    private readonly SMELT_DURATION: number = 5000;
    private readonly INTERACTION_DISTANCE: number = 3.5;
    // MAP_SIZE, ORE_TYPES, TREE_COUNT are now in WorldManager

    // Game systems
    private readonly gameState: GameState;
    private renderSystem: Renderer | null = null;
    private inputHandler: InputHandler | null = null;
    // messageTimeout and wasPointerLockedBeforePopup are now managed by UIManager

    // State properties
    private animationFrameId: number | null = null;
    private lastTime: number = 0;
    // messageTimeout, wasPointerLockedBeforePopup moved to UIManager


    constructor() {
        this.gameState = new GameState();
    }

    public async init(): Promise<void> {
        // GameState is already initialized in the constructor
        this.uiManager = new UIManager(this.gameState);

        const uiManagerCallbacks: UIManagerCallbacks = {
            // This is still needed for when a tool is selected from the popup
            onToolSelected: (toolId: Tool) => this.handleToolSelectionFromPopup(toolId),

            // UIManager calls this when it receives an input event to toggle the forge
            onRequestToggleForgeUI: () => this.handleToggleForgeUI(),

            // UIManager calls this for the equipment panel
            onRequestToggleEquipmentUI: () => this.handleToggleEquipmentUI(),

            // This is called from UIManager when a popup closes to handle re-locking the pointer
            onHandlePointerLockForPopupClose: (wasPointerLockedBeforePopup: boolean) => {
                if (wasPointerLockedBeforePopup && !this.gameState.isPaused) {
                    document.body.requestPointerLock();
                }
            },

            // This is called by UIManager when it receives an input event to toggle the tool popup
            onRequestToggleToolPopup: () => {
                // We can now use the centralized logic in UIManager
                this.uiManager?.handleToggleToolPopupRequest();
            },

            // This is for toggling the inventory display
            onRequestToggleInventory: () => {
                const newVisibility = this.gameState.toggleInventoryVisibility();
                this.uiManager?.toggleInventoryDisplay(newVisibility);
                if (newVisibility) {
                    this.uiManager?.setInventory(this.gameState.getStructuredInventory());
                }
            },

            // This allows the UI resume button to pause the game
            onPause: () => this.togglePause(),
        };

        await this.uiManager.init(uiManagerCallbacks);

        // Populate inventory if it's visible by default
        if (this.gameState.isInventoryVisible) {
            this.uiManager.setInventory(this.gameState.getStructuredInventory());
        }

        // --- FIX STARTS HERE ---
        // Manually and proactively show the loading screen.
        // This guarantees it is visible while the rest of the game initializes.
        this.uiManager.showLoadingScreen();
        this.uiManager.updateLoadingProgress("Initializing game systems...", 0, 1);
        // --- FIX ENDS HERE ---

        await this.initCoreGameSystems(); // loadingManager is created here, UIManager already has loadingScreenComponent reference

        this.initRenderer(); // Depends on the scene and camera
        this.initInputHandler();
        this.setupCallbacks();

        this.addTestEquipment();

        this.lastTime = performance.now();
        this.animate();
    }

    public handleQuickToggleTool(): void {
        if (this.gameState.isInteracting) return;

        this.uiManager?.updateHudQuickToggle(); // UIManager handles HUD visual swap
        this.gameState.toggleTool(); // GameState handles logical swap
        const newTool = this.gameState.getEquippedTool();
        this.playerManager?.updateToolVisuals(newTool); // PlayerManager handles 3D model
        this.uiManager?.showGameMessage(`Equipped ${newTool}`, 1000);
    }

    private async initCoreGameSystems(): Promise<void> {
        // 1. Setup LoadingManager & Scene
        this.loadingManager = new THREE.LoadingManager();
        // ... (loadingManager callbacks) ...

        // The onStart callback no longer needs to call showLoadingScreen(),
        // but it's perfect for updating the text to show what's loading.
        this.loadingManager.onStart = (url, itemsLoaded, itemsTotal) => {
            this.uiManager?.updateLoadingProgress(url, itemsLoaded, itemsTotal);
            console.log(`Started loading: ${url} (${itemsLoaded}/${itemsTotal})`);
        };

        this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
            this.uiManager?.updateLoadingProgress(url, itemsLoaded, itemsTotal);
            console.log(`Loading file: ${url} (${itemsLoaded}/${itemsTotal})`);
        };

        // This remains critical. It will hide the screen when all assets are loaded.
        this.loadingManager.onLoad = () => {
            this.uiManager?.hideLoadingScreen();
            console.log('All assets loaded.');
        };

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);

        // 2. Instantiate all managers
        this.worldManager = new WorldManager(this.scene, this.loadingManager!);
        this.playerManager = new PlayerManager(this.scene!, this.gameState);

        // 3. Set scene properties that depend on managers
        const mapSize = this.worldManager.getMapSize();
        this.scene.fog = new THREE.Fog(0x87ceeb, mapSize * 0.5, mapSize * 1.8);

        // 4. Initialize managers and await async operations
        this.playerManager.init(); // This is synchronous, creates the player object
        await this.worldManager.init(); // This is async, loads models

        // 5. Setup Camera and Renderer
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

        // 6. Final HUD update
        this.updatePlayerStatsHud();
    }

    private initRenderer(): void {
        if (!this.scene || !this.camera || !this.renderer || !this.worldManager) {
            console.error("Cannot init Renderer: scene, camera, renderer or worldManager is missing.");
            return;
        }
        this.renderSystem = new Renderer(this.scene, this.camera, this.renderer);
        this.renderSystem.setForgeLight(this.worldManager.forgeLight);
    }

    private initInputHandler(): void {
        if (!this.playerManager || !this.playerManager.getPlayer()) {
            console.error("Cannot init InputHandler: playerManager or player is missing.");
            return;
        }
        // Pass the min and max pitch values to the constructor
        // Also pass player object from PlayerManager and its rotation speed
        this.inputHandler = new InputHandler(
            this.gameState,
            this.playerManager.getPlayer()!,
            this.playerManager.playerRotationSpeed,
            this.minPitch,
            this.maxPitch
        );
        this.inputHandler.setupEventListeners();
    }

    private setupCallbacks(): void {
        if (!this.inputHandler || !this.uiManager) return;

        this.inputHandler.setCallbacks({
            onPause: () => this.togglePause(),
            onAction: () => this.startAction(),
            onToggleTool: () => this.handleQuickToggleTool(),
            onToggleForgeUI: () => this.handleToggleForgeUI(),
            onToggleEquipmentUI: () => this.handleToggleEquipmentUI(),
            onWindowResize: () => this.handleWindowResize(),
            onToggleToolPopup: () => this.uiManager!.handleToggleToolPopupRequest(),
            onToggleInventory: () => this.uiManager!.handleToggleInventoryRequest()
        });
    }

    // This method is now primarily game logic, UI interaction is handled by UIManager or its callbacks
    private handleToolSelectionFromPopup(selectedToolId: Tool): void {
        this.gameState.toggleTool(selectedToolId, true); // Game state update
        this.playerManager?.updateToolVisuals(selectedToolId); // Player 3D model update
        this.uiManager?.setHudActiveTool(selectedToolId);
        this.uiManager?.hideToolPopup(); // Hide the popup itself
        // Pointer lock logic is handled by UIManager callback
        this.uiManager?.showGameMessage(`Equipped ${selectedToolId}`, 1000);
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
        this.updatePlayerStatsHud();
    }

    private togglePause(): void {
        const isPaused = this.gameState.togglePause();
        this.uiManager?.togglePauseMenu(isPaused);

        if (isPaused) {
            if (document.pointerLockElement) document.exitPointerLock();
        } else {
            // UIManager's setActiveUIPanel or specific panel toggle methods handle pointer lock on close.
            // For resume, we might need to explicitly request pointer lock if no other UI is open.
             if (!this.uiManager?.forgeUi?.isVisible() && !this.uiManager?.equipmentUi?.isVisible()) {
                 document.body.requestPointerLock();
             }
            this.lastTime = performance.now(); // Reset lastTime for deltaTime calculation
        }
    }

    private startAction(): void {
        const currentPlayer = this.playerManager?.getPlayer();
        if (this.gameState.isInteracting || !currentPlayer) return;

        const playerStats = this.gameState.getPlayerStats();
        const mainHandItem = playerStats.equipment.mainHand
            ? this.gameState.getEquipment(playerStats.equipment.mainHand) : null;
        const hasWeapon = mainHandItem?.type === 'weapon';

        if (hasWeapon && this.worldManager?.combatDummy?.visible) {
            const distSq = currentPlayer.position.distanceToSquared(this.worldManager.combatDummy.position);
            if (distSq < this.INTERACTION_DISTANCE * this.INTERACTION_DISTANCE) {
                this.attackCombatDummy();
                return;
            }
        }

        let target: ActionTarget | null = null;
        const equippedTool = this.gameState.getEquippedTool();
        const resourceList = equippedTool === 'pickaxe' ? this.worldManager?.ores : this.worldManager?.trees;
        let closestDistSq = this.INTERACTION_DISTANCE * this.INTERACTION_DISTANCE;

        if (!resourceList) { // Guard if worldManager or its properties are null
            this.uiManager?.showGameMessage(hasWeapon ? 'No targets in range.' : `No ${equippedTool === 'pickaxe' ? 'ore' : 'trees'} in range.`, 1500);
            return;
        }
        for (const res of resourceList) {
            if (res.visible) {
                const distSq = currentPlayer.position.distanceToSquared(res.position);
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
            this.uiManager?.showGameMessage(`Gathering ${resourceName}...`, duration + 100);
        } else {
            this.uiManager?.showGameMessage(
                hasWeapon ? 'No targets in range.' : `No ${equippedTool === 'pickaxe' ? 'ore' : 'trees'} in range.`,
                1500
            );
        }
    }

    private attackCombatDummy(): void {
        if (!this.worldManager?.combatDummy) return;
        const dummyData = this.worldManager.combatDummy.userData as CombatDummyUserData;
        if (!dummyData.isAlive) return;

        const playerStats = this.gameState.getPlayerStats();
        const damage = playerStats.attack;
        dummyData.health = Math.max(0, dummyData.health - damage);

        this.worldManager?.updateCombatDummyHealthBarVisuals(dummyData.health, dummyData.maxHealth);
        this.uiManager?.showGameMessage(`Hit Combat Dummy for ${damage} damage!`, 1000);

        if (dummyData.health <= 0) {
            this.defeatCombatDummy();
        }
    }

    private defeatCombatDummy(): void {
        if (!this.worldManager?.combatDummy) return;
        const dummyData = this.worldManager.combatDummy.userData as CombatDummyUserData;

        this.worldManager.combatDummy.visible = false;
        dummyData.isAlive = false;
        this.uiManager?.showGameMessage('Combat Dummy defeated!', 2000);

        dummyData.respawnTimer = window.setTimeout(() => {
            if (!this.worldManager?.combatDummy) return; // Check again in timeout
            dummyData.health = dummyData.maxHealth;
            this.worldManager.combatDummy.visible = true;
            dummyData.isAlive = true;
            this.worldManager?.updateCombatDummyHealthBarVisuals(dummyData.health, dummyData.maxHealth);
            this.uiManager?.showGameMessage('Combat Dummy has respawned!', 2000);
            dummyData.respawnTimer = null;
        }, 30000);
    }

    private handleToggleForgeUI(): void {
        // If the UI is already open, tell the manager to close it.
        if (this.uiManager?.forgeUi?.isVisible()) {
            this.uiManager.closeAllPanels(); // Or a more specific close method
            return;
        }

        // Otherwise, run game logic to see IF we can open it.
        const currentPlayer = this.playerManager?.getPlayer();
        if (!currentPlayer || !this.worldManager?.forge) return;

        const distSq = currentPlayer.position.distanceToSquared(this.worldManager.forge.position);
        if (distSq < (this.INTERACTION_DISTANCE * this.INTERACTION_DISTANCE)) {
            this.uiManager?.openForgeUI(); // Logic passed, tell UI to open.
        } else {
            this.uiManager?.showGameMessage("Forge is too far.", 1500);
        }
    }

    // New handler in Game.ts (replaces handleToggleEquipmentUIRequest)
    private handleToggleEquipmentUI(): void {
        if (this.uiManager?.equipmentUi?.isVisible()) {
            this.uiManager.closeAllPanels();
        } else {
            this.uiManager?.openEquipmentUI();
        }
    }


    // --- Update Methods ---
    // updatePlayer is now in PlayerManager.ts

    private updateAction(deltaTime: number): void {
        const currentPickaxe = this.playerManager?.getPickaxe();
        const currentAxe = this.playerManager?.getAxe();

        if (!this.gameState.isInteracting || !this.gameState.currentActionTarget || !this.renderSystem || !currentPickaxe || !currentAxe ) return;

        const equippedTool = this.gameState.getEquippedTool();
        const tool = equippedTool === 'pickaxe' ? currentPickaxe : currentAxe;
        const duration = equippedTool === 'pickaxe' ? this.MINE_DURATION : this.CHOP_DURATION;
        const actionTarget = this.gameState.currentActionTarget;

        this.renderSystem.updateToolAnimation(tool, this.gameState.actionProgress, duration);
        const result = this.gameState.updateAction(deltaTime, duration);

        if (result?.completed) {
            // FIX 2: Capture userData before the target object state might change.
            const userData = actionTarget.userData as ResourceUserData;

            this.uiManager?.showGameMessage(`+1 ${result.resourceKey}!`, 2000);

            // Inventory display update handled by UIManager if visible
            if (this.gameState.isInventoryVisible) {
                 this.uiManager?.setInventory(this.gameState.getStructuredInventory());
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
            this.uiManager?.showGameMessage(`+1 ${result.oreType} Ingot!`, 2000);

            if (this.uiManager?.forgeUi?.isVisible()) { // Check UIManager's property
                this.uiManager.forgeUi.update(this.gameState);
            }
            if (this.gameState.isInventoryVisible) { // Check GameState
                 this.uiManager?.setInventory(this.gameState.getStructuredInventory());
            }
        }
    }

    // updateDummyHealthBar has been moved to WorldManager as updateCombatDummyHealthBarVisuals

    // --- UI Update Methods (moved to UIManager or replaced by calls to UIManager) ---
    // showGameMessage is now this.uiManager.showGameMessage()
    // updatePlayerStatsDisplay is now updatePlayerStatsHud() which calls UIManager.

    private updatePlayerStatsHud(): void { // Renamed from updatePlayerStatsDisplay
        if (!this.uiManager) return;
        const playerStats = this.gameState.getPlayerStats();
        const healthPercent = (playerStats.health / playerStats.maxHealth) * 100;
        this.uiManager.updatePlayerStats(healthPercent, playerStats.armor, playerStats.maxHealth);
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
        this.playerManager?.update(deltaTime, this.worldManager!.getMapSize()); // Call PlayerManager update
        this.updateAction(deltaTime);
        this.updateSmelting(deltaTime);

        // FIX 4: Removed per-frame UI updates from the game loop.
        // Updates are now triggered by events (e.g., gathering, smelting, opening UI).
        const currentPlayer = this.playerManager?.getPlayer();
        if (currentPlayer && this.renderSystem) {
            this.renderSystem.updateCameraPosition(
                currentPlayer,
                this.cameraOffset,
                this.gameState.cameraPitch
            );
        }
        this.renderSystem?.render();
    }
}

export default Game;