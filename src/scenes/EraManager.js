export default class EraManager {
  constructor(scene) {
    this.scene = scene;
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
    // Only clear display modes if the era is changing
    if (this.scene.currentVisibleEra !== era) {
      this.scene.caseDisplayModes.clear();
      // Additional era-switching logic can be added here if needed
    }

    // Existing logic to manage visibility and containers
    this.scene.historyCasesContainer.setVisible(false);
    this.scene.casesContainer.setVisible(false);

    if (era === this.scene.gameState.currentEra) {
      this.scene.historyCasesContainer.removeAll(true);
      this.scene.historyCasePool.clear();
      this.scene.casesContainer.setVisible(true);
      this.scene.dragTarget = this.scene.casesContainer;
      this.scene.eraLabel.setText(`Current Era (${era})`);
    } else {
      this.scene.casesContainer.removeAll(true);
      this.scene.currentCasePool.clear();
      this.scene.historyCasesContainer.setVisible(true);
      this.scene.dragTarget = this.scene.historyCasesContainer;
      this.scene.eraLabel.setText(`Era ${era}`);
    }

    // Update the current visible era
    this.scene.currentVisibleEra = era;

    // Refresh the display
    this.scene.caseManager.updateCasesDisplay();
    this.scene.caseManager.updateHistoryCasesDisplay();
    this.scene.uiManager.updateSelectedUpgradesText();
  }
}
