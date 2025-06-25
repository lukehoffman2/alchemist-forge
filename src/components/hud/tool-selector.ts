// src/components/hud/tool-selector.ts

import { Tool, ToolInfo } from './hud.types';

const toolSelectorTemplate = document.createElement('template');
toolSelectorTemplate.innerHTML = `
  <style>
    /* All CSS related to the tool selector goes here */
    :host { position: relative; }
    .clickable { pointer-events: auto; }
    #current-tool {
      width: 70px; height: 70px; border: 3px solid rgba(255, 255, 255, 0.7);
      border-radius: 16px; background-color: rgba(0, 0, 0, 0.5);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      backdrop-filter: blur(5px); transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    #current-tool:hover { transform: scale(1.05); box-shadow: 0 6px 20px rgba(0,0,0,0.4); }
    #current-tool img { width: 48px; height: 48px; filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.5)); }
    #tool-options-popup {
      position: absolute; bottom: 90px; left: 50%; display: flex; gap: 15px;
      opacity: 0; transform: translate(-50%, 20px); visibility: hidden;
      transition: opacity 0.25s ease-out, transform 0.25s ease-out, visibility 0.25s;
    }
    #tool-options-popup.visible { opacity: 1; transform: translateX(-50%); visibility: visible; }
    .tool-option {
      width: 60px; height: 60px; border: 2px solid rgba(255, 255, 255, 0.5);
      border-radius: 12px; background-color: rgba(0, 0, 0, 0.6); cursor: pointer;
      display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px);
      transition: all 0.2s ease;
    }
    .tool-option:hover { transform: translateY(-5px) scale(1.1); border-color: white; box-shadow: 0 5px 15px rgba(0,0,0,0.3); }
    .tool-option img { width: 40px; height: 40px; }
  </style>
  <div id="tool-options-popup" class="clickable"></div>
  <div id="current-tool" class="clickable"></div>
`;

export class ToolSelectorComponent extends HTMLElement {
    private currentToolSlot!: HTMLElement;
    private toolOptionsPopup!: HTMLElement;

    private tools: ToolInfo[] = [];

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot!.appendChild(toolSelectorTemplate.content.cloneNode(true));

        this.currentToolSlot = this.shadowRoot!.getElementById('current-tool')!;
        this.toolOptionsPopup = this.shadowRoot!.getElementById('tool-options-popup')!;

        this.toolOptionsPopup.addEventListener('click', (e) => this.handleToolClick(e));
    }

    public setTools(tools: ToolInfo[], currentToolId: Tool): void {
        this.tools = tools;
        this.renderToolOptions();
        this.setActiveTool(currentToolId);
    }

    public setActiveTool(toolId: Tool): void {
        const tool = this.tools.find(t => t.id === toolId);
        if (tool) {
            this.currentToolSlot.innerHTML = \`<img src="\${tool.iconUrl}" alt="\${tool.name}">\`;
        }
    }

    public showPopup(): void { this.toolOptionsPopup.classList.add('visible'); }
    public hidePopup(): void { this.toolOptionsPopup.classList.remove('visible'); }
    public isPopupVisible(): boolean { return this.toolOptionsPopup.classList.contains('visible'); }

    private renderToolOptions(): void {
        this.toolOptionsPopup.innerHTML = '';
        this.tools.forEach(tool => {
            const optionEl = document.createElement('div');
            optionEl.className = 'tool-option';
            optionEl.dataset.tool = tool.id;
            optionEl.innerHTML = \`<img src="\${tool.iconUrl}" alt="\${tool.name}">\`;
            this.toolOptionsPopup.appendChild(optionEl);
        });
    }

    private handleToolClick(event: MouseEvent): void {
        const target = (event.target as HTMLElement).closest('.tool-option') as HTMLElement | null;
        if (target?.dataset.tool) {
            // BEST PRACTICE: Dispatch an event to let the parent (game-hud) know a tool was selected.
            // The parent will then update the game state.
            this.dispatchEvent(new CustomEvent('tool-selected', {
                detail: { toolId: target.dataset.tool as Tool },
                bubbles: true,
                composed: true
            }));
        }
    }
}

customElements.define('tool-selector', ToolSelectorComponent);
