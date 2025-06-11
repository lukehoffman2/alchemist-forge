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
    // ... add properties for other elements you need to update

    constructor() {
        super();
        this.root = this.attachShadow({ mode: 'open' });
        this.root.appendChild(template.content.cloneNode(true));
        this.forgeUiElement = this.root.getElementById('forge-ui')!;
    }

    // --- PUBLIC API ---
    // This is how Game.ts will talk to this component
    public show(): void {
        this.forgeUiElement.style.display = 'block';
    }

    public hide(): void {
        this.forgeUiElement.style.display = 'none';
    }

    public isVisible(): boolean {
        return this.forgeUiElement.style.display !== 'none';
    }

    public update(gameState: any): void {
        // TODO: Pass the necessary part of the game state here
        // and update the fuel display, progress bars, recipes, etc.
        // For example:
        // const fuelDisplay = this.root.getElementById('forge-fuel-display');
        // if (fuelDisplay) fuelDisplay.textContent = gameState.forgeState.fuel;
    }
}

customElements.define('forge-ui', ForgeUiComponent);