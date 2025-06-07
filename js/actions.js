// actions.js - Game actions (mining, chopping)

import { 
    player, pickaxe, axe, ores, trees, equippedTool, isInteracting, 
    currentActionTarget, actionProgress, MINE_DURATION, CHOP_DURATION,
    INTERACTION_DISTANCE, inventory
} from './core.js';

import { showGameMessage, updateInventoryDisplay } from './ui.js';

// --- Game Actions (Mining, Chopping) ---
function startAction() {
    if (isInteracting) return;
    let target, duration;
    const resourceList = equippedTool === 'pickaxe' ? ores : trees;

    let closestDistSq = INTERACTION_DISTANCE * INTERACTION_DISTANCE;
    resourceList.forEach(res => {
        if (res.visible) {
            const distSq = player.position.distanceToSquared(res.position);
            if (distSq < closestDistSq) { closestDistSq = distSq; target = res; }
        }
    });

    if (target) {
        isInteracting = true;
        currentActionTarget = target;
        actionProgress = 0;
        duration = equippedTool === 'pickaxe' ? MINE_DURATION : CHOP_DURATION;

        const resourceName = target.userData.resourceType === 'ore' ? target.userData.type : target.userData.resourceType;
        showGameMessage(`Gathering ${resourceName}...`, duration + 100);
    } else {
        showGameMessage(`No ${equippedTool === 'pickaxe' ? 'ore' : 'trees'} in range.`, 1500);
    }
}

function updateAction(deltaTime) {
    if (!isInteracting || !currentActionTarget) return;

    const tool = equippedTool === 'pickaxe' ? pickaxe : axe;
    const duration = equippedTool === 'pickaxe' ? MINE_DURATION : CHOP_DURATION;
    actionProgress += deltaTime / duration;

    const swingProgress = (actionProgress * duration / 200) % 1;
    tool.rotation.x = Math.PI / 2 - (Math.PI / 3) * Math.sin(swingProgress * Math.PI);

    if (actionProgress >= 1) {
        const resourceKey = currentActionTarget.userData.resourceType === 'ore'
            ? currentActionTarget.userData.type
            : currentActionTarget.userData.resourceType;

        inventory[resourceKey]++;
        showGameMessage(`+1 ${resourceKey}!`, 2000);
        updateInventoryDisplay();

        currentActionTarget.visible = false;
        const targetToRespawn = currentActionTarget;
        if (targetToRespawn.userData.respawnTimer === null) {
            targetToRespawn.userData.respawnTimer = setTimeout(() => {
                targetToRespawn.visible = true;
                targetToRespawn.userData.respawnTimer = null;
            }, 20000 + Math.random() * 10000);
        }

        isInteracting = false;
        currentActionTarget = null;
        actionProgress = 0;
        tool.rotation.x = Math.PI / 2;
    }
}

export {
    startAction,
    updateAction
};