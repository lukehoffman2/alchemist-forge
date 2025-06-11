// src/components/hud/game-hud.ts

type Tool = 'axe' | 'pickaxe';

// Define the structure of a tool with its properties
export interface ToolInfo {
    id: Tool;
    name: string;
    iconUrl: string;
}

const hudTemplate = document.createElement('template');

// 1. We move ALL your original HTML and CSS directly into this template string.
hudTemplate.innerHTML = `
  <style>
    /* All your original CSS goes here, completely scoped to the component */
    :host {
      /* :host represents the <game-hud> element itself */
      position: fixed;
      inset: 0;
      pointer-events: none;
      color: white;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    .clickable {
      pointer-events: auto;
    }
    
    .bottom-hud {
      position: absolute;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: flex-end;
      gap: 24px;
    }

    /* --- Status Bars --- */
    .status-bars {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 250px;
    }

    .bar {
      width: 100%;
      height: 22px;
      background-color: rgba(0, 0, 0, 0.4);
      border-radius: 11px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    }

    .bar-fill {
      height: 100%;
      border-radius: 9px;
      transition: width 0.3s cubic-bezier(0.25, 1, 0.5, 1);
      box-shadow: inset 0 0 5px rgba(0,0,0,0.3);
    }

    #health-bar-fill {
      background: linear-gradient(90deg, #2ecc71, #28b463);
    }

    #armor-bar-fill {
      background: linear-gradient(90deg, #3498db, #2980b9);
    }
    
    /* --- Tool Selector --- */
    .tool-selector {
      position: relative;
    }

    #current-tool {
      width: 70px;
      height: 70px;
      border: 3px solid rgba(255, 255, 255, 0.7);
      border-radius: 16px;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      backdrop-filter: blur(5px);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    #current-tool:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 20px rgba(0,0,0,0.4);
    }

    #current-tool img {
      width: 48px;
      height: 48px;
      filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.5));
    }

    #tool-options-popup {
      position: absolute;
      bottom: 90px;
      left: 50%;
      display: flex;
      gap: 15px;
      opacity: 0;
      transform: translate(-50%, 20px);
      visibility: hidden;
      transition: opacity 0.25s ease-out, transform 0.25s ease-out, visibility 0.25s;
    }

    #tool-options-popup.visible {
      opacity: 1;
      transform: translateX(-50%);
      visibility: visible;
    }
    
    .tool-option {
      width: 60px;
      height: 60px;
      border: 2px solid rgba(255, 255, 255, 0.5);
      border-radius: 12px;
      background-color: rgba(0, 0, 0, 0.6);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(5px);
      transition: all 0.2s ease;
    }

    .tool-option:hover {
      transform: translateY(-5px) scale(1.1);
      border-color: white;
      box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    }
    
    .tool-option img {
      width: 40px;
      height: 40px;
    }
  </style>

  <div class="bottom-hud">
    <div class="tool-selector">
        <div id="tool-options-popup" class="clickable">
            </div>
        <div id="current-tool" class="clickable">
            </div>
    </div>
    
    <div class="status-bars">
        <div id="health-bar" class="bar">
            <div id="health-bar-fill" class="bar-fill"></div>
        </div>
        <div id="armor-bar" class="bar">
            <div id="armor-bar-fill" class="bar-fill"></div>
        </div>
    </div>
  </div>
`;

export class GameHudComponent extends HTMLElement {
    // Private fields for internal state and elements
    private healthBarFill!: HTMLElement;
    private armorBarFill!: HTMLElement;
    private currentToolSlot!: HTMLElement;
    private toolOptionsPopup!: HTMLElement;

    private tools: ToolInfo[] = [];
    private currentToolIndex = 0;
    private lastUsedToolIndex = 1;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' }); // Create the Shadow DOM
        this.shadowRoot!.appendChild(hudTemplate.content.cloneNode(true));

        // Query elements *inside the Shadow DOM*
        this.healthBarFill = this.shadowRoot!.getElementById('health-bar-fill')!;
        this.armorBarFill = this.shadowRoot!.getElementById('armor-bar-fill')!;
        this.currentToolSlot = this.shadowRoot!.getElementById('current-tool')!;
        this.toolOptionsPopup = this.shadowRoot!.getElementById('tool-options-popup')!;
    }

    // This lifecycle method is called when the element is added to the page.
    connectedCallback() {
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // We only listen for clicks *within* our component now.
        this.toolOptionsPopup.addEventListener('click', (e) => this.handleToolClick(e));

        // The main 'Q' key listeners will be managed by the game logic
        // to decouple the component from global input.
    }

    // --- PUBLIC API ---
    // This is how the main game logic will interact with the HUD.

    public setTools(tools: ToolInfo[]): void {
        this.tools = tools;
        this.lastUsedToolIndex = Math.min(1, this.tools.length - 1);
        this.renderToolOptions();
        this.updateCurrentToolDisplay();
    }

    public setHealth(percentage: number): void {
        this.healthBarFill.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
    }

    public setArmor(percentage: number): void {
        this.armorBarFill.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
    }

    public showToolPopup(): void {
        this.toolOptionsPopup.classList.add('visible');
    }

    public hideToolPopup(): void {
        this.toolOptionsPopup.classList.remove('visible');
    }

    public isPopupVisible(): boolean {
        return this.toolOptionsPopup.classList.contains('visible');
    }

    public quickToggleTool(): void {
        if (this.tools.length < 2) return;
        [this.currentToolIndex, this.lastUsedToolIndex] = [this.lastUsedToolIndex, this.currentToolIndex];
        this.updateCurrentToolDisplay();
        console.log(`HUD: Toggled to ${this.tools[this.currentToolIndex].name}`);
    }

    // --- PRIVATE METHODS ---
    // These handle the component's internal logic.

    private renderToolOptions(): void {
        this.toolOptionsPopup.innerHTML = ''; // Clear previous options
        this.tools.forEach(tool => {
            const optionEl = document.createElement('div');
            optionEl.className = 'tool-option';
            optionEl.dataset.tool = tool.id;
            optionEl.innerHTML = `<img src="${tool.iconUrl}" alt="${tool.name}">`;
            this.toolOptionsPopup.appendChild(optionEl);
        });
    }

    private handleToolClick(event: MouseEvent): void {
        const target = (event.target as HTMLElement).closest('.tool-option') as HTMLElement | null;
        if (target && target.dataset.tool) {
            this.equipTool(target.dataset.tool as Tool);
            this.hideToolPopup();
        }
    }

    private equipTool(toolId: Tool): void {
        const newIndex = this.tools.findIndex(t => t.id === toolId);
        if (newIndex !== -1 && newIndex !== this.currentToolIndex) {
            this.lastUsedToolIndex = this.currentToolIndex;
            this.currentToolIndex = newIndex;
            this.updateCurrentToolDisplay();
            console.log(`HUD: Equipped ${this.tools[this.currentToolIndex].name}`);
        }
    }

    private updateCurrentToolDisplay(): void {
        if (this.tools.length === 0) return;
        const currentTool = this.tools[this.currentToolIndex];
        this.currentToolSlot.innerHTML = `<img src="${currentTool.iconUrl}" alt="${currentTool.name}">`;
    }
}

// Register our new component with the browser.
customElements.define('game-hud', GameHudComponent);