import GameState, { Tool } from './GameState';
import { GameHudComponent } from '../components/hud/game-hud';
import { ForgeUiComponent } from '../components/forge/forge-ui';
import { EquipmentUiComponent } from '../components/equipment/equipment-ui';
import { LoadingScreenComponent } from '../components/loading/loading-screen';
import { ToolInfo } from '../components/hud/hud.types';

export interface UIManagerCallbacks {
    onToolSelected: (toolId: Tool) => void;
    onRequestToggleForgeUI: () => void;
    onRequestToggleEquipmentUI: () => void;
    onRequestToggleToolPopup: () => void;
    onHandlePointerLockForPopupClose: (wasPointerLockedBeforePopup: boolean) => void;
    onRequestToggleInventory: () => void;
    onPause: () => void;
    onGeminiSubmit?: (prompt: string) => void;
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

        // Forge UI Buttons
        document.getElementById('add-fuel-button')?.addEventListener('click', () => {
            const success = this.gameState.addForgeFuel(10);
            if (success) {
                this.forgeUi?.update(this.gameState); // Keep UI in sync
                this.showGameMessage("Added 10 fuel.", 1500);
            } else {
                this.showGameMessage("Not enough wood or forge is full.", 1500);
            }
        });

        document.querySelectorAll('.smelt-button[data-ore]').forEach(btn => {
            btn.addEventListener('click', () => {
                const ore = (btn as any).dataset.ore;
                if (ore) {
                    const success = this.gameState.startSmelting(ore);
                    if (success) {
                        this.forgeUi?.update(this.gameState);
                        this.showGameMessage(`Smelting ${ore}...`, 2000);
                    } else {
                        this.showGameMessage(`Cannot smelt ${ore}. Check resources or forge status.`, 2000);
                    }
                }
            });
        });

        // Gemini Modal Buttons
        document.getElementById('gemini-open-button')?.addEventListener('click', () => {
            document.getElementById('gemini-modal')?.style.setProperty('display', 'flex');
            this.handlePopupOpening(); // Use existing helper
        });

        document.getElementById('gemini-close-button')?.addEventListener('click', () => {
            document.getElementById('gemini-modal')?.style.setProperty('display', 'none');
            this.handlePopupClosing(); // Use existing helper
        });

        document.getElementById('gemini-submit-button')?.addEventListener('click', () => {
            const promptInput = document.getElementById('gemini-prompt') as HTMLInputElement;
            if (promptInput && promptInput.value) {
                this.callbacks?.onGeminiSubmit?.(promptInput.value);
            }
        });

        // Other pause menu buttons like "Exit" could be here or handled by Game if they have non-UI logic
    }

    public setHudTools(tools: ToolInfo[], currentToolId: Tool): void {
        this.hud?.setTools(tools, currentToolId);
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
        if (this.hud?.isToolPopupVisible()) {
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

    // --- Inventory Display ---
    public handleToggleInventoryRequest(): void {
        // This method is called from InputHandler.
        // It then calls the callback provided by Game.ts, which contains the actual logic.
        this.callbacks?.onRequestToggleInventory();
    }

    public toggleInventoryDisplay(isVisible: boolean): void {
        this.hud?.toggleInventoryDisplay(isVisible);
    }

    public setInventory(inventoryData: { resources: Record<string, number>, materials: Record<string, number> }): void {
        this.hud?.setInventory(inventoryData);
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

        // Always hide all panels first
        if (wasForgeVisible) this.forgeUi?.hide();
        if (wasEquipmentVisible) this.equipmentUi?.hide();

        let isAPanelOpening = false;
        if (panel === 'forge' && !wasForgeVisible) {
            this.forgeUi?.show();
            this.forgeUi?.update(this.gameState);
            isAPanelOpening = true;
        } else if (panel === 'equipment' && !wasEquipmentVisible) {
            this.equipmentUi?.show();
            this.equipmentUi?.update(this.gameState);
            isAPanelOpening = true;
        }

        // Consolidate pointer lock logic
        const isClosingAPanel = wasAnyPanelVisible && !isAPanelOpening && panel === 'none';
        if (isClosingAPanel) {
            // handlePopupClosing is now called by the event listener on the component
            // We just ensure the state is correct.
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
