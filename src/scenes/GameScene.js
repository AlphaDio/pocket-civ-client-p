import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload() {
    // Load assets
    // this.load.image('leader', 'assets/leader.png');
  }

  create() {
    // Add a sprite
    // this.add.sprite(400, 300, 'leader');
  }

  update() {
    // Game logic
  }
}
