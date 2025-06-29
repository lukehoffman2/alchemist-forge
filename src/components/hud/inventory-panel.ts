// src/components/hud/inventory-panel.ts
import { Inventory } from "./hud.types";

const inventoryPanelTemplate = document.createElement('template');
inventoryPanelTemplate.innerHTML = `
    <style>
        /* All CSS related to the inventory panel goes here */
        :host {
            position: absolute; top: 20px; right: 20px;
            width: 125px; max-height: 400px; overflow-y: auto;
            background-color: rgba(0, 0, 0, 0.7);
            border: 2px solid rgba(255, 255, 255, 0.3); border-radius: 10px;
            padding: 15px; color: white; display: block;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            pointer-events: auto;
        }
        :host([hidden]) { display: none; }
        h3 {
            margin-top: 0; text-align: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            padding-bottom: 10px; margin-bottom: 10px;
        }
        .inventory-item { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; font-size: 14px; }
        .inventory-item img { width: 20px; height: 20px; margin-right: 8px; }
        .inventory-item span:first-child { text-transform: capitalize; flex-grow: 1; }
        h4 { 
            margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.1);
            padding-top: 10px; font-size: 1em; 
        }
        p.empty-message {
            text-align: center; font-size: 13px; color: rgba(255,255,255,0.6);
        }
    </style>
    <h3>Inventory</h3>
    <div id="inventory-list"></div>
`;

export class InventoryPanelComponent extends HTMLElement {
    private inventoryList!: HTMLElement;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot!.appendChild(inventoryPanelTemplate.content.cloneNode(true));
        this.inventoryList = this.shadowRoot!.getElementById('inventory-list')!;
    }

    public setInventory(inventory: Inventory): void {
        this.inventoryList.innerHTML = ''; // Clear previous items

        const formatItemName = (rawName: string): string => {
            let formatted = rawName.replace(/([A-Z])/g, ' $1').replace(/Ingot/g, ' Ingot');
            return formatted.charAt(0).toUpperCase() + formatted.slice(1).trim();
        };

        const getItemIconPath = (itemName: string): string => {
            const basePath = "src/assets/";
            let folder = "ores/icons"; // Default to ores
            let fileName = itemName;

            if (itemName.toLowerCase().includes("wood")) {
                folder = "wood/icon";
                fileName = "wood.png";
            } else if (itemName.toLowerCase().includes("coal")) {
                folder = "";
                fileName = fileName.concat(".png");
            } else {
                fileName = fileName.concat("_ore.png");
            }

            return `${basePath}${folder}/${fileName}`;
        };

        const createItemElement = (name: string, count: number) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'inventory-item';

            const icon = document.createElement('img');
            icon.src = getItemIconPath(name);
            icon.alt = formatItemName(name); // Alt text for accessibility

            const nameSpan = document.createElement('span');
            nameSpan.textContent = formatItemName(name);

            const countSpan = document.createElement('span');
            countSpan.textContent = `${count}`;

            itemDiv.appendChild(icon);
            itemDiv.appendChild(nameSpan);
            itemDiv.appendChild(countSpan);
            return itemDiv;
        };

        let hasItems = false;

        // Add Resources
        const resourceKeys = Object.keys(inventory.resources);
        if (resourceKeys.some(key => inventory.resources[key] > 0)) {
            for (const resourceName in inventory.resources) {
                if (inventory.resources[resourceName] > 0) {
                    this.inventoryList.appendChild(createItemElement(resourceName, inventory.resources[resourceName]));
                    hasItems = true;
                }
            }
        }

        // Add Materials
        const materialKeys = Object.keys(inventory.materials);
        if (materialKeys.some(key => inventory.materials[key] > 0)) {
            const materialsTitle = document.createElement('h4');
            materialsTitle.textContent = 'Ingots & Materials';
            this.inventoryList.appendChild(materialsTitle);
            for (const materialName in inventory.materials) {
                if (inventory.materials[materialName] > 0) {
                    this.inventoryList.appendChild(createItemElement(materialName, inventory.materials[materialName]));
                    hasItems = true;
                }
            }
        }

        if (!hasItems) {
            const emptyMsg = document.createElement('p');
            emptyMsg.textContent = 'Your inventory is empty.';
            emptyMsg.className = 'empty-message';
            this.inventoryList.appendChild(emptyMsg);
        }
    }
}

customElements.define('inventory-panel', InventoryPanelComponent);