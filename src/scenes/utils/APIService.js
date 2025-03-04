import axios from 'axios';
import { BACKEND_URL } from './constants';

/**
 * Service class for handling all API communications with the backend
 */
class APIService {
  /**
   * Fetches the current game state from the server
   * @param {string} gameId - The ID of the game
   * @param {string} playerUUID - The UUID of the player
   * @returns {Promise<Object>} - The game state object
   */
  async fetchGameState(gameId, playerUUID) {
    console.log(`APIService: Fetching state for game ${gameId}`);
    try {
      const response = await axios.get(
        `${BACKEND_URL}/api/games/${gameId}/state`,
        {
          headers: {
            "X-Player-UUID": playerUUID,
          },
        }
      );
      console.log("APIService: Received game state:", response.data);
      return response.data;
    } catch (error) {
      console.error(`APIService: Server returned error`, error);
      throw new Error("Failed to fetch game state");
    }
  }

  /**
   * Starts a game
   * @param {string} gameId - The ID of the game
   * @param {string} playerUUID - The UUID of the player
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  async startGame(gameId, playerUUID) {
    console.log("APIService: Attempting to start game");
    try {
      await axios.post(
        `${BACKEND_URL}/api/games/${gameId}/start`,
        {},
        {
          headers: {
            "X-Player-UUID": playerUUID,
          },
        }
      );

      console.log("APIService: Game started successfully");
      return true;
    } catch (error) {
      console.error("APIService: Error starting game:", error);
      return false;
    }
  }

  /**
   * Forces the processing of the current turn
   * @param {string} gameId - The ID of the game
   * @param {string} playerUUID - The UUID of the player
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  async forceProcessTurn(gameId, playerUUID) {
    console.log("APIService: Attempting to force process turn");
    try {
      await axios.post(
        `${BACKEND_URL}/api/games/${gameId}/force-process-turn`,
        {},
        {
          headers: {
            "X-Player-UUID": playerUUID,
          },
        }
      );

      console.log("APIService: Turn force processed successfully");
      return true;
    } catch (error) {
      console.error("APIService: Error force processing turn:", error);
      return false;
    }
  }

  /**
   * Commits the player's turn actions
   * @param {string} gameId - The ID of the game
   * @param {string} playerUUID - The UUID of the player
   * @param {Array} leaderPlacements - Array of leader placement actions
   * @param {Array} upgrades - Array of upgrade actions
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  async commitTurn(gameId, playerUUID, leaderPlacements, upgrades) {
    console.log(
      "APIService: Committing turn with pending placements:",
      leaderPlacements,
      "and upgrades:",
      upgrades
    );
    try {
      await axios.post(
        `${BACKEND_URL}/api/games/${gameId}/commit-turn`,
        {
          leaderPlacements: leaderPlacements,
          upgrades: upgrades || [],
        },
        {
          headers: {
            "Content-Type": "application/json",
            "X-Player-UUID": playerUUID,
          },
        }
      );

      console.log("APIService: Successfully committed turn");
      return true;
    } catch (error) {
      console.error("APIService: Error committing turn:", error);
      return false;
    }
  }
}

// Export a singleton instance
export default new APIService(); 