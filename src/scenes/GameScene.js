import Phaser from 'phaser';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.gameState = null;
    this.gameId = null;
    this.playerUUID = null;
    console.log('GameScene: Initialized');
  }

  init(data) {
    this.gameId = data.gameId || localStorage.getItem('gameId');
    this.playerUUID = data.playerUUID || localStorage.getItem('playerUUID');
    console.log(`GameScene: Starting with gameId: ${this.gameId}, playerUUID: ${this.playerUUID}`);

    if (!this.gameId || !this.playerUUID) {
      console.warn('GameScene: Missing gameId or playerUUID, returning to menu');
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

    // Start Game button (initially hidden)
    this.startGameButton = this.add.text(400, 150, 'Start Game', {
      fontSize: '24px',
      fill: '#00ff00',
      backgroundColor: '#444',
      padding: { x: 20, y: 10 }
    })
    .setOrigin(0.5)
    .setInteractive()
    .on('pointerdown', () => this.handleStartGame())
    .on('pointerover', () => this.startGameButton.setStyle({ fill: '#88ff88' }))
    .on('pointerout', () => this.startGameButton.setStyle({ fill: '#00ff00' }));
    this.startGameButton.visible = false;

    // Create a container for cases
    this.casesContainer = this.add.container(400, 300);
    
    // Add scrolling functionality
    this.input.on('pointerdown', this.startDrag, this);
    this.input.on('pointermove', this.doDrag, this);
    this.input.on('pointerup', this.stopDrag, this);
    this.input.on('pointerout', this.stopDrag, this);

    // Add scroll state
    this.isDragging = false;
    this.lastPointerX = 0;
  }

  startDrag(pointer) {
    this.isDragging = true;
    this.lastPointerX = pointer.x;
  }

  doDrag(pointer) {
    if (!this.isDragging) return;

    const deltaX = pointer.x - this.lastPointerX;
    this.lastPointerX = pointer.x;

    // Calculate new container position
    const newX = this.casesContainer.x + deltaX;
    
    // Get the total width of all cards
    const totalCardsWidth = this.gameState ? 
      (this.gameState.currentCases.length * (150 + 20)) : 0;
    
    // Set bounds for scrolling
    const minX = this.sys.game.config.width - totalCardsWidth;
    const maxX = this.sys.game.config.width - 200; // Leave some space on the right

    // Apply bounded position
    this.casesContainer.x = Math.max(minX, Math.min(maxX, newX));
  }

  stopDrag() {
    this.isDragging = false;
  }

  async pollGameState() {
    console.log(`GameScene: Polling game state from ${BACKEND_URL}`);
    try {
      console.log(`GameScene: Fetching state for game ${this.gameId}`);
      const response = await fetch(`${BACKEND_URL}/api/games/${this.gameId}/state`, {
        headers: {
          'X-Player-UUID': this.playerUUID
        }
      });

      if (!response.ok) {
        console.error(`GameScene: Server returned error status ${response.status}`);
        throw new Error('Failed to fetch game state');
      }

      const gameState = await response.json();
      console.log('GameScene: Received game state:', gameState);
      this.updateGameState(gameState);

      console.log('GameScene: Scheduling next poll in 5 seconds');
      this.time.delayedCall(5000, () => this.pollGameState());
    } catch (error) {
      console.error('GameScene: Error polling game state:', error);
      this.statusText.setText('Error: Failed to fetch game state');
      
      console.log('GameScene: Retrying poll in 10 seconds due to error');
      this.time.delayedCall(10000, () => this.pollGameState());
    }
  }

  async handleStartGame() {
    console.log('GameScene: Attempting to start game');
    try {
      const response = await fetch(`${BACKEND_URL}/api/games/${this.gameId}/start`, {
        method: 'POST',
        headers: {
          'X-Player-UUID': this.playerUUID
        }
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('GameScene: Failed to start game:', data.error);
        // You might want to show an error message to the user here
        return;
      }

      console.log('GameScene: Game started successfully');
      // The next poll will update the game state
    } catch (error) {
      console.error('GameScene: Error starting game:', error);
    }
  }

  updateGameState(gameState) {
    this.gameState = gameState;
    console.log(`GameScene: Updating game state - Era: ${gameState.currentEra}, Round: ${gameState.currentRound}`);

    // Update status text
    this.statusText.setText(`Game Status: ${gameState.status}`);

    // Show/hide start game button based on game status and player being creator
    this.startGameButton.visible = (
      gameState.status === 'setup' && 
      gameState.player.uuid === gameState.creator
    );

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

    // Only show cases if game is in progress
    if (gameState.status === 'in_progress') {
      console.log('GameScene: Updating cases display');
      this.updateCasesDisplay();
    } else {
      // Clear cases display if not in progress
      this.casesContainer.removeAll(true);
    }
  }

  updateCasesDisplay() {
    console.log(`GameScene: Refreshing cases display with ${this.gameState.currentCases.length} cases`);
    // Clear existing cases
    this.casesContainer.removeAll(true);

    // Reset container position when updating display
    this.casesContainer.x = 400;

    // Single row layout
    const cardWidth = 150;
    const padding = 20;

    // Create cards for each case
    this.gameState.currentCases.forEach((caseData, index) => {
      // Layout cards from left to right
      const x = index * (cardWidth + padding);
      const y = 0;

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
        `Claim: ${caseData.claimPoints.get(this.playerUUID) || 0}/${caseData.claimThreshold}`,
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
