// src/components/forge/forge-ui.ts
import GameState, {
    ArmorRecipe,
    MaterialName,
    ResourceName,
} from '../../game/GameState';

const template = document.createElement('template');

template.innerHTML = `
    <style>
        :host {
            display: none;
            font-family: 'Arial', sans-serif;
        }
        #forge-modal {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90%;
            max-width: 650px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            background-color: #1e293b; /* slate-800 */
            border-radius: 8px;
            color: white;
            z-index: 100;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            border: 1px solid #334155; /* slate-700 */
        }
        .forge-header {
            padding: 1.5rem;
            text-align: center;
            border-bottom: 1px solid #334155; /* slate-700 */
            position: relative; /* For positioning the close button */
        }
        .forge-header h2 {
            font-size: 2.5rem;
            font-weight: bold;
            color: #f59e0b; /* amber-500 */
            margin: 0;
        }
        .forge-header p {
            margin: 0;
            color: #94a3b8; /* slate-400 */
        }
        #close-button {
            position: absolute;
            top: 1rem;
            right: 1rem;
            background: none;
            border: none;
            color: #94a3b8; /* slate-400 */
            font-size: 1.5rem;
            cursor: pointer;
            line-height: 1;
        }
        .forge-content {
            padding: 1.5rem;
            overflow-y: auto;
        }
        .fuel-section {
            margin-bottom: 1.5rem;
        }
        .fuel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
        }
        .fuel-bar-container {
            width: 100%;
            background-color: #334155; /* slate-700 */
            border-radius: 9999px;
            height: 0.75rem;
        }
        #fuel-bar {
            background-color: #f59e0b; /* amber-500 */
            height: 100%;
            border-radius: 9999px;
            transition: width 0.3s ease-in-out;
        }
        .tabs {
            display: flex;
            border-bottom: 1px solid #334155; /* slate-700 */
            margin-bottom: 1.5rem;
        }
        .tab-button {
            flex: 1;
            padding: 0.75rem;
            background: none;
            border: none;
            color: #94a3b8; /* slate-400 */
            cursor: pointer;
            font-size: 1rem;
            position: relative;
            transition: color 0.2s;
        }
        .tab-button.active {
            color: #f59e0b; /* amber-500 */
        }
        .tab-button.active::after {
            content: '';
            position: absolute;
            bottom: -1px;
            left: 0;
            right: 0;
            height: 2px;
            background-color: #f59e0b; /* amber-500 */
        }
        .tab-content {
            display: none;
        }
        .tab-content.active {
            display: block;
        }
        .recipe-list {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        .recipe-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background-color: #334155; /* slate-700 */
            padding: 1rem;
            border-radius: 6px;
        }
        .recipe-details h4 {
            margin: 0;
            font-size: 1.1rem;
            font-weight: bold;
        }
        .recipe-details p {
            margin: 0;
            font-size: 0.9rem;
            color: #94a3b8; /* slate-400 */
        }
        .recipe-icon {
            width: 40px;
            height: 40px;
            background-color: #475569; /* slate-600 */
            border-radius: 4px;
            margin-right: 1rem;
            /* Placeholder for actual icons */
        }
        .action-button {
            background-color: #f59e0b; /* amber-500 */
            color: #1e293b; /* slate-800 */
            border: none;
            border-radius: 4px;
            padding: 0.5rem 1rem;
            font-weight: bold;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        .action-button:hover:not(:disabled) {
            background-color: #fbbf24; /* amber-400 */
        }
        .action-button:disabled {
            background-color: #475569; /* slate-600 */
            color: #94a3b8; /* slate-400 */
            cursor: not-allowed;
        }
        .forge-footer {
            padding: 1.5rem;
            border-top: 1px solid #334155; /* slate-700 */
        }
        .add-fuel-button {
            width: 100%;
            background-color: #10b981; /* emerald-500 */
            color: white;
            border: none;
            border-radius: 6px;
            padding: 0.75rem;
            font-size: 1rem;
            font-weight: bold;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            transition: background-color 0.2s;
        }
        .add-fuel-button:hover:not(:disabled) {
            background-color: #059669; /* emerald-600 */
        }
        .add-fuel-button:disabled {
            background-color: #475569; /* slate-600 */
            color: #94a3b8; /* slate-400 */
            cursor: not-allowed;
        }

        @media (max-width: 600px) {
            #forge-modal {
                width: 95%;
                max-height: 90vh;
                overflow-y: auto;
            }
            .forge-header, .forge-content, .forge-footer {
                padding: 1rem;
            }
            .forge-header h2 {
                font-size: 2rem;
            }
            .recipe-item {
                flex-direction: column;
                align-items: stretch;
                gap: 0.75rem;
            }
            .action-button {
                padding: 0.75rem;
            }
        }
    </style>

    <div id="forge-modal">
        <div class="forge-header">
            <button id="close-button">&times;</button>
            <h2>FORGE</h2>
            <p>Status: <span id="forge-status">Idle</span></p>
        </div>
        <div class="forge-content">
            <div class="fuel-section">
                <div class="fuel-header">
                    <span>Fuel</span>
                    <span id="fuel-display">0 / 100</span>
                </div>
                <div class="fuel-bar-container">
                    <div id="fuel-bar" style="width: 0%;"></div>
                </div>
            </div>
            <div class="tabs">
                <button class="tab-button active" data-tab="smelt">SMELT ORE</button>
                <button class="tab-button" data-tab="craft">CRAFT ARMOR</button>
            </div>
            <div id="smelt-content" class="tab-content active">
                <div class="recipe-list" id="smelt-list">
                    <!-- Smelting recipes will be populated here -->
                </div>
            </div>
            <div id="craft-content" class="tab-content">
                <div class="recipe-list" id="craft-list">
                    <!-- Crafting recipes will be populated here -->
                </div>
            </div>
        </div>
        <div class="forge-footer">
            <button id="add-fuel-button" class="add-fuel-button">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-recycle" viewBox="0 0 16 16">
                    <path d="M9.302 1.256a1.5 1.5 0 0 0-2.604 0l-1.704 2.98a.5.5 0 0 0 .869.497l1.703-2.98a.5.5 0 0 1 .868 0l2.54 4.444-1.256-.337a.5.5 0 1 0-.26.966l2.415.647a.5.5 0 0 0 .613-.353l.647-2.415a.5.5 0 1 0-.966-.259l-.333 1.242-2.532-4.431zM2.973 7.773l-1.255.337a.5.5 0 1 1-.26-.966l2.416-.647a.5.5 0 0 1 .612.353l.647 2.415a.5.5 0 0 1-.966.259l-.333-1.242-2.532 4.431a.5.5 0 0 0 .869.497l2.53-4.43z"/>
                    <path fill-rule="evenodd" d="M10.86 7.033a.5.5 0 0 1 .592-.592l1.5 1.5a.5.5 0 0 1 0 .838l-1.5 1.5a.5.5 0 0 1-.838 0l-1.5-1.5a.5.5 0 0 1 .246-.838l1.5-1.5zM8 1a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 1zm-1.5 4.033a.5.5 0 0 1 .592.592l-1.5 1.5a.5.5 0 0 1-.838 0l-1.5-1.5a.5.5 0 0 1 .838-.838l1.5 1.5a.5.5 0 0 1 .246-.246z"/>
                </svg>
                <span>Add Wood (+10 Fuel)</span>
            </button>
        </div>
    </div>
`;

export class ForgeUiComponent extends HTMLElement {
    private root: ShadowRoot;
    private gameState?: GameState;

    private modal: HTMLElement;
    private statusDisplay: HTMLElement;
    private fuelDisplay: HTMLElement;
    private fuelBar: HTMLElement;
    private addFuelButton: HTMLButtonElement;
    private smeltList: HTMLElement;
    private craftList: HTMLElement;

    private ores: ResourceName[] = ['copper', 'iron', 'gold', 'silver', 'mithril', 'adamantite', 'obsidian'];

    constructor() {
        super();
        this.root = this.attachShadow({ mode: 'open' });
        this.root.appendChild(template.content.cloneNode(true));

        this.modal = this.root.getElementById('forge-modal')!;
        this.statusDisplay = this.root.getElementById('forge-status')!;
        this.fuelDisplay = this.root.getElementById('fuel-display')!;
        this.fuelBar = this.root.getElementById('fuel-bar')!;
        this.addFuelButton = this.root.getElementById('add-fuel-button') as HTMLButtonElement;
        this.smeltList = this.root.getElementById('smelt-list')!;
        this.craftList = this.root.getElementById('craft-list')!;

        this.addEventListeners();
    }

    private addEventListeners(): void {
        this.root.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                const tab = target.dataset.tab;

                this.root.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                target.classList.add('active');

                this.root.querySelectorAll('.tab-content').forEach(content => {
                    (content as HTMLElement).style.display = 'none';
                    content.classList.remove('active');
                });
                const activeContent = this.root.getElementById(`${tab}-content`);
                if (activeContent) {
                    activeContent.style.display = 'block';
                    activeContent.classList.add('active');
                }
            });
        });

        this.addFuelButton.addEventListener('click', () => this.handleAddFuel());

        this.root.getElementById('close-button')?.addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('forge-closed', { bubbles: true, composed: true }));
        });
    }

    private handleAddFuel(): void {
        if (this.gameState?.addForgeFuel(10)) {
            this.update(this.gameState);
        }
    }

    private handleSmeltOre(ore: ResourceName): void {
        if (this.gameState?.startSmelting(ore)) {
            this.update(this.gameState);
        }
    }

    private handleCraftArmor(recipeName: string): void {
        if (this.gameState?.craftArmorItem(recipeName)) {
            this.update(this.gameState);
        }
    }

    public show(): void {
        this.style.display = 'block';
    }

    public hide(): void {
        this.style.display = 'none';
    }

    public isVisible(): boolean {
        return this.style.display !== 'none';
    }

    public update(gameState: GameState): void {
        this.gameState = gameState;
        const forgeState = gameState.getForgeState();

        // Update header and fuel
        this.statusDisplay.textContent = forgeState.isSmelting ? `Smelting ${forgeState.oreToSmelt}` : 'Idle';
        this.fuelDisplay.textContent = `${forgeState.fuel} / ${forgeState.maxFuel}`;
        this.fuelBar.style.width = `${(forgeState.fuel / forgeState.maxFuel) * 100}%`;

        // Update "Add Fuel" button state
        const canAddFuel = gameState.inventory.resources.wood >= 10 && forgeState.fuel < forgeState.maxFuel;
        this.addFuelButton.disabled = !canAddFuel;

        // Update smelting list
        this.renderSmeltList(gameState);

        // Update crafting list
        this.renderCraftList(gameState);
    }

    private renderSmeltList(gameState: GameState): void {
        this.smeltList.innerHTML = ''; // Clear existing
        const forgeState = gameState.getForgeState();

        this.ores.forEach(ore => {
            const canSmelt = !forgeState.isSmelting && (gameState.inventory.resources[ore] ?? 0) >= 1 && forgeState.fuel >= 5;
            const item = this.createRecipeItem(
                `Smelt ${ore.charAt(0).toUpperCase() + ore.slice(1)}`,
                `Turns 1 ${ore.charAt(0).toUpperCase() + ore.slice(1)} Ore into 1 ${ore.charAt(0).toUpperCase() + ore.slice(1)} Bar`,
                'Smelt',
                canSmelt,
                () => this.handleSmeltOre(ore)
            );
            this.smeltList.appendChild(item);
        });
    }

    private renderCraftList(gameState: GameState): void {
        this.craftList.innerHTML = ''; // Clear existing
        const recipes = gameState.getArmorRecipes();
        const inventoryMaterials = gameState.inventory.materials;

        for (const recipeName in recipes) {
            const recipe = recipes[recipeName];
            const materialsText = Object.entries(recipe.materialsRequired)
                .map(([mat, N]) => `${N} ${mat.replace('Ingot', '')}`)
                .join(', ');

            let canCraft = true;
            for (const materialName in recipe.materialsRequired) {
                const requiredAmount = recipe.materialsRequired[materialName as MaterialName]!;
                const hasAmount = inventoryMaterials[materialName as MaterialName] || 0;
                if (hasAmount < requiredAmount) {
                    canCraft = false;
                    break;
                }
            }

            const item = this.createRecipeItem(
                `Craft ${recipe.item.name}`,
                `Requires: ${materialsText}`,
                'Craft',
                canCraft,
                () => this.handleCraftArmor(recipeName)
            );
            this.craftList.appendChild(item);
        }
    }

    private createRecipeItem(title: string, description: string, buttonText: string, enabled: boolean, onClick: () => void): HTMLElement {
        const item = document.createElement('div');
        item.className = 'recipe-item';

        item.innerHTML = `
            <div style="display: flex; align-items: center;">
                <div class="recipe-icon"></div>
                <div class="recipe-details">
                    <h4>${title}</h4>
                    <p>${description}</p>
                </div>
            </div>
            <button class="action-button">${buttonText}</button>
        `;

        const button = item.querySelector('.action-button') as HTMLButtonElement;
        button.disabled = !enabled;
        button.addEventListener('click', onClick);

        return item;
    }
}

customElements.define('forge-ui', ForgeUiComponent);
