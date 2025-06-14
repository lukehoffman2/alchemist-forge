// src/game/main.ts

import '../styles/main.css';
import Game from './game';

// Import all custom element definitions so they get registered by the browser
import '../components/hud/game-hud';        // <-- ADD THIS
import '../components/equipment/equipment-ui';// <-- ADD THIS
import '../components/forge/forge-ui';      // <-- This one was already here

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const game: Game = new Game();
    game.init();
});