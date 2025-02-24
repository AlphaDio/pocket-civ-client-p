import Phaser from 'phaser';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
    console.log('MenuScene: Initialized');
  }

  init() {
    console.log('MenuScene: Initializing scene');
    this.gameId = null;
    this.playerUUID = null;
    this.gamesList = [];
    this.gamesListContainer = null;
  }

  create() {
    console.log('MenuScene: Creating UI elements');
    
    // Get screen dimensions
    const screenWidth = this.scale.width;
    const screenCenter = screenWidth / 2;
    
    // Add title - moved higher up
    this.add.text(screenCenter, 50, 'PocketCiv', {
      fontSize: '32px',
      fill: '#fff'
    }).setOrigin(0.5);

    // Create Game button - adjusted position and size
    const createButton = this.add.text(screenCenter, 100, 'Create New Game', {
      fontSize: '24px',
      fill: '#fff',
      backgroundColor: '#444',
      padding: { x: 15, y: 8 }
    })
    .setOrigin(0.5)
    .setInteractive();

    // Available Games title - adjusted position
    const gamesTitle = this.add.text(screenCenter - 50, 160, 'Available Games', {
      fontSize: '24px',
      fill: '#fff'
    }).setOrigin(0.5);

    // Refresh button - repositioned next to title
    const refreshButton = this.add.text(screenCenter + 80, 160, 'Refresh', {
      fontSize: '18px',
      fill: '#fff',
      backgroundColor: '#444',
      padding: { x: 8, y: 4 }
    })
    .setOrigin(0.5)
    .setInteractive();

    // Create container for games list - adjusted position
    this.gamesListContainer = this.add.container(screenCenter, 200);

    // Input field for player name - moved to bottom
    this.playerNameText = this.add.text(screenCenter, this.scale.height - 100, 'Enter your name:', {
      fontSize: '20px',
      fill: '#fff'
    }).setOrigin(0.5);

    // Create an HTML input element for the player name - adjusted position and size
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.style = 'width: 160px; padding: 8px; font-size: 14px;';
    nameInput.placeholder = 'Your Name';

    // Add the input element to the game
    this.nameInput = this.add.dom(screenCenter, this.scale.height - 60, nameInput);

    // Button event handlers
    createButton.on('pointerdown', () => this.handleCreateGame());
    createButton.on('pointerover', () => createButton.setStyle({ fill: '#ff0' }));
    createButton.on('pointerout', () => createButton.setStyle({ fill: '#fff' }));

    refreshButton.on('pointerdown', () => this.fetchGames());
    refreshButton.on('pointerover', () => refreshButton.setStyle({ fill: '#ff0' }));
    refreshButton.on('pointerout', () => refreshButton.setStyle({ fill: '#fff' }));

    // Initial fetch of games
    this.fetchGames();
  }

  async fetchGames() {
    console.log('MenuScene: Fetching available games');
    try {
      const response = await fetch(`${BACKEND_URL}/api/games`);
      if (!response.ok) {
        throw new Error('Failed to fetch games');
      }

      const games = await response.json();
      console.log('MenuScene: Received games list:', games);
      this.updateGamesList(games);
    } catch (error) {
      console.error('MenuScene: Error fetching games:', error);
      this.showError('Failed to fetch games list');
    }
  }

  updateGamesList(games) {
    console.log('MenuScene: Updating games list display');
    this.gamesList = games;
    
    // Clear existing list
    this.gamesListContainer.removeAll(true);

    if (games.length === 0) {
      const noGamesText = this.add.text(0, 0, 'No games available', {
        fontSize: '18px',
        fill: '#888'
      }).setOrigin(0.5);
      
      this.gamesListContainer.add(noGamesText);
      return;
    }

    const currentPlayerUUID = localStorage.getItem('playerUUID') || this.playerUUID;

    // Create game entries with adjusted spacing and layout
    games.forEach((game, index) => {
      const yOffset = index * 80; // Increased vertical spacing
      
      // Game info text - adjusted position and size
      const gameText = this.add.text(-100, yOffset,
        `Game ${game.id}\nPlayers: ${game.players.length}\nStatus: ${game.status}`,
        {
          fontSize: '16px',
          fill: '#fff',
          align: 'left'
        }
      );

      const gameElements = [gameText];

      // Join/Continue button - adjusted position and size
      const buttonText = game.players.some(p => p.id === currentPlayerUUID) ? 'Continue' : 'Join';
      const joinButton = this.add.text(50, yOffset, buttonText, {
        fontSize: '16px',
        fill: '#00ff00',
        backgroundColor: '#444',
        padding: { x: 8, y: 4 }
      })
      .setInteractive()
      .on('pointerdown', () => this.handleJoinGame(game.id))
      .on('pointerover', () => joinButton.setStyle({ fill: '#88ff88' }))
      .on('pointerout', () => joinButton.setStyle({ fill: '#00ff00' }));

      gameElements.push(joinButton);

      // Delete/Close button - adjusted position and size
      if (game.status.toLowerCase() === 'in_progress' || game.status.toLowerCase() === 'in progress') {
        const closeButton = this.add.text(120, yOffset, 'Close', {
          fontSize: '16px',
          fill: '#ff0000',
          backgroundColor: '#444',
          padding: { x: 8, y: 4 }
        })
        .setInteractive()
        .on('pointerdown', () => this.handleCloseGame(game.id))
        .on('pointerover', () => closeButton.setStyle({ fill: '#ff8888' }))
        .on('pointerout', () => closeButton.setStyle({ fill: '#ff0000' }));

        gameElements.push(closeButton);
      } else if (game.status.toLowerCase() === 'waiting') {
        const deleteButton = this.add.text(120, yOffset, 'Delete', {
          fontSize: '16px',
          fill: '#ff0000',
          backgroundColor: '#444',
          padding: { x: 8, y: 4 }
        })
        .setInteractive()
        .on('pointerdown', () => this.handleDeleteGame(game.id))
        .on('pointerover', () => deleteButton.setStyle({ fill: '#ff8888' }))
        .on('pointerout', () => deleteButton.setStyle({ fill: '#ff0000' }));

        gameElements.push(deleteButton);
      }

      this.gamesListContainer.add(gameElements);
    });
  }

  async handleCreateGame() {
    const playerName = this.nameInput.node.value;
    if (!playerName) {
      console.warn('MenuScene: Create game attempted without player name');
      this.showError('Please enter your name');
      return;
    }

    console.log(`MenuScene: Attempting to create game for player: ${playerName}`);
    try {
      console.log(`MenuScene: Sending create game request to ${BACKEND_URL}`);
      const response = await fetch(`${BACKEND_URL}/api/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          playerName,
          playerUUID: localStorage.getItem('playerUUID') || this.playerUUID
        })
      });

      const data = await response.json();
      if (response.ok) {
        console.log(`MenuScene: Game created successfully - GameId: ${data.gameId}`);
        this.gameId = data.gameId;
        
        // Store playerUUID in both memory and localStorage
        if (data.playerUUID) {
          console.log('MenuScene: Received new playerUUID:', data.playerUUID);
          this.playerUUID = data.playerUUID;
          localStorage.setItem('playerUUID', data.playerUUID);
        }
        
        // Store gameId in localStorage
        localStorage.setItem('gameId', data.gameId);
        
        // Refresh games list and show success message
        this.fetchGames();
        this.showSuccess('Game created successfully!');
      } else {
        console.error('MenuScene: Server returned error on game creation:', data.error);
        this.showError(data.error);
      }
    } catch (error) {
      console.error('MenuScene: Failed to create game:', error);
      this.showError('Failed to create game');
    }
  }

  async handleJoinGame(gameId) {
    console.log(`MenuScene: Attempting to join game ${gameId}`);
    const playerName = this.nameInput.node.value;
    if (!playerName) {
      console.warn('MenuScene: Join game attempted without player name');
      this.showError('Please enter your name');
      return;
    }

    try {
      console.log(`MenuScene: Sending join game request to ${BACKEND_URL}`);
      const response = await fetch(`${BACKEND_URL}/api/games/${gameId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          playerName,
          playerUUID: localStorage.getItem('playerUUID') || this.playerUUID
        })
      });

      const data = await response.json();
      if (response.ok) {
        console.log('MenuScene: Joined game successfully');
        this.gameId = gameId;
        
        // Store playerUUID both in memory and localStorage
        if (data.playerUUID) {
          console.log('MenuScene: Received playerUUID:', data.playerUUID);
          this.playerUUID = data.playerUUID;
          localStorage.setItem('playerUUID', data.playerUUID);
        }
        
        // Store gameId in localStorage
        localStorage.setItem('gameId', gameId);
        
        this.startGame();
      } else {
        console.error('MenuScene: Server returned error on game join:', data.error);
        this.showError(data.error || 'Failed to join game');
      }
    } catch (error) {
      console.error('MenuScene: Failed to join game:', error);
      this.showError('Failed to join game');
    }
  }

  async handleDeleteGame(gameId) {
    console.log(`MenuScene: Attempting to delete game ${gameId}`);
    try {
      console.log(`MenuScene: Sending delete game request to ${BACKEND_URL}`);
      const response = await fetch(`${BACKEND_URL}/api/games/${gameId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log('MenuScene: Game deleted successfully');
        this.showSuccess('Game deleted successfully');
        this.fetchGames(); // Refresh the games list
      } else {
        const data = await response.json();
        console.error('MenuScene: Server returned error on game deletion:', data.error);
        this.showError(data.error || 'Failed to delete game');
      }
    } catch (error) {
      console.error('MenuScene: Failed to delete game:', error);
      this.showError('Failed to delete game');
    }
  }

  async handleCloseGame(gameId) {
    console.log(`MenuScene: Attempting to close game ${gameId}`);
    try {
      console.log(`MenuScene: Sending close game request to ${BACKEND_URL}`);
      const response = await fetch(`${BACKEND_URL}/api/games/${gameId}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log('MenuScene: Game closed successfully');
        this.showSuccess('Game closed successfully');
        this.fetchGames(); // Refresh the games list
      } else {
        const data = await response.json();
        console.error('MenuScene: Server returned error on game closure:', data.error);
        this.showError(data.error || 'Failed to close game');
      }
    } catch (error) {
      console.error('MenuScene: Failed to close game:', error);
      this.showError('Failed to close game');
    }
  }

  showError(message) {
    console.warn('MenuScene: Showing error:', message);
    if (this.messageText) this.messageText.destroy();
    
    this.messageText = this.add.text(this.scale.width / 2, this.scale.height - 20, message, {
      fontSize: '16px',
      fill: '#ff0000'
    }).setOrigin(0.5);

    this.time.delayedCall(3000, () => {
      if (this.messageText) this.messageText.destroy();
    });
  }

  showSuccess(message) {
    console.log('MenuScene: Showing success:', message);
    if (this.messageText) this.messageText.destroy();
    
    this.messageText = this.add.text(this.scale.width / 2, this.scale.height - 20, message, {
      fontSize: '16px',
      fill: '#00ff00'
    }).setOrigin(0.5);

    this.time.delayedCall(3000, () => {
      if (this.messageText) this.messageText.destroy();
    });
  }

  startGame() {
    console.log('MenuScene: Starting game scene');
    this.scene.start('GameScene', {
      gameId: this.gameId,
      playerUUID: this.playerUUID
    });
  }
} 