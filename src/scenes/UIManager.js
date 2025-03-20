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

    // Create container for player info and commit status
    this.scene.playerInfoContainer = this.scene.add.container(10, 40);
    
    // Add commit status text
    this.scene.playerCommitStatus = this.scene.add.text(0, 0, "", {
      fontSize: "11px",
      fontStyle: "bold",
      align: "left"
    });
    
    // Add player info text
    this.scene.playerInfo = this.scene.add.text(20, 0, "", {
      fontSize: "14px",
      fill: "#fff",
    });
    
    this.scene.playerInfoContainer.add([
      this.scene.playerCommitStatus,
      this.scene.playerInfo
    ]);

    // Create a single container for the other player display
    this.scene.otherPlayerContainer = this.scene.add.container(0, 80);
    this.scene.otherPlayerText = this.scene.add.text(32, 10, "", {
      fontSize: "11px",
      fill: "#aaa",
      align: "left",
    }).setInteractive();
    
    this.scene.otherPlayerContainer.add([
      this.scene.otherPlayerText
    ]);

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
      .text(10, 102, "", {
        fontSize: "18px",
        fill: "#fff",
      })
      .setOrigin(0, 0);

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
      .on("pointerout", () => {
        // Check if committed to determine the color to return to
        const hasCommitted = this.hasTurnCommitted(this.scene.gameState?.player);
        this.scene.commitTurnButton.setStyle({ 
          fill: hasCommitted ? "#ff0000" : "#00ff00" 
        });
      })
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

  hasTurnCommitted(player) {
    if (!player) return false;
    
    // If this is another player (has hasCommitted flag), use that
    if ('hasCommitted' in player) {
      return player.hasCommitted;
    }
    
    // For the current player, check detailed conditions
    const hasLeaderPlacements = player.turnActions?.leaderPlacements && 
                               Array.isArray(player.turnActions.leaderPlacements) && 
                               player.turnActions.leaderPlacements.length > 0;
    
    const hasUpgrades = player.turnActions?.upgrades && 
                        Array.isArray(player.turnActions.upgrades) && 
                        player.turnActions.upgrades.length > 0;
    
    // Check if leader has been used this turn
    const hasUsedLeader = player.leader?.usedThisTurn;
    
    return hasLeaderPlacements || hasUpgrades || hasUsedLeader;
  }

  updateOtherPlayersDisplay(otherPlayers) {
    if (!otherPlayers || otherPlayers.length === 0) {
      this.scene.otherPlayerText.visible = false;
      if (this.scene.commitStatusText) {
        this.scene.commitStatusText.visible = false;
      }
      return;
    }

    // Store the current player list and initialize current index if not set
    this.otherPlayersList = otherPlayers;
    if (!this.currentPlayerIndex) {
      this.currentPlayerIndex = 0;
    }

    // Get the current player to display
    const player = this.otherPlayersList[this.currentPlayerIndex];
    
    // Get leader information from the player object
    let leaderInfo = "No Leader";
    if (player.leader) {
      const uniqueStatus = player.leader.uniqueAbility.usedThisEra ? "Used" : "Available";
      const r1 = player.leader.range1;
      const r2 = player.leader.range2;
      leaderInfo = `${player.leader.name}\nR1: ${r1.knowledge.type.substring(0, 3)}: +${r1.knowledge.amount} (${r1.value} ${r1.direction})\nR2: ${r2.knowledge.type.substring(0, 3)}: +${r2.knowledge.amount} (${r2.value} ${r2.direction})\n${player.leader.uniqueAbility.name}: ${uniqueStatus}`;
    }
    
    const playerText = `${player.name}\nEP: ${player.eraPoints}\nM: ${player.resources.might} | E: ${player.resources.education}\nG: ${player.resources.gold} | Fa: ${player.resources.faith}\nFo: ${player.resources.food} | I: ${player.resources.influence}\n${leaderInfo}`;

    this.scene.otherPlayerText.setText(playerText);
    this.scene.otherPlayerText.setStyle({
      fontSize: "11px",
      fill: "#aaa",
      align: "left"
    });
    this.scene.otherPlayerText.visible = true;
    
    // Create or update the commit status text
    if (!this.scene.commitStatusText) {
      this.scene.commitStatusText = this.scene.add.text(0, 0, "", {
        fontSize: "11px",
        align: "left"
      });
      this.scene.otherPlayerContainer.add(this.scene.commitStatusText);
    }
    
    this.scene.commitStatusText.setText(player.hasCommitted ? 'OK' : 'X');
    this.scene.commitStatusText.setStyle({
      fill: player.hasCommitted ? '#00ff00' : '#ff0000',  // Green for committed, red for not committed
      fontSize: "11px",
      fontStyle: "bold"
    });
    this.scene.commitStatusText.setPosition(10, 10); // Position next to the player name
    this.scene.commitStatusText.visible = true;
    
    const playerWidth = 200; // Increased width to accommodate the text

    // Position the container in the top-right corner
    this.scene.otherPlayerContainer.setPosition(
      this.scene.sys.game.config.width - playerWidth - 10,
      35
    );
    
    // Add click handler for player switching
    this.scene.otherPlayerText.off('pointerdown'); // Remove any existing handlers
    this.scene.otherPlayerText.on('pointerdown', () => {
      // Increment index and wrap around if needed
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.otherPlayersList.length;
      // Update display with new player
      this.updateOtherPlayersDisplay(this.otherPlayersList);
    });

    // Add hover effect
    this.scene.otherPlayerText.on('pointerover', () => {
      this.scene.otherPlayerText.setStyle({ fill: '#ffffff' });
    });
    this.scene.otherPlayerText.on('pointerout', () => {
      this.scene.otherPlayerText.setStyle({ fill: '#aaa' });
    });
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

    // Update commit button and status for current player
    if (gameState?.player) {
      const hasCommitted = this.hasTurnCommitted(gameState.player);
      
      // Update commit button
      if (hasCommitted) {
        this.scene.commitTurnButton.setText("Committed!");
        this.scene.commitTurnButton.setStyle({ fill: "#ff0000" });
        this.scene.commitTurnButton.disableInteractive();
      } else {
        this.scene.commitTurnButton.setText("Commit Turn");
        this.scene.commitTurnButton.setStyle({ fill: "#00ff00" });
        this.scene.commitTurnButton.setInteractive();
      }
      this.scene.commitTurnButton.setVisible(gameState.status === 'IN_PROGRESS');

      // Update commit status text
      if (this.scene.playerCommitStatus) {
        this.scene.playerCommitStatus.setText(hasCommitted ? 'OK' : 'X');
        this.scene.playerCommitStatus.setStyle({
          fill: hasCommitted ? '#00ff00' : '#ff0000',
          fontSize: "11px",
          fontStyle: "bold"
        });
      }
    }
  }
}
