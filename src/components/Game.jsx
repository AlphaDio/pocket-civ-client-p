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
        height: window.innerHeight * 0.95,
        backgroundColor: '#222222',
        parent: 'game-container',
        dom: {
          createContainer: true
        },
        scale: {
          mode: Phaser.Scale.RESIZE,
          parent: 'game-container',
          width: '100%',
          height: '100%',
          autoCenter: Phaser.Scale.CENTER_BOTH
        },
        scene: [MenuScene, GameScene]
      };

    // Create the game instance
    const game = new Phaser.Game(config);
    gameRef.current = game;

    // Handle window resize
    const handleResize = () => {
      if (gameRef.current) {
        gameRef.current.scale.resize(window.innerWidth * 0.95, window.innerHeight * 0.95);
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      game.destroy(true);
    };
  }, []); // Empty dependency array means this effect runs once on mount

  return <div id="game-container" />;
}

export default Game; 