export class LoadingScreenComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.shadowRoot!.innerHTML = `
            <style>
                #loading-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0,0,0,0.85);
                    color: white;
                    display: none; /* Initially hidden */
                    justify-content: center;
                    align-items: center;
                    z-index: 9999;
                    font-family: 'Arial', sans-serif;
                    transition: opacity 0.3s ease-in-out;
                    opacity: 0;
                }
                #loading-overlay.visible {
                    display: flex;
                    opacity: 1;
                }
                #loading-box {
                    background-color: #1a1a1a; /* Darker box */
                    padding: 35px 45px;
                    border-radius: 10px;
                    text-align: center;
                    box-shadow: 0 5px 20px rgba(0,0,0,0.4);
                    width: 400px; /* Fixed width */
                }
                #loading-title {
                    margin-top: 0;
                    margin-bottom: 20px;
                    color: #eee; /* Lighter title */
                    font-size: 1.8em;
                }
                #progress-bar-container {
                    width: 100%;
                    background-color: #333; /* Darker bar background */
                    border-radius: 5px;
                    margin: 20px 0;
                    overflow: hidden; /* Ensure fill stays within bounds */
                }
                #progress-bar-fill {
                    width: 0%; /* Initial progress */
                    height: 22px;
                    background-color: #4CAF50; /* Green progress */
                    border-radius: 5px;
                    transition: width 0.2s ease-out;
                }
                #loading-message {
                    margin: 15px 0 5px;
                    color: #ddd; /* Lighter message text */
                    font-size: 1.1em;
                }
                #current-asset {
                    margin-top: 5px;
                    font-size: 0.85em;
                    color: #aaa; /* Dimmer asset text */
                    min-height: 1.2em; /* Prevent layout shift */
                    word-break: break-all; /* Prevent long URLs from breaking layout */
                }
                .error-message {
                    color: #ff6b6b !important; /* Red for errors */
                    font-weight: bold;
                }
            </style>
            <div id="loading-overlay">
                <div id="loading-box">
                    <h2 id="loading-title">Loading Game</h2>
                    <div id="progress-bar-container">
                        <div id="progress-bar-fill"></div>
                    </div>
                    <p id="loading-message">Initializing...</p>
                    <p id="current-asset"></p>
                </div>
            </div>
        `;
    }

    show(): void {
        const overlay = this.shadowRoot!.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('visible');
        }
    }

    hide(): void {
        const overlay = this.shadowRoot!.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.remove('visible');
            // Optionally, reset progress after hiding
            // this.updateProgress("", 0, 1);
            // this.shadowRoot!.getElementById('loading-message')!.textContent = 'Initializing...';
            // this.shadowRoot!.getElementById('current-asset')!.textContent = '';
        }
    }

    updateProgress(currentItemUrl: string, itemsLoaded: number, itemsTotal: number): void {
        const progressBarFill = this.shadowRoot!.getElementById('progress-bar-fill') as HTMLElement | null;
        const loadingMessage = this.shadowRoot!.getElementById('loading-message') as HTMLElement | null;
        const currentAssetText = this.shadowRoot!.getElementById('current-asset') as HTMLElement | null;

        if (!progressBarFill || !loadingMessage || !currentAssetText) return;

        const progress = itemsTotal > 0 ? (itemsLoaded / itemsTotal) * 100 : 0;
        progressBarFill.style.width = progress + '%';

        loadingMessage.textContent = `Loading assets... (${itemsLoaded}/${itemsTotal})`;
        loadingMessage.classList.remove('error-message'); // Remove error class if it was set

        // Truncate long URLs for display
        // const displayUrl = currentItemUrl.length > 50 ? '...' + currentItemUrl.slice(-47) : currentItemUrl;
        // currentAssetText.textContent = itemsTotal > 0 ? `Loading: ${displayUrl}` : '';
        currentAssetText.textContent = itemsTotal > 0 ? this.formatAssetName(currentItemUrl) : '';
    }

    private formatAssetName(url: string): string {
        if (!url || typeof url !== 'string') {
            return 'Loading asset...';
        }
        try {
            let fileName = url.substring(url.lastIndexOf('/') + 1);
            // Handle potential query parameters or hash in URL
            fileName = fileName.split('?')[0].split('#')[0];

            // More specific extensions for common game assets
            const nameWithoutExtension = fileName.replace(/\.(glb|gltf|png|jpg|jpeg|ogg|mp3|wav)$/i, "");
            const spacedName = nameWithoutExtension.replace(/[_-]/g, ' ');

            if (!spacedName.trim()) { // If only extension was present or empty name
                return `Loading: ${fileName}`; // Fallback to filename
            }

            const capitalizedName = spacedName.toLowerCase().split(' ')
                .map(word => {
                    if (word.length === 0) return '';
                    return word.charAt(0).toUpperCase() + word.substring(1);
                })
                .join(' ');
            return `Loading: ${capitalizedName}`;
        } catch (e) {
            console.warn('Error formatting asset name for URL:', url, e);
            // Fallback to a truncated original URL on error if formatting fails badly
            const displayUrl = url.length > 50 ? '...' + url.slice(-47) : url;
            return `Loading: ${displayUrl}`;
        }
    }

    setError(message: string): void {
        const loadingMessage = this.shadowRoot!.getElementById('loading-message') as HTMLElement | null;
        const currentAssetText = this.shadowRoot!.getElementById('current-asset') as HTMLElement | null;

        if (loadingMessage) {
            loadingMessage.textContent = message;
            loadingMessage.classList.add('error-message');
        }
        if (currentAssetText) {
            currentAssetText.textContent = ''; // Clear current asset on error
        }
        // Optionally, set progress bar to 100% and make it red or hide it
        const progressBarFill = this.shadowRoot!.getElementById('progress-bar-fill') as HTMLElement | null;
        if (progressBarFill){
            // progressBarFill.style.width = '100%';
            // progressBarFill.style.backgroundColor = '#ff6b6b'; // Red color for error
        }
    }
}

customElements.define('loading-screen', LoadingScreenComponent);
