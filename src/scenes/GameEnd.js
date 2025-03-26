export default class GameEnd extends Phaser.Scene {
  constructor() {
    super({ key: 'GameEnd' });
  }

  create(data) {
    const { winner, eraPoints } = data;
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;

    // Add a semi-transparent black background
    const bg = this.add.rectangle(0, 0, screenWidth, screenHeight, 0x000000, 0.7);
    bg.setOrigin(0);

    // Create title text
    this.add.text(screenWidth / 2, screenHeight * 0.2, 'Game Over!', {
      fontSize: '64px',
      fill: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Create winner text
    const winnerText = winner 
      ? `Player ${winner} wins with ${eraPoints} Era Points!`
      : 'No winner determined';
    
    this.add.text(screenWidth / 2, screenHeight * 0.4, winnerText, {
      fontSize: '32px',
      fill: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Add a button to return to main menu
    const menuButton = this.add.text(screenWidth / 2, screenHeight * 0.6, 'Return to Main Menu', {
      fontSize: '24px',
      fill: '#ffffff',
      backgroundColor: '#444',
      padding: { x: 20, y: 10 }
    })
    .setOrigin(0.5)
    .setInteractive()
    .on('pointerdown', () => {
      // Clear any stored game data
      localStorage.removeItem('gameId');
      localStorage.removeItem('playerUUID');
      this.scene.start('MenuScene');
    });

    // Add hover effect
    menuButton.on('pointerover', () => {
      menuButton.setStyle({ fill: '#ff0' });
    });
    menuButton.on('pointerout', () => {
      menuButton.setStyle({ fill: '#ffffff' });
    });
  }
} 