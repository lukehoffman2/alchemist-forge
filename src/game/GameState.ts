// src/game/GameState.ts

import * as THREE from 'three'; // <--- ADD THIS LINE

// TS-HINT: We are defining the "shape" of our data first. This makes the whole class much cleaner.
// It provides type safety and autocompletion for all your game's data.

// --- TYPE DEFINITIONS ---

// Using string literal types prevents typos, e.g., using 'cooper' instead of 'copper'.
type ResourceName = 'wood' | 'copper' | 'iron' | 'gold' | 'silver' | 'mithril' | 'adamantite' | 'obsidian' | 'coal';
type AlloyName = 'bronzeIngot' | 'steelIngot' | 'electrumIngot' | 'mithrilSteelIngot' | 'adamantiteSteelIngot';
type BasicIngotName = 'copperIngot' | 'ironIngot' | 'goldIngot' | 'silverIngot' | 'mithrilIngot' | 'adamantiteIngot' | 'workedObsidian';
type MaterialName = BasicIngotName | AlloyName;

type EquipmentType = 'weapon' | 'shield' | 'helmet' | 'chestplate' | 'leggings' | 'gauntlets' | 'boots';
type EquipmentSlot = 'head' | 'chest' | 'legs' | 'hands' | 'feet' | 'mainHand' | 'offHand';
export type Tool = 'pickaxe' | 'axe';

// --- INTERFACE DEFINITIONS ---

interface ItemStats {
    attack?: number;
    armor?: number;
}

interface EquipmentItem {
    id: string;
    type: EquipmentType;
    name: string;
    stats: ItemStats;
    durability: number;
    maxDurability: number;
}

interface Inventory {
    // TS-HINT: Record<Key, Value> is a utility type for defining objects with specific keys and values.
    resources: Record<ResourceName, number>;
    materials: Record<MaterialName, number>;
    equipment: Record<string, EquipmentItem>; // Key is the item's unique ID
    equipmentCount: number;
}

interface PlayerState {
    health: number;
    maxHealth: number;
    armor: number;
    attack: number;
    equippedTool: Tool;
    equipment: Record<EquipmentSlot, string | null>; // Value is the EquipmentItem ID
}

interface ForgeState {
    fuel: number;
    maxFuel: number;
    isSmelting: boolean;
    smeltingProgress: number;
    oreToSmelt: ResourceName | null;
}

// A generic interface for any object in the world the player can interact with.
export interface ActionTarget extends THREE.Object3D {
    userData: {
        resourceType: 'ore' | 'wood';
        type: string; // e.g., 'copper', 'tree'
    }
}

class GameState {
    // TS-HINT: Now we apply our interfaces to the class properties.
    public inventory: Inventory;
    public player: PlayerState;
    public forgeState: ForgeState;

    // Game state
    public isPaused: boolean = false;
    public isInteracting: boolean = false;
    public actionProgress: number = 0;
    public currentActionTarget: ActionTarget | null = null;

    // Controls state
    public keysPressed: Record<string, boolean> = {};
    public pointerLocked: boolean = false;
    public cameraPitch: number = 0.2;

    constructor() {
        this.inventory = {
            resources: {
                wood: 10, copper: 1, iron: 1, gold: 1, silver: 0,
                mithril: 0, adamantite: 0, obsidian: 0, coal: 5
            },
            materials: {
                copperIngot: 0, ironIngot: 0, goldIngot: 0, silverIngot: 0,
                mithrilIngot: 0, adamantiteIngot: 0, workedObsidian: 0,
                bronzeIngot: 0, steelIngot: 0, electrumIngot: 0,
                mithrilSteelIngot: 0, adamantiteSteelIngot: 0
            },
            equipment: {},
            equipmentCount: 0
        };

        this.player = {
            health: 100, maxHealth: 100, armor: 0, attack: 1,
            equippedTool: 'pickaxe',
            equipment: {
                head: null, chest: null, legs: null, hands: null,
                feet: null, mainHand: null, offHand: null
            }
        };

        this.forgeState = {
            fuel: 0, maxFuel: 100, isSmelting: false,
            smeltingProgress: 0, oreToSmelt: null
        };
    }

    // Add these methods to your GameState class in gamestate.ts

    public addForgeFuel(amount: number = 10): boolean {
        if (this.forgeState.fuel >= this.forgeState.maxFuel) return false;

        // Use wood as fuel, assuming 1 wood = 1 fuel point
        const woodNeeded = amount;
        if (this.inventory.resources.wood < woodNeeded) return false;

        this.removeResource('wood', woodNeeded);
        this.forgeState.fuel = Math.min(this.forgeState.maxFuel, this.forgeState.fuel + amount);
        return true;
    }

    public startSmelting(oreType: ResourceName): boolean {
        if (this.isInteracting || this.forgeState.isSmelting) return false;

        // Define which ores can be smelted and what they require
        const recipe = {
            fuelCost: 5,
            oreCost: 1
        };

        // Check for resources
        if (this.forgeState.fuel < recipe.fuelCost) return false;
        if (this.inventory.resources[oreType] < recipe.oreCost) return false;

        // Consume resources and start smelting
        this.forgeState.fuel -= recipe.fuelCost;
        this.removeResource(oreType, recipe.oreCost);

        this.forgeState.isSmelting = true;
        this.forgeState.oreToSmelt = oreType;
        this.forgeState.smeltingProgress = 0;

        return true;
    }

    public updateSmelting(deltaTime: number, duration: number): { completed: boolean; oreType?: MaterialName } | null {
        if (!this.forgeState.isSmelting || !this.forgeState.oreToSmelt) return null;

        this.forgeState.smeltingProgress += deltaTime / duration;

        if (this.forgeState.smeltingProgress >= 1) {
            // Map ore to its corresponding ingot
            const oreToIngotMap: Partial<Record<ResourceName, MaterialName>> = {
                copper: 'copperIngot',
                iron: 'ironIngot',
                gold: 'goldIngot',
                silver: 'silverIngot',
                mithril: 'mithrilIngot',
                adamantite: 'adamantiteIngot',
                obsidian: 'workedObsidian'
            };

            const resultIngot = oreToIngotMap[this.forgeState.oreToSmelt];

            if (resultIngot) {
                this.addResource(resultIngot, 1);
            }

            const completedOre = this.forgeState.oreToSmelt; // Keep a reference before resetting

            // Reset state
            this.forgeState.isSmelting = false;
            this.forgeState.oreToSmelt = null;
            this.forgeState.smeltingProgress = 0;

            return { completed: true, oreType: resultIngot };
        }
        return { completed: false };
    }

    // --- INVENTORY METHODS ---

    public addResource(type: ResourceName | MaterialName, amount: number = 1): number {
        if (type in this.inventory.resources) {
            this.inventory.resources[type as ResourceName] += amount;
            return this.inventory.resources[type as ResourceName];
        }
        if (type in this.inventory.materials) {
            this.inventory.materials[type as MaterialName] += amount;
            return this.inventory.materials[type as MaterialName];
        }
        console.warn(`Unknown resource or material type: ${type}`);
        return 0;
    }

    public removeResource(type: ResourceName | MaterialName, amount: number = 1): boolean {
        if (type in this.inventory.resources) {
            const resource = type as ResourceName;
            if (this.inventory.resources[resource] < amount) return false;
            this.inventory.resources[resource] -= amount;
            return true;
        }
        if (type in this.inventory.materials) {
            const material = type as MaterialName;
            if (this.inventory.materials[material] < amount) return false;
            this.inventory.materials[material] -= amount;
            return true;
        }
        console.warn(`Unknown resource or material type: ${type}`);
        return false;
    }

    public getStructuredInventory(): Inventory {
        return this.inventory;
    }

    // --- EQUIPMENT METHODS ---

    public createEquipment(type: EquipmentType, name: string, stats: ItemStats, durability: number): string {
        const id = `equip_${++this.inventory.equipmentCount}`;
        this.inventory.equipment[id] = {
            id, type, name, stats, durability, maxDurability: durability
        };
        return id;
    }

    public getEquipment(id: string): EquipmentItem | undefined {
        return this.inventory.equipment[id];
    }

    public getAllEquipment(): Record<string, EquipmentItem> {
        return this.inventory.equipment;
    }

    public equipItem(slot: EquipmentSlot, itemId: string): boolean {
        const currentItemInSlot = this.player.equipment[slot];
        if (currentItemInSlot) {
            this.unequipItem(slot);
        }

        const itemToEquip = this.inventory.equipment[itemId];
        if (!itemToEquip) return false;

        const validSlots: Record<EquipmentType, EquipmentSlot[]> = {
            weapon: ['mainHand', 'offHand'], shield: ['offHand'], helmet: ['head'],
            chestplate: ['chest'], leggings: ['legs'], gauntlets: ['hands'], boots: ['feet']
        };

        if (!validSlots[itemToEquip.type]?.includes(slot)) {
            return false;
        }

        this.player.equipment[slot] = itemId;
        this.updatePlayerStats();
        return true;
    }

    public unequipItem(slot: EquipmentSlot): boolean {
        if (!this.player.equipment[slot]) return false;
        this.player.equipment[slot] = null;
        this.updatePlayerStats();
        return true;
    }

    public updatePlayerStats(): void {
        this.player.armor = 0;
        this.player.attack = 1;

        Object.values(this.player.equipment).forEach(itemId => {
            if (!itemId) return;
            const item = this.getEquipment(itemId);
            if (!item) return;

            if (item.stats.armor) {
                this.player.armor += item.stats.armor;
            }
            // Only the main hand weapon contributes to attack stat
            if (item.stats.attack && this.player.equipment.mainHand === itemId) {
                this.player.attack = item.stats.attack;
            }
        });
    }

    // --- TOOL METHODS ---

    public toggleTool(tool?: Tool, force: boolean = false): Tool | false {
        if (!force && this.isInteracting) return false;
        this.player.equippedTool = tool || (this.player.equippedTool === 'pickaxe' ? 'axe' : 'pickaxe');
        return this.player.equippedTool;
    }

    public getEquippedTool(): Tool {
        return this.player.equippedTool;
    }

    // --- PLAYER STATE ---

    public getPlayerStats(): PlayerState {
        return this.player;
    }

    // --- GAME STATE ---

    public togglePause(): boolean {
        this.isPaused = !this.isPaused;
        this.keysPressed = {}; // Clear keys on pause/unpause
        return this.isPaused;
    }

    public startAction(target: ActionTarget): boolean {
        if (this.isInteracting) return false;
        this.isInteracting = true;
        this.currentActionTarget = target;
        this.actionProgress = 0;
        return true;
    }

    // TS-HINT: Define a return type for complex return objects.
    public updateAction(deltaTime: number, duration: number): { completed: boolean; resourceKey?: ResourceName | 'wood', progress?: number } {
        if (!this.isInteracting || !this.currentActionTarget) return { completed: false };

        this.actionProgress += deltaTime / duration;

        if (this.actionProgress >= 1) {
            const resourceKey = this.currentActionTarget.userData.resourceType === 'ore'
                ? this.currentActionTarget.userData.type as ResourceName
                : 'wood';

            this.addResource(resourceKey);
            this.isInteracting = false;
            this.actionProgress = 0;
            this.currentActionTarget = null;
            return { completed: true, resourceKey };
        }
        return { completed: false, progress: this.actionProgress };
    }

    // --- FORGE & CRAFTING ---
    // (Methods like addForgeFuel, startSmelting, craftAlloy, getRecipes etc. would be migrated here)
    // The principles are the same: add types to parameters and return values.

    public getForgeState(): ForgeState {
        return this.forgeState;
    }

    // --- INPUT HANDLING ---
    public setKeyPressed(key: string, isPressed: boolean): void {
        this.keysPressed[key] = isPressed;
    }

    public isKeyPressed(key: string): boolean {
        return !!this.keysPressed[key];
    }
}

export default GameState;