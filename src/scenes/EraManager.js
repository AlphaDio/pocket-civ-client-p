import { CARD_HEIGHT } from "./utils/constants";

export default class EraManager {
  constructor(scene) {
    this.scene = scene;
    this.prevEraButton = null;
    this.nextEraButton = null;
    this.eraNames = {
      1: "Ancient",
      2: "Classical",
      3: "Medieval",
      4: "Renaissance",
      5: "Modern",
      6: "Nuclear",
      7: "Information",
      8: "Space"
    };
  }

  createEraButtons() {
    const screenWidth = this.scene.scale.width;
    const screenHeight = this.scene.scale.height;
    const casesY = Math.floor(screenHeight * 0.4); // Match GameScene's casesY
    const buttonWidth = 48; // Smaller width
    const buttonHeight = 48; // Smaller height, still tappable
    const buttonPadding = { x: 8, y: 8 }; // Reduced padding

    // Position buttons on the right side, stacked vertically near cases
    const buttonX = screenWidth - buttonWidth - 20; // 20px from right edge
    const prevButtonY = casesY - buttonHeight - 10; // Above cases, closer
    const nextButtonY = prevButtonY + buttonHeight + 5; // Below prev, tight spacing

    // Previous Era Button (Up Arrow)
    this.prevEraButton = this.scene.add
      .text(buttonX, prevButtonY, "⬆️", {
        fontSize: "18px",
        fill: "#fff",
        backgroundColor: "#444",
        padding: buttonPadding,
      })
      .setInteractive()
      .on("pointerdown", () => this.navigateEra("prev"))
      .setVisible(false)
      .setOrigin(0, 0);

    // Next Era Button (Era: Down Arrow)
    this.nextEraButton = this.scene.add
      .text(buttonX - 50, nextButtonY, "Era: ⬇️", {
        fontSize: "18px",
        fill: "#fff",
        backgroundColor: "#444",
        padding: buttonPadding,
      })
      .setInteractive()
      .on("pointerdown", () => this.navigateEra("next"))
      .setVisible(false)
      .setOrigin(0, 0);
  }

  navigateEra(direction) {
    if (!this.scene.gameState) return;

    const allEras = [
      ...Object.keys(this.scene.gameState.historyCases || {}).map(Number),
      this.scene.gameState.currentEra,
    ].sort((a, b) => a - b);
    const currentIndex = allEras.indexOf(this.scene.currentVisibleEra);
    let newIndex;

    if (direction === "prev" && currentIndex > 0) newIndex = currentIndex - 1;
    else if (direction === "next" && currentIndex < allEras.length - 1)
      newIndex = currentIndex + 1;
    else return;

    this.showEra(allEras[newIndex]);
  }

  showEra(era) {
    if (this.scene.currentVisibleEra !== era) {
      this.scene.caseDisplayModes.clear();
    }

    this.scene.historyCasesContainer.setVisible(false);
    this.scene.casesContainer.setVisible(false);

    if (era === this.scene.gameState.currentEra) {
      this.scene.historyCasesContainer.removeAll(true);
      this.scene.historyCasePool.clear();
      this.scene.casesContainer.setVisible(true);
      this.scene.dragTarget = this.scene.casesContainer;
      this.scene.eraLabel.setText(`${this.eraNames[era]} Era (${era}) (current)`);
    } else {
      this.scene.casesContainer.removeAll(true);
      this.scene.currentCasePool.clear();
      this.scene.historyCasesContainer.setVisible(true);
      this.scene.dragTarget = this.scene.historyCasesContainer;
      this.scene.eraLabel.setText(`${this.eraNames[era]} Era (${era})`);
    }

    this.scene.currentVisibleEra = era;

    const allEras = [
      ...Object.keys(this.scene.gameState.historyCases || {}).map(Number),
      this.scene.gameState.currentEra,
    ].sort((a, b) => a - b);
    const currentIndex = allEras.indexOf(era);
    this.prevEraButton.setVisible(currentIndex > 0);
    this.nextEraButton.setVisible(currentIndex < allEras.length - 1);

    this.scene.caseManager.updateCasesDisplay();
    this.scene.caseManager.updateHistoryCasesDisplay();
    this.scene.uiManager.updateSelectedUpgradesText();
  }
}
