// world.js - Functions for creating the game world

import { 
    scene, player, pickaxe, axe, forge, forgeLight, 
    ores, trees, playerHeight, playerRadius,
    ORE_TYPES, TREE_COUNT, MAP_SIZE
} from './core.js';

// --- World Creation ---
function addLights() {
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(20, 40, 15);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 150;
    Object.assign(dirLight.shadow.camera, { left: -MAP_SIZE/2, right: MAP_SIZE/2, top: MAP_SIZE/2, bottom: -MAP_SIZE/2 });
    scene.add(dirLight);
}

function createGround() {
    const groundGeo = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x556B2F, roughness: 0.8 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
}

function createPlayerAndTools() {
    const playerGroup = new THREE.Group();
    const bodyGeo = new THREE.CylinderGeometry(playerRadius, playerRadius, playerHeight - playerRadius * 2, 16);
    const playerMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.6 });
    const body = new THREE.Mesh(bodyGeo, playerMat);
    body.position.y = playerHeight / 2 - playerRadius; body.castShadow = true;
    playerGroup.add(body);
    const headGeo = new THREE.SphereGeometry(playerRadius, 16, 8);
    const head = new THREE.Mesh(headGeo, playerMat);
    head.position.y = playerHeight - playerRadius;
    playerGroup.add(head);
    player = playerGroup;
    player.position.y = playerRadius;
    scene.add(player);
    pickaxe = createTool(0x718096, 0.8);
    player.add(pickaxe);
    axe = createTool(0xdb2777, 1.0, true);
    player.add(axe);
    toggleTool(equippedTool, true);
}

function createTool(color, handleLength, isAxe = false) {
    const tool = new THREE.Group();
    const handleGeom = new THREE.CylinderGeometry(0.05, 0.05, handleLength, 8);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const handle = new THREE.Mesh(handleGeom, handleMat);
    handle.position.y = handleLength / 2;
    tool.add(handle);
    const headMat = new THREE.MeshStandardMaterial({ color: color });
    let headGeom;
    if (isAxe) {
        headGeom = new THREE.BoxGeometry(0.1, 0.4, 0.3);
    } else {
        headGeom = new THREE.BoxGeometry(0.1, 0.3, 0.1);
    }
    const head = new THREE.Mesh(headGeom, headMat);
    head.position.set(0, handleLength, isAxe ? 0.0 : 0.05);
    head.rotation.z = isAxe ? 0 : Math.PI / 2.5;
    tool.add(head);
    tool.position.set(playerRadius, playerHeight * 0.6, playerRadius * 0.5);
    tool.rotation.x = Math.PI / 2; tool.rotation.y = -0.5;
    return tool;
}

function createWorldResources() {
    Object.values(ORE_TYPES).forEach(type => {
        for (let i = 0; i < type.count; i++) {
            const oreGeo = new THREE.DodecahedronGeometry(type.size * 0.6, 0);
            const ore = new THREE.Mesh(oreGeo, new THREE.MeshStandardMaterial({ color: type.color, metalness: 0.4, roughness: 0.7 }));
            ore.position.set((Math.random() - 0.5) * MAP_SIZE, type.size * 0.5, (Math.random() * 0.5) * MAP_SIZE - MAP_SIZE * 0.45);
            ore.castShadow = true; ore.receiveShadow = true;
            ore.userData = { type: type.name, resourceType: 'ore', respawnTimer: null };
            scene.add(ore); ores.push(ore);
        }
    });
    const forestX = -MAP_SIZE / 2 + 10; const forestZ = MAP_SIZE / 2 - 10;
    for (let i = 0; i < TREE_COUNT; i++) {
        const trunkHeight = 3 + Math.random() * 2;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, trunkHeight, 8), new THREE.MeshStandardMaterial({ color: 0x8B4513 }));
        const leaves = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 0), new THREE.MeshStandardMaterial({ color: 0x22c55e }));
        const tree = new THREE.Group();
        trunk.castShadow = true; trunk.position.y = trunkHeight / 2;
        leaves.castShadow = true; leaves.position.y = trunkHeight + 0.5;
        tree.add(trunk); tree.add(leaves);
        tree.position.set(Math.random() * 20 - 10 + forestX, 0, Math.random() * 20 - 10 + forestZ);
        tree.userData = { type: 'tree', resourceType: 'wood', respawnTimer: null };
        scene.add(tree); trees.push(tree);
    }
    createDetailedForge();
}

function createDetailedForge() {
    forge = new THREE.Group();
    const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8, metalness: 0.1 });
    const metalMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.9, roughness: 0.4 });
    const fireMaterial = new THREE.MeshBasicMaterial({ color: 0xffaa33 });
    const forgeBase = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 4), stoneMaterial);
    forgeBase.position.y = 0.5;
    forgeBase.castShadow = true;
    forge.add(forgeBase);
    const forgeFire = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 2), fireMaterial);
    forgeFire.position.y = 1.5;
    forge.add(forgeFire);
    forgeLight = new THREE.PointLight(0xffaa33, 2, 100);
    forgeLight.position.set(0, 0, 0);
    forgeLight.castShadow = true;
    forgeFire.add(forgeLight);
    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.5, 6, 8), stoneMaterial);
    chimney.position.set(0, 4, 0);
    chimney.castShadow = true;
    forge.add(chimney);
    const anvilTop = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 0.75), metalMaterial);
    anvilTop.position.set(4, 1.25, 0);
    anvilTop.castShadow = true;
    forge.add(anvilTop);
    const anvilHorn = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.1, 1, 16), metalMaterial);
    anvilHorn.rotation.z = -Math.PI / 2;
    anvilHorn.position.set(5.5, 1.25, 0);
    anvilHorn.castShadow = true;
    forge.add(anvilHorn);
    const anvilBase = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.5), metalMaterial);
    anvilBase.position.set(4, 0.5, 0);
    anvilBase.castShadow = true;
    forge.add(anvilBase);
    forge.position.set(0, 0, -10);
    scene.add(forge);
}

export {
    addLights,
    createGround,
    createPlayerAndTools,
    createTool,
    createWorldResources,
    createDetailedForge
};