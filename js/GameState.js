// // GameState.js - Class for managing game state
//
// class GameState {
//     constructor() {
//         // Core inventory with categories
//         this.inventory = {
//             // Resources (stackable)
//             resources: {
//                 wood: 10,
//                 copper: 1,
//                 iron: 1,
//                 gold: 1,
//                 silver: 0,
//                 mithril: 0,
//                 adamantite: 0,
//                 obsidian: 0,
//                 coal: 5
//             },
//             // Processed materials (stackable)
//             materials: {
//                 copperIngot: 0,
//                 ironIngot: 0,
//                 goldIngot: 0,
//                 silverIngot: 0,
//                 mithrilIngot: 0,
//                 adamantiteIngot: 0,
//                 workedObsidian: 0,
//                 // Alloys
//                 bronzeIngot: 0,
//                 steelIngot: 0,
//                 electrumIngot: 0,
//                 mithrilSteelIngot: 0,
//                 adamantiteSteelIngot: 0
//             },
//             // Equipment (non-stackable with properties)
//             equipment: {
//                 // Format: { id: { type, name, stats, durability } }
//             },
//             // Current equipment count for generating unique IDs
//             equipmentCount: 0
//         };
//
//         // Player state
//         this.player = {
//             health: 100,
//             maxHealth: 100,
//             armor: 0,
//             attack: 1,
//             equippedTool: 'pickaxe',
//             equipment: {
//                 head: null,
//                 chest: null,
//                 legs: null,
//                 hands: null,
//                 feet: null,
//                 mainHand: null,
//                 offHand: null
//             }
//         };
//
//         // Game state
//         this.isPaused = false;
//         this.isInteracting = false;
//         this.lastTime = performance.now();
//         this.actionProgress = 0;
//         this.currentActionTarget = null;
//
//         // Forge state
//         this.forgeState = {
//             fuel: 0,
//             maxFuel: 100,
//             isSmelting: false,
//             smeltingProgress: 0,
//             oreToSmelt: null
//         };
//
//         // Controls state
//         this.keysPressed = {};
//         this.pointerLocked = false;
//         this.cameraPitch = 0.2;
//     }
//
//     // Inventory methods
//     addResource(type, amount = 1) {
//         // Check if it's a basic resource
//         if (this.inventory.resources[type] !== undefined) {
//             this.inventory.resources[type] += amount;
//             return this.inventory.resources[type];
//         }
//         // Check if it's a processed material
//         else if (type.includes('Ingot')) {
//             this.inventory.materials[type] = (this.inventory.materials[type] || 0) + amount;
//             return this.inventory.materials[type];
//         }
//         // For backward compatibility
//         else {
//             console.warn(`Unknown resource type: ${type}`);
//             return 0;
//         }
//     }
//
//     removeResource(type, amount = 1) {
//         // Check if it's a basic resource
//         if (this.inventory.resources[type] !== undefined) {
//             if (this.inventory.resources[type] < amount) return false;
//             this.inventory.resources[type] -= amount;
//             return true;
//         }
//         // Check if it's a processed material
//         else if (this.inventory.materials[type] !== undefined) {
//             if (this.inventory.materials[type] < amount) return false;
//             this.inventory.materials[type] -= amount;
//             return true;
//         }
//         // For backward compatibility
//         else {
//             console.warn(`Unknown resource type: ${type}`);
//             return false;
//         }
//     }
//
//     getInventory() {
//         // Flatten the inventory for backward compatibility
//         const flatInventory = {};
//
//         // Add resources
//         Object.entries(this.inventory.resources).forEach(([key, value]) => {
//             flatInventory[key] = value;
//         });
//
//         // Add materials
//         Object.entries(this.inventory.materials).forEach(([key, value]) => {
//             flatInventory[key] = value;
//         });
//
//         // Add equipment count
//         flatInventory.equipmentCount = this.inventory.equipmentCount;
//
//         return flatInventory;
//     }
//
//     // Get the full structured inventory
//     getStructuredInventory() {
//         return { ...this.inventory };
//     }
//
//     // Equipment methods
//     createEquipment(type, name, stats, durability) {
//         const id = `equip_${++this.inventory.equipmentCount}`;
//         this.inventory.equipment[id] = {
//             id,
//             type,
//             name,
//             stats,
//             durability,
//             maxDurability: durability
//         };
//         return id;
//     }
//
//     getEquipment(id) {
//         return this.inventory.equipment[id];
//     }
//
//     getAllEquipment() {
//         return { ...this.inventory.equipment };
//     }
//
//     equipItem(slot, itemId) {
//         // Unequip current item in slot if any
//         const currentItem = this.player.equipment[slot];
//         if (currentItem) {
//             this.unequipItem(slot);
//         }
//
//         // Equip new item
//         const item = this.inventory.equipment[itemId];
//         if (!item) return false;
//
//         // Check if slot is valid for this item type
//         const validSlots = {
//             weapon: ['mainHand', 'offHand'],
//             shield: ['offHand'],
//             helmet: ['head'],
//             chestplate: ['chest'],
//             leggings: ['legs'],
//             gauntlets: ['hands'],
//             boots: ['feet']
//         };
//
//         if (!validSlots[item.type]?.includes(slot)) {
//             return false;
//         }
//
//         // Equip the item
//         this.player.equipment[slot] = itemId;
//
//         // Update player stats
//         this.updatePlayerStats();
//
//         return true;
//     }
//
//     unequipItem(slot) {
//         if (!this.player.equipment[slot]) return false;
//         this.player.equipment[slot] = null;
//
//         // Update player stats
//         this.updatePlayerStats();
//
//         return true;
//     }
//
//     updatePlayerStats() {
//         // Reset stats to base values
//         this.player.armor = 0;
//         this.player.attack = 1;
//
//         // Add stats from equipped items
//         Object.values(this.player.equipment).forEach(itemId => {
//             if (!itemId) return;
//
//             const item = this.inventory.equipment[itemId];
//             if (!item) return;
//
//             if (item.stats.armor) {
//                 this.player.armor += item.stats.armor;
//             }
//
//             if (item.stats.attack && (this.player.equipment.mainHand === itemId)) {
//                 this.player.attack = item.stats.attack;
//             }
//         });
//     }
//
//     // Tool methods
//     toggleTool(tool, force = false) {
//         if (!force && this.isInteracting) return false;
//
//         this.player.equippedTool = tool || (this.player.equippedTool === 'pickaxe' ? 'axe' : 'pickaxe');
//         return this.player.equippedTool;
//     }
//
//     getEquippedTool() {
//         return this.player.equippedTool;
//     }
//
//     // Player health methods
//     damagePlayer(amount) {
//         // Calculate damage reduction from armor
//         // Formula: Damage Taken = Incoming Damage * (1 - (Total Armor / (Total Armor + 100)))
//         const damageReduction = this.player.armor / (this.player.armor + 100);
//         const actualDamage = amount * (1 - damageReduction);
//
//         this.player.health = Math.max(0, this.player.health - actualDamage);
//
//         // Check if player is defeated
//         if (this.player.health <= 0) {
//             this.playerDefeated();
//         }
//
//         return this.player.health;
//     }
//
//     healPlayer(amount) {
//         this.player.health = Math.min(this.player.maxHealth, this.player.health + amount);
//         return this.player.health;
//     }
//
//     playerDefeated() {
//         // Handle player defeat logic
//         console.log("Player defeated!");
//         // Could trigger game over screen, respawn, etc.
//     }
//
//     getPlayerStats() {
//         return {
//             health: this.player.health,
//             maxHealth: this.player.maxHealth,
//             armor: this.player.armor,
//             attack: this.player.attack,
//             equipment: { ...this.player.equipment }
//         };
//     }
//
//     // Game state methods
//     togglePause() {
//         this.isPaused = !this.isPaused;
//         if (this.isPaused) {
//             this.keysPressed = {};
//         } else {
//             this.lastTime = performance.now();
//         }
//         return this.isPaused;
//     }
//
//     startAction(target) {
//         if (this.isInteracting) return false;
//
//         this.isInteracting = true;
//         this.currentActionTarget = target;
//         this.actionProgress = 0;
//         return true;
//     }
//
//     updateAction(deltaTime, duration) {
//         if (!this.isInteracting || !this.currentActionTarget) return false;
//
//         this.actionProgress += deltaTime / duration;
//
//         if (this.actionProgress >= 1) {
//             const resourceKey = this.currentActionTarget.userData.resourceType === 'ore'
//                 ? this.currentActionTarget.userData.type
//                 : this.currentActionTarget.userData.resourceType;
//
//             this.addResource(resourceKey);
//             this.isInteracting = false;
//             this.actionProgress = 0;
//             return { completed: true, resourceKey };
//         }
//
//         return { completed: false, progress: this.actionProgress };
//     }
//
//     // Forge methods
//     addForgeFuel(amount) {
//         if (this.inventory.resources.wood >= amount && this.forgeState.fuel + amount <= this.forgeState.maxFuel) {
//             this.removeResource('wood', amount);
//             this.forgeState.fuel += amount;
//             return true;
//         }
//         return false;
//     }
//
//     startSmelting(oreType) {
//         if (this.forgeState.isSmelting) return false;
//         if (this.forgeState.fuel < 5) return false;
//
//         // Check if ore exists in resources
//         if (this.inventory.resources[oreType] === undefined || this.inventory.resources[oreType] < 1) {
//             return false;
//         }
//
//         this.forgeState.fuel -= 5;
//         this.removeResource(oreType, 1);
//         this.forgeState.isSmelting = true;
//         this.forgeState.smeltingProgress = 0;
//         this.forgeState.oreToSmelt = oreType;
//         return true;
//     }
//
//     updateSmelting(deltaTime, duration) {
//         if (!this.forgeState.isSmelting) return false;
//
//         this.forgeState.smeltingProgress += deltaTime / duration;
//         if (this.forgeState.smeltingProgress >= 1) {
//             let outputType;
//
//             // Handle special case for obsidian
//             if (this.forgeState.oreToSmelt === 'obsidian') {
//                 outputType = 'workedObsidian';
//             } else {
//                 outputType = `${this.forgeState.oreToSmelt}Ingot`;
//             }
//
//             this.inventory.materials[outputType] = (this.inventory.materials[outputType] || 0) + 1;
//
//             this.forgeState.isSmelting = false;
//             this.forgeState.smeltingProgress = 0;
//             const completedOre = this.forgeState.oreToSmelt;
//             this.forgeState.oreToSmelt = null;
//             return { completed: true, ingotType: outputType, oreType: completedOre };
//         }
//
//         return { completed: false, progress: this.forgeState.smeltingProgress };
//     }
//
//     getForgeState() {
//         return { ...this.forgeState };
//     }
//
//     // Crafting methods
//     craftAlloy(alloyType) {
//         const recipes = {
//             bronzeIngot: { copper: 2, iron: 1 },
//             steelIngot: { iron: 2, coal: 1 },
//             electrumIngot: { gold: 1, silver: 1 },
//             mithrilSteelIngot: { mithril: 2, steel: 1 },
//             adamantiteSteelIngot: { adamantite: 1, steel: 2 }
//         };
//
//         const recipe = recipes[alloyType];
//         if (!recipe) return false;
//
//         // Check if player has required materials
//         for (const [material, amount] of Object.entries(recipe)) {
//             const materialType = material.includes('Ingot') ? 'materials' : 'resources';
//             const materialName = material.includes('Ingot') ? material : material;
//
//             if (this.inventory[materialType][materialName] < amount) {
//                 return false;
//             }
//         }
//
//         // Remove materials
//         for (const [material, amount] of Object.entries(recipe)) {
//             const materialType = material.includes('Ingot') ? 'materials' : 'resources';
//             const materialName = material.includes('Ingot') ? material : material;
//
//             this.inventory[materialType][materialName] -= amount;
//         }
//
//         // Add alloy
//         this.inventory.materials[alloyType] = (this.inventory.materials[alloyType] || 0) + 1;
//
//         return true;
//     }
//
//     craftEquipment(equipmentType) {
//         const recipes = {
//             // Weapons
//             bronzeSword: {
//                 type: 'weapon',
//                 materials: { bronzeIngot: 5, wood: 1 },
//                 stats: { attack: 3 },
//                 durability: 100
//             },
//             ironSword: {
//                 type: 'weapon',
//                 materials: { ironIngot: 5, wood: 1 },
//                 stats: { attack: 5 },
//                 durability: 150
//             },
//             steelSword: {
//                 type: 'weapon',
//                 materials: { steelIngot: 5, wood: 1 },
//                 stats: { attack: 8 },
//                 durability: 200
//             },
//             mithrilSword: {
//                 type: 'weapon',
//                 materials: { mithrilIngot: 5, wood: 1 },
//                 stats: { attack: 12 },
//                 durability: 250
//             },
//             adamantiteGreatsword: {
//                 type: 'weapon',
//                 materials: { adamantiteSteelIngot: 10 },
//                 stats: { attack: 20 },
//                 durability: 300
//             },
//
//             // Armor - Helmets
//             ironHelmet: {
//                 type: 'helmet',
//                 materials: { ironIngot: 4 },
//                 stats: { armor: 3 },
//                 durability: 100
//             },
//             steelHelmet: {
//                 type: 'helmet',
//                 materials: { steelIngot: 4 },
//                 stats: { armor: 5 },
//                 durability: 150
//             },
//             mithrilHelmet: {
//                 type: 'helmet',
//                 materials: { mithrilSteelIngot: 4 },
//                 stats: { armor: 8 },
//                 durability: 200
//             },
//
//             // Armor - Chestplates
//             ironChestplate: {
//                 type: 'chestplate',
//                 materials: { ironIngot: 8 },
//                 stats: { armor: 5 },
//                 durability: 100
//             },
//             steelChestplate: {
//                 type: 'chestplate',
//                 materials: { steelIngot: 8 },
//                 stats: { armor: 8 },
//                 durability: 150
//             },
//             mithrilChestplate: {
//                 type: 'chestplate',
//                 materials: { mithrilSteelIngot: 8 },
//                 stats: { armor: 12 },
//                 durability: 200
//             },
//
//             // Armor - Leggings
//             ironLeggings: {
//                 type: 'leggings',
//                 materials: { ironIngot: 6 },
//                 stats: { armor: 4 },
//                 durability: 100
//             },
//             steelLeggings: {
//                 type: 'leggings',
//                 materials: { steelIngot: 6 },
//                 stats: { armor: 6 },
//                 durability: 150
//             },
//             mithrilLeggings: {
//                 type: 'leggings',
//                 materials: { mithrilSteelIngot: 6 },
//                 stats: { armor: 10 },
//                 durability: 200
//             },
//
//             // Armor - Gauntlets
//             ironGauntlets: {
//                 type: 'gauntlets',
//                 materials: { ironIngot: 3 },
//                 stats: { armor: 2 },
//                 durability: 100
//             },
//             steelGauntlets: {
//                 type: 'gauntlets',
//                 materials: { steelIngot: 3 },
//                 stats: { armor: 3 },
//                 durability: 150
//             },
//             mithrilGauntlets: {
//                 type: 'gauntlets',
//                 materials: { mithrilSteelIngot: 3 },
//                 stats: { armor: 5 },
//                 durability: 200
//             },
//
//             // Armor - Boots
//             ironBoots: {
//                 type: 'boots',
//                 materials: { ironIngot: 3 },
//                 stats: { armor: 2 },
//                 durability: 100
//             },
//             steelBoots: {
//                 type: 'boots',
//                 materials: { steelIngot: 3 },
//                 stats: { armor: 3 },
//                 durability: 150
//             },
//             mithrilBoots: {
//                 type: 'boots',
//                 materials: { mithrilSteelIngot: 3 },
//                 stats: { armor: 5 },
//                 durability: 200
//             }
//         };
//
//         const recipe = recipes[equipmentType];
//         if (!recipe) return false;
//
//         // Check if player has required materials
//         for (const [material, amount] of Object.entries(recipe.materials)) {
//             const materialType = material.includes('Ingot') ? 'materials' : 'resources';
//             const materialName = material;
//
//             if (this.inventory[materialType][materialName] < amount) {
//                 return false;
//             }
//         }
//
//         // Remove materials
//         for (const [material, amount] of Object.entries(recipe.materials)) {
//             const materialType = material.includes('Ingot') ? 'materials' : 'resources';
//             const materialName = material;
//
//             this.inventory[materialType][materialName] -= amount;
//         }
//
//         // Create equipment
//         const equipmentId = this.createEquipment(
//             recipe.type,
//             equipmentType.charAt(0).toUpperCase() + equipmentType.slice(1),
//             recipe.stats,
//             recipe.durability
//         );
//
//         return equipmentId;
//     }
//
//     getRecipes() {
//         return {
//             alloys: [
//                 { id: 'bronzeIngot', name: 'Bronze Ingot', materials: { copper: 2, iron: 1 } },
//                 { id: 'steelIngot', name: 'Steel Ingot', materials: { iron: 2, coal: 1 } },
//                 { id: 'electrumIngot', name: 'Electrum Ingot', materials: { gold: 1, silver: 1 } },
//                 { id: 'mithrilSteelIngot', name: 'Mithril Steel Ingot', materials: { mithril: 2, steelIngot: 1 } },
//                 { id: 'adamantiteSteelIngot', name: 'Adamantite Steel Ingot', materials: { adamantite: 1, steelIngot: 2 } }
//             ],
//             weapons: [
//                 { id: 'bronzeSword', name: 'Bronze Sword', materials: { bronzeIngot: 5, wood: 1 }, stats: { attack: 3 } },
//                 { id: 'ironSword', name: 'Iron Sword', materials: { ironIngot: 5, wood: 1 }, stats: { attack: 5 } },
//                 { id: 'steelSword', name: 'Steel Sword', materials: { steelIngot: 5, wood: 1 }, stats: { attack: 8 } },
//                 { id: 'mithrilSword', name: 'Mithril Sword', materials: { mithrilIngot: 5, wood: 1 }, stats: { attack: 12 } },
//                 { id: 'adamantiteGreatsword', name: 'Adamantite Greatsword', materials: { adamantiteSteelIngot: 10 }, stats: { attack: 20 } }
//             ],
//             armor: [
//                 { id: 'ironHelmet', name: 'Iron Helmet', materials: { ironIngot: 4 }, stats: { armor: 3 }, type: 'helmet' },
//                 { id: 'steelHelmet', name: 'Steel Helmet', materials: { steelIngot: 4 }, stats: { armor: 5 }, type: 'helmet' },
//                 { id: 'mithrilHelmet', name: 'Mithril Helmet', materials: { mithrilSteelIngot: 4 }, stats: { armor: 8 }, type: 'helmet' },
//
//                 { id: 'ironChestplate', name: 'Iron Chestplate', materials: { ironIngot: 8 }, stats: { armor: 5 }, type: 'chestplate' },
//                 { id: 'steelChestplate', name: 'Steel Chestplate', materials: { steelIngot: 8 }, stats: { armor: 8 }, type: 'chestplate' },
//                 { id: 'mithrilChestplate', name: 'Mithril Chestplate', materials: { mithrilSteelIngot: 8 }, stats: { armor: 12 }, type: 'chestplate' },
//
//                 { id: 'ironLeggings', name: 'Iron Leggings', materials: { ironIngot: 6 }, stats: { armor: 4 }, type: 'leggings' },
//                 { id: 'steelLeggings', name: 'Steel Leggings', materials: { steelIngot: 6 }, stats: { armor: 6 }, type: 'leggings' },
//                 { id: 'mithrilLeggings', name: 'Mithril Leggings', materials: { mithrilSteelIngot: 6 }, stats: { armor: 10 }, type: 'leggings' },
//
//                 { id: 'ironGauntlets', name: 'Iron Gauntlets', materials: { ironIngot: 3 }, stats: { armor: 2 }, type: 'gauntlets' },
//                 { id: 'steelGauntlets', name: 'Steel Gauntlets', materials: { steelIngot: 3 }, stats: { armor: 3 }, type: 'gauntlets' },
//                 { id: 'mithrilGauntlets', name: 'Mithril Gauntlets', materials: { mithrilSteelIngot: 3 }, stats: { armor: 5 }, type: 'gauntlets' },
//
//                 { id: 'ironBoots', name: 'Iron Boots', materials: { ironIngot: 3 }, stats: { armor: 2 }, type: 'boots' },
//                 { id: 'steelBoots', name: 'Steel Boots', materials: { steelIngot: 3 }, stats: { armor: 3 }, type: 'boots' },
//                 { id: 'mithrilBoots', name: 'Mithril Boots', materials: { mithrilSteelIngot: 3 }, stats: { armor: 5 }, type: 'boots' }
//             ]
//         };
//     }
//
//     // Input handling
//     setKeyPressed(key, isPressed) {
//         this.keysPressed[key] = isPressed;
//     }
//
//     isKeyPressed(key) {
//         return !!this.keysPressed[key];
//     }
//
//     setPointerLocked(locked) {
//         this.pointerLocked = locked;
//     }
//
//     updateCameraPitch(delta) {
//         this.cameraPitch += delta;
//
//         this.cameraPitch = Math.max(-.5, Math.min(.5, this.cameraPitch));
//     }
// }
//
// export default GameState;
