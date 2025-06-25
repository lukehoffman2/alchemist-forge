/// <reference types="vite/client" />

declare module '*.glb' {
    const src: string;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    export default src;
}