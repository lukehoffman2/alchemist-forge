// // InputHandler.js - Class for handling user input
//
// class InputHandler {
//     constructor(gameState, player, playerRotationSpeed) {
//         this.gameState = gameState;
//         this.player = player;
//         this.playerRotationSpeed = playerRotationSpeed;
//         this.callbacks = {
//             onPause: null,
//             onAction: null,
//             onToggleTool: null,
//             onToggleForgeUI: null,
//             onWindowResize: null
//         };
//     }
//
//     setupEventListeners() {
//         document.addEventListener('keydown', this.onKeyDown.bind(this));
//         document.addEventListener('keyup', this.onKeyUp.bind(this));
//         document.addEventListener('mousemove', this.onMouseMove.bind(this));
//         window.addEventListener('resize', this.onWindowResize.bind(this));
//
//         document.getElementById('game-container').addEventListener('click', () => {
//             if (!this.gameState.isPaused) document.body.requestPointerLock();
//         });
//
//         document.addEventListener('pointerlockchange', () => {
//             this.gameState.setPointerLocked(!!document.pointerLockElement);
//         });
//
//         // UI element event listeners
//         document.getElementById('resume-button').addEventListener('click', () => {
//             if (this.callbacks.onPause) this.callbacks.onPause();
//         });
//
//         document.getElementById('exit-button').addEventListener('click', () => window.location.reload());
//
//         document.getElementById('add-fuel-button').addEventListener('click', () => {
//             this.gameState.addForgeFuel(10);
//         });
//
//         document.querySelectorAll('.smelt-button[data-ore]').forEach(btn => {
//             btn.addEventListener('click', () => {
//                 this.gameState.startSmelting(btn.dataset.ore);
//             });
//         });
//
//         document.getElementById('gemini-open-button').addEventListener('click', () => {
//             document.getElementById('gemini-modal').style.display = 'flex';
//             document.getElementById('gemini-response').textContent = '...';
//             if (document.pointerLockElement) document.exitPointerLock();
//         });
//
//         document.getElementById('gemini-close-button').addEventListener('click', () => {
//             document.getElementById('gemini-modal').style.display = 'none';
//         });
//
//         document.getElementById('gemini-submit-button').addEventListener('click', this.handleGeminiSubmit.bind(this));
//     }
//
//     onKeyDown(event) {
//         const key = event.key.toLowerCase();
//
//         if (key === 'escape') {
//             if (this.callbacks.onPause) this.callbacks.onPause();
//             return;
//         }
//
//         if (this.gameState.isPaused ||
//             this.gameState.isInteracting ||
//             document.getElementById('gemini-modal').style.display === 'flex') return;
//
//         this.gameState.setKeyPressed(key, true);
//
//         if (key === 'e' && this.callbacks.onAction) {
//             this.callbacks.onAction();
//         }
//
//         if (key === 'q' && this.callbacks.onToggleTool) {
//             this.callbacks.onToggleTool();
//         }
//
//         if (key === 'f' && this.callbacks.onToggleForgeUI) {
//             this.callbacks.onToggleForgeUI();
//         }
//     }
//
//     onKeyUp(event) {
//         this.gameState.setKeyPressed(event.key.toLowerCase(), false);
//     }
//
//     onMouseMove(event) {
//         if (this.gameState.isPaused || !this.gameState.pointerLocked) return;
//
//         const movementX = event.movementX || 0.00000002;
//         const movementY = event.movementY || 0.00000002;
//
//         this.player.rotation.y -= movementX * this.playerRotationSpeed;
//         this.gameState.updateCameraPitch(-movementY * this.playerRotationSpeed);
//     }
//
//     onWindowResize() {
//         if (this.callbacks.onWindowResize) {
//             this.callbacks.onWindowResize();
//         }
//     }
//
//     async handleGeminiSubmit() {
//         const userInput = document.getElementById('gemini-prompt').value;
//         if (!userInput) {
//             // Show message
//             return;
//         }
//
//         const responseDiv = document.getElementById('gemini-response');
//         responseDiv.textContent = '';
//         responseDiv.classList.add('loading');
//
//         const inventoryString = Object.entries(this.gameState.inventory)
//             .map(([key, value]) => `${key}: ${value}`)
//             .join(', ');
//
//         const fullPrompt = `
//             You are the Forge Master, a wise, ancient, and slightly grumpy blacksmith in a fantasy world.
//             A player comes to you for advice.
//             Their inventory contains: ${inventoryString}.
//             Their question is: "${userInput}"
//
//             Give them a short, creative, in-character response. Offer helpful advice, but with the personality of a master craftsman who has seen it all.
//             Keep your response to about 2-4 sentences.
//         `;
//
//         try {
//             const chatHistory = [{ role: "user", parts: [{ text: fullPrompt }] }];
//             const payload = { contents: chatHistory };
//             const apiKey = "";
//             const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
//
//             const response = await fetch(apiUrl, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify(payload)
//             });
//             const result = await response.json();
//
//             responseDiv.classList.remove('loading');
//
//             if (result.candidates && result.candidates.length > 0) {
//                 responseDiv.textContent = result.candidates[0].content.parts[0].text;
//             } else {
//                 responseDiv.textContent = "The Forge Master grunts, seemingly unimpressed by your question. Try asking again.";
//             }
//         } catch (error) {
//             console.error("Gemini API error:", error);
//             responseDiv.classList.remove('loading');
//             responseDiv.textContent = "The forge fire sputters and dies... something is wrong. (API Error)";
//         }
//     }
//
//     // Register callback functions
//     setCallbacks(callbacks) {
//         this.callbacks = { ...this.callbacks, ...callbacks };
//     }
// }
//
// export default InputHandler;