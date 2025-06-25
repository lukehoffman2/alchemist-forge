// src/components/hud/status-bars.ts

const statusBarsTemplate = document.createElement('template');
statusBarsTemplate.innerHTML = `
  <style>
    /* All CSS related to status bars goes here */
    :host {
        display: flex;
        flex-direction: column;
        gap: 12px;
        width: 250px;
    }
    .bar {
      width: 100%; height: 22px; background-color: rgba(0, 0, 0, 0.4);
      border-radius: 11px; border: 2px solid rgba(255, 255, 255, 0.3);
      overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    }
    .bar-fill {
      height: 100%; border-radius: 9px;
      transition: width 0.3s cubic-bezier(0.25, 1, 0.5, 1);
      box-shadow: inset 0 0 5px rgba(0,0,0,0.3);
    }
    #health-bar-fill { background: linear-gradient(90deg, #2ecc71, #28b463); }
    #armor-bar-fill { background: linear-gradient(90deg, #3498db, #2980b9); }
  </style>
  <div id="health-bar" class="bar">
    <div id="health-bar-fill" class="bar-fill"></div>
  </div>
  <div id="armor-bar" class="bar">
    <div id="armor-bar-fill" class="bar-fill"></div>
  </div>
`;

export class StatusBarsComponent extends HTMLElement {
    private healthBarFill!: HTMLElement;
    private armorBarFill!: HTMLElement;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot!.appendChild(statusBarsTemplate.content.cloneNode(true));

        this.healthBarFill = this.shadowRoot!.getElementById('health-bar-fill')!;
        this.armorBarFill = this.shadowRoot!.getElementById('armor-bar-fill')!;
    }

    public setHealth(percentage: number): void {
        this.healthBarFill.style.width = \`\${Math.max(0, Math.min(100, percentage))}%\`;
    }

    public setArmor(currentArmor: number, referenceMax: number): void {
        const percentage = referenceMax > 0 ? (currentArmor / referenceMax) * 100 : 0;
        this.armorBarFill.style.width = \`\${Math.max(0, Math.min(100, percentage))}%\`;
    }
}

customElements.define('status-bars', StatusBarsComponent);
