import GameState, { Tool } from './GameState';
import { GameHudComponent } from '../components/hud/game-hud';
import { ForgeUiComponent } from '../components/forge/forge-ui';
import { EquipmentUiComponent } from '../components/equipment/equipment-ui';
import { LoadingScreenComponent } from '../components/loading/loading-screen';

// Moved from Game.ts - used by HUD
export interface ToolInfo {
    id: Tool;
    name: string;
    iconUrl: string;
}

export interface UIManagerCallbacks {
    onToolSelected: (toolId: Tool) => void;
    onRequestToggleForgeUI: () => void;
    onRequestToggleEquipmentUI: () => void;
    onRequestToggleToolPopup: () => void;
    onHandlePointerLockForPopupClose: (wasPointerLockedBeforePopup: boolean) => void;
    onRequestToggleInventory: () => void;
    onPause: () => void; // For pause menu resume button
}

export class UIManager {
    private gameState: GameState;
    private callbacks: UIManagerCallbacks | null = null;

    // UI Component Properties
    public forgeUi: ForgeUiComponent | null = null;
    public equipmentUi: EquipmentUiComponent | null = null;
    public loadingScreenComponent: LoadingScreenComponent | null = null;
    public hud: GameHudComponent | null = null;

    // State Properties
    private messageTimeout: number | null = null;
    private wasPointerLockedBeforePopup: boolean = false;

    constructor(gameState: GameState) {
        this.gameState = gameState;
    }

    public async init(callbacks: UIManagerCallbacks): Promise<void> {
        this.callbacks = callbacks;

        await Promise.all([
            customElements.whenDefined('game-hud'),
            customElements.whenDefined('forge-ui'),
            customElements.whenDefined('equipment-ui'),
            customElements.whenDefined('loading-screen')
        ]);

        this.equipmentUi?.addEventListener('equipment-ui-opened', () => this.handlePopupOpening());
        this.equipmentUi?.addEventListener('equipment-ui-closed', () => this.handlePopupClosing());

        this.hud = document.querySelector<GameHudComponent>('game-hud');
        this.forgeUi = document.querySelector<ForgeUiComponent>('forge-ui');
        this.equipmentUi = document.querySelector<EquipmentUiComponent>('equipment-ui');
        this.loadingScreenComponent = document.querySelector<LoadingScreenComponent>('loading-screen');

        if (!this.hud || !this.forgeUi || !this.equipmentUi || !this.loadingScreenComponent) {
            console.error("Fatal: One or more UI components not found in DOM!");
            // Potentially throw an error or handle this more gracefully
            return;
        }

        // Initialize HUD tools
        const tools: ToolInfo[] = [
            { id: 'pickaxe', name: 'Pickaxe', iconUrl: 'public/assets/tools/icons/pickaxe.png' },
            { id: 'axe', name: 'Axe', iconUrl: 'public/assets/tools/icons/axe.png' }
        ];
        this.hud.setTools(tools);

        // Setup event listeners
        this.equipmentUi.addEventListener('equipment-ui-opened', () => {
            if (document.pointerLockElement) {
                this.wasPointerLockedBeforePopup = true;
                document.exitPointerLock();
            } else {
                this.wasPointerLockedBeforePopup = false;
            }
        });
        this.equipmentUi.addEventListener('equipment-ui-closed', () => {
            this.callbacks?.onHandlePointerLockForPopupClose(this.wasPointerLockedBeforePopup);
            this.wasPointerLockedBeforePopup = false;
        });

        this.hud.addEventListener('tool-selected', (event: Event) => {
            const customEvent = event as CustomEvent<{ toolId: Tool }>;
            if (customEvent.detail && customEvent.detail.toolId) {
                this.callbacks?.onToolSelected(customEvent.detail.toolId);
            }
        });

        // Pause menu resume button (example, actual ID might differ)
        document.getElementById('resume-button')?.addEventListener('click', () => {
            this.callbacks?.onPause();
        });
        // Other pause menu buttons like "Exit" could be here or handled by Game if they have non-UI logic
    }

    // Method to be called before ANY popup is shown
    private handlePopupOpening(): void {
        if (document.pointerLockElement) {
            this.wasPointerLockedBeforePopup = true;
            document.exitPointerLock();
        } else {
            this.wasPointerLockedBeforePopup = false;
        }
    }


    // Method to be called after ANY popup is closed
    private handlePopupClosing(): void {
        if (this.wasPointerLockedBeforePopup && !this.gameState.isPaused) {
            document.body.requestPointerLock();
        }
        this.wasPointerLockedBeforePopup = false; // Reset the flag
    }

    // --- Loading Screen Methods ---
    public showLoadingScreen(): void {
        this.loadingScreenComponent?.show();
    }

    public hideLoadingScreen(): void {
        this.loadingScreenComponent?.hide();
    }

    public updateLoadingProgress(url: string, itemsLoaded: number, itemsTotal: number): void {
        this.loadingScreenComponent?.updateProgress(url, itemsLoaded, itemsTotal);
    }

    public setLoadingError(message: string) : void {
        this.loadingScreenComponent?.setError(message);
    }

    // --- Pause Menu ---
    public togglePauseMenu(isPaused: boolean): void {
        const pauseMenu = document.getElementById('pause-menu');
        if (pauseMenu) {
            pauseMenu.style.display = isPaused ? 'flex' : 'none';
        }
    }

    // --- Tool Popup ---
    public handleToggleToolPopupRequest(): void {
        if (this.hud?.isPopupVisible()) {
            this.hud.hideToolPopup();
            this.gameState.isToolPopupVisible = false;
            this.handlePopupClosing(); // Use the centralized handler
        } else {
            // No callback needed here, UIManager can handle it
            this.handlePopupOpening(); // Use the centralized handler
            this.hud?.showToolPopup();
            this.gameState.isToolPopupVisible = true;
        }
    }

    public setHudActiveTool(toolId: Tool): void {
        this.hud?.setActiveTool(toolId);
    }

    public hideToolPopup(): void {
        this.hud?.hideToolPopup();
        // this.gameState.isToolPopupVisible = false; // Game should manage this via callback if needed
    }

    public updateHudQuickToggle(): void {
        this.hud?.quickToggleTool();
    }

    // --- Inventory Display ---
    public handleToggleInventoryRequest(): void {
        // This method is called from InputHandler.
        // It then calls the callback provided by Game.ts, which contains the actual logic.
        this.callbacks?.onRequestToggleInventory();
    }

    public toggleInventoryDisplay(isVisible: boolean): void {
        this.hud?.toggleInventoryDisplay(isVisible);
    }

    public setInventory(inventoryData: { resources: Record<string, number>, equipment: Record<string, any> }): void {
        const hudInventoryData = {
            resources: inventoryData.resources,
            materials: {}
        };

        // Now we pass the correctly shaped object to the HUD.
        this.hud?.setInventory(hudInventoryData);
    }

    // --- On-screen Messages ---
    public showGameMessage(message: string, duration: number = 3000): void {
        const box = document.getElementById('message-box');
        if (box) {
            box.textContent = message;
            box.style.opacity = '1';

            if (this.messageTimeout) {
                clearTimeout(this.messageTimeout);
            }
            this.messageTimeout = window.setTimeout(() => {
                box.style.opacity = '0';
            }, duration);
        }
    }

    // --- Player Stats HUD ---
    public updatePlayerStats(healthPercent: number, armor: number, maxHealth: number): void {
        this.hud?.setHealth(healthPercent);
        this.hud?.setArmor(armor, maxHealth); // Assuming maxHealth is needed for context by HUD
    }

    // --- Main UI Panel Management ---
    private setActiveUIPanel(panel: 'forge' | 'equipment' | 'none'): void {
        const wasForgeVisible = this.forgeUi?.isVisible() ?? false;
        const wasEquipmentVisible = this.equipmentUi?.isVisible() ?? false;
        const wasAnyPanelVisible = wasForgeVisible || wasEquipmentVisible;

        this.forgeUi?.hide();
        this.equipmentUi?.hide();

        // If inventory is considered a main panel that closes others:
        if (this.hud && this.gameState.isInventoryVisible && panel !== 'none') {
             this.callbacks?.onRequestToggleInventory(); // Request game to toggle it off
        }

        let isAPanelVisible = false;
        if (panel === 'forge') {
            this.forgeUi?.show();
            this.forgeUi?.update(this.gameState);
            isAPanelVisible = true;
        } else if (panel === 'equipment') {
            this.equipmentUi?.show();
            this.equipmentUi?.update(this.gameState);
            isAPanelVisible = true;
        }

        if (isAPanelVisible && !wasAnyPanelVisible) {
            if (document.pointerLockElement) document.exitPointerLock();
        } else if (!isAPanelVisible && wasAnyPanelVisible) {
            this.callbacks?.onHandlePointerLockForPopupClose(true); // Assume pointer should be re-locked by Game
        }
    }

    public openForgeUI(): void { // Called by Game after checks
        this.setActiveUIPanel('forge');
    }

    public requestToggleEquipmentUI(): void {
         if (this.equipmentUi?.isVisible()) {
            this.setActiveUIPanel('none');
        } else {
            this.callbacks?.onRequestToggleEquipmentUI(); // Game will decide
        }
    }

    public openEquipmentUI(): void { // Called by Game
        this.setActiveUIPanel('equipment');
    }

    public closeAllPanels(): void {
        this.setActiveUIPanel('none');
    }
}
