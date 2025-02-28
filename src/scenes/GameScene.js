import Phaser from "phaser";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const CARD_WIDTH = 180;
const CARD_HEIGHT = 300;
const LEADER_CONTAINER_WIDTH = 300;

// Display modes for case cards
const DISPLAY_MODE = {
  DEFAULT: 'default',      // Show claim effects, rewards, and upgrade information
  UPGRADE: 'upgrade',      // Show upgrade information
  LEADERS: 'leaders'       // Show leader placements
};

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
    this.gameState = null;
    this.gameId = null;
    this.playerUUID = null;
    this.currentCasePool = new Map(); // Pool for current era cases
    this.historyCasePool = new Map(); // Pool for historical cases
    this.leaderPool = new Map(); // Pool to store leader display objects
    this.playerPool = new Map(); // Pool to store other player display objects
    this.selectedLeader = null; // Track currently selected leader
    this.selectedLeaderUnique = false; // Track if unique ability is selected
    this.pendingPlacements = []; // Track local leader placements before commit
    this.shouldInitialize = true;
    this.pollTimer = null; // Track polling timer
    this.isPollingPaused = false; // Track if polling is paused
    this.selectedHistoryCase = null; // Track currently selected history case
    this.showingUpgradeInfo = null; // Track which case is currently showing upgrade info
    this.caseDisplayModes = new Map(); // Track display mode for each case
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
    // Load game assets
    // this.load.image('leader', 'assets/leader.png');
  }

  create() {
    if (!this.shouldInitialize) {
      return;
    }
    console.log("GameScene: Creating game UI elements");
    this.createUI();

    // Add click handler to clear display modes when clicking elsewhere
    this.input.on('pointerdown', (pointer) => {
      // Check if the click is outside any case
      if (pointer.y < 100 || pointer.y > 500) { // Adjust these values based on your layout
        this.clearUpgradeInfoDisplay();
      }
    });

    console.log("GameScene: Starting game state polling");
    this.pollGameState();
  }

  createUI() {
    console.log("GameScene: Setting up UI components");
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;

    // Game status text - moved to top
    this.statusText = this.add.text(10, 10, "Loading game state...", {
      fontSize: "18px",
      fill: "#fff",
    });

    // Add selected upgrades text at top center
    this.selectedUpgradesText = this.add
      .text(screenWidth / 2, 10, "", {
        fontSize: "14px",
        fill: "#DAA520",
        align: "center",
      })
      .setOrigin(0.5, 0);

    // Current Era and Round - moved to top right
    this.eraInfo = this.add
      .text(screenWidth - 10, 10, "", {
        fontSize: "16px", // Reduced size
        fill: "#fff",
        align: "right",
      })
      .setOrigin(1, 0);

    // Current player info and resources - moved below status
    this.playerInfo = this.add.text(10, 40, "", {
      fontSize: "14px",
      fill: "#fff",
    });

    // Container for other players - moved below player info, made scrollable horizontally
    this.otherPlayersContainer = this.add.container(0, 80);
    const otherPlayersBg = this.add.rectangle(0, 0, 0, 80, 0x222222, 0.5);
    this.otherPlayersContainer.add(otherPlayersBg);
    this.otherPlayersBg = otherPlayersBg;

    // Cases containers - centered in middle of screen
    const casesY = Math.floor(screenHeight * 0.4); // 40% down the screen

    // Current cases container
    this.casesContainer = this.add.container(0, casesY);

    // History cases container - at same Y as current cases
    this.historyCasesContainer = this.add.container(0, casesY);

    // Add era navigation buttons
    this.prevEraButton = this.add
      .text(10, casesY - 50, "⬆️ Previous Era", {
        fontSize: "16px",
        fill: "#fff",
        backgroundColor: "#444",
        padding: { x: 10, y: 5 },
      })
      .setInteractive()
      .on("pointerdown", () => this.navigateEra("prev"))
      .setVisible(false);

    this.nextEraButton = this.add
      .text(10, casesY + 250, "⬇️ Next Era", {
        fontSize: "16px",
        fill: "#fff",
        backgroundColor: "#444",
        padding: { x: 10, y: 5 },
      })
      .setInteractive()
      .on("pointerdown", () => this.navigateEra("next"))
      .setVisible(false);

    // Track current visible era
    this.currentVisibleEra = null;

    // Add scroll state for containers
    this.isDragging = false;
    this.lastPointerX = 0;
    this.dragTarget = null;

    // Add era label
    this.eraLabel = this.add
      .text(screenWidth / 2, casesY - 30, "", {
        fontSize: "18px",
        fill: "#fff",
      })
      .setOrigin(0.5, 0);

    // Leaders container - moved to bottom
    const leadersY = screenHeight - 120;
    this.leadersContainer = this.add.container(10, leadersY);
    const leadersBg = this.add.rectangle(
      0,
      0,
      LEADER_CONTAINER_WIDTH,
      110,
      0x222222,
      0.5
    );
    this.leadersContainer.add(leadersBg);
    this.leadersBg = leadersBg;

    // Add player UUID display above leaders container
    this.playerUUIDText = this.add.text(
      10,
      leadersY - 20,
      `Your ID: ${this.playerUUID.slice(-3)}`,
      {
        fontSize: "12px",
        fill: "#aaa",
      }
    );

    // Commit Turn button - moved to bottom right
    this.commitTurnButton = this.add
      .text(screenWidth - 10, screenHeight - 20, "Commit Turn", {
        fontSize: "18px", // Reduced size
        fill: "#00ff00",
        backgroundColor: "#444",
        padding: { x: 10, y: 5 },
      })
      .setOrigin(1, 1)
      .setInteractive()
      .on("pointerdown", () => this.handleCommitTurn())
      .on("pointerover", () =>
        this.commitTurnButton.setStyle({ fill: "#88ff88" })
      )
      .on("pointerout", () =>
        this.commitTurnButton.setStyle({ fill: "#00ff00" })
      );
    this.commitTurnButton.visible = false;

    // Force Process Turn button - moved above commit button
    this.forceProcessButton = this.add
      .text(screenWidth - 10, screenHeight - 50, "Force Process", {
        fontSize: "18px", // Reduced size
        fill: "#ff0000",
        backgroundColor: "#444",
        padding: { x: 10, y: 5 },
      })
      .setOrigin(1, 1)
      .setInteractive()
      .on("pointerdown", () => this.handleForceProcessTurn())
      .on("pointerover", () =>
        this.forceProcessButton.setStyle({ fill: "#ff8888" })
      )
      .on("pointerout", () =>
        this.forceProcessButton.setStyle({ fill: "#ff0000" })
      );
    this.forceProcessButton.visible = false;

    // Start Game button (initially hidden)
    this.startGameButton = this.add
      .text(400, 150, "Start Game", {
        fontSize: "24px",
        fill: "#00ff00",
        backgroundColor: "#444",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerdown", () => this.handleStartGame())
      .on("pointerover", () =>
        this.startGameButton.setStyle({ fill: "#88ff88" })
      )
      .on("pointerout", () =>
        this.startGameButton.setStyle({ fill: "#00ff00" })
      );
    this.startGameButton.visible = false;

    // Add scrolling functionality
    this.input.on("pointerdown", this.startDrag, this);
    this.input.on("pointermove", this.doDrag, this);
    this.input.on("pointerup", this.stopDrag, this);
    this.input.on("pointerout", this.stopDrag, this);
  }

  startDrag(pointer) {
    this.isDragging = true;
    this.lastPointerX = pointer.x;

    // Cancel any existing polling timer
    if (this.pollTimer) {
      this.pollTimer.remove();
      this.pollTimer = null;
    }
    this.isPollingPaused = true;

    // Simply use whichever container is currently visible
    if (this.currentVisibleEra === this.gameState.currentEra) {
      this.dragTarget = this.casesContainer;
    } else {
      this.dragTarget = this.historyCasesContainer;
    }
  }

  doDrag(pointer) {
    if (!this.isDragging || !this.dragTarget) return;

    const deltaX = pointer.x - this.lastPointerX;
    this.lastPointerX = pointer.x;

    // Simply update the container position with no constraints
    this.dragTarget.x += deltaX;
  }

  stopDrag() {
    this.isDragging = false;
    this.dragTarget = null;
    this.isPollingPaused = false;

    // Start a new polling cycle
    if (!this.pollTimer) {
      this.schedulePoll();
    }
  }

  schedulePoll(delay = 5000) {
    // Clear any existing timer
    if (this.pollTimer) {
      this.pollTimer.remove();
      this.pollTimer = null;
    }

    // Schedule the next poll
    if (!this.isPollingPaused) {
      this.pollTimer = this.time.delayedCall(delay, () => this.pollGameState());
    }
  }

  async pollGameState() {
    if (this.isPollingPaused) {
      console.log("GameScene: Polling paused");
      return;
    }

    console.log(`GameScene: Polling game state from ${BACKEND_URL}`);
    try {
      console.log(`GameScene: Fetching state for game ${this.gameId}`);
      const response = await fetch(
        `${BACKEND_URL}/api/games/${this.gameId}/state`,
        {
          headers: {
            "X-Player-UUID": this.playerUUID,
          },
        }
      );

      if (!response.ok) {
        console.error(
          `GameScene: Server returned error status ${response.status}`
        );
        throw new Error("Failed to fetch game state");
      }

      const gameState = await response.json();
      console.log("GameScene: Received game state:", gameState);
      this.updateGameState(gameState);

      // Schedule the next poll
      this.schedulePoll(5000);
    } catch (error) {
      console.error("GameScene: Error polling game state:", error);
      this.statusText.setText("Error: Failed to fetch game state");

      // Schedule retry with longer delay
      this.schedulePoll(10000);
    }
  }

  async handleStartGame() {
    console.log("GameScene: Attempting to start game");
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/games/${this.gameId}/start`,
        {
          method: "POST",
          headers: {
            "X-Player-UUID": this.playerUUID,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        console.error("GameScene: Failed to start game:", data.error);
        // You might want to show an error message to the user here
        return;
      }

      console.log("GameScene: Game started successfully");
      // The next poll will update the game state
    } catch (error) {
      console.error("GameScene: Error starting game:", error);
    }
  }

  async handleForceProcessTurn() {
    console.log("GameScene: Attempting to force process turn");
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/games/${this.gameId}/force-process-turn`,
        {
          method: "POST",
          headers: {
            "X-Player-UUID": this.playerUUID,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        console.error("GameScene: Failed to force process turn:", data.error);
        return;
      }

      // Clear all turn actions after successful processing
      this.pendingPlacements = [];
      this.commitTurnButton.visible = false;

      // Clear the game state turn actions
      this.gameState = {
        ...this.gameState,
        player: {
          ...this.gameState.player,
          turnActions: {
            leaderPlacements: [],
            upgrades: [],
          },
        },
      };

      // Update the display to reflect cleared state
      this.updateCasesDisplay();

      console.log("GameScene: Turn force processed successfully");

      // Schedule an immediate poll
      this.schedulePoll(0);
    } catch (error) {
      console.error("GameScene: Error force processing turn:", error);
    }
  }

  updateGameState(gameState) {
    // Check if round has changed (turn has been processed)
    if (
      this.gameState &&
      gameState.currentRound !== this.gameState.currentRound
    ) {
      console.log("GameScene: Round changed, clearing all turn actions");
      this.pendingPlacements = [];
      this.gameState.player.turnActions.upgrades = [];
      this.commitTurnButton.visible = false;
    }

    // Preserve existing upgrades if they exist
    const existingUpgrades =
      this.gameState?.player?.turnActions?.upgrades || [];
    const existingSelectedHistoryCase = this.selectedHistoryCase;

    this.gameState = {
      ...gameState,
      player: {
        ...gameState.player,
        turnActions: {
          ...gameState.player.turnActions,
          leaderPlacements:
            this.pendingPlacements.length > 0
              ? []
              : gameState.player.turnActions?.leaderPlacements || [],
          // Preserve existing upgrades
          upgrades: existingUpgrades,
        },
      },
    };

    // Restore the selected history case
    this.selectedHistoryCase = existingSelectedHistoryCase;

    console.log(
      `GameScene: Updating game state - Era: ${gameState.currentEra}, Round: ${gameState.currentRound}`
    );

    // Update status text
    this.statusText.setText(`Game Status: ${gameState.status}`);

    // Update leaders display
    this.updateLeadersDisplay(gameState.player.leaders);

    // Show/hide start game button based on game status and player being creator
    this.startGameButton.visible =
      gameState.status === "setup" &&
      gameState.player.uuid === gameState.creator;

    // Show/hide force process button based on game status and player being creator
    this.forceProcessButton.visible =
      gameState.status === "in_progress" &&
      gameState.player.uuid === gameState.creator;

    // Update current player info and resources
    const player = gameState.player;
    this.playerInfo.setText(
      `${player.name} (${player.eraPoints} EP) | ` +
        `M:${player.resources.might}\n` +
        `E:${player.resources.education}\n` +
        `G:${player.resources.gold}\n` +
        `Fa:${player.resources.faith}\n` +
        `Fo:${player.resources.food}\n` +
        `I:${player.resources.influence}`
    );

    // Update other players info
    this.updateOtherPlayersDisplay(
      gameState.players.filter((p) => p.id !== player.id)
    );

    // Update era info
    this.eraInfo.setText(
      `Era: ${gameState.currentEra}\nRound: ${gameState.currentRound}`
    );

    // Only show cases if game is in progress
    if (gameState.status === "in_progress") {
      console.log("GameScene: Updating cases display");

      // If currentVisibleEra is not set, default to current era
      if (this.currentVisibleEra === null) {
        this.currentVisibleEra = gameState.currentEra;
      }

      this.updateCasesDisplay();
      this.updateHistoryCasesDisplay();
      this.showEra(this.currentVisibleEra);
      this.updateSelectedUpgradesText();
    } else {
      // Clear cases display if not in progress
      this.casesContainer.removeAll(true);
      this.historyCasesContainer.removeAll(true);
      this.currentCasePool.clear();
      this.historyCasePool.clear();
      this.prevEraButton.setVisible(false);
      this.nextEraButton.setVisible(false);
      this.eraLabel.setText("");
    }

    // Show commit button if we have any pending placements or upgrades
    this.commitTurnButton.visible =
      this.pendingPlacements.length > 0 ||
      this.gameState.player.turnActions.upgrades.length > 0;
  }

  updateOtherPlayersDisplay(otherPlayers) {
    // Track active player IDs
    const activePlayerIds = new Set();

    if (!otherPlayers || otherPlayers.length === 0) {
      // Hide all pooled player displays
      for (const [_, display] of this.playerPool) {
        display.text.visible = false;
      }
      this.otherPlayersBg.setSize(0, 0);
      return;
    }

    let xOffset = 10;
    const padding = 10;
    const playerWidth = 100;

    otherPlayers.forEach((player, index) => {
      const playerId = player.id;
      activePlayerIds.add(playerId);

      const playerText =
        `${player.name}\n` +
        `EP: ${player.eraPoints}\n` +
        `M: ${player.resources.might}\n` +
        `E: ${player.resources.education}\n` +
        `G: ${player.resources.gold}\n` +
        `Fa: ${player.resources.faith}\n` +
        `Fo: ${player.resources.food}\n` +
        `I: ${player.resources.influence}`;

      let display;
      if (this.playerPool.has(playerId)) {
        // Update existing player display
        display = this.playerPool.get(playerId);
        display.text.setText(playerText);
        display.text.visible = true;
        display.bg.visible = true;
      } else {
        // Create new player display
        const text = this.add.text(xOffset, 10, playerText, {
          fontSize: "10px", // Smaller font
          fill: "#aaa",
          align: "left",
        });

        const bg = this.add.rectangle(
          xOffset - 5,
          5,
          playerWidth,
          100,
          0x333333,
          0.5
        );

        this.otherPlayersContainer.add(bg);
        this.otherPlayersContainer.add(text);

        display = { text, bg };
        this.playerPool.set(playerId, display);
      }

      // Update position
      display.text.setPosition(xOffset, 10);
      display.bg.setPosition(xOffset - 5, 5);

      xOffset += playerWidth + padding;
    });

    // Hide unused player displays
    for (const [playerId, display] of this.playerPool.entries()) {
      if (!activePlayerIds.has(playerId)) {
        display.text.visible = false;
        display.bg.visible = false;
      }
    }

    // Update container background and position
    this.otherPlayersBg.setPosition(0, 0);
    this.otherPlayersBg.setSize(xOffset, 110);

    // Center the container in the top right
    const gameWidth = this.sys.game.config.width;
    this.otherPlayersContainer.setPosition(gameWidth - xOffset - 10, 10);
  }

  updateCasesDisplay() {
    console.log(
      `GameScene: Refreshing cases display with ${this.gameState.currentCases.length} cases`
    );
    // Only update if we're showing the current era
    if (this.currentVisibleEra !== this.gameState.currentEra) {
      this.casesContainer.removeAll(true);
      return;
    }

    const padding = 30;
    const screenWidth = this.sys.game.config.width;

    // Calculate total width needed for all cards
    const totalCardsWidth =
      this.gameState.currentCases.length * (CARD_WIDTH + padding) - padding;

    // Calculate starting X position to center the cards
    let xOffset = (screenWidth - totalCardsWidth) / 2;

    // Track which cases are still in use
    const activeCaseIds = new Set();

    // Update or create cards for each case
    this.gameState.currentCases.forEach((caseData, index) => {
      const caseId = caseData.caseId;
      activeCaseIds.add(caseId);

      const x = xOffset + index * (CARD_WIDTH + padding);
      const y = 0;

      let caseContainer;
      if (this.currentCasePool.has(caseId)) {
        // Update existing case
        caseContainer = this.currentCasePool.get(caseId);
        this.updateCaseCard(caseContainer, caseData, index);
        caseContainer.x = x;
        caseContainer.y = y;
      } else {
        // Create new case if not in pool
        caseContainer = this.createCaseCard(caseData, x, y, index);
        this.currentCasePool.set(caseId, caseContainer);
        this.casesContainer.add(caseContainer);
      }
    });

    // Remove cases that are no longer present
    for (const [caseId, container] of this.currentCasePool.entries()) {
      if (!activeCaseIds.has(caseId)) {
        container.destroy();
        this.currentCasePool.delete(caseId);
      }
    }
  }

  updateCaseCard(container, caseData, index) {
    if (!container || !container.list) {
      console.warn("Invalid container for case:", caseData.caseId);
      return;
    }

    try {
      // Find existing elements in the container
      const elements = container.list;
      const bg = elements.find((e) => e.type === "Rectangle");
      const nameText = elements.find((e) => e.type === "Text" && e.y === -90);
      const typeText = elements.find((e) => e.type === "Text" && e.y === -60);
      const leadersText = elements.find((e) => e.type === "Text" && e.y === 60);

      if (!bg || !nameText || !typeText) {
        console.warn("Missing required elements for case:", caseData.caseId);
        return;
      }

      // Update text content based on revealed status
      nameText.setText(caseData.isRevealed ? caseData.name : "???");
      typeText.setText(caseData.type);

      // Remove any existing texts except name, type, and leaders
      container.list
        .filter(
          (e) =>
            e.type === "Text" &&
            e !== nameText &&
            e !== typeText &&
            e !== leadersText
        )
        .forEach((e) => e.destroy());

      let yOffset = -30;

      if (caseData.owner) {
        // Show owner if case is claimed
        const ownerText = this.add
          .text(0, yOffset, `${caseData.owner.slice(-3)}`, {
            fontSize: "12px",
            fill: "#00ff00",
          })
          .setOrigin(0.5);

        container.add(ownerText);
      } else if (!caseData.isRevealed) {
        // Show exploration points for unrevealed cases
        const explorationPointsText = Object.entries(
          caseData.explorationPoints || {}
        )
          .map(([uuid, points]) => `${points}[${uuid.slice(-3)}]`)
          .join(" ");

        const explorationText = this.add
          .text(0, yOffset, explorationPointsText, {
            fontSize: "12px",
            fill: "#fff",
          })
          .setOrigin(0.5);

        container.add(explorationText);
      } else {
        // Show claim points for revealed but unclaimed cases
        const claimPointsText = Object.entries(caseData.claimPoints || {})
          .map(([uuid, points]) => `${points}[${uuid.slice(-3)}]`)
          .join(" ");

        const claimText = this.add
          .text(0, yOffset, claimPointsText, { fontSize: "12px", fill: "#fff" })
          .setOrigin(0.5);

        container.add(claimText);
      }

      // Check if this case has leaders placed on it
      const hasLeaders = (caseData.placedLeaders && caseData.placedLeaders.length > 0) ||
                         this.gameState.player.turnActions.leaderPlacements.some(p => p.caseId === caseData.caseId) ||
                         this.pendingPlacements.some(p => p.caseId === caseData.caseId);

      // Get the current display mode for this case
      let displayMode = this.caseDisplayModes.get(caseData.caseId) || DISPLAY_MODE.DEFAULT;
      
      // If we're in the current era and this case has leaders, we need special handling
      if (this.currentVisibleEra === this.gameState.currentEra && hasLeaders) {
        // If we're in LEADERS mode but there are no leaders, switch to DEFAULT
        if (displayMode === DISPLAY_MODE.LEADERS && !hasLeaders) {
          displayMode = DISPLAY_MODE.DEFAULT;
          this.caseDisplayModes.set(caseData.caseId, displayMode);
        }
      }
      
      // Add information based on display mode
      if (displayMode === DISPLAY_MODE.UPGRADE) {
        // Only show upgrade information for history era cases
        if (this.currentVisibleEra !== this.gameState.currentEra && this.isUpgradeable(caseData)) {
          this.addUpgradeInformation(container, caseData);
          // Hide leaders text when showing upgrade info
          if (leadersText) {
            leadersText.setVisible(false);
          }
        } else {
          // If we're in current era, switch back to DEFAULT mode
          displayMode = DISPLAY_MODE.DEFAULT;
          this.caseDisplayModes.set(caseData.caseId, displayMode);
        }
      }
      
      if (displayMode === DISPLAY_MODE.DEFAULT) {
        // In DEFAULT mode, show both claim and upgrade information
        if (this.currentVisibleEra === this.gameState.currentEra) {
          // For current era cases
          if (caseData.owner) {
            // For claimed cases, only show upgrade information if upgradeable
            if (this.isUpgradeable(caseData)) {
              this.addUpgradeInformation(container, caseData);
            }
          } else {
            // For unclaimed cases, show claim information
            this.addClaimInformation(container, caseData);
          }
        } else {
          // For history cases, show upgrade info
          this.addUpgradeInformation(container, caseData);
        }
        
        // Hide leaders text in DEFAULT mode
        if (leadersText) {
          leadersText.setVisible(false);
        }
      } else if (displayMode === DISPLAY_MODE.LEADERS) {
        // Show leaders information
        if (leadersText) {
          leadersText.setVisible(true);
        }
      }

      // Check if this case is selected for upgrade
      const isSelectedForUpgrade = this.gameState.player.turnActions.upgrades?.some(
        (u) => u.caseId === caseData.caseId
      );

      // Update background color based on selection state
      if (isSelectedForUpgrade) {
        bg.setFillStyle(0x666666);
      } else if (this.selectedHistoryCase === caseData.caseId) {
        bg.setFillStyle(0x666666);
      } else if (displayMode === DISPLAY_MODE.UPGRADE) {
        // Highlight with a different color when in upgrade mode
        bg.setFillStyle(0x555555);
      } else {
        bg.setFillStyle(0x333333);
      }

      // Update leaders text if it exists
      if (leadersText) {
        const currentLeaders = caseData.placedLeaders || [];
        const serverPendingPlacement =
          this.gameState.player.turnActions.leaderPlacements.find(
            (p) => p.caseId === caseData.caseId
          );
        const localPendingPlacement = this.pendingPlacements.find(
          (p) => p.caseId === caseData.caseId
        );

        if (
          currentLeaders.length > 0 ||
          serverPendingPlacement ||
          localPendingPlacement
        ) {
          const leaderStrings = [
            ...currentLeaders.map((leader) => {
              const shortUUID = leader.playerUUID.substring(0, 3);
              const uniqueMarker = leader.usingUnique ? "*" : "";
              return `${leader.name}${uniqueMarker}[${shortUUID}]`;
            }),
          ];

          // Add server-side pending placements
          if (serverPendingPlacement) {
            const leader = this.gameState.player.leaders.find(
              (l) => l.leaderId === serverPendingPlacement.leaderId
            );
            if (leader) {
              const shortUUID = this.playerUUID.substring(0, 3);
              const uniqueMarker = serverPendingPlacement.useUnique ? "*" : "";
              leaderStrings.push(
                `${leader.name}${uniqueMarker}[${shortUUID}] (Pending)`
              );
            }
          }

          // Add local pending placements
          if (localPendingPlacement) {
            const leader = this.gameState.player.leaders.find(
              (l) => l.leaderId === localPendingPlacement.leaderId
            );
            if (leader) {
              const shortUUID = this.playerUUID.substring(0, 3);
              const uniqueMarker = localPendingPlacement.useUnique ? "*" : "";
              leaderStrings.push(
                `${leader.name}${uniqueMarker}[${shortUUID}] (Pending*)`
              );
            }
          }

          leadersText.setText(leaderStrings.join("\n"));
          // Only show leaders text if we're in LEADERS display mode
          leadersText.setVisible(displayMode === DISPLAY_MODE.LEADERS);
        } else {
          leadersText.setText("");
          leadersText.setVisible(false);
        }
      }
      
      // Only add the upgrade symbol for upgradeable cases in history eras
      if (this.isUpgradeable(caseData)) {
        this.addUpgradeSymbol(container, caseData);
      }
    } catch (error) {
      console.error("Error updating case card:", error);
      console.error("Case data:", caseData);
      console.error("Container:", container);
    }
  }

  isUpgradeable(caseData) {
    // Check if the case has not been upgraded, has an upgrade effect, and is owned by the player
    return (
      !caseData.isUpgraded &&
      caseData.isRevealed &&
      caseData.owner === this.playerUUID &&
      (caseData.upgradeEffect1 || caseData.upgradeEffect2)
    );
  }

  createCaseCard(caseData, x, y, index) {
    console.log(
      `GameScene: Creating case card for ${caseData.name} at position (${x}, ${y})`
    );
    const container = this.add.container(x, y);

    try {
      // Card background
      const bg = this.add.rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT, 0x333333);
      bg.setInteractive();
      bg.on("pointerover", () => {
        // Highlight on hover for current era cases and upgradeable cases
        if (
          this.currentVisibleEra === this.gameState.currentEra ||
          (this.currentVisibleEra !== this.gameState.currentEra && this.isUpgradeable(caseData))
        ) {
          bg.setFillStyle(0x444444);
        }
      });
      bg.on("pointerout", () => {
        // Check if this case is selected for upgrade
        const isSelectedForUpgrade = this.gameState.player.turnActions.upgrades?.some(
          (u) => u.caseId === caseData.caseId
        );
        
        // Keep selected cases highlighted, otherwise return to normal
        if (isSelectedForUpgrade || this.selectedHistoryCase === caseData.caseId) {
          bg.setFillStyle(0x666666);
        } else {
          const currentMode = this.caseDisplayModes.get(caseData.caseId) || DISPLAY_MODE.DEFAULT;
          if (currentMode === DISPLAY_MODE.UPGRADE) {
            bg.setFillStyle(0x555555); // Special highlight for upgrade mode
          } else {
            bg.setFillStyle(0x333333);
          }
        }
      });
      bg.on("pointerdown", () => {
        // Check if this case has leaders placed on it
        const hasLeaders = (caseData.placedLeaders && caseData.placedLeaders.length > 0) ||
                           this.gameState.player.turnActions.leaderPlacements.some(p => p.caseId === caseData.caseId) ||
                           this.pendingPlacements.some(p => p.caseId === caseData.caseId);
        
        // Get current display mode
        const currentMode = this.caseDisplayModes.get(caseData.caseId) || DISPLAY_MODE.DEFAULT;
        
        // Handle click based on current era and case state
        if (this.currentVisibleEra === this.gameState.currentEra) {
          // In current era
          
          // If case has leaders, toggle between DEFAULT and LEADERS modes
          if (hasLeaders) {
            const newMode = currentMode === DISPLAY_MODE.DEFAULT ? DISPLAY_MODE.LEADERS : DISPLAY_MODE.DEFAULT;
            this.caseDisplayModes.set(caseData.caseId, newMode);
            this.updateCaseCard(container, caseData, index);
            return;
          }
          
          // Handle normal case click (leader placement, etc.)
          this.handleCaseClick(caseData, container, index);
        } else if (this.isUpgradeable(caseData)) {
          // In history era, handle upgrade selection
          if (currentMode === DISPLAY_MODE.UPGRADE) {
            // If already in UPGRADE mode, toggle selection
            this.handleHistoryCaseClick(caseData, bg);
          } else {
            // Otherwise, switch to UPGRADE mode first
            this.caseDisplayModes.set(caseData.caseId, DISPLAY_MODE.UPGRADE);
            this.updateCaseCard(container, caseData, index);
          }
        }
      });

      // Case name - larger text, hidden if not revealed
      const nameText = this.add
        .text(0, -90, caseData.isRevealed ? caseData.name : "???", {
          fontSize: "18px",
          fill: "#fff",
          align: "center",
          wordWrap: { width: CARD_WIDTH - 20 },
        })
        .setOrigin(0.5);

      // Case type - larger text
      const typeText = this.add
        .text(0, -60, caseData.type, {
          fontSize: "14px",
          fill: "#aaa",
        })
        .setOrigin(0.5);

      // Leaders container text - larger text
      const leadersText = this.add
        .text(0, 60, "", {
          fontSize: "12px",
          fill: "#fff",
          align: "center",
          wordWrap: { width: CARD_WIDTH - 20 },
        })
        .setOrigin(0.5);

      container.add([bg, nameText, typeText, leadersText]);

      // Update owner text position and size if case is claimed
      let yOffset = -30;

      if (caseData.owner) {
        // Show owner if case is claimed
        const ownerText = this.add
          .text(0, yOffset, `${caseData.owner.slice(-3)}`, {
            fontSize: "14px",
            fill: "#00ff00",
          })
          .setOrigin(0.5);

        container.add(ownerText);
      } else if (!caseData.isRevealed) {
        // Show exploration points for unrevealed cases
        const explorationPointsText = Object.entries(
          caseData.explorationPoints || {}
        )
          .map(([uuid, points]) => `${points}[${uuid.slice(-3)}]`)
          .join(" ");

        const explorationText = this.add
          .text(0, yOffset, explorationPointsText, {
            fontSize: "14px",
            fill: "#fff",
          })
          .setOrigin(0.5);

        container.add(explorationText);
      } else {
        // Show claim points for revealed but unclaimed cases
        const claimPointsText = Object.entries(caseData.claimPoints || {})
          .map(([uuid, points]) => `${points}[${uuid.slice(-3)}]`)
          .join(" ");

        const claimText = this.add
          .text(0, yOffset, claimPointsText, { fontSize: "14px", fill: "#fff" })
          .setOrigin(0.5);

        container.add(claimText);
      }

      // Set initial display mode
      let initialMode = DISPLAY_MODE.DEFAULT;
      
      // Store the initial display mode
      this.caseDisplayModes.set(caseData.caseId, initialMode);
      
      // Add information based on display mode
      if (initialMode === DISPLAY_MODE.DEFAULT) {
        if (this.currentVisibleEra === this.gameState.currentEra) {
          // Show claim information for current era
          this.addClaimInformation(container, caseData);
        } else {
          // Show upgrade information for history era
          this.addUpgradeInformation(container, caseData);
        }
      }
      
      // Only add the upgrade symbol for upgradeable cases in history eras
      if (this.isUpgradeable(caseData)) {
        this.addUpgradeSymbol(container, caseData);
      }

      return container;
    } catch (error) {
      console.error("Error creating case card:", error);
      console.error("Case data:", caseData);
      return container;
    }
  }

  handleHistoryCaseClick(caseData, bg) {
    // Only allow upgrading cases that are owned by the player
    if (!this.isUpgradeable(caseData)) {
      return;
    }
    
    // Ensure turnActions.upgrades exists
    if (!this.gameState.player.turnActions.upgrades) {
      this.gameState.player.turnActions.upgrades = [];
    }

    // Check if this case is already selected for upgrade
    const isAlreadySelected = this.gameState.player.turnActions.upgrades.some(
      (u) => u.caseId === caseData.caseId
    );

    if (isAlreadySelected) {
      // Deselect the case
      this.selectedHistoryCase = null;
      bg.setFillStyle(0x555555); // Keep the upgrade mode highlight

      // Remove this case from pending upgrades
      this.gameState.player.turnActions.upgrades =
        this.gameState.player.turnActions.upgrades.filter(
          (u) => u.caseId !== caseData.caseId
        );
    } else {
      // Select this case
      this.selectedHistoryCase = caseData.caseId;
      bg.setFillStyle(0x666666);

      // Add this case to pending upgrades if not already present
      if (
        !this.gameState.player.turnActions.upgrades.find(
          (u) => u.caseId === caseData.caseId
        )
      ) {
        this.gameState.player.turnActions.upgrades.push({
          caseId: caseData.caseId,
        });
      }
    }

    // Update selected upgrades text
    this.updateSelectedUpgradesText();

    // Show commit button if we have any upgrades to process
    this.commitTurnButton.visible =
      this.gameState.player.turnActions.upgrades.length > 0;
  }

  // Add new method to update selected upgrades text
  updateSelectedUpgradesText() {
    if (!this.gameState?.player?.turnActions?.upgrades?.length) {
      this.selectedUpgradesText.setText("");
      return;
    }

    const selectedCases = this.gameState.player.turnActions.upgrades.map(
      (upgrade) => {
        // Search in all eras of history cases
        for (const [era, cases] of Object.entries(
          this.gameState.historyCases
        )) {
          const foundCase = cases.find((c) => c.caseId === upgrade.caseId);
          if (foundCase) {
            return `${foundCase.name} (Era ${era})`;
          }
        }
        return "Unknown Case";
      }
    );

    this.selectedUpgradesText.setText(
      `Selected Upgrades: ${selectedCases.join(", ")}`
    );
  }

  async handleCaseClick(caseData, container, index) {
    // Only allow leader placement if we're viewing the current era
    if (this.currentVisibleEra !== this.gameState.currentEra) {
      return;
    }

    // Reset display mode for other cases when clicking on a different case
    for (const [caseId, mode] of this.caseDisplayModes.entries()) {
      if (caseId !== caseData.caseId && mode !== DISPLAY_MODE.DEFAULT) {
        this.caseDisplayModes.set(caseId, DISPLAY_MODE.DEFAULT);
        
        // Update the display for the case that was reset
        const resetCase = this.gameState.currentCases.find(c => c.caseId === caseId);
        if (resetCase) {
          const resetContainer = this.currentCasePool.get(caseId);
          if (resetContainer) {
            const resetIndex = this.gameState.currentCases.findIndex(c => c.caseId === caseId);
            this.updateCaseCard(resetContainer, resetCase, resetIndex);
          }
        }
      }
    }

    // Get current display mode
    const currentMode = this.caseDisplayModes.get(caseData.caseId) || DISPLAY_MODE.DEFAULT;
    
    // Check if this case has leaders placed on it
    const hasLeaders = (caseData.placedLeaders && caseData.placedLeaders.length > 0) ||
                       this.gameState.player.turnActions.leaderPlacements.some(p => p.caseId === caseData.caseId) ||
                       this.pendingPlacements.some(p => p.caseId === caseData.caseId);

    // Handle display mode cycling
    if (hasLeaders) {
      // If case has leaders, toggle between DEFAULT and LEADERS modes
      const newMode = currentMode === DISPLAY_MODE.DEFAULT ? DISPLAY_MODE.LEADERS : DISPLAY_MODE.DEFAULT;
      this.caseDisplayModes.set(caseData.caseId, newMode);
      this.updateCaseCard(container, caseData, index);
      return;
    }

    // Cases in the current era cannot be upgraded, so just handle leader placement
    if (this.selectedLeader) {
      const leader = this.gameState.player.leaders.find(
        (l) => l.leaderId === this.selectedLeader
      );
      if (leader) {
        // Check if this leader already has a pending placement
        const existingPlacement = this.pendingPlacements.find(
          (p) => p.leaderId === leader.leaderId
        );
        if (existingPlacement) {
          // Update existing placement
          existingPlacement.caseId = caseData.caseId;
          existingPlacement.useUnique = this.selectedLeaderUnique;
        } else {
          // Add new placement
          this.pendingPlacements.push({
            leaderId: leader.leaderId,
            caseId: caseData.caseId,
            useUnique: this.selectedLeaderUnique,
          });
        }

        // Clear selection
        this.selectedLeader = null;
        this.selectedLeaderUnique = false;
        const display = this.leaderPool.get(leader.leaderId);
        if (display) {
          this.updateLeaderSelection(display, leader, leader.leaderId);
        }

        // Set display mode to LEADERS to show the placement
        this.caseDisplayModes.set(caseData.caseId, DISPLAY_MODE.LEADERS);
        
        // Update the display to show pending placement
        this.updateCasesDisplay();

        // Show commit button since we have pending placements
        this.commitTurnButton.visible = true;
      }
    }
  }

  async handleCommitTurn() {
    console.log(
      "GameScene: Committing turn with pending placements:",
      this.pendingPlacements,
      "and upgrades:",
      this.gameState.player.turnActions.upgrades
    );
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/games/${this.gameId}/commit-turn`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Player-UUID": this.playerUUID,
          },
          body: JSON.stringify({
            leaderPlacements: this.pendingPlacements,
            upgrades: this.gameState.player.turnActions.upgrades || [],
          }),
        }
      );

      if (!response.ok) {
        console.error("Failed to commit turn:", await response.json());
        return;
      }

      // Update the game state to reflect the committed placements and upgrades
      this.gameState = {
        ...this.gameState,
        player: {
          ...this.gameState.player,
          turnActions: {
            leaderPlacements: this.pendingPlacements,
            upgrades: this.gameState.player.turnActions.upgrades || [],
          },
        },
      };

      // Clear pending placements and upgrades after successful commit
      this.pendingPlacements = [];
      this.selectedHistoryCase = null;
      this.gameState.player.turnActions.upgrades = [];
      this.commitTurnButton.visible = false;

      // Update the display to reflect the committed state
      this.updateCasesDisplay();
      this.updateSelectedUpgradesText();

      console.log("Successfully committed turn");

      // Change the display mode to LEADERS for each pending placement
      this.pendingPlacements.forEach(placement => {
        this.caseDisplayModes.set(placement.caseId, DISPLAY_MODE.LEADERS);
      });

      // Schedule an immediate poll
      this.schedulePoll(0);
    } catch (error) {
      console.error("Error committing turn:", error);
    }
  }

  updateLeadersDisplay(leaders) {
    // Track which leaders are still active
    const activeLeaderIds = new Set();

    if (!leaders || leaders.length === 0) {
      // Hide all pooled leaders if there are none to display
      for (const [_, display] of this.leaderPool) {
        display.nameText.visible = false;
        display.knowledgeText.visible = false;
        display.uniqueText.visible = false;
        display.bg.visible = false;
      }
      this.leadersBg.setSize(LEADER_CONTAINER_WIDTH, 100);
      return;
    }

    // Calculate total height needed
    const leaderHeight = 60; // Reduced height
    const padding = 5; // Reduced padding
    const totalHeight = Math.max(100, leaders.length * leaderHeight + padding * 2);

    // Start from the bottom
    let yOffset = totalHeight - padding - leaderHeight;

    leaders.forEach((leader, index) => {
      const leaderId = leader.leaderId;
      activeLeaderIds.add(leaderId);

      // Find if this leader has a pending placement
      const pendingPlacement = this.gameState.player.turnActions.leaderPlacements.find(
        (p) => p.leaderId === leaderId
      );

      let display;
      if (this.leaderPool.has(leaderId)) {
        // Update existing leader display
        display = this.leaderPool.get(leaderId);

        // Update text content with both ranges
        display.nameText.setText(
          `${leader.name} (R1: ${leader.range1.value} ${leader.range1.direction}, R2: ${leader.range2.value} ${leader.range2.direction})`
        );
        
        // Show both range knowledge types
        display.knowledgeText.setText(
          `R1: ${leader.range1.knowledge.type.substring(0, 3)}: ${leader.range1.knowledge.amount} | ` +
          `R2: ${leader.range2.knowledge.type.substring(0, 3)}: ${leader.range2.knowledge.amount}`
        );

        // Update unique ability text and add case position if placed
        let uniqueAbilityText = `${leader.uniqueAbility.name} (${leader.uniqueAbility.usedThisEra ? "Used" : "Available"})`;
        if (pendingPlacement) {
          const casePosition = this.gameState.currentCases.findIndex(
            (c) => c.caseId === pendingPlacement.caseId
          ) + 1;
          if (casePosition > 0) {
            uniqueAbilityText += ` | Case: #${casePosition}`;
          }
        }
        display.uniqueText.setText(uniqueAbilityText);
        display.uniqueText.setStyle({
          fill: leader.uniqueAbility.usedThisEra ? "#888" : "#00ff00",
        });

        // Show the display elements
        display.nameText.visible = true;
        display.knowledgeText.visible = true;
        display.uniqueText.visible = true;
        display.bg.visible = true;

        // Update text sizes
        display.nameText.setStyle({ fontSize: "12px" });
        display.knowledgeText.setStyle({ fontSize: "10px" });
        display.uniqueText.setStyle({ fontSize: "10px" });
      } else {
        // Create background for the leader
        const bg = this.add.rectangle(0, 0, LEADER_CONTAINER_WIDTH, leaderHeight - 10, 0x333333);
        bg.setInteractive();

        // Create new leader display objects with updated range information
        const nameText = this.add.text(10, 0, 
          `${leader.name} (R1: ${leader.range1.value} ${leader.range1.direction}, R2: ${leader.range2.value} ${leader.range2.direction})`, {
          fontSize: "14px",
          fill: "#fff",
        });

        const knowledgeText = this.add.text(10, 20, 
          `R1: ${leader.range1.knowledge.type.substring(0, 3)}: ${leader.range1.knowledge.amount} | ` +
          `R2: ${leader.range2.knowledge.type.substring(0, 3)}: ${leader.range2.knowledge.amount}`, {
          fontSize: "12px",
          fill: "#aaa",
        });

        const uniqueText = this.add.text(10, 40, "", {
          fontSize: "12px",
          fill: "#00ff00",
        });

        // Add to container
        this.leadersContainer.add([bg, nameText, knowledgeText, uniqueText]);

        // Create display object and add to pool
        display = { bg, nameText, knowledgeText, uniqueText };
        this.leaderPool.set(leaderId, display);

        // Set initial unique ability text with case position if placed
        let initialUniqueText = `${leader.uniqueAbility.name} (${leader.uniqueAbility.usedThisEra ? "Used" : "Available"})`;
        if (pendingPlacement) {
          const casePosition = this.gameState.currentCases.findIndex(
            (c) => c.caseId === pendingPlacement.caseId
          ) + 1;
          if (casePosition > 0) {
            initialUniqueText += ` | Case: #${casePosition}`;
          }
        }
        display.uniqueText.setText(initialUniqueText);
        display.uniqueText.setStyle({
          fill: leader.uniqueAbility.usedThisEra ? "#888" : "#00ff00",
        });

        // Setup click handler
        bg.on("pointerdown", () => this.handleLeaderClick(leaderId, leader));
        bg.on("pointerover", () => {
          if (this.selectedLeader !== leaderId) {
            bg.setFillStyle(0x444444);
          }
        });
        bg.on("pointerout", () => {
          if (this.selectedLeader !== leaderId) {
            bg.setFillStyle(0x333333);
          }
        });

        // Set initial selection state
        this.updateLeaderSelection(display, leader, leaderId);
      }

      // Update positions
      display.bg.setPosition(LEADER_CONTAINER_WIDTH / 2, yOffset + (leaderHeight - 10) / 2);
      display.nameText.setPosition(10, yOffset);
      display.knowledgeText.setPosition(10, yOffset + 20);
      display.uniqueText.setPosition(10, yOffset + 40);

      yOffset -= leaderHeight; // Move up for the next leader
    });

    // Hide unused leader displays
    for (const [leaderId, display] of this.leaderPool.entries()) {
      if (!activeLeaderIds.has(leaderId)) {
        display.nameText.visible = false;
        display.knowledgeText.visible = false;
        display.uniqueText.visible = false;
        display.bg.visible = false;
      }
    }

    // Update background size to fit all leaders
    this.leadersBg.setSize(LEADER_CONTAINER_WIDTH, totalHeight);

    // Show commit turn button if we have any turn actions
    this.commitTurnButton.visible =
      this.gameState.player.turnActions.leaderPlacements.length > 0;
  }

  handleLeaderClick(leaderId, leader) {
    if (this.selectedLeader === leaderId) {
      // If already selected, check if we can select unique
      if (!leader.uniqueAbility.usedThisEra && !this.selectedLeaderUnique) {
        this.selectedLeaderUnique = true;
        this.updateLeaderSelection(
          this.leaderPool.get(leaderId),
          leader,
          leaderId
        );
      } else {
        // Deselect if clicking again
        this.selectedLeader = null;
        this.selectedLeaderUnique = false;
        this.updateLeaderSelection(
          this.leaderPool.get(leaderId),
          leader,
          leaderId
        );
      }
    } else {
      // Select new leader
      if (this.selectedLeader) {
        // Deselect previous leader
        const prevDisplay = this.leaderPool.get(this.selectedLeader);
        if (prevDisplay) {
          prevDisplay.bg.setFillStyle(0x333333);
        }
      }
      this.selectedLeader = leaderId;
      this.selectedLeaderUnique = false;
      this.updateLeaderSelection(
        this.leaderPool.get(leaderId),
        leader,
        leaderId
      );
    }
  }

  updateLeaderSelection(display, leader, leaderId) {
    if (this.selectedLeader === leaderId) {
      if (this.selectedLeaderUnique) {
        display.bg.setFillStyle(0xdaa520); // Gold color for unique selection
      } else {
        display.bg.setFillStyle(0x666666); // Grey for normal selection
      }
    } else {
      display.bg.setFillStyle(0x333333); // Default color
    }
  }

  updateHistoryCasesDisplay() {
    if (!this.gameState.historyCases) return;

    // Only update if we're showing a historical era
    if (this.currentVisibleEra === this.gameState.currentEra) {
      this.historyCasesContainer.removeAll(true);
      return;
    }

    const padding = 30;
    const screenWidth = this.sys.game.config.width;

    // Track which cases are still in use
    const activeCaseIds = new Set();

    // Only show cases for the current visible era
    if (
      this.currentVisibleEra &&
      this.currentVisibleEra !== this.gameState.currentEra
    ) {
      const cases = this.gameState.historyCases[this.currentVisibleEra];
      if (cases) {
        // Calculate total width needed for all cards
        const totalCardsWidth = cases.length * (CARD_WIDTH + padding) - padding;

        // Calculate starting X position to center the cards
        let xOffset = (screenWidth - totalCardsWidth) / 2;

        cases.forEach((caseData, index) => {
          const caseId = caseData.caseId;
          activeCaseIds.add(caseId);

          const x = xOffset + index * (CARD_WIDTH + padding);
          const y = 0; // All cases at same y-level

          let caseContainer;
          if (this.historyCasePool.has(caseId)) {
            // Update existing case
            caseContainer = this.historyCasePool.get(caseId);
            this.updateCaseCard(caseContainer, caseData, index);
            caseContainer.x = x;
            caseContainer.y = y;
          } else {
            // Create new case if not in pool
            caseContainer = this.createCaseCard(caseData, x, y, index);
            this.historyCasePool.set(caseId, caseContainer);
            this.historyCasesContainer.add(caseContainer);
          }
        });
      }
    }

    // Remove cases that are no longer present
    for (const [caseId, container] of this.historyCasePool.entries()) {
      if (!activeCaseIds.has(caseId)) {
        container.destroy();
        this.historyCasePool.delete(caseId);
      }
    }
  }

  navigateEra(direction) {
    if (!this.gameState) return;

    const allEras = [
      ...Object.keys(this.gameState.historyCases || {}).map(Number),
      this.gameState.currentEra,
    ].sort((a, b) => a - b);

    const currentIndex = allEras.indexOf(this.currentVisibleEra);
    let newIndex;

    if (direction === "prev" && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (direction === "next" && currentIndex < allEras.length - 1) {
      newIndex = currentIndex + 1;
    } else {
      return;
    }

    this.showEra(allEras[newIndex]);
  }

  showEra(era) {
    if (!this.gameState) return;

    // Clear all display modes when changing eras
    this.caseDisplayModes.clear();

    // Store the current upgrades before switching eras
    const currentUpgrades = this.gameState.player.turnActions.upgrades || [];

    // Hide all containers initially
    this.historyCasesContainer.setVisible(false);
    this.casesContainer.setVisible(false);

    // Clear the inactive container
    if (era === this.gameState.currentEra) {
      this.historyCasesContainer.removeAll(true);
      this.historyCasePool.clear();

      // Show current era cases
      this.casesContainer.setVisible(true);
      this.dragTarget = this.casesContainer;
      this.eraLabel.setText(`Current Era (${era})`);
    } else {
      this.casesContainer.removeAll(true);
      this.currentCasePool.clear();

      // Show historical era cases
      this.historyCasesContainer.setVisible(true);
      this.dragTarget = this.historyCasesContainer;
      this.eraLabel.setText(`Era ${era}`);
    }

    // Update navigation buttons
    const allEras = [
      ...Object.keys(this.gameState.historyCases || {}).map(Number),
      this.gameState.currentEra,
    ].sort((a, b) => a - b);

    const currentIndex = allEras.indexOf(era);
    this.prevEraButton.setVisible(currentIndex > 0);
    this.nextEraButton.setVisible(currentIndex < allEras.length - 1);

    this.currentVisibleEra = era;

    // Update the appropriate display
    if (era === this.gameState.currentEra) {
      this.updateCasesDisplay();
    } else {
      this.updateHistoryCasesDisplay();
    }

    // Restore the upgrades after switching eras
    this.gameState.player.turnActions.upgrades = currentUpgrades;

    // Update selected upgrades text
    this.updateSelectedUpgradesText();

    // Update commit button visibility based on upgrades
    this.commitTurnButton.visible = currentUpgrades.length > 0;
  }

  update() {
    // Game logic updates
  }

  shutdown() {
    console.log("GameScene: Shutting down");
    if (this.pollTimer) {
      this.pollTimer.remove();
      this.pollTimer = null;
    }
    this.shouldInitialize = false;
  }

  // New method to handle upgrade information display
  addUpgradeInformation(container, caseData) {
    // Show upgrade information if the case has an upgrade effect and is revealed
    if (
      caseData.isRevealed &&
      (caseData.upgradeEffect1 || caseData.upgradeEffect2)
    ) {
      // Determine text color based on whether this is a history case or current era case
      const isHistoryCase = this.currentVisibleEra !== this.gameState.currentEra;
      const textColor = isHistoryCase ? "#DAA520" : "#fff"; // Gold for history, white for current

      // Show upgrade effect
      if (caseData.upgradeEffect1) {
        const upgradeEffect = this.add.text(
          -CARD_WIDTH / 2 + 10,
          CARD_HEIGHT / 2 - 80, // Adjusted for CARD_HEIGHT
          `Effect: ${caseData.upgradeEffect1}`,
          {
            fontSize: "12px",
            wordWrap: { width: CARD_WIDTH - 20 },
            fill: textColor,
          }
        );
        container.add(upgradeEffect);
      }

      // Show upgrade cost
      if (caseData.upgradeCost1Amount && caseData.upgradeCost1Type) {
        let costText = `Cost: ${caseData.upgradeCost1Amount} ${caseData.upgradeCost1Type}`;
        if (caseData.upgradeCost2Amount && caseData.upgradeCost2Type) {
          costText += `, ${caseData.upgradeCost2Amount} ${caseData.upgradeCost2Type}`;
        }
        const upgradeCost = this.add.text(
          -CARD_WIDTH / 2 + 10,
          CARD_HEIGHT / 2 - 100, // Adjusted for CARD_HEIGHT
          costText,
          {
            fontSize: "12px",
            fill: textColor,
          }
        );
        container.add(upgradeCost);
      }

      // Show "Upgrade" text (simplified from "Upgradeable"/"Upgraded")
      const upgradeText = this.add.text(
        -CARD_WIDTH / 2 + 10,
        CARD_HEIGHT / 2 - 120, // Adjusted for CARD_HEIGHT
        "Upgrade", // Always just "Upgrade"
        {
          fontSize: "14px",
          fill: textColor,
          fontStyle: "bold",
        }
      );
      container.add(upgradeText);
    }
  }

  // Update method to clear case display modes when clicking elsewhere
  clearUpgradeInfoDisplay() {
    // Reset all case display modes to DEFAULT
    const modifiedCaseIds = [];
    
    for (const [caseId, mode] of this.caseDisplayModes.entries()) {
      if (mode !== DISPLAY_MODE.DEFAULT) {
        this.caseDisplayModes.set(caseId, DISPLAY_MODE.DEFAULT);
        modifiedCaseIds.push(caseId);
      }
    }
    
    // Update all cases that had their display mode reset
    if (this.currentVisibleEra === this.gameState.currentEra) {
      // Update current era cases
      for (const caseId of modifiedCaseIds) {
        const caseData = this.gameState.currentCases.find(c => c.caseId === caseId);
        if (caseData) {
          const container = this.currentCasePool.get(caseId);
          if (container) {
            const index = this.gameState.currentCases.findIndex(c => c.caseId === caseId);
            this.updateCaseCard(container, caseData, index);
          }
        }
      }
    } else {
      // Update history cases
      const historyCases = this.gameState.historyCases[this.currentVisibleEra] || [];
      for (const caseId of modifiedCaseIds) {
        const caseData = historyCases.find(c => c.caseId === caseId);
        if (caseData) {
          const container = this.historyCasePool.get(caseId);
          if (container) {
            const index = historyCases.findIndex(c => c.caseId === caseId);
            this.updateCaseCard(container, caseData, index);
          }
        }
      }
    }
  }

  // New method to display claim effects and rewards
  addClaimInformation(container, caseData) {
    // Only show claim information for revealed cases in the current era
    if (!caseData.isRevealed || this.currentVisibleEra !== this.gameState.currentEra) {
      return;
    }

    // Show claim effects if available (use claimEffect1 from the backend)
    if (caseData.claimEffect1) {
      const claimEffect = this.add.text(
        -CARD_WIDTH / 2 + 10,
        CARD_HEIGHT / 2 - 80,
        `Effect: ${caseData.claimEffect1}`,
        {
          fontSize: "12px",
          wordWrap: { width: CARD_WIDTH - 20 },
          fill: "#fff",
        }
      );
      container.add(claimEffect);
    }

    // Show claim rewards if available (use claimRewardAmount1 and claimReward1Type from the backend)
    if (caseData.claimRewardAmount1 && caseData.claimReward1Type) {
      let rewardsText = "Rw: ";
      
      // Format primary reward
      const resource1 = caseData.claimReward1Type.toLowerCase();
      const amount1 = caseData.claimRewardAmount1;
      
      // Use abbreviations for resources
      const abbr = {
        'might': 'M',
        'education': 'E',
        'gold': 'G',
        'faith': 'Fa',
        'food': 'Fo',
        'influence': 'I'
      }[resource1] || resource1;
      
      rewardsText += `+${amount1} ${abbr}`;
      
      // Add secondary reward if available
      if (caseData.claimRewardAmount2 && caseData.claimReward2Type) {
        const resource2 = caseData.claimReward2Type.toLowerCase();
        const amount2 = caseData.claimRewardAmount2;
        const abbr2 = {
          'might': 'M',
          'education': 'E',
          'gold': 'G',
          'faith': 'Fa',
          'food': 'Fo',
          'influence': 'I'
        }[resource2] || resource2;
        
        rewardsText += `, +${amount2} ${abbr2}`;
      }
      
      const claimRewards = this.add.text(
        -CARD_WIDTH / 2 + 10,
        CARD_HEIGHT / 2 - 100,
        rewardsText,
        {
          fontSize: "12px",
          wordWrap: { width: CARD_WIDTH - 20 },
          fill: "#fff",
        }
      );
      container.add(claimRewards);
    }

    // Show "Claim" label
    const claimLabel = this.add.text(
      -CARD_WIDTH / 2 + 10,
      CARD_HEIGHT / 2 - 120,
      "Claim",
      {
        fontSize: "14px",
        fill: "#fff",
        fontStyle: "bold",
      }
    );
    container.add(claimLabel);
  }

  // Add a method to add the upgrade symbol to any case card
  addUpgradeSymbol(container, caseData) {
    // Only add the symbol if the case is upgradeable
    if (this.isUpgradeable(caseData)) {
      console.log("Adding upgrade symbol");
      // Check if the symbol already exists in the container
      const existingSymbol = container.list.find(
        item => item.type === 'Text' && item.text === 'ᴜ' && Math.abs(item.y - (CARD_HEIGHT / 2 - 10)) < 5
      );
      
      // Only add if it doesn't already exist
      if (!existingSymbol) {
        const upgradeSymbol = this.add.text(
          0,
          CARD_HEIGHT / 2 - 10,
          "ᴜ", // Small capital U
          {
            fontSize: "14px",
            fill: "#DAA520", // Gold color
            fontStyle: "bold",
          }
        ).setOrigin(0.5);
        container.add(upgradeSymbol);
      }
    }
  }

  // Add a new helper method to handle upgrade selection
  handleUpgradeSelection(caseData) {
    // Ensure turnActions.upgrades exists
    if (!this.gameState.player.turnActions.upgrades) {
      this.gameState.player.turnActions.upgrades = [];
    }

    // Check if this case is already selected for upgrade
    const isAlreadySelected = this.gameState.player.turnActions.upgrades.some(
      (u) => u.caseId === caseData.caseId
    );

    if (isAlreadySelected) {
      // Deselect the case
      // Remove this case from pending upgrades
      this.gameState.player.turnActions.upgrades =
        this.gameState.player.turnActions.upgrades.filter(
          (u) => u.caseId !== caseData.caseId
        );
    } else {
      // Add this case to pending upgrades if not already present
      if (
        !this.gameState.player.turnActions.upgrades.find(
          (u) => u.caseId === caseData.caseId
        )
      ) {
        this.gameState.player.turnActions.upgrades.push({
          caseId: caseData.caseId,
        });
      }
    }

    // Update selected upgrades text
    this.updateSelectedUpgradesText();

    // Show commit button if we have any upgrades to process
    this.commitTurnButton.visible =
      this.gameState.player.turnActions.upgrades.length > 0 || 
      this.pendingPlacements.length > 0;
    
    // Update the display to reflect selection
    this.updateCasesDisplay();
  }
}
