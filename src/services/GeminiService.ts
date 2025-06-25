// src/services/GeminiService.ts

import { GameState } from '../game/GameState'; // Or just pass the data it needs

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

export class GeminiService {
    private readonly apiKey = "YOUR_API_KEY_HERE"; // Store this securely!
    private readonly apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${this.apiKey}`;

    public async getForgeMasterResponse(gameState: GameState, userInput: string): Promise<string> {
        const inventoryString = Object.entries(gameState.getStructuredInventory().resources)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');

        const fullPrompt = `You are the Forge Master... Their inventory contains: ${inventoryString}. Their question is: "${userInput}". ...`;

        const payload: GeminiRequestPayload = { contents: [{ role: "user", parts: [{ text: fullPrompt }] }] };

        try {
            const response = await fetch(this.apiUrl, { /* ... */ });
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }
            const result: GeminiResponse = await response.json();
            if (result.candidates?.length > 0) {
                return result.candidates[0].content.parts[0].text;
            }
            return "The Forge Master grunts, seemingly unimpressed by your question. Try asking again.";
        } catch (error) {
            console.error("Gemini API error:", error);
            return "The forge fire sputters and dies... something is wrong. (API Error)";
        }
    }
}
