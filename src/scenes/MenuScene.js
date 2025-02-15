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
    this.playerId = null;
    this.gamesList = [];
    this.gamesListContainer = null;
  }

  create() {
    console.log('MenuScene: Creating UI elements');
    // Add title
    this.add.text(400, 100, 'PocketCiv', {
      fontSize: '48px',
      fill: '#fff'
    }).setOrigin(0.5);

    // Create Game button
    const createButton = this.add.text(400, 180, 'Create New Game', {
      fontSize: '32px',
      fill: '#fff',
      backgroundColor: '#444',
      padding: { x: 20, y: 10 }
    })
    .setOrigin(0.5)
    .setInteractive();

    // Available Games title
    this.add.text(400, 250, 'Available Games', {
      fontSize: '28px',
      fill: '#fff'
    }).setOrigin(0.5);

    // Create container for games list
    this.gamesListContainer = this.add.container(400, 350);

    // Refresh button
    const refreshButton = this.add.text(600, 250, 'Refresh', {
      fontSize: '20px',
      fill: '#fff',
      backgroundColor: '#444',
      padding: { x: 10, y: 5 }
    })
    .setOrigin(0.5)
    .setInteractive();

    // Input field for player name
    this.playerNameText = this.add.text(400, 550, 'Enter your name:', {
      fontSize: '24px',
      fill: '#fff'
    }).setOrigin(0.5);

    // Create an HTML input element for the player name
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.style = 'width: 200px; padding: 10px; font-size: 16px;';
    nameInput.placeholder = 'Your Name';

    // Add the input element to the game
    this.nameInput = this.add.dom(400, 600, nameInput);

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
      // Show "No games available" message
      const noGamesText = this.add.text(0, 0, 'No games available', {
        fontSize: '20px',
        fill: '#888'
      }).setOrigin(0.5);
      
      this.gamesListContainer.add(noGamesText);
      return;
    }

    // Get current player's ID from localStorage
    const currentPlayerId = localStorage.getItem('playerId');

    // Create game entries
    games.forEach((game, index) => {
      const yOffset = index * 60;
      
      // Game info text
      const gameText = this.add.text(-200, yOffset,
        `Game ${game.id}\nPlayers: ${game.players.length}\nStatus: ${game.status}`,
        {
          fontSize: '18px',
          fill: '#fff',
          align: 'left'
        }
      );

      const gameElements = [gameText];

      // Check if current player is already in the game
      const isPlayerInGame = game.players.some(player => player.id === currentPlayerId);

      // Only show join button if player is not already in the game
      if (!isPlayerInGame) {
        const joinButton = this.add.text(100, yOffset, 'Join', {
          fontSize: '20px',
          fill: '#fff',
          backgroundColor: '#444',
          padding: { x: 10, y: 5 }
        })
        .setInteractive()
        .on('pointerdown', () => this.handleJoinGame(game.id))
        .on('pointerover', () => joinButton.setStyle({ fill: '#ff0' }))
        .on('pointerout', () => joinButton.setStyle({ fill: '#fff' }));

        gameElements.push(joinButton);
      }

      // Delete button
      const deleteButton = this.add.text(200, yOffset, 'Delete', {
        fontSize: '20px',
        fill: '#ff0000',
        backgroundColor: '#444',
        padding: { x: 10, y: 5 }
      })
      .setInteractive()
      .on('pointerdown', () => this.handleDeleteGame(game.id))
      .on('pointerover', () => deleteButton.setStyle({ fill: '#ff8888' }))
      .on('pointerout', () => deleteButton.setStyle({ fill: '#ff0000' }));

      gameElements.push(deleteButton);
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
        body: JSON.stringify({ playerName })
      });

      const data = await response.json();
      if (response.ok) {
        console.log(`MenuScene: Game created successfully - GameId: ${data.gameId}, PlayerId: ${data.playerId}`);
        this.gameId = data.gameId;
        this.playerId = data.playerId;
        
        console.log('MenuScene: Storing game and player IDs in localStorage');
        localStorage.setItem('gameId', this.gameId);
        localStorage.setItem('playerId', this.playerId);
        
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
    const playerName = this.nameInput.node.value;
    if (!playerName) {
      console.warn('MenuScene: Join game attempted without player name');
      this.showError('Please enter your name');
      return;
    }

    console.log(`MenuScene: Attempting to join game ${gameId} as ${playerName}`);
    try {
      console.log(`MenuScene: Sending join game request to ${BACKEND_URL}`);
      const response = await fetch(`${BACKEND_URL}/api/games/${gameId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ playerName })
      });

      const data = await response.json();
      if (response.ok) {
        console.log(`MenuScene: Successfully joined game - GameId: ${data.gameId}, PlayerId: ${data.playerId}`);
        this.gameId = data.gameId;
        this.playerId = data.playerId;
        
        console.log('MenuScene: Storing game and player IDs in localStorage');
        localStorage.setItem('gameId', this.gameId);
        localStorage.setItem('playerId', this.playerId);
        
        this.startGame();
      } else {
        console.error('MenuScene: Server returned error on game join:', data.error);
        this.showError(data.error);
      }
    } catch (error) {
      console.error('MenuScene: Failed to join game:', error);
      this.showError('Failed to join game');
    }
  }

  async handleDeleteGame(gameId) {
    console.log(`MenuScene: Attempting to delete game ${gameId}`);
    try {
      const playerId = localStorage.getItem('playerId');
      if (!playerId) {
        this.showError('You must be a player to delete a game');
        return;
      }

      console.log(`MenuScene: Sending delete game request to ${BACKEND_URL}`);
      const response = await fetch(`${BACKEND_URL}/api/games/${gameId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-player-id': playerId
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

  showError(message) {
    console.warn('MenuScene: Showing error:', message);
    if (this.messageText) this.messageText.destroy();
    
    this.messageText = this.add.text(400, 650, message, {
      fontSize: '20px',
      fill: '#ff0000'
    }).setOrigin(0.5);

    this.time.delayedCall(3000, () => {
      if (this.messageText) this.messageText.destroy();
    });
  }

  showSuccess(message) {
    console.log('MenuScene: Showing success:', message);
    if (this.messageText) this.messageText.destroy();
    
    this.messageText = this.add.text(400, 650, message, {
      fontSize: '20px',
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
      playerId: this.playerId
    });
  }
} 