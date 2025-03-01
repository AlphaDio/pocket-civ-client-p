import Phaser from "phaser";
import { LEADER_CONTAINER_WIDTH } from './constants';

export default class LeaderManager {
  constructor(scene) {
    this.scene = scene;
    this.leaderPool = new Map(); // Pool to store leader display objects
    this.selectedLeader = null; // Track currently selected leader
    this.selectedLeaderUnique = false; // Track if unique ability is selected
    this.pendingPlacements = []; // Track local leader placements before commit
  }

  createLeadersContainer(x, y) {
    // Leaders container
    this.leadersContainer = this.scene.add.container(x, y);
    this.leadersBg = this.scene.add.rectangle(
      0,
      0,
      LEADER_CONTAINER_WIDTH,
      110,
      0x222222,
      0.5
    );
    this.leadersContainer.add(this.leadersBg);

    return this.leadersContainer;
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
      this.leadersBg.setSize(LEADER_CONTAINER_WIDTH, 100);
      return;
    }

    // Calculate total height needed
    const leaderHeight = 60; // Reduced height
    const padding = 5; // Reduced padding
    const totalHeight = Math.max(100, leaders.length * leaderHeight + padding * 2);

    // Start from the bottom
    let yOffset = totalHeight - padding - leaderHeight;

    leaders.forEach((leader, index) => {
      const leaderId = leader.leaderId;
      activeLeaderIds.add(leaderId);

      // Find if this leader has a pending placement
      const pendingPlacement = this.scene.gameState.player.turnActions.leaderPlacements.find(
        (p) => p.leaderId === leaderId
      );

      let display;
      if (this.leaderPool.has(leaderId)) {
        // Update existing leader display
        display = this.leaderPool.get(leaderId);

        // Update text content with both ranges
        display.nameText.setText(
          `${leader.name} (R1: ${leader.range1.value} ${leader.range1.direction}, R2: ${leader.range2.value} ${leader.range2.direction})`
        );
        
        // Show both range knowledge types
        display.knowledgeText.setText(
          `R1: ${leader.range1.knowledge.type.substring(0, 3)}: ${leader.range1.knowledge.amount} | ` +
          `R2: ${leader.range2.knowledge.type.substring(0, 3)}: ${leader.range2.knowledge.amount}`
        );

        // Update unique ability text and add case position if placed
        let uniqueAbilityText = `${leader.uniqueAbility.name} (${leader.uniqueAbility.usedThisEra ? "Used" : "Available"})`;
        if (pendingPlacement) {
          const casePosition = this.scene.gameState.currentCases.findIndex(
            (c) => c.caseId === pendingPlacement.caseId
          ) + 1;
          if (casePosition > 0) {
            uniqueAbilityText += ` | Case: #${casePosition}`;
          }
        }
        display.uniqueText.setText(uniqueAbilityText);
        display.uniqueText.setStyle({
          fill: leader.uniqueAbility.usedThisEra ? "#888" : "#00ff00",
        });

        // Show the display elements
        display.nameText.visible = true;
        display.knowledgeText.visible = true;
        display.uniqueText.visible = true;
        display.bg.visible = true;

        // Update text sizes
        display.nameText.setStyle({ fontSize: "12px" });
        display.knowledgeText.setStyle({ fontSize: "10px" });
        display.uniqueText.setStyle({ fontSize: "10px" });
      } else {
        // Create background for the leader
        const bg = this.scene.add.rectangle(0, 0, LEADER_CONTAINER_WIDTH, leaderHeight - 10, 0x333333);
        bg.setInteractive();

        // Create new leader display objects with updated range information
        const nameText = this.scene.add.text(10, 0, 
          `${leader.name} (R1: ${leader.range1.value} ${leader.range1.direction}, R2: ${leader.range2.value} ${leader.range2.direction})`, {
          fontSize: "14px",
          fill: "#fff",
        });

        const knowledgeText = this.scene.add.text(10, 20, 
          `R1: ${leader.range1.knowledge.type.substring(0, 3)}: ${leader.range1.knowledge.amount} | ` +
          `R2: ${leader.range2.knowledge.type.substring(0, 3)}: ${leader.range2.knowledge.amount}`, {
          fontSize: "12px",
          fill: "#aaa",
        });

        const uniqueText = this.scene.add.text(10, 40, "", {
          fontSize: "12px",
          fill: "#00ff00",
        });

        // Add to container
        this.leadersContainer.add([bg, nameText, knowledgeText, uniqueText]);

        // Create display object and add to pool
        display = { bg, nameText, knowledgeText, uniqueText };
        this.leaderPool.set(leaderId, display);

        // Set initial unique ability text with case position if placed
        let initialUniqueText = `${leader.uniqueAbility.name} (${leader.uniqueAbility.usedThisEra ? "Used" : "Available"})`;
        if (pendingPlacement) {
          const casePosition = this.scene.gameState.currentCases.findIndex(
            (c) => c.caseId === pendingPlacement.caseId
          ) + 1;
          if (casePosition > 0) {
            initialUniqueText += ` | Case: #${casePosition}`;
          }
        }
        display.uniqueText.setText(initialUniqueText);
        display.uniqueText.setStyle({
          fill: leader.uniqueAbility.usedThisEra ? "#888" : "#00ff00",
        });

        // Setup click handler
        bg.on("pointerdown", () => this.handleLeaderClick(leaderId, leader));
        bg.on("pointerover", () => {
          if (this.selectedLeader !== leaderId) {
            bg.setFillStyle(0x444444);
          }
        });
        bg.on("pointerout", () => {
          if (this.selectedLeader !== leaderId) {
            bg.setFillStyle(0x333333);
          }
        });

        // Set initial selection state
        this.updateLeaderSelection(display, leader, leaderId);
      }

      // Update positions
      display.bg.setPosition(LEADER_CONTAINER_WIDTH / 2, yOffset + (leaderHeight - 10) / 2);
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
    this.leadersBg.setSize(LEADER_CONTAINER_WIDTH, totalHeight);
  }

  handleLeaderClick(leaderId, leader) {
    if (this.selectedLeader === leaderId) {
      // If already selected, check if we can select unique
      if (!leader.uniqueAbility.usedThisEra && !this.selectedLeaderUnique) {
        this.selectedLeaderUnique = true;
        this.updateLeaderSelection(
          this.leaderPool.get(leaderId),
          leader,
          leaderId
        );
      } else {
        // Deselect if clicking again
        this.selectedLeader = null;
        this.selectedLeaderUnique = false;
        this.updateLeaderSelection(
          this.leaderPool.get(leaderId),
          leader,
          leaderId
        );
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
      this.updateLeaderSelection(
        this.leaderPool.get(leaderId),
        leader,
        leaderId
      );
    }
  }

  updateLeaderSelection(display, leader, leaderId) {
    if (this.selectedLeader === leaderId) {
      if (this.selectedLeaderUnique) {
        display.bg.setFillStyle(0xdaa520); // Gold color for unique selection
      } else {
        display.bg.setFillStyle(0x666666); // Grey for normal selection
      }
    } else {
      display.bg.setFillStyle(0x333333); // Default color
    }
  }

  getSelectedLeader() {
    return {
      leaderId: this.selectedLeader,
      useUnique: this.selectedLeaderUnique
    };
  }

  clearSelection() {
    if (this.selectedLeader) {
      const display = this.leaderPool.get(this.selectedLeader);
      if (display) {
        display.bg.setFillStyle(0x333333);
      }
    }
    this.selectedLeader = null;
    this.selectedLeaderUnique = false;
  }

  addPendingPlacement(caseId) {
    if (!this.selectedLeader) return false;

    const leader = this.scene.gameState.player.leaders.find(
      (l) => l.leaderId === this.selectedLeader
    );
    
    if (!leader) return false;

    // Check if this leader already has a pending placement
    const existingPlacement = this.pendingPlacements.find(
      (p) => p.leaderId === leader.leaderId
    );
    
    if (existingPlacement) {
      // Update existing placement
      existingPlacement.caseId = caseId;
      existingPlacement.useUnique = this.selectedLeaderUnique;
    } else {
      // Add new placement
      this.pendingPlacements.push({
        leaderId: leader.leaderId,
        caseId: caseId,
        useUnique: this.selectedLeaderUnique,
      });
    }

    // Clear selection
    this.clearSelection();
    
    return true;
  }

  getPendingPlacements() {
    return this.pendingPlacements;
  }

  clearPendingPlacements() {
    this.pendingPlacements = [];
  }

  hasPlacementsForCase(caseId) {
    return this.pendingPlacements.some(p => p.caseId === caseId) || 
           (this.scene.gameState?.player?.turnActions?.leaderPlacements || []).some(p => p.caseId === caseId);
  }

  getLeaderDisplayForCase(caseId) {
    const currentLeaders = this.scene.gameState.currentCases
      .find(c => c.caseId === caseId)?.placedLeaders || [];
      
    const serverPendingPlacement = this.scene.gameState.player.turnActions.leaderPlacements.find(
      (p) => p.caseId === caseId
    );
    
    const localPendingPlacement = this.pendingPlacements.find(
      (p) => p.caseId === caseId
    );

    const leaderStrings = [];
    
    // Add current leaders
    currentLeaders.forEach(leader => {
      const shortUUID = leader.playerUUID.substring(0, 3);
      const uniqueMarker = leader.usingUnique ? "*" : "";
      leaderStrings.push(`${leader.name}${uniqueMarker}[${shortUUID}]`);
    });

    // Add server-side pending placements
    if (serverPendingPlacement) {
      const leader = this.scene.gameState.player.leaders.find(
        (l) => l.leaderId === serverPendingPlacement.leaderId
      );
      if (leader) {
        const shortUUID = this.scene.playerUUID.substring(0, 3);
        const uniqueMarker = serverPendingPlacement.useUnique ? "*" : "";
        leaderStrings.push(
          `${leader.name}${uniqueMarker}[${shortUUID}] (Pending)`
        );
      }
    }

    // Add local pending placements
    if (localPendingPlacement) {
      const leader = this.scene.gameState.player.leaders.find(
        (l) => l.leaderId === localPendingPlacement.leaderId
      );
      if (leader) {
        const shortUUID = this.scene.playerUUID.substring(0, 3);
        const uniqueMarker = localPendingPlacement.useUnique ? "*" : "";
        leaderStrings.push(
          `${leader.name}${uniqueMarker}[${shortUUID}] (Pending*)`
        );
      }
    }

    return leaderStrings.join("\n");
  }

  shutdown() {
    // Clean up resources
    this.leaderPool.clear();
    this.selectedLeader = null;
    this.selectedLeaderUnique = false;
    this.pendingPlacements = [];
  }

  getLeaderPool() {
    return this.leaderPool;
  }
} 