import { helpContent, HELP_PANEL_CONFIG } from './utils/helpContent';
import APIService from './utils/APIService';

export default class UIManager {
  constructor(scene) {
    this.scene = scene;
  }

  async fetchCaseModifiers() {
    return await APIService.fetchCaseModifiers();
  }

  formatModifiersTable(modifiers) {
    if (!modifiers) return helpContent.page4.tips;

    const header = "Case Type     | M  | S  | E  | R  | C  | D";
    const separator = "-------------|----|----|----|----|----|----";
    const rows = Object.entries(modifiers).map(([type, mods]) => {
      const paddedType = type.padEnd(12);
      return `${paddedType} | ${mods.military.toString().padStart(2)} | ${mods.science.toString().padStart(2)} | ${mods.economy.toString().padStart(2)} | ${mods.religion.toString().padStart(2)} | ${mods.cultural.toString().padStart(2)} | ${mods.diplomatic.toString().padStart(2)}`;
    });

    return [
      header,
      separator,
      ...rows,
      "",
      "M=Military, S=Scientific, E=Economic, R=Religious, C=Cultural, D=Diplomatic"
    ];
  }

  async updateHelpPanel() {
    const modifiers = await this.fetchCaseModifiers();
    const tips = this.formatModifiersTable(modifiers);
    
    // Update the help content
    helpContent.page4.tips = tips;
    
    // Update the help panel if it's visible
    if (this.scene.helpPanel && this.scene.helpPanel.visible) {
      this.scene.helpPages.forEach((page, index) => {
        if (index === 3) { // page4 is at index 3
          // Clear existing content
          page.removeAll(true);
          
          // Add title
          const title = this.scene.add.text(10, 10, helpContent.page4.title, {
            fontSize: Math.min(14, this.scene.sys.game.config.width * 0.04) + "px",
            fill: "#ffffff",
            align: "left"
          });
          page.add(title);

          // Add tips with dynamic font size and positioning
          const titleHeight = 30;
          const contentArea = this.scene.helpPanelBg.height - titleHeight - HELP_PANEL_CONFIG.indicatorOffset;
          const tipSpacing = Math.min(HELP_PANEL_CONFIG.tipSpacing, contentArea / tips.length);
          
          tips.forEach((tip, i) => {
            const text = this.scene.add.text(
              10,
              titleHeight + i * tipSpacing,
              tip,
              {
                fontSize: Math.min(11, this.scene.sys.game.config.width * 0.03) + "px",
                fill: "#ffffff",
                align: "left",
                wordWrap: { width: this.scene.helpPanelBg.width - 40 }
              }
            );
            page.add(text);
          });
        }
      });
    }
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
      { fontSize: "14px", fill: "#fff" }
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
      .text(screenWidth / 2, 20, "", {
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
      { fontSize: "14px", fill: "#DAA520" }
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

    // Add help button
    this.scene.helpButton = this.scene.add
      .text(screenWidth - 10, screenHeight - 80, "?", {
        fontSize: "24px",
        fill: "#ffffff",
        backgroundColor: "#444",
        padding: { x: 10, y: 5 },
      })
      .setOrigin(1, 1)
      .setInteractive()
      .on("pointerdown", () => this.toggleHelpPanel())
      .on("pointerover", () =>
        this.scene.helpButton.setStyle({ fill: "#cccccc" })
      )
      .on("pointerout", () =>
        this.scene.helpButton.setStyle({ fill: "#ffffff" })
      )
      .setVisible(true);

    // Create help panel
    const panelWidth = Math.min(
      Math.max(screenWidth * HELP_PANEL_CONFIG.widthPercent, HELP_PANEL_CONFIG.minWidth),
      HELP_PANEL_CONFIG.maxWidth
    );
    const panelHeight = Math.min(
      Math.max(screenHeight * HELP_PANEL_CONFIG.heightPercent, HELP_PANEL_CONFIG.minHeight),
      HELP_PANEL_CONFIG.maxHeight
    );
    
    const panelX = screenWidth / 2 - panelWidth / 2;
    const panelY = screenHeight / 2 - panelHeight / 2;

    this.scene.helpPanel = this.scene.add.container(panelX, panelY);
    
    // Panel background
    this.scene.helpPanelBg = this.scene.add.rectangle(
      panelWidth / 2,
      170,
      panelWidth,
      panelHeight,
      0x000000,
      0.95
    );
    this.scene.helpPanelBg.setStrokeStyle(2, 0xffffff);
    this.scene.helpPanel.add(this.scene.helpPanelBg);

    // Create containers for each page
    this.scene.helpPages = [];
    
    // Create help pages
    Object.entries(helpContent).forEach(([_, pageContent], pageIndex) => {
      const pageContainer = this.scene.add.container(0, 0);
      
      // Add title
      const title = this.scene.add.text(10, 10, pageContent.title, {
        fontSize: Math.min(14, screenWidth * 0.04) + "px",
        fill: "#ffffff",
        align: "left"
      });
      pageContainer.add(title);

      // Add tips with dynamic font size and positioning
      const titleHeight = 30;
      const contentArea = panelHeight - titleHeight - HELP_PANEL_CONFIG.indicatorOffset;
      const tipSpacing = Math.min(HELP_PANEL_CONFIG.tipSpacing, contentArea / pageContent.tips.length);
      
      pageContent.tips.forEach((tip, index) => {
        const text = this.scene.add.text(
          10,
          titleHeight + index * tipSpacing,
          tip,
          {
            fontSize: Math.min(11, screenWidth * 0.03) + "px",
            fill: "#ffffff",
            align: "left",
            wordWrap: { width: panelWidth - 40 }
          }
        );
        pageContainer.add(text);
      });

      pageContainer.setVisible(pageIndex === 0);
      this.scene.helpPages.push(pageContainer);
      this.scene.helpPanel.add(pageContainer);
    });

    // Page indicator
    this.currentHelpPage = 0;
    this.totalHelpPages = Object.keys(helpContent).length;
    this.scene.pageIndicator = this.scene.add.text(
      panelWidth / 2,
      panelHeight - HELP_PANEL_CONFIG.indicatorOffset,
      this.getPageIndicatorText(1),
      {
        fontSize: Math.min(12, screenWidth * 0.035) + "px",
        fill: "#ffffff",
        align: "center"
      }
    ).setOrigin(0.5);
    this.scene.helpPanel.add(this.scene.pageIndicator);

    // Close button
    this.scene.closeHelpButton = this.scene.add
      .text(panelWidth - 20, 20, "×", {
        fontSize: Math.min(20, screenWidth * 0.05) + "px",
        fill: "#ffffff",
      })
      .setInteractive()
      .on("pointerdown", () => this.toggleHelpPanel())
      .on("pointerover", () =>
        this.scene.closeHelpButton.setStyle({ fill: "#cccccc" })
      )
      .on("pointerout", () =>
        this.scene.closeHelpButton.setStyle({ fill: "#ffffff" })
      );
    this.scene.helpPanel.add(this.scene.closeHelpButton);

    // Make panel interactive to change pages
    this.scene.helpPanelBg.setInteractive()
      .on("pointerdown", () => this.nextHelpPage());

    this.scene.helpPanel.setVisible(false);

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

    let xOffset = 0;
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

  toggleHelpPanel() {
    const isVisible = !this.scene.helpPanel.visible;
    this.scene.helpPanel.setVisible(isVisible);
    if (!isVisible) {
      // Reset to first page when closing
      this.currentHelpPage = 0;
      this.scene.helpPages.forEach((page, index) => {
        page.setVisible(index === 0);
      });
      this.scene.pageIndicator.setText(this.getPageIndicatorText(1));
    } else {
      // Update modifiers when opening
      this.updateHelpPanel();
    }
  }

  getPageIndicatorText(currentPage) {
    return `Page ${currentPage}/${this.totalHelpPages}`;
  }

  nextHelpPage() {
    this.currentHelpPage++;
    if (this.currentHelpPage >= this.scene.helpPages.length) {
      this.toggleHelpPanel();
      return;
    }

    this.scene.helpPages.forEach((page, index) => {
      page.setVisible(index === this.currentHelpPage);
    });
    this.scene.pageIndicator.setText(this.getPageIndicatorText(this.currentHelpPage + 1));
  }

  updateUIState(gameState) {
    // Update help button visibility based on game state
    if (this.scene.helpButton) {
      this.scene.helpButton.setVisible(gameState?.status === 'IN_PROGRESS');
    }
  }
}
