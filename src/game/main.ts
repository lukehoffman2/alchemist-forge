// src/game/main.ts

import '../styles/main.css'; // <-- ADD THIS LINE AT THE TOP
// TS-HINT: The import path remains the same. Vite handles resolving the .ts file.
import Game from './game';
import '../components/forge/forge-ui'; // <-- ADD THIS

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // TS-HINT: We declare 'game' as type 'Game' for clarity.
    const game: Game = new Game();
    game.init();
});