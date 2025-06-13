// src/components/forge/forge-ui.ts

const template = document.createElement('template');

// All the HTML and CSS for the Forge UI goes here, completely encapsulated.
template.innerHTML = `
    <style>
        /* Add any specific styles for the forge UI here */
        #forge-ui {
            display: none; /* Hidden by default */
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 500px;
            background-color: rgba(30, 41, 59, 0.9);
            border: 1px solid #4b5563;
            border-radius: 8px;
            padding: 1.5rem;
            color: white;
            z-index: 20;
            backdrop-filter: blur(5px);
        }
        /* ... copy other relevant styles from your old CSS file ... */
    </style>

    <div id="forge-ui">
        <h3 class="text-2xl font-bold mb-4">Forge</h3>
        <div class="forge-status">Fuel: <span id="forge-fuel-display">0</span> / 100</div>
        <div class="w-full bg-gray-700 rounded-full h-2.5 mb-4"><div id="forge-fuel-bar" class="bg-red-600 h-2.5 rounded-full" style="width: 0%"></div></div>
        <div class="forge-status">Status: <span id="smelting-status-display">Idle</span></div>
        <div class="w-full bg-gray-700 rounded-full h-2.5 mb-4"><div id="smelting-progress-bar" class="bg-blue-600 h-2.5 rounded-full" style="width: 0%"></div></div>

        </div>
`;

export class ForgeUiComponent extends HTMLElement {
    private root: ShadowRoot;
    private forgeUiElement: HTMLElement;
    private fuelDisplay: HTMLElement;
    private fuelBar: HTMLElement;
    private smeltingStatusDisplay: HTMLElement;
    private smeltingProgressBar: HTMLElement;
    private armorRecipesContainer: HTMLElement; // Container for armor crafting buttons

    // Keep a reference to GameState to make calls from UI interactions
    private gameState?: import('../../game/GameState').default;
    // Define types for GameState related properties if not already broadly available via import
    private ores: import('../../game/GameState').ResourceName[] = ['copper', 'iron', 'gold', 'silver', 'mithril', 'adamantite', 'obsidian'];
    // Explicitly type ArmorRecipe if direct import from GameState is complex or not preferred here
    private ArmorRecipeType = {} as import('../../game/GameState').ArmorRecipe; // Helper for type casting/intellisense


    constructor() {
        super();
        this.root = this.attachShadow({ mode: 'open' });
        this.root.appendChild(template.content.cloneNode(true));
        this.forgeUiElement = this.root.getElementById('forge-ui')!;
        this.fuelDisplay = this.root.getElementById('forge-fuel-display')!;
        this.fuelBar = this.root.getElementById('forge-fuel-bar')!;
        this.smeltingStatusDisplay = this.root.getElementById('smelting-status-display')!;
        this.smeltingProgressBar = this.root.getElementById('smelting-progress-bar')!;

        this.armorRecipesContainer = document.createElement('div'); // Initialize the container
        this.forgeUiElement.appendChild(this.armorRecipesContainer); // Append it to the UI structure

        this.renderOreButtons();
        this.renderArmorCraftingSection(); // Initial setup for armor crafting section
        this.addEventListeners(); // For fuel button
    }

    private renderOreButtons(): void {
        const oreSelectionContainer = document.createElement('div');
        oreSelectionContainer.className = 'ore-selection mb-4';
        oreSelectionContainer.innerHTML = '<h4 class="text-lg font-semibold mb-2">Select Ore:</h4>';

        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'grid grid-cols-3 gap-2'; // Example layout

        this.ores.forEach(ore => {
            const button = document.createElement('button');
            button.id = `smelt-${ore}-button`;
            button.textContent = `Smelt ${ore.charAt(0).toUpperCase() + ore.slice(1)}`;
            button.className = 'bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded'; // Basic styling
            button.addEventListener('click', () => this.handleSmeltOre(ore));
            buttonsContainer.appendChild(button);
        });
        oreSelectionContainer.appendChild(buttonsContainer);
        this.forgeUiElement.appendChild(oreSelectionContainer); // Append before action buttons if any
    }

    private addEventListeners(): void {
        const addFuelButton = document.createElement('button');
        addFuelButton.id = 'add-fuel-button';
        addFuelButton.textContent = 'Add Wood (10 fuel)';
        addFuelButton.className = 'bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded w-full mt-4'; // Placed after armor section
        addFuelButton.addEventListener('click', () => this.handleAddFuel());
        // Appending fuel button after other sections typically makes sense for layout
        this.forgeUiElement.appendChild(addFuelButton);
    }

    private renderArmorCraftingSection(): void {
        this.armorRecipesContainer.className = 'armor-crafting mb-4';
        this.armorRecipesContainer.innerHTML = '<h4 class="text-lg font-semibold mb-2">Craft Armor:</h4>';
        // Buttons will be populated by the update method
    }

    private handleAddFuel(): void {
        if (this.gameState) {
            const success = this.gameState.addForgeFuel(10); // Add 10 fuel (e.g., 1 wood = 1 fuel, 10 wood consumed)
            if (success) {
                console.log("Fuel added");
                this.update(this.gameState); // Re-render with new state
            } else {
                console.log("Failed to add fuel (not enough wood or forge full)");
                // Optionally, display a message to the user in the UI
            }
        }
    }

    private handleSmeltOre(ore: import('../../game/GameState').ResourceName): void {
        if (this.gameState) {
            const success = this.gameState.startSmelting(ore);
            if (success) {
                console.log(`Started smelting ${ore}`);
                this.update(this.gameState); // Re-render
            } else {
                console.log(`Failed to start smelting ${ore} (not enough resources, fuel, or already smelting)`);
                // Optionally, display a message to the user
            }
        }
    }

    private handleCraftArmor(recipeName: string): void {
        if (this.gameState) {
            const craftedItemId = this.gameState.craftArmorItem(recipeName);
            if (craftedItemId) {
                console.log(`Successfully crafted ${recipeName}! Item ID: ${craftedItemId}.`);
                // TODO: Show success message in UI
            } else {
                console.log(`Failed to craft ${recipeName}. Check resources or recipe details.`);
                // TODO: Show failure message in UI
            }
            this.update(this.gameState); // Re-render to update button states and inventory
        }
    }

    // --- PUBLIC API ---
    // This is how Game.ts will talk to this component
    public show(): void {
        this.forgeUiElement.style.display = 'block';
        if (this.gameState) { // Ensure UI is up-to-date when shown
            this.update(this.gameState);
        }
    }

    public hide(): void {
        this.forgeUiElement.style.display = 'none';
    }

    public isVisible(): boolean {
        return this.forgeUiElement.style.display !== 'none';
    }

    public update(gameState: import('../../game/GameState').default): void {
        this.gameState = gameState; // Cache gameState for internal use

        const forgeState = gameState.getForgeState();
        this.fuelDisplay.textContent = `${forgeState.fuel} / ${forgeState.maxFuel}`;
        this.fuelBar.style.width = `${(forgeState.fuel / forgeState.maxFuel) * 100}%`;

        if (forgeState.isSmelting && forgeState.oreToSmelt) {
            this.smeltingStatusDisplay.textContent = `Smelting ${forgeState.oreToSmelt}`;
            this.smeltingProgressBar.style.width = `${forgeState.smeltingProgress * 100}%`;
        } else {
            this.smeltingStatusDisplay.textContent = 'Idle';
            this.smeltingProgressBar.style.width = '0%';
        }

        // Update ore button states (e.g., disable if not enough ore)
        this.ores.forEach(ore => {
            const button = this.root.getElementById(`smelt-${ore}-button`) as HTMLButtonElement | null;
            if (button) {
                // Basic check: disable if smelting or not enough ore (assuming 1 ore needed)
                // More complex checks (like fuel for *this* specific ore) could be added
                const canSmelt = !forgeState.isSmelting && gameState.inventory.resources[ore] >= 1 && forgeState.fuel >=5;
                button.disabled = !canSmelt;
                button.style.opacity = canSmelt ? '1' : '0.5';
            }
        });

        // Update fuel button state
        const addFuelButton = this.root.getElementById('add-fuel-button') as HTMLButtonElement | null;
        if (addFuelButton) {
            const canAddFuel = gameState.inventory.resources.wood >= 10 && forgeState.fuel < forgeState.maxFuel;
            addFuelButton.disabled = !canAddFuel;
            addFuelButton.style.opacity = canAddFuel ? '1' : '0.5';
        }

        this.updateArmorRecipeButtons(gameState);
    }

    private updateArmorRecipeButtons(gameState: import('../../game/GameState').default): void {
        // Clear existing buttons before re-rendering
        // Keep the title, so start removing children after the first one (the h4 title)
        while (this.armorRecipesContainer.children.length > 1) {
            this.armorRecipesContainer.removeChild(this.armorRecipesContainer.lastChild!);
        }

        const recipes = gameState.getArmorRecipes();
        const inventoryMaterials = gameState.inventory.materials;

        const buttonsGrid = document.createElement('div'); // Using a grid for armor recipes too
        buttonsGrid.className = 'grid grid-cols-2 gap-2'; // Or grid-cols-1 for a list view

        for (const recipeName in recipes) {
            const recipe = recipes[recipeName];
            const button = document.createElement('button');
            button.id = `craft-${recipe.item.name.replace(/\s+/g, '-')}-button`; // e.g. craft-Iron-Helmet-button

            let materialsText = Object.entries(recipe.materialsRequired)
                .map(([mat, N]) => `${N} ${mat.replace('Ingot', '')}`) // e.g., "3 Iron"
                .join(', ');
            button.textContent = `Craft ${recipe.item.name} (${materialsText})`;
            button.className = 'bg-blue-700 hover:bg-blue-600 text-white font-bold py-2 px-3 rounded text-sm'; // Adjusted styling for potentially longer text

            let canCraft = true;
            for (const materialKey in recipe.materialsRequired) {
                const materialName = materialKey as import('../../game/GameState').MaterialName;
                const requiredAmount = recipe.materialsRequired[materialName]!;
                if (!inventoryMaterials[materialName] || inventoryMaterials[materialName] < requiredAmount) {
                    canCraft = false;
                    break;
                }
            }

            button.disabled = !canCraft;
            button.style.opacity = canCraft ? '1' : '0.5';
            button.addEventListener('click', () => this.handleCraftArmor(recipeName));
            buttonsGrid.appendChild(button);
        }
        this.armorRecipesContainer.appendChild(buttonsGrid);
    }
}

customElements.define('forge-ui', ForgeUiComponent);