// src/components/equipment/equipment-ui.ts

import GameState, { EquipmentSlot } from '../../game/GameState'; // Assuming GameState path

const template = document.createElement('template');
template.innerHTML = `
    <style>
        #equipment-panel {
            display: none; /* Hidden by default */
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 300px;
            background-color: rgba(40, 51, 69, 0.95);
            border: 1px solid #5b6573;
            border-radius: 8px;
            padding: 1.5rem;
            color: white;
            z-index: 25; /* Ensure it's above other UI elements if needed */
            font-family: Arial, sans-serif;
            box-shadow: 0 0 15px rgba(0,0,0,0.5);
        }
        .equipment-slot {
            margin-bottom: 10px;
            padding: 8px;
            background-color: rgba(30, 41, 59, 0.8);
            border-radius: 4px;
        }
        .slot-label {
            font-weight: bold;
            margin-right: 10px;
            color: #cbd5e1; /* Light gray for labels */
        }
        .item-name {
            color: #94a3b8; /* Lighter gray for item names */
        }
        h3 {
            text-align: center;
            margin-top: 0;
            color: #e2e8f0; /* A light title color */
            border-bottom: 1px solid #5b6573;
            padding-bottom: 10px;
            margin-bottom: 15px;
        }
        button#close-equipment-ui {
            display: block;
            margin: 15px auto 0;
            padding: 8px 16px;
            background-color: #ef4444; /* Red */
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        button#close-equipment-ui:hover {
            background-color: #dc2626; /* Darker Red */
        }
    </style>
    <div id="equipment-panel">
        <h3>Player Equipment</h3>
        <div class="equipment-slot">
            <span class="slot-label">Head:</span>
            <span class="item-name" data-slot="head">Empty</span>
        </div>
        <div class="equipment-slot">
            <span class="slot-label">Chest:</span>
            <span class="item-name" data-slot="chest">Empty</span>
        </div>
        <div class="equipment-slot">
            <span class="slot-label">Legs:</span>
            <span class="item-name" data-slot="legs">Empty</span>
        </div>
        <div class="equipment-slot">
            <span class="slot-label">Feet:</span>
            <span class="item-name" data-slot="feet">Empty</span>
        </div>
        <button id="close-equipment-ui">Close</button>
    </div>
`;

export class EquipmentUiComponent extends HTMLElement {
    private root: ShadowRoot;
    private equipmentPanel: HTMLElement;
    private slotElements: Record<EquipmentSlot, HTMLElement> = {} as Record<EquipmentSlot, HTMLElement>;
    private relevantSlots: EquipmentSlot[] = ['head', 'chest', 'legs', 'feet'];

    constructor() {
        super();
        this.root = this.attachShadow({ mode: 'open' });
        this.root.appendChild(template.content.cloneNode(true));
        this.equipmentPanel = this.root.getElementById('equipment-panel')!;

        this.relevantSlots.forEach(slot => {
            const element = this.root.querySelector(`.item-name[data-slot="${slot}"]`);
            if (element) {
                this.slotElements[slot] = element as HTMLElement;
            } else {
                console.error(`Equipment UI: Slot element for '${slot}' not found.`);
            }
        });

        const closeButton = this.root.getElementById('close-equipment-ui');
        closeButton?.addEventListener('click', () => this.hide());
    }

    public show(): void {
        this.equipmentPanel.style.display = 'block';
        // Potentially dispatch an event that the game can listen to, to handle pointer lock etc.
        this.dispatchEvent(new CustomEvent('equipment-ui-opened', { bubbles: true, composed: true }));
    }

    public hide(): void {
        this.equipmentPanel.style.display = 'none';
        // Potentially dispatch an event
        this.dispatchEvent(new CustomEvent('equipment-ui-closed', { bubbles: true, composed: true }));
    }

    public isVisible(): boolean {
        return this.equipmentPanel.style.display !== 'none';
    }

    public update(gameState: GameState): void {
        if (!gameState) return;

        this.relevantSlots.forEach(slotName => {
            const slotElement = this.slotElements[slotName];
            if (!slotElement) return;

            const equippedItemId = gameState.player.equipment[slotName];
            if (equippedItemId) {
                const item = gameState.getEquipment(equippedItemId);
                slotElement.textContent = item ? item.name : 'Error: Item not found';
            } else {
                slotElement.textContent = 'Empty';
            }
        });
    }
}

customElements.define('equipment-ui', EquipmentUiComponent);
