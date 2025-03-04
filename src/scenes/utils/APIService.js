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
    const response = await fetch(
      `${BACKEND_URL}/api/games/${gameId}/state`,
      {
        headers: {
          "X-Player-UUID": playerUUID,
        },
      }
    );

    if (!response.ok) {
      console.error(
        `APIService: Server returned error status ${response.status}`
      );
      throw new Error("Failed to fetch game state");
    }

    const gameState = await response.json();
    console.log("APIService: Received game state:", gameState);
    return gameState;
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
      const response = await fetch(
        `${BACKEND_URL}/api/games/${gameId}/start`,
        {
          method: "POST",
          headers: {
            "X-Player-UUID": playerUUID,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        console.error("APIService: Failed to start game:", data.error);
        return false;
      }

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
      const response = await fetch(
        `${BACKEND_URL}/api/games/${gameId}/force-process-turn`,
        {
          method: "POST",
          headers: {
            "X-Player-UUID": playerUUID,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        console.error("APIService: Failed to force process turn:", data.error);
        return false;
      }

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
      const response = await fetch(
        `${BACKEND_URL}/api/games/${gameId}/commit-turn`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Player-UUID": playerUUID,
          },
          body: JSON.stringify({
            leaderPlacements: leaderPlacements,
            upgrades: upgrades || [],
          }),
        }
      );

      if (!response.ok) {
        console.error("APIService: Failed to commit turn:", await response.json());
        return false;
      }

      console.log("APIService: Successfully committed turn");
      return true;
    } catch (error) {
      console.error("APIService: Error committing turn:", error);
      return false;
    }
  }

  /**
   * Fetches the case modifiers from the server
   * @returns {Promise<Object|null>} - The case modifiers object or null if the request fails
   */
  async fetchCaseModifiers() {
    console.log("APIService: Fetching case modifiers");
    try {
      const response = await fetch(`${BACKEND_URL}/api/data/case-modifiers`);
      if (!response.ok) {
        console.error("APIService: Failed to fetch case modifiers:", response.status);
        return null;
      }
      const modifiers = await response.json();
      console.log("APIService: Received case modifiers:", modifiers);
      return modifiers;
    } catch (error) {
      console.error("APIService: Error fetching case modifiers:", error);
      return null;
    }
  }

  /**
   * Fetches all cases from the server
   * @returns {Promise<Array>} - Array of case objects
   */
  async fetchCases() {
    console.log("APIService: Fetching all cases");
    try {
      const response = await fetch(`${BACKEND_URL}/api/data/cases`);
      if (!response.ok) {
        console.error("APIService: Failed to fetch cases:", response.status);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const cases = await response.json();
      console.log("APIService: Received cases:", cases);
      return cases;
    } catch (error) {
      console.error("APIService: Error fetching cases:", error);
      throw error;
    }
  }

  /**
   * Fetches a single case by ID
   * @param {string} caseId - The ID of the case to fetch
   * @returns {Promise<Object>} - The case object
   */
  async fetchSingleCase(caseId) {
    console.log("APIService: Fetching case with ID:", caseId);
    try {
      const response = await fetch(`${BACKEND_URL}/api/data/cases/${caseId}`);
      if (!response.ok) {
        console.error("APIService: Failed to fetch case:", response.status);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("APIService: Received case:", data);
      return data[0];
    } catch (error) {
      console.error("APIService: Error fetching case:", error);
      throw error;
    }
  }
}

// Export a singleton instance
export default new APIService(); 