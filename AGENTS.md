## Project Structure

This document outlines the architecture of the game project to facilitate understanding and interaction by AI agents.

```
game-project/
├── src/
│   ├── components/         # UI Web Components
│   ├── game/
│   │   ├── Game.ts         # Core game orchestrator.
│   │   ├── GameState.ts    # Centralized data store.
│   │   ├── InputHandler.ts # Handles raw game input.
│   │   ├── main.ts         # Application entry point.
│   │   ├── PlayerManager.ts # Manages the player character.
│   │   ├── Renderer.ts     # Manages 3D rendering.
│   │   ├── UIManager.ts      # Manages UI components and events.
│   │   └── WorldManager.ts   # Manages the game world and its objects.
│   ├── services/
│   │   └── GeminiService.ts # Handles communication with the Gemini API.
```

## Guiding Principles

When refactoring, debugging, or adding new features to this project, all changes should adhere to the following software engineering principles. These principles are fundamental to the project's design and are key to maintaining a clean, scalable, and manageable codebase.

* **Modularity:** The project is broken down into independent, interchangeable modules (e.g., `PlayerManager`, `WorldManager`, `Renderer`). Each module encapsulates a specific set of functionalities. When adding new features, consider if they belong in an existing module or if they are distinct enough to warrant a new one. The goal is to keep modules focused and loosely coupled.

* **DRY (Don't Repeat Yourself):** Avoid duplicating code. If you find yourself writing the same logic in multiple places, refactor it into a reusable function, method, or class. For example, the `WorldManager`'s `loadOreModel` method centralizes the logic for loading models and their fallbacks, preventing this logic from being repeated for each ore type.

* **Single Responsibility Principle (SRP):** Every class or module should have one, and only one, reason to change. For example, `Renderer.ts` is only responsible for rendering; it knows nothing about game rules. `GameState.ts` is only responsible for managing data; it knows nothing about how that data is displayed. When adding code, ask "What is the single responsibility of this class?" and ensure your new code aligns with it. If it doesn't, it likely belongs in a different class or a new one.

### File Descriptions

#### `src/game/main.ts`

* **Purpose:** This is the main entry point for the entire web application. Its sole job is to kickstart the game.
* **Key Responsibilities:**
    * Imports the main CSS stylesheet for the project.
    * Imports custom element definitions (e.g., `game-hud`, `forge-ui`) to register them with the browser.
    * Listens for the `DOMContentLoaded` event to ensure the HTML page is fully loaded before running any game code.
    * Instantiates the main `Game` class and calls its `init()` method.

#### `src/game/Game.ts`

* **Purpose:** This is the core orchestrator of the entire game. It is responsible for initializing all major game systems and contains the main game loop (`animate`).
* **Key Responsibilities:**
    * Initializes and holds instances of all Manager classes, `GameState`, `Renderer`, `InputHandler`, and external services.
    * Manages the main game loop, calculating delta time and triggering updates for other systems.
    * Mediates high-level gameplay logic that requires coordination between multiple managers (e.g., player actions, UI interactions).
    * Connects systems using a callback pattern, linking UI events from `UIManager` to game logic.
    * Orchestrates calls to external services (like `GeminiService`) in response to UI events.

#### `src/game/GameState.ts`

* **Purpose:** Acts as the **single source of truth** for all game data. It defines the structure of the game's state and provides a safe, centralized API for modifying it.
* **Key Responsibilities:**
    * Defines the core data structures, types, and interfaces for the entire game (e.g., `Inventory`, `PlayerState`, `EquipmentItem`).
    * Holds the current state of the player, inventory, world objects, and general game status (e.g., `isPaused`).
    * Contains pure data-mutation logic for actions like crafting, smelting, equipping items, and updating player stats.
    * Enforces game rules by validating state transitions (e.g., checking for sufficient materials before crafting).

#### `src/game/PlayerManager.ts`

* **Purpose:** To manage the player character's state and behavior within the 3D world. It encapsulates all logic related to the player's physical presence, tools, and movement.
* **Key Responsibilities:**
    * Creates the player's 3D model (`THREE.Group`) and attached tools (axe, pickaxe).
    * Handles the visual state of the player, such as making the currently equipped tool visible.
    * Contains the player's movement logic, updating the player's position based on keyboard input recorded in `GameState`.
    * Enforces world boundaries to prevent the player from walking off the map.
    * Holds player-specific physical constants, such as movement speed, height, and radius.

#### `src/game/WorldManager.ts`

* **Purpose:** To create, manage, and hold references to all non-player objects and environmental elements in the game world. It is responsible for the entire world setup.
* **Key Responsibilities:**
    * Initializes the 3D environment, including the ground plane and lighting (ambient, directional).
    * Uses `GLTFLoader` to asynchronously load, place, and manage all world resources (e.g., ores, trees) and structures (e.g., the forge).
    * Provides robust fallback mechanisms, creating primitive shapes for resources if their 3D models fail to load.
    * Creates and manages interactive world objects, like the `combatDummy`, including their visual components like health bars.
    * Attaches `userData` to world objects to store their game-relevant data (e.g., resource type, respawn timers).

#### `src/game/UIManager.ts`

* **Purpose:** To manage the entire user interface, including all visual components and their interactions. It is the single source of truth for UI state and events.
* **Key Responsibilities:**
    * Initializes and holds references to all custom UI web components (`game-hud`, `forge-ui`, etc.).
    * Provides a high-level API for the `Game` class to control the UI (e.g., `showGameMessage`, `togglePauseMenu`, `updatePlayerStats`).
    * **Manages all UI-specific event listeners.** This includes clicks on buttons within the forge, pause menu, and Gemini modal.
    * Uses a callback system to notify the `Game` class of user actions that require game logic (e.g., selecting a tool, submitting a prompt).
    * Handles pointer lock logic related to opening and closing UI panels.

#### `src/game/InputHandler.ts`

* **Purpose:** To capture and interpret raw user input for **core game control only**. It bridges player hardware with game-level actions like movement and interaction.
* **Key Responsibilities:**
    * Translates browser events (`keydown`, `keyup`, `mousemove`, `click`) into game commands via callbacks.
    * Manages camera and player rotation based on mouse movement.
    * Handles pointer lock changes for the main game container.
    * Does **not** handle events for specific UI elements, as that is the `UIManager`'s responsibility.

#### `src/game/Renderer.ts`

* **Purpose:** To manage all logic related to rendering the 3D scene with `three.js`. It provides a simplified API for the rest of the application to manipulate visuals.
* **Key Responsibilities:**
    * Holds the core `three.js` components: `Scene`, `PerspectiveCamera`, and `WebGLRenderer`.
    * Contains the final `render()` method that draws the scene to the canvas.
    * Handles viewport updates, such as resizing the canvas when the browser window changes.
    * Implements all visual-only updates that occur each frame, such as the forge light flicker effect and tool swing animations.
    * Includes helper methods to control the visibility of objects like resources and tools.

#### `src/services/GeminiService.ts`

* **Purpose:** To encapsulate all logic related to communicating with the Google Gemini API. It acts as a dedicated service layer, separating external API concerns from the main game logic.
* **Key Responsibilities:**
    * Manages the Gemini API key and endpoint URL.
    * Constructs a detailed, in-character prompt for the "Forge Master" persona, dynamically injecting the player's current inventory.
    * Handles the `fetch` request, including setting headers and sending the payload.
    * Processes the JSON response from the API, handling both successful results and potential errors gracefully.
