import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import MenuScene from '../scenes/MenuScene';
import GameScene from '../scenes/GameScene';

function Game() {
  const gameRef = useRef(null);

  useEffect(() => {
    const config = {
        type: Phaser.AUTO,
        width: window.innerWidth * 0.95,
        height: window.innerHeight * 0.75,
        backgroundColor: '#222222',
        parent: 'game-container',
        dom: {
          createContainer: true
        },
        scale: {
          mode: Phaser.Scale.RESIZE,
        },
        scene: [MenuScene, GameScene]
      };

    // Create the game instance
    const game = new Phaser.Game(config);

    // Cleanup function
    return () => {
      game.destroy(true);
    };
  }, []); // Empty dependency array means this effect runs once on mount

  return <div id="game-container" style={{ width: '95vw', height: '95vh' }} />;
}

export default Game; 