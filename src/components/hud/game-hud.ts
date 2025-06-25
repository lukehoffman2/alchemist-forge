// src/components/hud/game-hud.ts

// Import child components to ensure they are registered
import './status-bars';
import './tool-selector';
import './inventory-panel';

import { StatusBarsComponent } from './status-bars';
import { ToolSelectorComponent } from './tool-selector';
import { InventoryPanelComponent } from './inventory-panel';
import { Tool, ToolInfo, Inventory } from './hud.types';

const hudTemplate = document.createElement('template');
// The HTML is now incredibly simple and declarative!
hudTemplate.innerHTML = `
  <style>
    :host {
      position: fixed; inset: 0;
      pointer-events: none; color: white;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    .bottom-hud {
      position: absolute; bottom: 24px; left: 50%;
      transform: translateX(-50%); display: flex;
      align-items: flex-end; gap: 24px;
    }
  </style>

  <inventory-panel id="inventory-panel"></inventory-panel>

  <div class="bottom-hud">
    <tool-selector id="tool-selector"></tool-selector>
    <status-bars id="status-bars"></status-bars>
  </div>
`;

export class GameHudComponent extends HTMLElement {
    // References to the child components
    private statusBars!: StatusBarsComponent;
    private toolSelector!: ToolSelectorComponent;
    private inventoryPanel!: InventoryPanelComponent;

    // State previously in this component is now managed by game logic
    // or delegated to child components.

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot!.appendChild(hudTemplate.content.cloneNode(true));

        // Get references to our child components
        this.statusBars = this.shadowRoot!.getElementById('status-bars') as StatusBarsComponent;
        this.toolSelector = this.shadowRoot!.getElementById('tool-selector') as ToolSelectorComponent;
        this.inventoryPanel = this.shadowRoot!.getElementById('inventory-panel') as InventoryPanelComponent;
    }

    // --- PUBLIC API (Delegation) ---
    // The main game logic interacts with these clean, high-level methods.

    public setHealth(percentage: number): void {
        this.statusBars.setHealth(percentage);
    }

    public setArmor(current: number, max: number): void {
        this.statusBars.setArmor(current, max);
    }

    public setTools(tools: ToolInfo[], currentToolId: Tool): void {
        this.toolSelector.setTools(tools, currentToolId);
    }

    public setActiveTool(toolId: Tool): void {
        this.toolSelector.setActiveTool(toolId);
    }

    public setInventory(inventory: Inventory): void {
        this.inventoryPanel.setInventory(inventory);
    }

    public toggleInventoryDisplay(visible: boolean): void {
        // Use the 'hidden' attribute for better accessibility and standards
        if (visible) {
            this.inventoryPanel.removeAttribute('hidden');
        } else {
            this.inventoryPanel.setAttribute('hidden', '');
        }
    }

    // --- Methods for interacting with popups etc. ---
    public showToolPopup(): void { this.toolSelector.showPopup(); }
    public hideToolPopup(): void { this.toolSelector.hidePopup(); }
    public isToolPopupVisible(): boolean { return this.toolSelector.isPopupVisible(); }
}

customElements.define('game-hud', GameHudComponent);