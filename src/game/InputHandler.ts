// src/game/InputHandler.ts

import * as THREE from 'three';
import GameState from './GameState';

interface InputHandlerCallbacks {
    onPause?: () => void;
    onAction?: () => void;
    onToggleTool?: () => void;
    onToggleForgeUI?: () => void;
    onWindowResize?: () => void;
    // We can add a new callback for the tool popup
    onToggleToolPopup?: () => void;
    onToggleInventory?: () => void;
}

interface GeminiRequestPayload {
    contents: {
        role: "user",
        parts: { text: string }[]
    }[];
}

interface GeminiResponse {
    candidates: {
        content: {
            parts: { text: string }[]
        }
    }[];
}

class InputHandler {
    private gameState: GameState;
    private player: THREE.Group;
    private playerRotationSpeed: number;
    private callbacks: InputHandlerCallbacks;
    private minPitch: number; // ADDED
    private maxPitch: number; // ADDED

    // UPDATED: The constructor now accepts minPitch and maxPitch
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
        this.minPitch = minPitch; // ADDED
        this.maxPitch = maxPitch; // ADDED
    }

    public setupEventListeners(): void {
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
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

        // --- UI Element Event Listeners ---
        document.getElementById('resume-button')?.addEventListener('click', () => {
            this.callbacks.onPause?.();
        });

        document.getElementById('exit-button')?.addEventListener('click', () => window.location.reload());

        document.getElementById('add-fuel-button')?.addEventListener('click', () => {
            this.gameState.addForgeFuel(10);
        });

        document.querySelectorAll('.smelt-button[data-ore]').forEach(btn => {
            btn.addEventListener('click', () => {
                // ADDED: Cast to any to access dataset, then check if it's a valid ResourceName
                const ore = (btn as any).dataset.ore;
                if (ore) {
                    // This will need a type guard if you want to be super strict, but this works
                    this.gameState.startSmelting(ore);
                }
            });
        });

        document.getElementById('gemini-open-button')?.addEventListener('click', () => {
            const geminiModal = document.getElementById('gemini-modal');
            const geminiResponse = document.getElementById('gemini-response');
            if (geminiModal && geminiResponse) {
                geminiModal.style.display = 'flex';
                geminiResponse.textContent = '...';
                if (document.pointerLockElement) {
                    document.exitPointerLock();
                }
            }
        });

        document.getElementById('gemini-close-button')?.addEventListener('click', () => {
            const geminiModal = document.getElementById('gemini-modal');
            if (geminiModal) {
                geminiModal.style.display = 'none';
            }
        });

        document.getElementById('gemini-submit-button')?.addEventListener('click', () => this.handleGeminiSubmit());
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

        if (key === 'e') this.callbacks.onAction?.();

        // 'q' now calls our new quick toggle handler
        if (key === 'q') this.callbacks.onToggleTool?.();

        // Let's use 'Tab' to show the tool selection popup
        if (key === 'tab') {
            event.preventDefault(); // Prevent tabbing to other elements
            this.callbacks.onToggleToolPopup?.();
        }

        if (key === 'f') this.callbacks.onToggleForgeUI?.();


        const geminiModal = document.getElementById('gemini-modal');
        if (this.gameState.isPaused || this.gameState.isInteracting || geminiModal?.style.display === 'flex') {
            return;
        }

        this.gameState.setKeyPressed(key, true);
    }

    private onKeyUp(event: KeyboardEvent): void {
        this.gameState.setKeyPressed(event.key.toLowerCase(), false);
    }

    private onMouseMove(event: MouseEvent): void {
        if (this.gameState.isPaused || !this.gameState.pointerLocked) return;

        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;

        // Player rotation (left/right) is still handled here
        this.player.rotation.y -= movementX * this.playerRotationSpeed;

        // UPDATED: This block replaces the single erroneous line
        // 1. Calculate the potential new pitch
        const newPitch = this.gameState.cameraPitch - (movementY * this.playerRotationSpeed);

        // 2. Clamp the value between the min and max limits
        this.gameState.cameraPitch = Math.max(this.minPitch, Math.min(this.maxPitch, newPitch));
    }

    private onWindowResize(): void {
        this.callbacks.onWindowResize?.();
    }

    private async handleGeminiSubmit(): Promise<void> {
        const promptInput = document.getElementById('gemini-prompt') as HTMLInputElement;
        const responseDiv = document.getElementById('gemini-response');

        if (!promptInput || !responseDiv) {
            console.error("Gemini modal elements not found.");
            return;
        }

        const userInput = promptInput.value;
        if (!userInput) return;

        responseDiv.textContent = '';
        responseDiv.classList.add('loading');

        const inventoryString = Object.entries(this.gameState.getStructuredInventory().resources)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');

        const fullPrompt = `You are the Forge Master, a wise, ancient, and slightly grumpy blacksmith in a fantasy world. A player comes to you for advice. Their inventory contains: ${inventoryString}. Their question is: "${userInput}". Give them a short, creative, in-character response. Offer helpful advice, but with the personality of a master craftsman who has seen it all. Keep your response to about 2-4 sentences.`;

        const payload: GeminiRequestPayload = { contents: [{ role: "user", parts: [{ text: fullPrompt }] }] };

        const apiKey = "";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            const result: GeminiResponse = await response.json();
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

    public setCallbacks(callbacks: Partial<InputHandlerCallbacks>): void {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }
}

export default InputHandler;