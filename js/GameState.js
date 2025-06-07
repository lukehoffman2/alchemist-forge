// GameState.js - Class for managing game state

class GameState {
    constructor() {
        // Core inventory
        this.inventory = {
            wood: 10, copper: 1, iron: 1, gold: 1,
            copperIngot: 0, ironIngot: 0, goldIngot: 0
        };

        // Player state
        this.equippedTool = 'pickaxe';
        this.isPaused = false;
        this.isInteracting = false;
        this.lastTime = performance.now();
        this.actionProgress = 0;
        this.currentActionTarget = null;
        
        // Forge state
        this.forgeState = {
            fuel: 0,
            maxFuel: 100,
            isSmelting: false,
            smeltingProgress: 0,
            oreToSmelt: null
        };

        // Controls state
        this.keysPressed = {};
        this.pointerLocked = false;
        this.cameraPitch = 0.2;
    }

    // Inventory methods
    addResource(type, amount = 1) {
        this.inventory[type] = (this.inventory[type] || 0) + amount;
        return this.inventory[type];
    }

    removeResource(type, amount = 1) {
        if (!this.inventory[type] || this.inventory[type] < amount) {
            return false;
        }
        this.inventory[type] -= amount;
        return true;
    }

    getInventory() {
        return { ...this.inventory };
    }

    // Tool methods
    toggleTool(tool, force = false) {
        if (!force && this.isInteracting) return false;
        
        this.equippedTool = tool || (this.equippedTool === 'pickaxe' ? 'axe' : 'pickaxe');
        return this.equippedTool;
    }

    getEquippedTool() {
        return this.equippedTool;
    }

    // Game state methods
    togglePause() {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.keysPressed = {};
        } else {
            this.lastTime = performance.now();
        }
        return this.isPaused;
    }

    startAction(target) {
        if (this.isInteracting) return false;
        
        this.isInteracting = true;
        this.currentActionTarget = target;
        this.actionProgress = 0;
        return true;
    }

    updateAction(deltaTime, duration) {
        if (!this.isInteracting || !this.currentActionTarget) return false;
        
        this.actionProgress += deltaTime / duration;
        
        if (this.actionProgress >= 1) {
            const resourceKey = this.currentActionTarget.userData.resourceType === 'ore'
                ? this.currentActionTarget.userData.type
                : this.currentActionTarget.userData.resourceType;
            
            this.addResource(resourceKey);
            this.isInteracting = false;
            this.actionProgress = 0;
            return { completed: true, resourceKey };
        }
        
        return { completed: false, progress: this.actionProgress };
    }

    // Forge methods
    addForgeFuel(amount) {
        if (this.inventory.wood >= amount && this.forgeState.fuel + amount <= this.forgeState.maxFuel) {
            this.removeResource('wood', amount);
            this.forgeState.fuel += amount;
            return true;
        }
        return false;
    }

    startSmelting(oreType) {
        if (this.forgeState.isSmelting) return false;
        if (this.forgeState.fuel < 5) return false;
        if (this.inventory[oreType] < 1) return false;

        this.forgeState.fuel -= 5;
        this.removeResource(oreType, 1);
        this.forgeState.isSmelting = true;
        this.forgeState.smeltingProgress = 0;
        this.forgeState.oreToSmelt = oreType;
        return true;
    }

    updateSmelting(deltaTime, duration) {
        if (!this.forgeState.isSmelting) return false;

        this.forgeState.smeltingProgress += deltaTime / duration;
        if (this.forgeState.smeltingProgress >= 1) {
            const ingotType = `${this.forgeState.oreToSmelt}Ingot`;
            this.addResource(ingotType);
            this.forgeState.isSmelting = false;
            this.forgeState.smeltingProgress = 0;
            const completedOre = this.forgeState.oreToSmelt;
            this.forgeState.oreToSmelt = null;
            return { completed: true, ingotType, oreType: completedOre };
        }
        
        return { completed: false, progress: this.forgeState.smeltingProgress };
    }

    getForgeState() {
        return { ...this.forgeState };
    }

    // Input handling
    setKeyPressed(key, isPressed) {
        this.keysPressed[key] = isPressed;
    }

    isKeyPressed(key) {
        return !!this.keysPressed[key];
    }

    setPointerLocked(locked) {
        this.pointerLocked = locked;
    }

    updateCameraPitch(delta) {
        this.cameraPitch += delta;
    }
}

export default GameState;