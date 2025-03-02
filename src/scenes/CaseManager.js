import { CARD_WIDTH, CARD_HEIGHT, DISPLAY_MODE } from "./utils/constants";

export default class CaseManager {
  constructor(scene) {
    this.scene = scene;
    this.scene.currentCasePool = new Map();
    this.scene.historyCasePool = new Map();
    this.scene.caseDisplayModes = new Map();
    this.scene.selectedHistoryCase = null;
    this.scene.showingUpgradeInfo = null;
  }

  updateCasesDisplay() {
    if (this.scene.currentVisibleEra !== this.scene.gameState.currentEra) {
      this.scene.casesContainer.removeAll(true);
      return;
    }

    const padding = 30;
    const screenWidth = this.scene.sys.game.config.width;
    const totalCardsWidth =
      this.scene.gameState.currentCases.length * (CARD_WIDTH + padding) -
      padding;
    let xOffset = (screenWidth - totalCardsWidth) / 2;
    const activeCaseIds = new Set();

    this.scene.gameState.currentCases.forEach((caseData, index) => {
      const caseId = caseData.caseId;
      activeCaseIds.add(caseId);
      const x = xOffset + index * (CARD_WIDTH + padding);
      const y = 0;

      let caseContainer;
      if (this.scene.currentCasePool.has(caseId)) {
        caseContainer = this.scene.currentCasePool.get(caseId);
        this.updateCaseCard(caseContainer, caseData, index);
        caseContainer.setPosition(x, y);
      } else {
        caseContainer = this.createCaseCard(caseData, x, y, index);
        this.scene.currentCasePool.set(caseId, caseContainer);
        this.scene.casesContainer.add(caseContainer);
      }
    });

    for (const [caseId, container] of this.scene.currentCasePool.entries()) {
      if (!activeCaseIds.has(caseId)) {
        container.destroy();
        this.scene.currentCasePool.delete(caseId);
      }
    }
  }

  updateHistoryCasesDisplay() {
    if (
      !this.scene.gameState.historyCases ||
      this.scene.currentVisibleEra === this.scene.gameState.currentEra
    ) {
      this.scene.historyCasesContainer.removeAll(true);
      return;
    }

    const padding = 30;
    const screenWidth = this.scene.sys.game.config.width;
    const cases =
      this.scene.gameState.historyCases[this.scene.currentVisibleEra] || [];
    const totalCardsWidth = cases.length * (CARD_WIDTH + padding) - padding;
    let xOffset = (screenWidth - totalCardsWidth) / 2;
    const activeCaseIds = new Set();

    cases.forEach((caseData, index) => {
      const caseId = caseData.caseId;
      activeCaseIds.add(caseId);
      const x = xOffset + index * (CARD_WIDTH + padding);
      const y = 0;

      let caseContainer;
      if (this.scene.historyCasePool.has(caseId)) {
        caseContainer = this.scene.historyCasePool.get(caseId);
        this.updateCaseCard(caseContainer, caseData, index);
        caseContainer.setPosition(x, y);
      } else {
        caseContainer = this.createCaseCard(caseData, x, y, index);
        this.scene.historyCasePool.set(caseId, caseContainer);
        this.scene.historyCasesContainer.add(caseContainer);
      }
    });

    for (const [caseId, container] of this.scene.historyCasePool.entries()) {
      if (!activeCaseIds.has(caseId)) {
        container.destroy();
        this.scene.historyCasePool.delete(caseId);
      }
    }
  }

  createCaseCard(caseData, x, y, index) {
    const container = this.scene.add.container(x, y);
    const bg = this.scene.add.rectangle(
      0,
      0,
      CARD_WIDTH,
      CARD_HEIGHT,
      0x333333
    );
    bg.setInteractive()
      .on("pointerover", () => {
        if (
          this.scene.currentVisibleEra === this.scene.gameState.currentEra ||
          this.isUpgradeable(caseData)
        ) {
          bg.setFillStyle(0x444444);
        }
      })
      .on("pointerout", () => {
        const isSelectedForUpgrade =
          this.scene.gameState.player.turnActions.upgrades?.some(
            (u) => u.caseId === caseData.caseId
          );
        const currentMode =
          this.scene.caseDisplayModes.get(caseData.caseId) ||
          DISPLAY_MODE.DEFAULT;
        bg.setFillStyle(
          isSelectedForUpgrade ||
            this.scene.selectedHistoryCase === caseData.caseId
            ? 0x666666
            : currentMode === DISPLAY_MODE.UPGRADE
            ? 0x555555
            : 0x333333
        );
      })
      .on("pointerdown", () =>
        this.handleCaseClick(caseData, container, index)
      );

    const nameText = this.scene.add
      .text(0, -90, caseData.isRevealed ? caseData.name : "???", {
        fontSize: "18px",
        fill: "#fff",
        align: "center",
        wordWrap: { width: CARD_WIDTH - 20 },
      })
      .setOrigin(0.5);
    nameText.name = "name";

    const typeText = this.scene.add
      .text(0, -60, caseData.type, {
        fontSize: "14px",
        fill: "#aaa",
      })
      .setOrigin(0.5);
    typeText.name = "type";

    const leadersText = this.scene.add
      .text(0, 60, "", {
        fontSize: "12px",
        fill: "#fff",
        align: "center",
        wordWrap: { width: CARD_WIDTH - 20 },
      })
      .setOrigin(0.5);
    leadersText.name = "leaders";

    container.add([bg, nameText, typeText, leadersText]);

    this.updateCaseCard(container, caseData, index);

    return container;
  }

  updateCaseCard(container, caseData, index) {
    const nameText = container.list.find(
      (e) => e.type === "Text" && e.name === "name"
    );
    const typeText = container.list.find(
      (e) => e.type === "Text" && e.name === "type"
    );
    const leadersText = container.list.find(
      (e) => e.type === "Text" && e.name === "leaders"
    );

    if (nameText) {
      nameText.setText(caseData.isRevealed ? caseData.name : "???");
      nameText.setVisible(true);
    }
    if (typeText) {
      typeText.setText(caseData.type);
      typeText.setVisible(true);
    }

    container.list
      .filter(
        (e) =>
          e.type === "Text" &&
          e !== nameText &&
          e !== typeText &&
          e !== leadersText
      )
      .forEach((e) => e.destroy());

    const displayMode =
      this.scene.caseDisplayModes.get(caseData.caseId) || DISPLAY_MODE.DEFAULT;

    if (this.scene.currentVisibleEra === this.scene.gameState.currentEra) {
      let yOffset = -30;
      if (caseData.owner) {
        const ownerText = this.scene.add
          .text(0, yOffset, `${caseData.owner.slice(-3)}`, {
            fontSize: "14px",
            fill: "#00ff00",
          })
          .setOrigin(0.5);
        container.add(ownerText);
      } else if (!caseData.isRevealed) {
        const explorationPointsText = Object.entries(
          caseData.explorationPoints || {}
        )
          .map(([uuid, points]) => `${points}[${uuid.slice(-3)}]`)
          .join(" ");
        if (explorationPointsText) {
          const explorationText = this.scene.add
            .text(0, yOffset, explorationPointsText, {
              fontSize: "14px",
              fill: "#fff",
            })
            .setOrigin(0.5);
          container.add(explorationText);
        }
      } else {
        const claimPointsText = Object.entries(caseData.claimPoints || {})
          .map(([uuid, points]) => `${points}[${uuid.slice(-3)}]`)
          .join(" ");
        if (claimPointsText) {
          const claimText = this.scene.add
            .text(0, yOffset, claimPointsText, {
              fontSize: "14px",
              fill: "#fff",
            })
            .setOrigin(0.5);
          container.add(claimText);
        }
      }
    }

    if (
      this.scene.currentVisibleEra !== this.scene.gameState.currentEra &&
      (this.isUpgradeable(caseData) || caseData.isUpgraded) &&
      caseData.isRevealed &&
      caseData.owner
    ) {
      this.addUpgradeInformation(container, caseData);
    }

    if (this.scene.currentVisibleEra === this.scene.gameState.currentEra) {
      if (displayMode === DISPLAY_MODE.LEADER) {
        this.addLeaderInformation(container, caseData);
        if (leadersText) leadersText.setVisible(true);
      } else if (
        displayMode === DISPLAY_MODE.UPGRADE &&
        this.isUpgradeable(caseData)
      ) {
        this.addUpgradeInformation(container, caseData);
        if (leadersText) leadersText.setVisible(false);
      } else {
        this.addClaimInformation(container, caseData);
        if (leadersText) leadersText.setVisible(false);
      }
    } else {
      if (leadersText) leadersText.setVisible(false);
    }
  }

  handleCaseClick(caseData, container, index) {
    // Fetch the latest caseData based on the current visible era
    const latestCaseData =
      this.scene.currentVisibleEra === this.scene.gameState.currentEra
        ? this.scene.gameState.currentCases.find(
            (c) => c.caseId === caseData.caseId
          )
        : this.scene.gameState.historyCases[this.scene.currentVisibleEra]?.find(
            (c) => c.caseId === caseData.caseId
          );

    if (!latestCaseData) {
      console.warn(`Case ${caseData.caseId} not found in game state`);
      return;
    }

    // Handle historical cases
    if (this.scene.currentVisibleEra !== this.scene.gameState.currentEra) {
      this.handleHistoryCaseClick(
        latestCaseData,
        container.list.find((e) => e.type === "Rectangle")
      );
      return;
    }

    // Handle current era cases
    const selectedLeader = this.scene.leaderManager.getSelectedLeader();
    if (
      selectedLeader.leaderId &&
      this.scene.leaderManager.addPendingPlacement(latestCaseData.caseId)
    ) {
      this.scene.caseDisplayModes.set(
        latestCaseData.caseId,
        DISPLAY_MODE.LEADER
      );
      this.updateCasesDisplay();
      this.scene.commitTurnButton.visible = true;
    } else {
      const currentMode =
        this.scene.caseDisplayModes.get(latestCaseData.caseId) ||
        DISPLAY_MODE.DEFAULT;
      let newMode;
      if (currentMode === DISPLAY_MODE.LEADER) {
        newMode = this.isUpgradeable(latestCaseData)
          ? DISPLAY_MODE.UPGRADE
          : DISPLAY_MODE.DEFAULT;
      } else if (currentMode === DISPLAY_MODE.UPGRADE) {
        newMode = DISPLAY_MODE.DEFAULT;
      } else {
        newMode = DISPLAY_MODE.LEADER;
      }
      this.scene.caseDisplayModes.set(latestCaseData.caseId, newMode);
      this.updateCaseCard(container, latestCaseData, index);
    }
  }

  handleHistoryCaseClick(caseData, bg) {
    if (!this.isUpgradeable(caseData)) return;

    this.scene.gameState.player.turnActions.upgrades =
      this.scene.gameState.player.turnActions.upgrades || [];
    const isAlreadySelected =
      this.scene.gameState.player.turnActions.upgrades.some(
        (u) => u.caseId === caseData.caseId
      );

    if (isAlreadySelected) {
      this.scene.selectedHistoryCase = null;
      bg.setFillStyle(0x555555);
      this.scene.gameState.player.turnActions.upgrades =
        this.scene.gameState.player.turnActions.upgrades.filter(
          (u) => u.caseId !== caseData.caseId
        );
    } else {
      this.scene.selectedHistoryCase = caseData.caseId;
      bg.setFillStyle(0x666666);
      if (
        !this.scene.gameState.player.turnActions.upgrades.find(
          (u) => u.caseId === caseData.caseId
        )
      ) {
        this.scene.gameState.player.turnActions.upgrades.push({
          caseId: caseData.caseId,
        });
      }
    }

    this.scene.uiManager.updateSelectedUpgradesText();
    this.scene.commitTurnButton.visible =
      this.scene.gameState.player.turnActions.upgrades.length > 0 ||
      this.scene.leaderManager.getPendingPlacements().length > 0;
  }

  addUpgradeInformation(container, caseData) {
    if (
      !caseData.isRevealed ||
      (!caseData.upgradeEffect1 && !caseData.upgradeEffect2)
    )
      return;

    const isHistoryCase =
      this.scene.currentVisibleEra !== this.scene.gameState.currentEra;
    const textColor = isHistoryCase ? "#DAA520" : "#fff";

    if (caseData.upgradeEffect1) {
      container.add(
        this.scene.add.text(
          -CARD_WIDTH / 2 + 10,
          CARD_HEIGHT / 2 - 80,
          `Effect: ${caseData.upgradeEffect1}`,
          {
            fontSize: "12px",
            wordWrap: { width: CARD_WIDTH - 20 },
            fill: textColor,
          }
        )
      );
    }

    if (caseData.upgradeCost1Amount && caseData.upgradeCost1Type) {
      let costText = `Cost: ${caseData.upgradeCost1Amount} ${caseData.upgradeCost1Type}`;
      if (caseData.upgradeCost2Amount && caseData.upgradeCost2Type)
        costText += `, ${caseData.upgradeCost2Amount} ${caseData.upgradeCost2Type}`;
      container.add(
        this.scene.add.text(
          -CARD_WIDTH / 2 + 10,
          CARD_HEIGHT / 2 - 100,
          costText,
          { fontSize: "12px", fill: textColor }
        )
      );
    }

    // Restore "Upgradeable" or "Upgraded" distinction
    const statusText = caseData.isUpgraded ? "Upgraded" : "Upgradeable";
    container.add(
      this.scene.add.text(
        -CARD_WIDTH / 2 + 10,
        CARD_HEIGHT / 2 - 120,
        statusText,
        { fontSize: "14px", fill: textColor, fontStyle: "bold" }
      )
    );
  }

  addClaimInformation(container, caseData) {
    if (
      !caseData.isRevealed ||
      this.scene.currentVisibleEra !== this.scene.gameState.currentEra
    )
      return;

    if (caseData.claimEffect1) {
      container.add(
        this.scene.add.text(
          -CARD_WIDTH / 2 + 10,
          CARD_HEIGHT / 2 - 80,
          `Effect: ${caseData.claimEffect1}`,
          {
            fontSize: "12px",
            wordWrap: { width: CARD_WIDTH - 20 },
            fill: "#fff",
          }
        )
      );
    }

    if (caseData.claimRewardAmount1 && caseData.claimReward1Type) {
      const abbr = {
        might: "M",
        education: "E",
        gold: "G",
        faith: "Fa",
        food: "Fo",
        influence: "I",
      };
      let rewardsText = `Rw: +${caseData.claimRewardAmount1} ${
        abbr[caseData.claimReward1Type.toLowerCase()] ||
        caseData.claimReward1Type
      }`;
      if (caseData.claimRewardAmount2 && caseData.claimReward2Type) {
        rewardsText += `, +${caseData.claimRewardAmount2} ${
          abbr[caseData.claimReward2Type.toLowerCase()] ||
          caseData.claimReward2Type
        }`;
      }
      container.add(
        this.scene.add.text(
          -CARD_WIDTH / 2 + 10,
          CARD_HEIGHT / 2 - 100,
          rewardsText,
          {
            fontSize: "12px",
            wordWrap: { width: CARD_WIDTH - 20 },
            fill: "#fff",
          }
        )
      );
    }

    container.add(
      this.scene.add.text(
        -CARD_WIDTH / 2 + 10,
        CARD_HEIGHT / 2 - 120,
        "Claim",
        { fontSize: "14px", fill: "#fff", fontStyle: "bold" }
      )
    );
  }

  addUpgradeSymbol(container, caseData) {
    if (
      !this.isUpgradeable(caseData) ||
      container.list.find(
        (item) =>
          item.type === "Text" &&
          item.text === "ᴜ" &&
          Math.abs(item.y - (CARD_HEIGHT / 2 - 10)) < 5
      )
    )
      return;
    container.add(
      this.scene.add
        .text(0, CARD_HEIGHT / 2 - 10, "ᴜ", {
          fontSize: "14px",
          fill: "#DAA520",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
    );
  }

  addLeaderInformation(container, caseData) {
    const leaderText = this.scene.leaderManager.getLeaderDisplayForCase(
      caseData.caseId
    );
    if (leaderText) {
      container.add(
        this.scene.add
          .text(0, 80, leaderText, {
            fontSize: "12px",
            fill: "#00ff00",
            align: "center",
            wordWrap: { width: 120 },
          })
          .setOrigin(0.5)
      );
    }
  }

  isUpgradeable(caseData) {
    return (
      !caseData.isUpgraded &&
      caseData.isRevealed &&
      caseData.owner === this.scene.playerUUID &&
      (caseData.upgradeEffect1 || caseData.upgradeEffect2)
    );
  }

  clearUpgradeInfoDisplay() {
    const modifiedCaseIds = [];
    for (const [caseId, mode] of this.scene.caseDisplayModes.entries()) {
      if (mode !== DISPLAY_MODE.DEFAULT) {
        this.scene.caseDisplayModes.set(caseId, DISPLAY_MODE.DEFAULT);
        modifiedCaseIds.push(caseId);
      }
    }

    if (this.scene.currentVisibleEra === this.scene.gameState.currentEra) {
      for (const caseId of modifiedCaseIds) {
        const caseData = this.scene.gameState.currentCases.find(
          (c) => c.caseId === caseId
        );
        if (caseData) {
          const container = this.scene.currentCasePool.get(caseId);
          if (container)
            this.updateCaseCard(
              container,
              caseData,
              this.scene.gameState.currentCases.findIndex(
                (c) => c.caseId === caseId
              )
            );
        }
      }
    } else {
      const historyCases =
        this.scene.gameState.historyCases[this.scene.currentVisibleEra] || [];
      for (const caseId of modifiedCaseIds) {
        const caseData = historyCases.find((c) => c.caseId === caseId);
        if (caseData) {
          const container = this.scene.historyCasePool.get(caseId);
          if (container)
            this.updateCaseCard(
              container,
              caseData,
              historyCases.findIndex((c) => c.caseId === caseId)
            );
        }
      }
    }
  }
}
