import Phaser from 'phaser';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.gameState = null;
    this.gameId = null;
    this.playerId = null;
    console.log('GameScene: Initialized');
  }

  init(data) {
    this.gameId = data.gameId || localStorage.getItem('gameId');
    this.playerId = data.playerId || localStorage.getItem('playerId');
    console.log(`GameScene: Starting with gameId: ${this.gameId}, playerId: ${this.playerId}`);

    if (!this.gameId || !this.playerId) {
      console.warn('GameScene: Missing gameId or playerId, returning to menu');
      this.scene.start('MenuScene');
      return;
    }
  }

  preload() {
    console.log('GameScene: Preloading assets');
    // Load game assets
    // this.load.image('leader', 'assets/leader.png');
  }

  create() {
    console.log('GameScene: Creating game UI elements');
    this.createUI();
    
    console.log('GameScene: Starting game state polling');
    this.pollGameState();
  }

  createUI() {
    console.log('GameScene: Setting up UI components');
    // Game status text
    this.statusText = this.add.text(10, 10, 'Loading game state...', {
      fontSize: '24px',
      fill: '#fff'
    });

    // Player info
    this.playerInfo = this.add.text(10, 50, '', {
      fontSize: '20px',
      fill: '#fff'
    });

    // Current Era and Round
    this.eraInfo = this.add.text(10, 90, '', {
      fontSize: '20px',
      fill: '#fff'
    });

    // Create a container for cases
    this.casesContainer = this.add.container(400, 300);
  }

  async pollGameState() {
    console.log(`GameScene: Polling game state from ${BACKEND_URL}`);
    try {
      console.log(`GameScene: Fetching state for game ${this.gameId}`);
      const response = await fetch(`${BACKEND_URL}/api/games/${this.gameId}/state`, {
        headers: {
          'X-Player-Id': this.playerId
        }
      });

      if (!response.ok) {
        console.error(`GameScene: Server returned error status ${response.status}`);
        throw new Error('Failed to fetch game state');
      }

      const gameState = await response.json();
      console.log('GameScene: Received game state:', gameState);
      this.updateGameState(gameState);

      console.log('GameScene: Scheduling next poll in 2 seconds');
      this.time.delayedCall(2000, () => this.pollGameState());
    } catch (error) {
      console.error('GameScene: Error polling game state:', error);
      this.statusText.setText('Error: Failed to fetch game state');
      
      console.log('GameScene: Retrying poll in 5 seconds due to error');
      this.time.delayedCall(5000, () => this.pollGameState());
    }
  }

  updateGameState(gameState) {
    this.gameState = gameState;
    console.log(`GameScene: Updating game state - Era: ${gameState.currentEra}, Round: ${gameState.currentRound}`);

    // Update status text
    this.statusText.setText(`Game Status: ${gameState.status}`);

    // Update player info
    const player = gameState.player;
    console.log(`GameScene: Updating player info - Name: ${player.name}, Era Points: ${player.eraPoints}`);
    this.playerInfo.setText(
      `Player: ${player.name}\nEra Points: ${player.eraPoints}`
    );

    // Update era info
    this.eraInfo.setText(
      `Era: ${gameState.currentEra}\nRound: ${gameState.currentRound}`
    );

    console.log('GameScene: Updating cases display');
    this.updateCasesDisplay();
  }

  updateCasesDisplay() {
    console.log(`GameScene: Refreshing cases display with ${this.gameState.currentCases.length} cases`);
    // Clear existing cases
    this.casesContainer.removeAll(true);

    // Calculate grid layout
    const gridCols = 4;
    const gridRows = 3;
    const cardWidth = 150;
    const cardHeight = 200;
    const padding = 20;

    // Create cards for each case
    this.gameState.currentCases.forEach((caseData, index) => {
      const row = Math.floor(index / gridCols);
      const col = index % gridCols;

      const x = (col - gridCols/2) * (cardWidth + padding);
      const y = (row - gridRows/2) * (cardHeight + padding);

      // Create case card
      const card = this.createCaseCard(caseData, x, y);
      this.casesContainer.add(card);
    });
  }

  createCaseCard(caseData, x, y) {
    console.log(`GameScene: Creating case card for ${caseData.name} at position (${x}, ${y})`);
    const container = this.add.container(x, y);

    // Card background
    const bg = this.add.rectangle(0, 0, 150, 200, 0x333333);
    bg.setInteractive();
    bg.on('pointerover', () => bg.setFillStyle(0x444444));
    bg.on('pointerout', () => bg.setFillStyle(0x333333));

    // Case name
    const nameText = this.add.text(0, -80, caseData.name, {
      fontSize: '16px',
      fill: '#fff'
    }).setOrigin(0.5);

    // Case type
    const typeText = this.add.text(0, -60, caseData.type, {
      fontSize: '14px',
      fill: '#aaa'
    }).setOrigin(0.5);

    // Add exploration/claim info if revealed
    let yOffset = -30;
    if (caseData.isRevealed) {
      const explorationText = this.add.text(0, yOffset,
        `Exploration: ${caseData.explorationPoints}/${caseData.explorationThreshold}`,
        { fontSize: '12px', fill: '#fff' }
      ).setOrigin(0.5);
      
      yOffset += 20;
      
      const claimText = this.add.text(0, yOffset,
        `Claim: ${caseData.claimPoints.get(this.playerId) || 0}/${caseData.claimThreshold}`,
        { fontSize: '12px', fill: '#fff' }
      ).setOrigin(0.5);

      container.add([explorationText, claimText]);
    }

    container.add([bg, nameText, typeText]);
    return container;
  }

  update() {
    // Game logic updates
  }
}
