import mapBackground from "../assets/map-background.jpg";

/**
 * The Messe München campus map background shown behind the mission map.
 * Isolated in its own file (rather than demoInstance.ts) because it's a
 * real Vite asset import — demoInstance.ts is plain data imported by
 * Deno.test files, and a binary asset import isn't resolvable outside a
 * Vite/browser context.
 */
export const DEFAULT_SESSION_BACKGROUND_URL: string = mapBackground;
