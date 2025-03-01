import APIService from "./utils/APIService";
import { BACKEND_URL } from "./utils/constants";

export default class StateManager {
  constructor(scene) {
    this.scene = scene;
  }

  async pollGameState() {
    if (this.scene.isPollingPaused) {
      console.log("StateManager: Polling paused");
      return;
    }

    console.log(`StateManager: Polling game state from ${BACKEND_URL}`);
    try {
      const gameState = await APIService.fetchGameState(
        this.scene.gameId,
        this.scene.playerUUID
      );
      console.log("StateManager: Received game state:", gameState);
      this.updateGameState(gameState);
      this.schedulePoll(5000);
    } catch (error) {
      console.error("StateManager: Error polling game state:", error);
      this.scene.statusText.setText("Error: Failed to fetch game state");
      this.schedulePoll(10000);
    }
  }

  schedulePoll(delay = 5000) {
    if (this.scene.pollTimer) {
      this.scene.pollTimer.remove();
      this.scene.pollTimer = null;
    }
    if (!this.scene.isPollingPaused) {
      this.scene.pollTimer = this.scene.time.delayedCall(delay, () =>
        this.pollGameState()
      );
    }
  }

  updateGameState(gameState) {
    if (
      this.scene.gameState &&
      gameState.currentRound !== this.scene.gameState.currentRound
    ) {
      console.log("StateManager: Round changed, clearing all turn actions");
      this.scene.leaderManager.clearPendingPlacements();
      this.scene.gameState.player.turnActions.upgrades = [];
      this.scene.commitTurnButton.visible = false;
    }

    const existingUpgrades =
      this.scene.gameState?.player?.turnActions?.upgrades || [];
    const existingSelectedHistoryCase = this.scene.selectedHistoryCase;

    this.scene.gameState = {
      ...gameState,
      player: {
        ...gameState.player,
        turnActions: {
          ...gameState.player.turnActions,
          leaderPlacements:
            this.scene.leaderManager.getPendingPlacements().length > 0
              ? []
              : gameState.player.turnActions?.leaderPlacements || [],
          upgrades: existingUpgrades,
        },
      },
    };
    this.scene.selectedHistoryCase = existingSelectedHistoryCase;

    this.scene.statusText.setText(`Game Status: ${gameState.status}`);
    this.scene.leaderManager.updateLeadersDisplay(gameState.player.leaders);
    this.scene.startGameButton.visible =
      gameState.status === "setup" &&
      gameState.player.uuid === gameState.creator;
    this.scene.forceProcessButton.visible =
      gameState.status === "in_progress" &&
      gameState.player.uuid === gameState.creator;

    const player = gameState.player;
    this.scene.playerInfo.setText(
      `${player.name} (${player.eraPoints} EP) | M:${player.resources.might}\nE:${player.resources.education}\nG:${player.resources.gold}\nFa:${player.resources.faith}\nFo:${player.resources.food}\nI:${player.resources.influence}`
    );

    this.scene.uiManager.updateOtherPlayersDisplay(
      gameState.players.filter((p) => p.id !== player.id)
    );
    this.scene.eraInfo.setText(
      `Era: ${gameState.currentEra}\nRound: ${gameState.currentRound}`
    );

    if (gameState.status === "in_progress") {
      if (this.scene.currentVisibleEra === null)
        this.scene.currentVisibleEra = gameState.currentEra;
      this.scene.caseManager.updateCasesDisplay();
      this.scene.caseManager.updateHistoryCasesDisplay();
      this.scene.eraManager.showEra(this.scene.currentVisibleEra);
      this.scene.uiManager.updateSelectedUpgradesText();
    } else {
      this.scene.casesContainer.removeAll(true);
      this.scene.historyCasesContainer.removeAll(true);
      this.scene.currentCasePool.clear();
      this.scene.historyCasePool.clear();
      this.scene.prevEraButton.setVisible(false);
      this.scene.nextEraButton.setVisible(false);
      this.scene.eraLabel.setText("");
    }

    this.scene.commitTurnButton.visible =
      this.scene.leaderManager.getPendingPlacements().length > 0 ||
      this.scene.gameState.player.turnActions.upgrades.length > 0;
  }

  async handleStartGame() {
    console.log("StateManager: Attempting to start game");
    try {
      const success = await APIService.startGame(
        this.scene.gameId,
        this.scene.playerUUID
      );
      if (!success) {
        console.error("StateManager: Failed to start game");
        return;
      }
      console.log("StateManager: Game started successfully");
    } catch (error) {
      console.error("StateManager: Error starting game:", error);
    }
  }

  async handleForceProcessTurn() {
    console.log("StateManager: Attempting to force process turn");
    try {
      const success = await APIService.forceProcessTurn(
        this.scene.gameId,
        this.scene.playerUUID
      );
      if (!success) {
        console.error("StateManager: Failed to force process turn");
        return;
      }
      this.scene.leaderManager.clearPendingPlacements();
      this.scene.gameState.player.turnActions = {
        leaderPlacements: [],
        upgrades: [],
      };
      this.scene.caseManager.updateCasesDisplay();
      console.log("StateManager: Turn force processed successfully");
      this.schedulePoll(0);
    } catch (error) {
      console.error("StateManager: Error force processing turn:", error);
    }
  }

  async handleCommitTurn() {
    console.log(
      "StateManager: Committing turn with pending placements and upgrades"
    );
    try {
      const success = await APIService.commitTurn(
        this.scene.gameId,
        this.scene.playerUUID,
        this.scene.leaderManager.getPendingPlacements(),
        this.scene.gameState.player.turnActions.upgrades || []
      );
      if (!success) {
        console.error("StateManager: Failed to commit turn");
        return;
      }
      this.scene.gameState.player.turnActions = {
        leaderPlacements: this.scene.leaderManager.getPendingPlacements(),
        upgrades: this.scene.gameState.player.turnActions.upgrades || [],
      };
      this.scene.leaderManager.clearPendingPlacements();
      this.scene.selectedHistoryCase = null;
      this.scene.gameState.player.turnActions.upgrades = [];
      this.scene.commitTurnButton.visible = false;
      this.scene.caseManager.updateCasesDisplay();
      this.scene.uiManager.updateSelectedUpgradesText();
      console.log("StateManager: Successfully committed turn");
      this.schedulePoll(0);
    } catch (error) {
      console.error("StateManager: Error committing turn:", error);
    }
  }
}
