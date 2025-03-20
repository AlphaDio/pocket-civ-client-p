export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
export const DEFAULT_POLL_INTERVAL = 800;
export const ERROR_POLL_INTERVAL = 2000;
export const CARD_WIDTH = 180;
export const CARD_HEIGHT = 300;
export const LEADER_CONTAINER_WIDTH = 300;

// Display modes for case cards
export const DISPLAY_MODE = {
  DEFAULT: 'default',      // Show claim effects, rewards, and upgrade information
  UPGRADE: 'upgrade',      // Show upgrade information
  LEADER: 'leader'       // Show leader placements
};
