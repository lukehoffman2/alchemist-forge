// src/components/hud/hud.types.ts

export type Tool = 'axe' | 'pickaxe';

export interface ToolInfo {
    id: Tool;
    name: string;
    iconUrl: string;
}

export interface Inventory {
    resources: Record<string, number>;
    materials: Record<string, number>;
}
