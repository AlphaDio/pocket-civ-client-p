export default class UIManager {
  constructor(scene) {
    this.scene = scene;
  }

  createUI() {
    console.log("UIManager: Setting up UI components");
    const screenWidth = this.scene.scale.width;
    const screenHeight = this.scene.scale.height;
    const casesY = Math.floor(screenHeight * 0.4);

    this.scene.statusText = this.scene.add.text(
      10,
      10,
      "Loading game state...",
      { fontSize: "18px", fill: "#fff" }
    );
    this.scene.selectedUpgradesText = this.scene.add
      .text(screenWidth / 2, 10, "", {
        fontSize: "14px",
        fill: "#DAA520",
        align: "center",
      })
      .setOrigin(0.5, 0);
    this.scene.eraInfo = this.scene.add
      .text(screenWidth - 10, 10, "", {
        fontSize: "16px",
        fill: "#fff",
        align: "right",
      })
      .setOrigin(1, 0);
    this.scene.playerInfo = this.scene.add.text(10, 40, "", {
      fontSize: "14px",
      fill: "#fff",
    });

    this.scene.otherPlayersContainer = this.scene.add.container(0, 80);
    this.scene.otherPlayersBg = this.scene.add.rectangle(
      0,
      0,
      0,
      80,
      0x222222,
      0.5
    );
    this.scene.otherPlayersContainer.add(this.scene.otherPlayersBg);

    this.scene.casesContainer = this.scene.add.container(0, casesY);
    this.scene.historyCasesContainer = this.scene.add.container(0, casesY);

    this.scene.prevEraButton = this.scene.add
      .text(10, casesY - 50, "⬆️ Previous Era", {
        fontSize: "16px",
        fill: "#fff",
        backgroundColor: "#444",
        padding: { x: 10, y: 5 },
      })
      .setInteractive()
      .on("pointerdown", () => this.scene.eraManager.navigateEra("prev"))
      .setVisible(false);

    this.scene.nextEraButton = this.scene.add
      .text(10, casesY + 250, "⬇️ Next Era", {
        fontSize: "16px",
        fill: "#fff",
        backgroundColor: "#444",
        padding: { x: 10, y: 5 },
      })
      .setInteractive()
      .on("pointerdown", () => this.scene.eraManager.navigateEra("next"))
      .setVisible(false);

    this.scene.eraLabel = this.scene.add
      .text(screenWidth / 2, casesY - 30, "", {
        fontSize: "18px",
        fill: "#fff",
      })
      .setOrigin(0.5, 0);

    const leadersY = screenHeight - 120;
    this.scene.leadersContainer =
      this.scene.leaderManager.createLeadersContainer(10, leadersY);
    this.scene.playerUUIDText = this.scene.add.text(
      10,
      leadersY - 20,
      `Your ID: ${this.scene.playerUUID.slice(-3)}`,
      { fontSize: "12px", fill: "#aaa" }
    );

    this.scene.commitTurnButton = this.scene.add
      .text(screenWidth - 10, screenHeight - 20, "Commit Turn", {
        fontSize: "18px",
        fill: "#00ff00",
        backgroundColor: "#444",
        padding: { x: 10, y: 5 },
      })
      .setOrigin(1, 1)
      .setInteractive()
      .on("pointerdown", () => this.scene.stateManager.handleCommitTurn())
      .on("pointerover", () =>
        this.scene.commitTurnButton.setStyle({ fill: "#88ff88" })
      )
      .on("pointerout", () =>
        this.scene.commitTurnButton.setStyle({ fill: "#00ff00" })
      )
      .setVisible(false);

    this.scene.forceProcessButton = this.scene.add
      .text(screenWidth - 10, screenHeight - 50, "Force Process", {
        fontSize: "18px",
        fill: "#ff0000",
        backgroundColor: "#444",
        padding: { x: 10, y: 5 },
      })
      .setOrigin(1, 1)
      .setInteractive()
      .on("pointerdown", () => this.scene.stateManager.handleForceProcessTurn())
      .on("pointerover", () =>
        this.scene.forceProcessButton.setStyle({ fill: "#ff8888" })
      )
      .on("pointerout", () =>
        this.scene.forceProcessButton.setStyle({ fill: "#ff0000" })
      )
      .setVisible(false);

    this.scene.startGameButton = this.scene.add
      .text(250, 150, "Start Game", {
        fontSize: "24px",
        fill: "#00ff00",
        backgroundColor: "#444",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerdown", () => this.scene.stateManager.handleStartGame())
      .on("pointerover", () =>
        this.scene.startGameButton.setStyle({ fill: "#88ff88" })
      )
      .on("pointerout", () =>
        this.scene.startGameButton.setStyle({ fill: "#00ff00" })
      )
      .setVisible(false);
  }

  updateOtherPlayersDisplay(otherPlayers) {
    const activePlayerIds = new Set();
    if (!otherPlayers || otherPlayers.length === 0) {
      for (const [_, display] of this.scene.playerPool) {
        display.text.visible = false;
        display.bg.visible = false;
      }
      this.scene.otherPlayersBg.setSize(0, 0);
      return;
    }

    let xOffset = 10;
    const padding = 10;
    const playerWidth = 100;

    otherPlayers.forEach((player) => {
      const playerId = player.id;
      activePlayerIds.add(playerId);
      const playerText = `${player.name}\nEP: ${player.eraPoints}\nM: ${player.resources.might} | E: ${player.resources.education}\nG: ${player.resources.gold} | Fa: ${player.resources.faith}\nFo: ${player.resources.food} | I: ${player.resources.influence}`;

      let display;
      if (this.scene.playerPool.has(playerId)) {
        display = this.scene.playerPool.get(playerId);
        display.text.setText(playerText);
        display.text.visible = true;
        display.bg.visible = true;
      } else {
        const text = this.scene.add.text(xOffset, 10, playerText, {
          fontSize: "10px",
          fill: "#aaa",
          align: "left",
        });
        const bg = this.scene.add.rectangle(
          xOffset - 5,
          5,
          playerWidth,
          100,
          0x333333,
          0.5
        );
        this.scene.otherPlayersContainer.add(bg);
        this.scene.otherPlayersContainer.add(text);
        display = { text, bg };
        this.scene.playerPool.set(playerId, display);
      }

      display.text.setPosition(xOffset, 10);
      display.bg.setPosition(xOffset - 5, 5);
      xOffset += playerWidth + padding;
    });

    for (const [playerId, display] of this.scene.playerPool.entries()) {
      if (!activePlayerIds.has(playerId)) {
        display.text.visible = false;
        display.bg.visible = false;
      }
    }

    this.scene.otherPlayersBg.setSize(xOffset, 110);
    this.scene.otherPlayersContainer.setPosition(
      this.scene.sys.game.config.width - xOffset - 10,
      10
    );
  }

  updateSelectedUpgradesText() {
    if (!this.scene.gameState?.player?.turnActions?.upgrades?.length) {
      this.scene.selectedUpgradesText.setText("");
      return;
    }

    const selectedCases = this.scene.gameState.player.turnActions.upgrades.map(
      (upgrade) => {
        for (const [era, cases] of Object.entries(
          this.scene.gameState.historyCases || {}
        )) {
          const foundCase = cases.find((c) => c.caseId === upgrade.caseId);
          if (foundCase) return `${foundCase.name} (Era ${era})`;
        }
        return "Unknown Case";
      }
    );

    this.scene.selectedUpgradesText.setText(
      `Selected Upgrades: ${selectedCases.join(", ")}`
    );
  }
}
