import * as THREE from 'three';
import GameState, { Tool } from './GameState'; // Assuming Tool is exported from GameState

export class PlayerManager {
    private scene: THREE.Scene;
    private gameState: GameState;

    public player: THREE.Group | null = null;
    public pickaxe: THREE.Group | null = null;
    public axe: THREE.Group | null = null;

    // Constants moved from Game.ts
    private readonly playerSpeed: number = 0.12;
    public readonly playerRotationSpeed: number = 0.001; // Made public for InputHandler
    private readonly playerHeight: number = 1.8;
    private readonly playerRadius: number = 0.4;
    private readonly WORLD_UP: THREE.Vector3 = new THREE.Vector3(0, 1, 0); // Used for movement

    // Map size might be needed for movement boundaries if not handled by collision detection
    // For now, assume Game.ts will pass mapSize to update if needed, or PlayerManager gets it from WorldManager if one is passed.
    // For simplicity, let's assume Game will handle boundaries for now, or we add mapSize to constructor later.

    constructor(scene: THREE.Scene, gameState: GameState) {
        this.scene = scene;
        this.gameState = gameState;
    }

    public init(): void {
        this.createPlayerAndTools();
    }

    public getPlayer(): THREE.Group | null {
        return this.player;
    }

    public getPickaxe(): THREE.Group | null {
        return this.pickaxe;
    }

    public getAxe(): THREE.Group | null {
        return this.axe;
    }

    public updateToolVisuals(equippedTool: Tool): void {
        if (this.pickaxe && this.axe) {
            this.pickaxe.visible = (equippedTool === 'pickaxe');
            this.axe.visible = (equippedTool === 'axe');
        }
    }

    // Moved from Game.ts
    private createPlayerAndTools(): void {
        const playerGroup = new THREE.Group();
        // Body
        const bodyGeo = new THREE.CylinderGeometry(
            this.playerRadius, this.playerRadius, this.playerHeight - this.playerRadius * 2, 16
        );
        const playerMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.6 });
        const body = new THREE.Mesh(bodyGeo, playerMat);
        body.position.y = this.playerHeight / 2 - this.playerRadius; // Center of cylinder part
        body.castShadow = true;
        playerGroup.add(body);

        // Head
        const headGeo = new THREE.SphereGeometry(this.playerRadius, 16, 8);
        const head = new THREE.Mesh(headGeo, playerMat);
        head.position.y = this.playerHeight - this.playerRadius; // Top of the body
        playerGroup.add(head);

        this.player = playerGroup;
        this.player.position.y = this.playerRadius; // Player's feet at y=0
        this.scene.add(this.player);

        // Create tools and attach them
        this.pickaxe = this.createTool(0x718096, 0.8); // Grey color, 0.8 length
        this.player.add(this.pickaxe);

        this.axe = this.createTool(0xdb2777, 1.0, true); // Pink color, 1.0 length, isAxe = true
        this.player.add(this.axe);

        // Set initial tool visibility based on GameState
        this.updateToolVisuals(this.gameState.getEquippedTool());
    }

    // Moved from Game.ts
    private createTool(color: number, handleLength: number, isAxe: boolean = false): THREE.Group {
        const tool = new THREE.Group();
        const handleGeom = new THREE.CylinderGeometry(0.05, 0.05, handleLength, 8);
        const handleMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Brown for handle
        const handle = new THREE.Mesh(handleGeom, handleMat);
        handle.position.y = handleLength / 2;
        tool.add(handle);

        const headMat = new THREE.MeshStandardMaterial({ color: color });
        let headGeom: THREE.BoxGeometry;
        if (isAxe) {
            headGeom = new THREE.BoxGeometry(0.1, 0.4, 0.3); // Axe head dimensions
        } else {
            headGeom = new THREE.BoxGeometry(0.1, 0.3, 0.1); // Pickaxe head dimensions
        }
        const head = new THREE.Mesh(headGeom, headMat);
        head.position.set(0, handleLength, isAxe ? 0.0 : 0.05); // Position head relative to handle
        head.rotation.z = isAxe ? 0 : Math.PI / 2.5; // Rotate pickaxe head
        tool.add(head);

        // Position and rotate the entire tool relative to the player
        tool.position.set(this.playerRadius, this.playerHeight * 0.6, this.playerRadius * 0.5);
        tool.rotation.x = Math.PI / 2; // Align with player's hand
        tool.rotation.y = -0.5; // Angle slightly outwards

        return tool;
    }

    // Player movement logic, from Game.updatePlayer
    public update(deltaTime: number, mapSize: number): void { // mapSize passed for boundaries
        if (!this.player || this.gameState.isInteracting) return;

        const moveSpeed = this.playerSpeed * (deltaTime / (1000 / 60)); // Frame-rate independent speed
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

        // Boundary clamping
        this.player.position.x = Math.max(-mapSize / 2 + this.playerRadius, Math.min(mapSize / 2 - this.playerRadius, this.player.position.x));
        this.player.position.z = Math.max(-mapSize / 2 + this.playerRadius, Math.min(mapSize / 2 - this.playerRadius, this.player.position.z));
    }
}
