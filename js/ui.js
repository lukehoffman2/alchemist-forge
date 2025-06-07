// ui.js - UI update functions

import { inventory, equippedTool, forgeState } from './core.js';

// --- UI Updates ---
let messageTimeout;
function showGameMessage(message, duration = 3000) {
    const box = document.getElementById('message-box');
    box.textContent = message; box.style.opacity = '1';
    clearTimeout(messageTimeout);
    messageTimeout = setTimeout(() => { box.style.opacity = '0'; }, duration);
}

function updateInventoryDisplay() {
    const container = document.getElementById('inventory-display');
    container.innerHTML = `
            <div class="inventory-category">Tools</div>
            <div class="inventory-slot bg-slate-700">
                <div class="icon-placeholder">T</div> <span>${equippedTool.charAt(0).toUpperCase() + equippedTool.slice(1)}</span>
            </div>
            <div class="inventory-category">Resources</div>
            <div class="inventory-slot"><div class="icon-placeholder" style="background-color:#A0522D;">W</div> <span>Wood: ${inventory.wood}</span></div>
            <div class="inventory-slot"><div class="icon-placeholder" style="background-color:#b87333;">Cu</div> <span>Copper: ${inventory.copper}</span></div>
            <div class="inventory-slot"><div class="icon-placeholder" style="background-color:#808080;">Fe</div> <span>Iron: ${inventory.iron}</span></div>
            <div class="inventory-slot"><div class="icon-placeholder" style="background-color:#FFD700;">Au</div> <span>Gold: ${inventory.gold}</span></div>
            <div class="inventory-category">Ingots</div>
            <div class="inventory-slot"><div class="icon-placeholder" style="background-color:#f97316;"></div> <span>Copper: ${inventory.copperIngot}</span></div>
            <div class="inventory-slot"><div class="icon-placeholder" style="background-color:#9ca3af;"></div> <span>Iron: ${inventory.ironIngot}</span></div>
            <div class="inventory-slot"><div class="icon-placeholder" style="background-color:#facc15;"></div> <span>Gold: ${inventory.goldIngot}</span></div>
        `;
}

function updateForgeUI() {
    document.getElementById('forge-fuel-display').textContent = `${forgeState.fuel}`;
    document.getElementById('forge-fuel-bar').style.width = `${(forgeState.fuel / forgeState.maxFuel) * 100}%`;

    const statusDisplay = document.getElementById('smelting-status-display');
    const progressBar = document.getElementById('smelting-progress-bar');
    if (forgeState.isSmelting) {
        statusDisplay.textContent = `Smelting ${forgeState.oreToSmelt}...`;
        progressBar.style.width = `${forgeState.smeltingProgress * 100}%`;
    } else {
        statusDisplay.textContent = 'Idle';
        progressBar.style.width = '0%';
    }
    document.querySelectorAll('.smelt-button[data-ore]').forEach(btn => {
        const ore = btn.dataset.ore;
        btn.classList.toggle('disabled', forgeState.isSmelting || forgeState.fuel < 5 || inventory[ore] < 1);
    });
    document.getElementById('add-fuel-button').classList.toggle('disabled', inventory.wood < 10 || forgeState.fuel >= forgeState.maxFuel);
}

export {
    showGameMessage,
    updateInventoryDisplay,
    updateForgeUI
};