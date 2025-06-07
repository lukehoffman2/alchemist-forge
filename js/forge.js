// forge.js - Forge-related functionality

import { 
    player, forge, forgeState, inventory, INTERACTION_DISTANCE, SMELT_DURATION
} from './core.js';

import { showGameMessage, updateInventoryDisplay, updateForgeUI } from './ui.js';

// --- Forge Logic & Gemini API ---
function toggleForgeUI() {
    const forgeUI = document.getElementById('forge-ui');
    const distSq = player.position.distanceToSquared(forge.position);
    if (forgeUI.style.display === 'none' && distSq < (INTERACTION_DISTANCE * INTERACTION_DISTANCE)) {
        forgeUI.style.display = 'block';
        if (document.pointerLockElement) document.exitPointerLock();
    } else {
        forgeUI.style.display = 'none';
    }
}

function addForgeFuel() {
    if (inventory.wood >= 10 && forgeState.fuel + 10 <= forgeState.maxFuel) {
        inventory.wood -= 10;
        forgeState.fuel += 10;
        updateForgeUI();
        updateInventoryDisplay();
        showGameMessage("+10 Fuel", 1500);
    } else if (inventory.wood < 10) {
        showGameMessage("Not enough wood (need 10).", 1500);
    } else {
        showGameMessage("Forge fuel is full.", 1500);
    }
}

function startSmelting(oreType) {
    if (forgeState.isSmelting) { showGameMessage("Forge is busy.", 1500); return; }
    if (forgeState.fuel < 5) { showGameMessage("Not enough fuel (need 5).", 1500); return; }
    if (inventory[oreType] < 1) { showGameMessage(`No ${oreType} ore to smelt.`, 1500); return; }

    forgeState.fuel -= 5;
    inventory[oreType]--;
    forgeState.isSmelting = true;
    forgeState.smeltingProgress = 0;
    forgeState.oreToSmelt = oreType;

    showGameMessage(`Smelting ${oreType} ingot...`, SMELT_DURATION);
    updateForgeUI();
    updateInventoryDisplay();
}

function updateSmelting(deltaTime) {
    if (!forgeState.isSmelting) return;

    forgeState.smeltingProgress += deltaTime / SMELT_DURATION;
    if (forgeState.smeltingProgress >= 1) {
        const ingotType = `${forgeState.oreToSmelt}Ingot`;
        inventory[ingotType]++;
        showGameMessage(`+1 ${forgeState.oreToSmelt} Ingot!`, 2000);
        updateInventoryDisplay();

        forgeState.isSmelting = false;
        forgeState.smeltingProgress = 0;
        forgeState.oreToSmelt = null;
    }
    if (document.getElementById('forge-ui').style.display === 'block') {
        updateForgeUI();
    }
}

function openGeminiModal() {
    document.getElementById('gemini-modal').style.display = 'flex';
    document.getElementById('gemini-response').textContent = '...';
    if (document.pointerLockElement) document.exitPointerLock();
}

function closeGeminiModal() {
    document.getElementById('gemini-modal').style.display = 'none';
}

async function askGemini() {
    const userInput = document.getElementById('gemini-prompt').value;
    if (!userInput) {
        showGameMessage("You must ask a question!", 2000);
        return;
    }

    const responseDiv = document.getElementById('gemini-response');
    responseDiv.textContent = '';
    responseDiv.classList.add('loading');

    const inventoryString = Object.entries(inventory)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');

    const fullPrompt = `
            You are the Forge Master, a wise, ancient, and slightly grumpy blacksmith in a fantasy world. 
            A player comes to you for advice.
            Their inventory contains: ${inventoryString}.
            Their question is: "${userInput}"
            
            Give them a short, creative, in-character response. Offer helpful advice, but with the personality of a master craftsman who has seen it all. 
            Keep your response to about 2-4 sentences.
        `;

    try {
        const chatHistory = [{ role: "user", parts: [{ text: fullPrompt }] }];
        const payload = { contents: chatHistory };
        const apiKey = "";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();

        responseDiv.classList.remove('loading');

        if (result.candidates && result.candidates.length > 0) {
            responseDiv.textContent = result.candidates[0].content.parts[0].text;
        } else {
            responseDiv.textContent = "The Forge Master grunts, seemingly unimpressed by your question. Try asking again.";
        }
    } catch (error) {
        console.error("Gemini API error:", error);
        responseDiv.classList.remove('loading');
        responseDiv.textContent = "The forge fire sputters and dies... something is wrong. (API Error)";
    }
}

export {
    toggleForgeUI,
    addForgeFuel,
    startSmelting,
    updateSmelting,
    openGeminiModal,
    closeGeminiModal,
    askGemini
};