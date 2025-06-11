// src/game/Renderer.ts

// TS-HINT: We import all the necessary classes and types from the 'three' library.
import * as THREE from 'three';

class Renderer {
    // TS-HINT: All properties are now strongly-typed with their corresponding Three.js types.
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera; // Using the more specific PerspectiveCamera type
    private renderer: THREE.WebGLRenderer;
    private forgeLight: THREE.PointLight | null = null;
    private flickerClock: THREE.Clock;

    constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.flickerClock = new THREE.Clock();
    }

    // TS-HINT: We add types to all method parameters. The return type is 'void' as these methods don't return values.
    public setForgeLight(light: THREE.PointLight | null): void {
        this.forgeLight = light;
    }

    public updateCameraPosition(player: THREE.Group, cameraOffset: THREE.Vector3, cameraPitch: number): void {
        const lookAtPoint = player.position.clone().add(new THREE.Vector3(0, 1.5, 0));
        const relativeOffset = cameraOffset.clone();

        relativeOffset.applyQuaternion(player.quaternion);
        this.camera.position.copy(player.position).add(relativeOffset);

        const pitchAdjust = new THREE.Vector3(0, Math.tan(cameraPitch) * cameraOffset.z, 0);
        const finalLookAt = lookAtPoint.add(pitchAdjust);

        this.camera.lookAt(finalLookAt);
    }

    public updateToolAnimation(tool: THREE.Group | null, actionProgress: number, duration: number): void {
        // The null check was already good practice in JS; TypeScript now enforces its value.
        if (!tool) return;

        // This math is fine, no changes needed.
        const swingProgress = (actionProgress * duration / 200) % 1;
        tool.rotation.x = Math.PI / 2 - (Math.PI / 3) * Math.sin(swingProgress * Math.PI);
    }

    public resetToolPosition(tool: THREE.Group | null): void {
        if (!tool) return;
        tool.rotation.x = Math.PI / 2;
    }

    public updateForgeLight(): void {
        if (!this.forgeLight) return;

        const flickerSpeed = 5;
        const flickerStrength = 0.25;
        this.forgeLight.intensity = 2 + Math.sin(this.flickerClock.getElapsedTime() * flickerSpeed) * flickerStrength;
    }

    public handleWindowResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    public render(): void {
        this.renderer.render(this.scene, this.camera);
    }

    // TS-HINT: We use the base 'Object3D' type for resources, as it could be a Mesh, Group, etc.
    public showResource(resource: THREE.Object3D | null): void {
        if (!resource) return;
        resource.visible = true;
    }

    public hideResource(resource: THREE.Object3D | null): void {
        if (!resource) return;
        resource.visible = false;
    }

    // TS-HINT: Tools are specifically Groups in your code, so we use that type.
    public showTool(tool: THREE.Group | null): void {
        if (!tool) return;
        tool.visible = true;
    }

    public hideTool(tool: THREE.Group | null): void {
        if (!tool) return;
        tool.visible = false;
    }
}

export default Renderer;