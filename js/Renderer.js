// // Renderer.js - Class for handling rendering logic
//
// class Renderer {
//     constructor(scene, camera, renderer) {
//         this.scene = scene;
//         this.camera = camera;
//         this.renderer = renderer;
//         this.forgeLight = null;
//         this.flickerClock = new THREE.Clock();
//     }
//
//     setForgeLight(light) {
//         this.forgeLight = light;
//     }
//
//     updateCameraPosition(player, cameraOffset, cameraPitch) {
//         const lookAtPoint = player.position.clone().add(new THREE.Vector3(0, 1.5, 0));
//         const relativeOffset = cameraOffset.clone();
//         relativeOffset.applyQuaternion(player.quaternion);
//         this.camera.position.copy(player.position).add(relativeOffset);
//         const pitchAdjust = new THREE.Vector3(0, Math.tan(cameraPitch) * cameraOffset.z, 0);
//         const finalLookAt = lookAtPoint.add(pitchAdjust);
//         this.camera.lookAt(finalLookAt);
//     }
//
//     updateToolAnimation(tool, actionProgress, duration) {
//         if (!tool) return;
//
//         const swingProgress = (actionProgress * duration / 200) % 1;
//         tool.rotation.x = Math.PI / 2 - (Math.PI / 3) * Math.sin(swingProgress * Math.PI);
//     }
//
//     resetToolPosition(tool) {
//         if (!tool) return;
//         tool.rotation.x = Math.PI / 2;
//     }
//
//     updateForgeLight() {
//         if (!this.forgeLight) return;
//
//         const flickerSpeed = 5;
//         const flickerStrength = 0.25;
//         this.forgeLight.intensity = 2 + Math.sin(this.flickerClock.elapsedTime * flickerSpeed) * flickerStrength;
//     }
//
//     handleWindowResize() {
//         this.camera.aspect = window.innerWidth / window.innerHeight;
//         this.camera.updateProjectionMatrix();
//         this.renderer.setSize(window.innerWidth, window.innerHeight);
//     }
//
//     render() {
//         this.renderer.render(this.scene, this.camera);
//     }
//
//     // Resource visibility methods
//     showResource(resource) {
//         if (!resource) return;
//         resource.visible = true;
//     }
//
//     hideResource(resource) {
//         if (!resource) return;
//         resource.visible = false;
//     }
//
//     // Tool visibility methods
//     showTool(tool) {
//         if (!tool) return;
//         tool.visible = true;
//     }
//
//     hideTool(tool) {
//         if (!tool) return;
//         tool.visible = false;
//     }
// }
//
// export default Renderer;