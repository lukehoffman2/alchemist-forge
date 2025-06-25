// src/game/InputHandler.ts

import * as THREE from 'three';
import GameState from './GameState';

interface InputHandlerCallbacks {
    onPause?: () => void;
    onAction?: () => void;
    onToggleTool?: () => void;
    onToggleForgeUI?: () => void;
    onToggleEquipmentUI?: () => void;
    onWindowResize?: () => void;
    onToggleToolPopup?: () => void;
    onToggleInventory?: () => void;
}

class InputHandler {
    private gameState: GameState;
    private player: THREE.Group;
    private playerRotationSpeed: number;
    private callbacks: InputHandlerCallbacks;
    private minPitch: number;
    private maxPitch: number;

    private qKeyTimer: number | null = null;
    private qKeyLongPressDetected: boolean = false;
    private readonly longPressThreshold: number = 300; // milliseconds

    constructor(
        gameState: GameState,
        player: THREE.Group,
        playerRotationSpeed: number,
        minPitch: number,
        maxPitch: number
    ) {
        this.gameState = gameState;
        this.player = player;
        this.playerRotationSpeed = playerRotationSpeed;
        this.callbacks = {};
        this.minPitch = minPitch;
        this.maxPitch = maxPitch;
    }

    public setupEventListeners(): void {
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        document.addEventListener('click', (e) => this.onMouseClick(e)); // Added this line
        window.addEventListener('resize', () => this.onWindowResize());

        document.getElementById('game-container')?.addEventListener('click', () => {
            if (!this.gameState.isPaused) {
                document.body.requestPointerLock();
            }
        });

        document.addEventListener('pointerlockchange', () => {
            // UPDATED: This now correctly assigns to the public property
            this.gameState.pointerLocked = !!document.pointerLockElement;
        });

    }

    private onKeyDown(event: KeyboardEvent): void {
        const key = event.key.toLowerCase();

        if (key === 'escape') {
            this.callbacks.onPause?.();
            return;
        }

        if (key === 'i') {
            this.callbacks.onToggleInventory?.();
            // We might want to return here if 'i' should only toggle inventory
            // and not also be registered as a pressed key for other game mechanics.
            // For now, let's allow it to be registered.
        }

        // Add a check for the tool popup
        if (this.gameState.isPaused || this.gameState.isInteracting || this.gameState.isToolPopupVisible) {
            return;
        }

        this.gameState.setKeyPressed(key, true);

        // 'q' key long press logic
        if (key === 'q') {
            if (!this.qKeyTimer) { // Only start a new timer if one isn't already running
                this.qKeyLongPressDetected = false;
                this.qKeyTimer = window.setTimeout(() => {
                    this.qKeyLongPressDetected = true;
                    this.callbacks.onToggleToolPopup?.();
                    this.qKeyTimer = null; // Clear the timer ID after execution
                }, this.longPressThreshold);
            }
        }

        // Removed 'tab' key functionality for tool popup
        // if (key === 'tab') {
        //     event.preventDefault(); // Prevent tabbing to other elements
        //     this.callbacks.onToggleToolPopup?.();
        // }

        if (key === 'f') this.callbacks.onToggleForgeUI?.();


        const geminiModal = document.getElementById('gemini-modal');
        if (this.gameState.isPaused || this.gameState.isInteracting || geminiModal?.style.display === 'flex') {
            return;
        }

        this.gameState.setKeyPressed(key, true);
    }

    private onKeyUp(event: KeyboardEvent): void {
        const key = event.key.toLowerCase();
        this.gameState.setKeyPressed(key, false);

        if (key === 'q') {
            if (this.qKeyTimer) {
                clearTimeout(this.qKeyTimer);
                this.qKeyTimer = null;
                if (!this.qKeyLongPressDetected) { // Short press for tool toggle
                    this.callbacks.onToggleTool?.();
                }
            }
            this.qKeyLongPressDetected = false; // Reset for next press
        }

        if (key === 'b') { // 'B' key to toggle equipment UI
            this.callbacks.onToggleEquipmentUI?.();
        }
    }

    private onMouseMove(event: MouseEvent): void {
        if (this.gameState.isPaused || !this.gameState.pointerLocked) return;

        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;

        // Player rotation (left/right) is handled here
        this.player.rotation.y -= movementX * this.playerRotationSpeed;

        // 1. Calculate the potential new pitch
        const newPitch = this.gameState.cameraPitch - (movementY * this.playerRotationSpeed);

        // 2. Clamp the value between the min and max limits
        this.gameState.cameraPitch = Math.max(this.minPitch, Math.min(this.maxPitch, newPitch));
    }

    private onWindowResize(): void {
        this.callbacks.onWindowResize?.();
    }

    private onMouseClick(event: MouseEvent): void {
        // Check for left click (button === 0)
        if (event.button !== 0) return;

        if (
            this.gameState.pointerLocked &&
            !this.gameState.isPaused &&
            !this.gameState.isInteracting
        ) {
            this.callbacks.onAction?.();
        }
    }

    public setCallbacks(callbacks: Partial<InputHandlerCallbacks>): void {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }
}

export default InputHandler;