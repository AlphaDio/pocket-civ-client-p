import Phaser from 'phaser';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.gameState = null;
    this.gameId = null;
    this.playerUUID = null;
    this.casePool = new Map(); // Pool to store case containers
    this.leaderPool = new Map(); // Pool to store leader display objects
    this.playerPool = new Map(); // Pool to store other player display objects
    this.selectedLeader = null; // Track currently selected leader
    this.selectedLeaderUnique = false; // Track if unique ability is selected
    this.pendingPlacements = []; // Track local leader placements before commit
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

    // Current player info and resources (horizontal layout)
    this.playerInfo = this.add.text(10, 50, '', {
      fontSize: '14px',
      fill: '#fff'
    });

    // Container for other players (will flow horizontally)
    this.otherPlayersContainer = this.add.container(400, 10);
    
    // Create a background for other players section
    const otherPlayersBg = this.add.rectangle(0, 0, 0, 0, 0x222222, 0.5);
    this.otherPlayersContainer.add(otherPlayersBg);
    this.otherPlayersBg = otherPlayersBg;

    // Current Era and Round
    this.eraInfo = this.add.text(10, 90, '', {
      fontSize: '20px',
      fill: '#fff'
    });

    // Commit Turn button - move to bottom right
    this.commitTurnButton = this.add.text(
        this.sys.game.config.width - 20,
        this.sys.game.config.height - 60,
        'Commit Turn',
        {
            fontSize: '24px',
            fill: '#00ff00',
            backgroundColor: '#444',
            padding: { x: 20, y: 10 }
        }
    )
    .setOrigin(1, 0.5)  // Align to right side
    .setInteractive()
    .on('pointerdown', () => this.handleCommitTurn())
    .on('pointerover', () => this.commitTurnButton.setStyle({ fill: '#88ff88' }))
    .on('pointerout', () => this.commitTurnButton.setStyle({ fill: '#00ff00' }));
    this.commitTurnButton.visible = false;

    // Force Process Turn button - move to bottom right, above Commit Turn
    this.forceProcessButton = this.add.text(
        this.sys.game.config.width - 20,
        this.sys.game.config.height - 110,  // Position above Commit Turn
        'Force Process Turn',
        {
            fontSize: '24px',
            fill: '#ff0000',
            backgroundColor: '#444',
            padding: { x: 20, y: 10 }
        }
    )
    .setOrigin(1, 0.5)  // Align to right side
    .setInteractive()
    .on('pointerdown', () => this.handleForceProcessTurn())
    .on('pointerover', () => this.forceProcessButton.setStyle({ fill: '#ff8888' }))
    .on('pointerout', () => this.forceProcessButton.setStyle({ fill: '#ff0000' }));
    this.forceProcessButton.visible = false;

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

    // Create leaders container at bottom left
    this.leadersContainer = this.add.container(10, this.sys.game.config.height - 140);
    const leadersBg = this.add.rectangle(0, 0, 300, 100, 0x222222, 0.5);
    this.leadersContainer.add(leadersBg);
    this.leadersBg = leadersBg;
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

  async handleForceProcessTurn() {
    console.log('GameScene: Attempting to force process turn');
    try {
      const response = await fetch(`${BACKEND_URL}/api/games/${this.gameId}/force-process-turn`, {
        method: 'POST',
        headers: {
          'X-Player-UUID': this.playerUUID
        }
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('GameScene: Failed to force process turn:', data.error);
        return;
      }

      // Clear all turn actions after successful processing
      this.pendingPlacements = [];
      this.commitTurnButton.visible = false;
      
      // Clear the game state turn actions
      this.gameState = {
        ...this.gameState,
        player: {
          ...this.gameState.player,
          turnActions: {
            leaderPlacements: [],
            upgrades: []
          }
        }
      };

      // Update the display to reflect cleared state
      this.updateCasesDisplay();

      console.log('GameScene: Turn force processed successfully');
      
      // Trigger an immediate poll to get the updated game state
      this.pollGameState();
    } catch (error) {
      console.error('GameScene: Error force processing turn:', error);
    }
  }

  updateGameState(gameState) {
    // Check if round has changed (turn has been processed)
    if (this.gameState && gameState.currentRound !== this.gameState.currentRound) {
      console.log('GameScene: Round changed, clearing all turn actions');
      this.pendingPlacements = [];
      this.commitTurnButton.visible = false;
    }

    this.gameState = {
      ...gameState,
      player: {
        ...gameState.player,
        turnActions: {
          ...gameState.player.turnActions,
          // Local pending placements take precedence over server state
          leaderPlacements: this.pendingPlacements.length > 0 ? [] : (gameState.player.turnActions?.leaderPlacements || [])
        }
      }
    };
    
    console.log(`GameScene: Updating game state - Era: ${gameState.currentEra}, Round: ${gameState.currentRound}`);

    // Update status text
    this.statusText.setText(`Game Status: ${gameState.status}`);

    // Update leaders display
    this.updateLeadersDisplay(gameState.player.leaders);

    // Show/hide start game button based on game status and player being creator
    this.startGameButton.visible = (
      gameState.status === 'setup' && 
      gameState.player.uuid === gameState.creator
    );

    // Show/hide force process button based on game status and player being creator
    this.forceProcessButton.visible = (
      gameState.status === 'in_progress' && 
      gameState.player.uuid === gameState.creator
    );

    // Update current player info and resources (horizontal layout)
    const player = gameState.player;
    console.log(`GameScene: Updating player info - Name: ${player.name}, Era Points: ${player.eraPoints}`);
    this.playerInfo.setText(
      `${player.name} (${player.eraPoints} EP) | ` +
      `M:${player.resources.might}\n` +
      `E:${player.resources.education}\n` +
      `G:${player.resources.gold}\n` +
      `F:${player.resources.faith}\n` +
      `F:${player.resources.food}\n` +
      `I:${player.resources.influence}`
    );

    // Update other players info
    this.updateOtherPlayersDisplay(gameState.players.filter(p => p.id !== player.id));

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
      this.casePool.clear();
    }

    // Show commit button if we have any pending placements
    this.commitTurnButton.visible = this.pendingPlacements.length > 0;
  }

  updateOtherPlayersDisplay(otherPlayers) {
    // Track active player IDs
    const activePlayerIds = new Set();
    
    if (!otherPlayers || otherPlayers.length === 0) {
      // Hide all pooled player displays
      for (const [_, display] of this.playerPool) {
        display.text.visible = false;
      }
      this.otherPlayersBg.setSize(0, 0);
      return;
    }

    let xOffset = 10;
    const padding = 20;
    const playerWidth = 120;

    otherPlayers.forEach((player, index) => {
      const playerId = player.id;
      activePlayerIds.add(playerId);

      const playerText = 
        `${player.name}\n` +
        `EP: ${player.eraPoints}\n` +
        `M: ${player.resources.might}\n` +
        `E: ${player.resources.education}\n` +
        `G: ${player.resources.gold}\n` +
        `F: ${player.resources.faith}\n` +
        `F: ${player.resources.food}\n` +
        `I: ${player.resources.influence}`;

      let display;
      if (this.playerPool.has(playerId)) {
        // Update existing player display
        display = this.playerPool.get(playerId);
        display.text.setText(playerText);
        display.text.visible = true;
        display.bg.visible = true;
      } else {
        // Create new player display
        const text = this.add.text(xOffset, 10, playerText, {
          fontSize: '12px',
          fill: '#aaa',
          align: 'left'
        });
        
        const bg = this.add.rectangle(
          xOffset - 5, 
          5, 
          playerWidth, 
          100, 
          0x333333, 
          0.5
        );
        
        this.otherPlayersContainer.add(bg);
        this.otherPlayersContainer.add(text);
        
        display = { text, bg };
        this.playerPool.set(playerId, display);
      }

      // Update position
      display.text.setPosition(xOffset, 10);
      display.bg.setPosition(xOffset - 5, 5);
      
      xOffset += playerWidth + padding;
    });

    // Hide unused player displays
    for (const [playerId, display] of this.playerPool.entries()) {
      if (!activePlayerIds.has(playerId)) {
        display.text.visible = false;
        display.bg.visible = false;
      }
    }

    // Update container background and position
    this.otherPlayersBg.setPosition(0, 0);
    this.otherPlayersBg.setSize(xOffset, 110);
    
    // Center the container in the top right
    const gameWidth = this.sys.game.config.width;
    this.otherPlayersContainer.setPosition(gameWidth - xOffset - 10, 10);
  }

  updateCasesDisplay() {
    console.log(`GameScene: Refreshing cases display with ${this.gameState.currentCases.length} cases`);
    // Store current container position
    const currentX = this.casesContainer.x;
    
    const cardWidth = 150;
    const padding = 20;

    // Track which cases are still in use
    const activeCaseIds = new Set();

    // Update or create cards for each case
    this.gameState.currentCases.forEach((caseData, index) => {
      const caseId = caseData.caseId;
      activeCaseIds.add(caseId);

      const x = index * (cardWidth + padding);
      const y = 0;

      let caseContainer;
      if (this.casePool.has(caseId)) {
        // Update existing case
        caseContainer = this.casePool.get(caseId);
        this.updateCaseCard(caseContainer, caseData, index);
        caseContainer.x = x;
        caseContainer.y = y;
      } else {
        // Create new case if not in pool
        caseContainer = this.createCaseCard(caseData, x, y, index);
        this.casePool.set(caseId, caseContainer);
        this.casesContainer.add(caseContainer);
      }
    });

    // Remove cases that are no longer present
    for (const [caseId, container] of this.casePool.entries()) {
      if (!activeCaseIds.has(caseId)) {
        container.destroy();
        this.casePool.delete(caseId);
      }
    }

    // Get the total width of all cards
    const totalCardsWidth = this.gameState.currentCases.length * (cardWidth + padding);
    
    // Calculate bounds
    const minX = this.sys.game.config.width - totalCardsWidth;
    const maxX = this.sys.game.config.width - 200; // Leave some space on the right

    // Restore container position within bounds
    this.casesContainer.x = Math.max(minX, Math.min(maxX, currentX));
  }

  updateCaseCard(container, caseData, index) {
    // Find existing elements in the container
    const [bg, nameText, typeText, leadersText, ...otherElements] = container.list;

    // Update text content
    nameText.setText(caseData.name);
    typeText.setText(caseData.type);

    // Remove any existing exploration/claim/owner texts
    otherElements.forEach(element => element.destroy());

    let yOffset = -30;

    if (caseData.owner) {
        // Show owner if case is claimed
        const ownerText = this.add.text(0, yOffset,
            `Claimed by: ${caseData.owner.slice(-3)}`,
            { fontSize: '12px', fill: '#00ff00' }
        ).setOrigin(0.5);
        
        container.add([ownerText]);
    } else if (!caseData.isRevealed) {
        // Show exploration points for unrevealed cases
        const explorationPointsText = Object.entries(caseData.explorationPoints || {})
            .map(([uuid, points]) => `${points}[${uuid.slice(-3)}]`)
            .join(', ');
        
        const explorationText = this.add.text(0, yOffset,
            `Exploration: ${explorationPointsText || '0'}/${caseData.explorationThreshold}`,
            { fontSize: '12px', fill: '#fff' }
        ).setOrigin(0.5);
        
        container.add([explorationText]);
    } else {
        // Show claim points for revealed but unclaimed cases
        const claimPoints = caseData.claimPoints || {};
        const claimPointsValue = typeof claimPoints.get === 'function' 
            ? claimPoints.get(this.playerUUID) 
            : (claimPoints[this.playerUUID] || 0);
        
        const claimText = this.add.text(0, yOffset,
            `Claim: ${claimPointsValue}/${caseData.claimThreshold}`,
            { fontSize: '12px', fill: '#fff' }
        ).setOrigin(0.5);

        container.add([claimText]);
    }

    // Update leaders text with both placed and pending leaders
    const currentLeaders = caseData.placedLeaders || [];
    const serverPendingPlacement = this.gameState.player.turnActions.leaderPlacements.find(p => p.caseId === caseData.caseId);
    const localPendingPlacement = this.pendingPlacements.find(p => p.caseId === caseData.caseId);
    
    if (currentLeaders.length > 0 || serverPendingPlacement || localPendingPlacement) {
      const leaderStrings = [
        ...currentLeaders.map(leader => {
          const shortUUID = leader.playerUUID.substring(0, 3);
          const uniqueMarker = leader.usingUnique ? '*' : '';
          return `${leader.name}${uniqueMarker}[${shortUUID}]`;
        })
      ];

      // Add server-side pending placements
      if (serverPendingPlacement) {
        const leader = this.gameState.player.leaders.find(l => l.leaderId === serverPendingPlacement.leaderId);
        if (leader) {
          const shortUUID = this.playerUUID.substring(0, 3);
          const uniqueMarker = serverPendingPlacement.useUnique ? '*' : '';
          leaderStrings.push(`${leader.name}${uniqueMarker}[${shortUUID}] (Pending)`);
        }
      }

      // Add local pending placements
      if (localPendingPlacement) {
        const leader = this.gameState.player.leaders.find(l => l.leaderId === localPendingPlacement.leaderId);
        if (leader) {
          const shortUUID = this.playerUUID.substring(0, 3);
          const uniqueMarker = localPendingPlacement.useUnique ? '*' : '';
          leaderStrings.push(`${leader.name}${uniqueMarker}[${shortUUID}] (Pending*)`);
        }
      }

      leadersText.setText(leaderStrings.join('\n'));
      leadersText.setVisible(true);
    } else {
      leadersText.setText('');
      leadersText.setVisible(false);
    }
  }

  createCaseCard(caseData, x, y, index) {
    console.log(`GameScene: Creating case card for ${caseData.name} at position (${x}, ${y})`);
    const container = this.add.container(x, y);

    // Card background
    const bg = this.add.rectangle(0, 0, 150, 200, 0x333333);
    bg.setInteractive();
    bg.on('pointerover', () => bg.setFillStyle(0x444444));
    bg.on('pointerout', () => bg.setFillStyle(0x333333));
    bg.on('pointerdown', () => this.handleCaseClick(caseData, container, index));

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

    // Leaders container text (initially empty)
    const leadersText = this.add.text(0, 60, '', {
      fontSize: '12px',
      fill: '#fff',
      align: 'center',
      wordWrap: { width: 140 }
    }).setOrigin(0.5);

    container.add([bg, nameText, typeText, leadersText]);

    let yOffset = -30;

    if (caseData.owner) {
        // Show owner if case is claimed
        const ownerText = this.add.text(0, yOffset,
            `Claimed by: ${caseData.owner.slice(-3)}`,
            { fontSize: '12px', fill: '#00ff00' }
        ).setOrigin(0.5);
        
        container.add([ownerText]);
    } else if (!caseData.isRevealed) {
        // Show exploration points for unrevealed cases
        const explorationPointsText = Object.entries(caseData.explorationPoints || {})
            .map(([uuid, points]) => `${points}[${uuid.slice(-3)}]`)
            .join(', ');
        
        const explorationText = this.add.text(0, yOffset,
            `Exploration: ${explorationPointsText || '0'}/${caseData.explorationThreshold}`,
            { fontSize: '12px', fill: '#fff' }
        ).setOrigin(0.5);
        
        container.add([explorationText]);
    } else {
        // Show claim points for revealed but unclaimed cases
        const claimPoints = caseData.claimPoints || {};
        const claimPointsValue = typeof claimPoints.get === 'function' 
            ? claimPoints.get(this.playerUUID) 
            : (claimPoints[this.playerUUID] || 0);
        
        const claimText = this.add.text(0, yOffset,
            `Claim: ${claimPointsValue}/${caseData.claimThreshold}`,
            { fontSize: '12px', fill: '#fff' }
        ).setOrigin(0.5);

        container.add([claimText]);
    }

    return container;
  }

  async handleCaseClick(caseData, container, index) {
    if (this.selectedLeader) {
      const leader = this.gameState.player.leaders.find(l => l.leaderId === this.selectedLeader);
      if (leader) {
        // Check if this leader already has a pending placement
        const existingPlacement = this.pendingPlacements.find(p => p.leaderId === leader.leaderId);
        if (existingPlacement) {
          // Update existing placement
          existingPlacement.caseId = caseData.caseId;
          existingPlacement.useUnique = this.selectedLeaderUnique;
        } else {
          // Add new placement
          this.pendingPlacements.push({
            leaderId: leader.leaderId,
            caseId: caseData.caseId,
            useUnique: this.selectedLeaderUnique
          });
        }

        // Clear selection
        this.selectedLeader = null;
        this.selectedLeaderUnique = false;
        const display = this.leaderPool.get(leader.leaderId);
        if (display) {
          this.updateLeaderSelection(display, leader, leader.leaderId);
        }

        // Update the display to show pending placement
        this.updateCasesDisplay();
        
        // Show commit button since we have pending placements
        this.commitTurnButton.visible = true;
      }
    }
  }

  async handleCommitTurn() {
    console.log('GameScene: Committing turn with pending placements:', this.pendingPlacements);
    try {
      const response = await fetch(`${BACKEND_URL}/api/games/${this.gameId}/commit-turn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Player-UUID': this.playerUUID
        },
        body: JSON.stringify({
          leaderPlacements: this.pendingPlacements,
          upgrades: []
        })
      });

      if (!response.ok) {
        console.error('Failed to commit turn:', await response.json());
        return;
      }

      // Update the game state to reflect the committed placements
      this.gameState = {
        ...this.gameState,
        player: {
          ...this.gameState.player,
          turnActions: {
            ...this.gameState.player.turnActions,
            leaderPlacements: this.pendingPlacements
          }
        }
      };

      // Clear pending placements after successful commit
      this.pendingPlacements = [];
      this.commitTurnButton.visible = false;

      // Update the display to reflect the committed state
      this.updateCasesDisplay();

      console.log('Successfully committed turn');
    } catch (error) {
      console.error('Error committing turn:', error);
    }
  }

  updateLeadersDisplay(leaders) {
    // Track which leaders are still active
    const activeLeaderIds = new Set();
    
    if (!leaders || leaders.length === 0) {
      // Hide all pooled leaders if there are none to display
      for (const [_, display] of this.leaderPool) {
        display.nameText.visible = false;
        display.knowledgeText.visible = false;
        display.uniqueText.visible = false;
        display.bg.visible = false;
      }
      this.leadersBg.setSize(300, 100);
      return;
    }

    // Calculate total height needed
    const leaderHeight = 70; // Height needed for each leader
    const padding = 10; // Padding at top and bottom
    const totalHeight = Math.max(100, (leaders.length * leaderHeight) + (padding * 2));
    
    // Start from the bottom
    let yOffset = totalHeight - padding - leaderHeight;
    
    leaders.forEach((leader, index) => {
      const leaderId = leader.leaderId;
      activeLeaderIds.add(leaderId);

      // Find if this leader has a pending placement
      const pendingPlacement = this.gameState.player.turnActions.leaderPlacements.find(p => p.leaderId === leaderId);
      
      let display;
      if (this.leaderPool.has(leaderId)) {
        // Update existing leader display
        display = this.leaderPool.get(leaderId);
        
        // Update text content
        display.nameText.setText(`${leader.name} (Range: ${leader.range.value} ${leader.range.direction})`);
        display.knowledgeText.setText(
          leader.knowledgeTypes.map(k => `${k.type.substring(0, 3)}: ${k.amount}`).join(' | ')
        );
        
        // Update unique ability text and add case info if placed
        let uniqueAbilityText = `${leader.uniqueAbility.name} (${leader.uniqueAbility.usedThisEra ? 'Used' : 'Available'})`;
        if (pendingPlacement) {
          const targetCase = this.gameState.currentCases.find(c => c.caseId === pendingPlacement.caseId);
          if (targetCase) {
            uniqueAbilityText += ` | Case: ${targetCase.name}`;
          }
        }
        display.uniqueText.setText(uniqueAbilityText);
        display.uniqueText.setStyle({ 
          fill: leader.uniqueAbility.usedThisEra ? '#888' : '#00ff00' 
        });

        // Show the display elements
        display.nameText.visible = true;
        display.knowledgeText.visible = true;
        display.uniqueText.visible = true;
        display.bg.visible = true;
      } else {
        // Create background for the leader
        const bg = this.add.rectangle(0, 0, 290, leaderHeight - 10, 0x333333);
        bg.setInteractive();
        
        // Create new leader display objects
        const nameText = this.add.text(10, 0, '', {
          fontSize: '14px',
          fill: '#fff'
        });
        
        const knowledgeText = this.add.text(10, 20, '', {
          fontSize: '12px',
          fill: '#aaa'
        });
        
        const uniqueText = this.add.text(10, 40, '', {
          fontSize: '12px',
          fill: '#00ff00'
        });

        // Add to container
        this.leadersContainer.add([bg, nameText, knowledgeText, uniqueText]);

        // Create display object and add to pool
        display = { bg, nameText, knowledgeText, uniqueText };
        this.leaderPool.set(leaderId, display);

        // Set initial content
        display.nameText.setText(`${leader.name} (Range: ${leader.range.value} ${leader.range.direction})`);
        display.knowledgeText.setText(
          leader.knowledgeTypes.map(k => `${k.type.substring(0, 3)}: ${k.amount}`).join(' | ')
        );
        
        // Set initial unique ability text with case info if placed
        let initialUniqueText = `${leader.uniqueAbility.name} (${leader.uniqueAbility.usedThisEra ? 'Used' : 'Available'})`;
        if (pendingPlacement) {
          const targetCase = this.gameState.currentCases.find(c => c.caseId === pendingPlacement.caseId);
          if (targetCase) {
            initialUniqueText += ` | Case: ${targetCase.name}`;
          }
        }
        display.uniqueText.setText(initialUniqueText);
        display.uniqueText.setStyle({ 
          fill: leader.uniqueAbility.usedThisEra ? '#888' : '#00ff00' 
        });

        // Setup click handler
        bg.on('pointerdown', () => this.handleLeaderClick(leaderId, leader));
        bg.on('pointerover', () => {
          if (this.selectedLeader !== leaderId) {
            bg.setFillStyle(0x444444);
          }
        });
        bg.on('pointerout', () => {
          if (this.selectedLeader !== leaderId) {
            bg.setFillStyle(0x333333);
          }
        });

        // Set initial selection state
        this.updateLeaderSelection(display, leader, leaderId);
      }

      // Update positions
      display.bg.setPosition(155, yOffset + (leaderHeight - 10) / 2);
      display.nameText.setPosition(10, yOffset);
      display.knowledgeText.setPosition(10, yOffset + 20);
      display.uniqueText.setPosition(10, yOffset + 40);

      yOffset -= leaderHeight; // Move up for the next leader
    });

    // Hide unused leader displays
    for (const [leaderId, display] of this.leaderPool.entries()) {
      if (!activeLeaderIds.has(leaderId)) {
        display.nameText.visible = false;
        display.knowledgeText.visible = false;
        display.uniqueText.visible = false;
        display.bg.visible = false;
      }
    }

    // Update background size to fit all leaders
    this.leadersBg.setSize(300, totalHeight);

    // Show commit turn button if we have any turn actions
    this.commitTurnButton.visible = this.gameState.player.turnActions.leaderPlacements.length > 0;
  }

  handleLeaderClick(leaderId, leader) {
    if (this.selectedLeader === leaderId) {
      // If already selected, check if we can select unique
      if (!leader.uniqueAbility.usedThisEra && !this.selectedLeaderUnique) {
        this.selectedLeaderUnique = true;
        this.updateLeaderSelection(this.leaderPool.get(leaderId), leader, leaderId);
      } else {
        // Deselect if clicking again
        this.selectedLeader = null;
        this.selectedLeaderUnique = false;
        this.updateLeaderSelection(this.leaderPool.get(leaderId), leader, leaderId);
      }
    } else {
      // Select new leader
      if (this.selectedLeader) {
        // Deselect previous leader
        const prevDisplay = this.leaderPool.get(this.selectedLeader);
        if (prevDisplay) {
          prevDisplay.bg.setFillStyle(0x333333);
        }
      }
      this.selectedLeader = leaderId;
      this.selectedLeaderUnique = false;
      this.updateLeaderSelection(this.leaderPool.get(leaderId), leader, leaderId);
    }
  }

  updateLeaderSelection(display, leader, leaderId) {
    if (this.selectedLeader === leaderId) {
      if (this.selectedLeaderUnique) {
        display.bg.setFillStyle(0xDAA520); // Gold color for unique selection
      } else {
        display.bg.setFillStyle(0x666666); // Grey for normal selection
      }
    } else {
      display.bg.setFillStyle(0x333333); // Default color
    }
  }

  update() {
    // Game logic updates
  }
}
