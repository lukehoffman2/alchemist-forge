import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import adamantiteOreModelUrl from '../assets/ores/3d/adamantite_ore.glb';
import goldModelUrl from '../assets/ores/3d/gold_ore.glb';
import copperOreModelUrl from '../assets/ores/3d/copper_ore.glb';
import mithrilOreModelUrl from '../assets/ores/3d/mithril_ore.glb';
import ironOreModelUrl from '../assets/ores/3d/iron_ore.glb';
import silverOreModelUrl from '../assets/ores/3d/silver_ore.glb';
import forgeModelUrl from '../assets/buildings/3d/forge.glb';

// Interface for Ore Type definitions
export interface OreType {
    name: string;
    color: number;
    value: number; // Assuming value is still relevant, was in Game.ts
    size: number;
    count: number;
    modelPath?: string;
}

// UserData interfaces for world objects
export interface ResourceUserData {
    type: string; // e.g., 'copper', 'iron', 'tree'
    resourceType: 'ore' | 'wood'; // Specific category
    respawnTimer: number | null;
    // Original Game.ts had hp, maxHp, regenerationRate, lastHitTime for some resources.
    // These seem more generic, so let's include them, assuming they might be used.
    hp?: number;
    maxHp?: number;
    regenerationRate?: number;
    lastHitTime?: number;
    [key: string]: any; // For any other custom data
}

export interface CombatDummyUserData {
    type: 'enemy'; // Specific type
    name: string;
    health: number;
    maxHealth: number;
    isAlive: boolean;
    respawnTimer: number | null;
    healthBar?: THREE.Mesh;
    [key: string]: any; // For any other custom data
}

export class WorldManager {
    private scene: THREE.Scene;
    private loadingManager: THREE.LoadingManager;
    private gltfLoader: GLTFLoader;

    // Properties moved from Game.ts
    public ores: THREE.Object3D[] = []; // In Game.ts it was THREE.Object3D[]
    public trees: THREE.Group[] = [];
    public combatDummy: THREE.Group | null = null;
    public forge: THREE.Group | null = null;
    public forgeLight: THREE.PointLight | null = null;

    // Constants moved from Game.ts
    private readonly MAP_SIZE: number = 80;
    // ORE_TYPES definition from Game.ts
    private readonly ORE_TYPES: Record<string, OreType> = {
        COPPER: { name: 'copper', color: 0xb87333, value: 1, size: 0.8, count: 25, modelPath: copperOreModelUrl },
        IRON: { name: 'iron', color: 0x808080, value: 1, size: 1, count: 20, modelPath: ironOreModelUrl },
        GOLD: { name: 'gold', color: 0xFFD700, value: 1, size: 0.6, count: 15, modelPath: goldModelUrl },
        SILVER: { name: 'silver', color: 0xC0C0C0, value: 1, size: 0.7, count: 15, modelPath: silverOreModelUrl },
        MITHRIL: { name: 'mithril', color: 0x9bc4e2, value: 2, size: 0.9, count: 10, modelPath: mithrilOreModelUrl },
        ADAMANTITE: { name: 'adamantite', color: 0x800080, value: 3, size: 1.1, count: 5, modelPath: adamantiteOreModelUrl },
        OBSIDIAN: { name: 'obsidian', color: 0x310062, value: 2, size: 1.0, count: 8 } // No modelPath, will use fallback
    };
    private readonly TREE_COUNT: number = 40;

    constructor(scene: THREE.Scene, loadingManager: THREE.LoadingManager) {
        this.scene = scene;
        this.loadingManager = loadingManager;
        this.gltfLoader = new GLTFLoader(this.loadingManager);
    }

    public async init(): Promise<void> {
        this.addLights();
        this.createGround();
        await this.createWorldResources(); // This is async
        this.createCombatDummy();
        // createDetailedForge needs loadingManager, it's available via this.loadingManager
        this.createDetailedForge();
    }

    public getMapSize(): number {
        return this.MAP_SIZE;
    }

    // --- World Creation Methods (Moved from Game.ts) ---
    public addLights(): void { // Made public if Game needs to access it, otherwise private
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
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
        this.scene.add(dirLight);
    }

    public createGround(): void { // Made public for consistency, or private
        const groundGeo = new THREE.PlaneGeometry(this.MAP_SIZE, this.MAP_SIZE);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x556B2F, roughness: 0.8 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }

    private async loadOreModel(type: OreType): Promise<THREE.Object3D | null> {
        // Uses this.gltfLoader (initialized from this.loadingManager)
        if (type.modelPath) {
            const modelPath = type.modelPath;
            return new Promise((resolve) => {
                this.gltfLoader.load(
                    modelPath,
                    (gltf) => {
                        const model = gltf.scene;
                        model.scale.set(0.5, 0.5, 0.5); // Example scale, adjust as needed
                        model.position.set(
                            (Math.random() - 0.5) * this.MAP_SIZE,
                            type.size * 0.5, // Assumes size is diameter, place on ground
                            (Math.random() * 0.5) * this.MAP_SIZE - this.MAP_SIZE * 0.45 // Spread them out
                        );
                        model.castShadow = true;
                        model.receiveShadow = true;
                        model.traverse(child => {
                            if (child instanceof THREE.Mesh) {
                                child.castShadow = true;
                                child.receiveShadow = true;
                            }
                        });
                        model.userData = { type: type.name, resourceType: 'ore', respawnTimer: null } as ResourceUserData;
                        resolve(model);
                    },
                    undefined, // onProgress
                    (error) => {
                        console.error(`Error loading model for ${type.name}: `, error);
                        const fallbackGeo = new THREE.DodecahedronGeometry(type.size * 0.6, 0);
                        const fallbackMat = new THREE.MeshStandardMaterial({ color: type.color, metalness: 0.4, roughness: 0.7 });
                        const fallbackMesh = new THREE.Mesh(fallbackGeo, fallbackMat);
                        fallbackMesh.position.set(
                            (Math.random() - 0.5) * this.MAP_SIZE,
                            type.size * 0.5,
                            (Math.random() * 0.5) * this.MAP_SIZE - this.MAP_SIZE * 0.45
                        );
                        fallbackMesh.castShadow = true;
                        fallbackMesh.receiveShadow = true;
                        fallbackMesh.userData = { type: type.name, resourceType: 'ore', respawnTimer: null } as ResourceUserData;
                        resolve(fallbackMesh);
                    }
                );
            });
        } else {
            const oreGeo = new THREE.DodecahedronGeometry(type.size * 0.6, 0);
            const oreMat = new THREE.MeshStandardMaterial({ color: type.color, metalness: 0.4, roughness: 0.7 });
            const oreMesh = new THREE.Mesh(oreGeo, oreMat);
            oreMesh.position.set(
                (Math.random() - 0.5) * this.MAP_SIZE,
                type.size * 0.5,
                (Math.random() * 0.5) * this.MAP_SIZE - this.MAP_SIZE * 0.45
            );
            oreMesh.castShadow = true;
            oreMesh.receiveShadow = true;
            oreMesh.userData = { type: type.name, resourceType: 'ore', respawnTimer: null } as ResourceUserData;
            return Promise.resolve(oreMesh);
        }
    }

    public async createWorldResources(): Promise<void> { // Made public for consistency
        const modelPromises: Promise<THREE.Object3D | null>[] = [];

        Object.values(this.ORE_TYPES).forEach(type => {
            for (let i = 0; i < type.count; i++) {
                // loadOreModel now uses this.gltfLoader which has the loadingManager
                modelPromises.push(this.loadOreModel(type));
            }
        });

        const loadedModels = await Promise.all(modelPromises);

        loadedModels.forEach(model => {
            if (model) {
                this.scene.add(model);
                this.ores.push(model);
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
                0, // Trees are placed at y=0, trunk height handles elevation
                Math.random() * 20 - 10 + forestZ
            );
            tree.userData = { type: 'tree', resourceType: 'wood', respawnTimer: null } as ResourceUserData;

            this.scene.add(tree);
            this.trees.push(tree);
        }
    }

    public createCombatDummy(): void { // Made public
        this.combatDummy = new THREE.Group();
        const bodyGeometry = new THREE.BoxGeometry(1, 2, 1);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xef4444 }); // Red color
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1; // Center of the body
        body.castShadow = true;
        body.receiveShadow = true;
        this.combatDummy.add(body);

        const standGeometry = new THREE.CylinderGeometry(0.5, 0.7, 0.2, 8); // Wider base
        const standMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Wood color
        const stand = new THREE.Mesh(standGeometry, standMaterial);
        stand.position.y = 0.1; // Bottom of the stand
        stand.castShadow = true;
        stand.receiveShadow = true;
        this.combatDummy.add(stand);

        this.combatDummy.position.set(5, 0, -5); // Example position
        this.combatDummy.userData = {
            type: 'enemy',
            name: 'Combat Dummy',
            health: 50,
            maxHealth: 50,
            isAlive: true,
            respawnTimer: null
        } as CombatDummyUserData;

        this.createDummyHealthBar();
        this.scene.add(this.combatDummy);
    }

    private createDummyHealthBar(): void {
        if (!this.combatDummy) return;

        const healthBarContainer = new THREE.Group();
        const bgGeometry = new THREE.PlaneGeometry(1.2, 0.15); // Slightly larger for background
        const bgMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5 });
        const bgBar = new THREE.Mesh(bgGeometry, bgMaterial);
        healthBarContainer.add(bgBar);

        const healthGeometry = new THREE.PlaneGeometry(1.2, 0.15); // Same size as background initially
        const healthMaterial = new THREE.MeshBasicMaterial({ color: 0x22c55e }); // Green for health
        const healthBar = new THREE.Mesh(healthGeometry, healthMaterial);
        healthBar.position.z = 0.01; // Slightly in front of the background
        healthBarContainer.add(healthBar);

        healthBarContainer.position.y = 3; // Position above the dummy
        healthBarContainer.rotation.x = -Math.PI / 6; // Tilted for better visibility

        this.combatDummy.add(healthBarContainer);
        // Store the health bar mesh in userData to update it later
        (this.combatDummy.userData as CombatDummyUserData).healthBar = healthBar;
    }

    public createDetailedForge(): void { // Made public
        this.forge = new THREE.Group();
        this.forge.position.set(0, 0, -10); // Example position
        this.scene.add(this.forge);

        this.forgeLight = new THREE.PointLight(0xffaa33, 2, 100); // Intensity, distance
        this.forgeLight.castShadow = true; // Shadows can be expensive

        // GLTFLoader is already initialized with loadingManager in constructor
        this.gltfLoader.load(
            forgeModelUrl,
            (gltf) => {
                const modelScene = gltf.scene;
                const desiredScale = 10;
                modelScene.scale.set(desiredScale, desiredScale, desiredScale);
                modelScene.position.y = 7; // Adjust based on model's origin

                this.forge!.add(modelScene);
                modelScene.traverse((node) => {
                    if (node instanceof THREE.Mesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                    }
                });

                // Attempt to find a specific object in the model to attach the light to
                const forgeFire = modelScene.getObjectByName('ForgeFire'); // Use the actual name from your GLB
                if (forgeFire && this.forgeLight) {
                    forgeFire.add(this.forgeLight);
                } else if (this.forgeLight) {
                    // Fallback position if 'ForgeFire' isn't found
                    this.forgeLight.position.set(0, 1.5, 0); // Adjust as needed
                    this.forge!.add(this.forgeLight);
                }
                console.log('Forge model loaded successfully');
            },
            undefined, // onProgress callback
            (error) => {
                console.error('An error happened loading the forge model:', error);
                this.createFallbackForge(); // Create a simpler forge if loading fails
            }
        );
    }

    private createFallbackForge(): void {
        console.log('Creating fallback forge');
        if (!this.forge) return; // Should not happen if createDetailedForge was called

        // Clear any partially loaded model
        while (this.forge.children.length > 0) {
            this.forge.remove(this.forge.children[0]);
        }

        const forgeBase = new THREE.Mesh(
            new THREE.BoxGeometry(4, 1, 4), // width, height, depth
            new THREE.MeshStandardMaterial({ color: 0x888888 }) // Grey color
        );
        forgeBase.position.y = 0.5; // Half of height to sit on ground
        forgeBase.castShadow = true;
        this.forge.add(forgeBase);

        const forgeFire = new THREE.Mesh(
            new THREE.BoxGeometry(2, 1, 2), // Smaller fire area
            new THREE.MeshBasicMaterial({ color: 0xffaa33 }) // Orange/yellow fire color
        );
        forgeFire.position.y = 1.5; // Above the base
        this.forge.add(forgeFire);

        // Ensure forgeLight is created if it wasn't (e.g. if detailed forge failed early)
        if (!this.forgeLight) {
            this.forgeLight = new THREE.PointLight(0xffaa33, 2, 100);
            this.forgeLight.castShadow = true;
        }
        this.forgeLight.position.set(0, 0, 0); // Centered in the forgeFire mesh
        forgeFire.add(this.forgeLight); // Add light to the fire mesh
    }

    public updateCombatDummyHealthBarVisuals(currentHealth: number, maxHealth: number): void {
        if (!this.combatDummy) return;
        const userData = this.combatDummy.userData as CombatDummyUserData;
        if (!userData.healthBar) return;

        const healthPercent = Math.max(0, Math.min(1, currentHealth / maxHealth)); // Ensure percent is between 0 and 1
        userData.healthBar.scale.x = healthPercent; // Health bar shrinks from right to left
        // Adjust position to keep left side fixed, if health bar's origin is center
        // userData.healthBar.position.x = - (1 - healthPercent) * (barWidth / 2);
        // The original game.ts had: healthBar.position.x = -0.6 * (1 - healthPercent);
        // This implies the bar is 1.2 units wide and its origin is its center.
        // Let's assume the health bar's original full width corresponds to a scale of 1.
        // If the health bar's geometry is 1.2 units wide, then position.x = - (1 - healthPercent) * 0.6;
        userData.healthBar.position.x = - (1 - healthPercent) * 0.6;


        const color = healthPercent > 0.6 ? 0x22c55e : healthPercent > 0.3 ? 0xf59e0b : 0xef4444;
        if (userData.healthBar.material instanceof THREE.MeshBasicMaterial) {
            userData.healthBar.material.color.set(color);
        }
    }
}
