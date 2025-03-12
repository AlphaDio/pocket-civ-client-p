import Phaser from "phaser";
import {
  BACKEND_URL,
  CARD_WIDTH,
  CARD_HEIGHT,
  LEADER_CONTAINER_WIDTH,
  DISPLAY_MODE,
} from "./utils/constants";
import APIService from "./utils/APIService";
import LeaderManager from "./utils/LeaderManager";
import UIManager from "./UIManager";
import StateManager from "./StateManager";
import CaseManager from "./CaseManager";
import EraManager from "./EraManager";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
    this.gameState = null;
    this.gameId = null;
    this.playerUUID = null;
    this.shouldInitialize = true;
    this.pollTimer = null;
    this.isPollingPaused = false;
    this.currentVisibleEra = null;
    this.isDragging = false;
    this.lastPointerX = 0;
    this.dragTarget = null;
    this.leaderManager = null;
    this.playerPool = new Map();
    console.log("GameScene: Initialized");
  }

  init(data) {
    this.gameId = data.gameId || localStorage.getItem("gameId");
    this.playerUUID = data.playerUUID || localStorage.getItem("playerUUID");
    console.log(
      `GameScene: Starting with gameId: ${this.gameId}, playerUUID: ${this.playerUUID}`
    );
    if (!this.gameId || !this.playerUUID) {
      console.warn(
        "GameScene: Missing gameId or playerUUID, returning to menu"
      );
      this.scene.start("MenuScene");
      this.shouldInitialize = false;
      return;
    }
    this.shouldInitialize = true;
  }

  preload() {
    console.log("GameScene: Preloading assets");
    // this.load.image('leader', 'assets/leader.png');
    
    // No need to preload the checkmark image as we'll create it dynamically
  }

  create() {
    if (!this.shouldInitialize) return;
    console.log("GameScene: Creating game scene");
  
    this.leaderManager = new LeaderManager(this);
    this.uiManager = new UIManager(this);
    this.stateManager = new StateManager(this);
    this.caseManager = new CaseManager(this);
    this.eraManager = new EraManager(this);
  
    this.uiManager.createUI();
    this.eraManager.createEraButtons();
  
    // Verify caseManager is initialized
    console.log("CaseManager initialized:", this.caseManager.updateCasesDisplay ? "Yes" : "No");
  
    // Delay polling to ensure initialization
    this.time.delayedCall(100, () => this.stateManager.pollGameState(), [], this);
  
    this.input.on("pointerdown", this.startDrag, this);
    this.input.on("pointermove", this.doDrag, this);
    this.input.on("pointerup", this.stopDrag, this);
    this.input.on("pointerout", this.stopDrag, this);
  }

  update() {
    // Game logic updates if needed
  }

  shutdown() {
    console.log("GameScene: Shutting down");
    if (this.pollTimer) {
      this.pollTimer.remove();
      this.pollTimer = null;
    }
    if (this.leaderManager) {
      this.leaderManager.shutdown();
    }
    this.shouldInitialize = false;
  }

  startDrag(pointer) {
    this.isDragging = true;
    this.lastPointerX = pointer.x;
    if (this.pollTimer) {
      this.pollTimer.remove();
      this.pollTimer = null;
    }
    this.isPollingPaused = true;
    this.dragTarget =
      this.currentVisibleEra === this.gameState?.currentEra
        ? this.casesContainer
        : this.historyCasesContainer;
  }

  doDrag(pointer) {
    if (!this.isDragging || !this.dragTarget) return;
    const deltaX = pointer.x - this.lastPointerX;
    this.lastPointerX = pointer.x;
    this.dragTarget.x += deltaX;
  }

  stopDrag() {
    this.isDragging = false;
    this.dragTarget = null;
    this.isPollingPaused = false;
    if (!this.pollTimer) {
      this.stateManager.schedulePoll();
    }
  }
}
