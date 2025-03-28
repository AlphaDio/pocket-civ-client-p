import Phaser from "phaser";
import { LEADER_CONTAINER_WIDTH } from './constants';

export default class LeaderManager {
  constructor(scene) {
    this.scene = scene;
    this.leaderPool = new Map(); // Pool to store leader display objects
    this.selectedLeader = null; // Track currently selected leader
    this.selectedLeaderUnique = false; // Track if unique ability is selected
    this.pendingPlacements = []; // Track local leader placements before commit
    
    // Height constants
    this.BASE_LEADER_HEIGHT = 80;
    this.CONTAINER_PADDING = 5;
    this.MIN_CONTAINER_HEIGHT = 100;
  }

  formatLeaderText(leader) {
    return {
      nameText: `${leader.name} (R1: ${leader.range1.value} ${leader.range1.direction} Range; R2: ${leader.range2.value} ${leader.range2.direction} Range)`,
      knowledgeText: `R1: ${leader.range1.knowledge.type.substring(0, 3)}: +${leader.range1.knowledge.amount}; R2: ${leader.range2.knowledge.type.substring(0, 3)}: +${leader.range2.knowledge.amount}`
    };
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

  calculateLeaderHeight(leaderId) {
    return (this.selectedLeader === leaderId && this.selectedLeaderUnique)
      ? this.BASE_LEADER_HEIGHT
      : this.BASE_LEADER_HEIGHT;
  }

  calculateTotalContainerHeight(leader) {
    if (!leader) {
      return this.MIN_CONTAINER_HEIGHT;
    }

    return Math.max(
      this.MIN_CONTAINER_HEIGHT,
      this.BASE_LEADER_HEIGHT + this.CONTAINER_PADDING * 2
    );
  }

  updateLeadersDisplay(leader) {
    // Clear all leader displays first
    for (const [_, display] of this.leaderPool) {
      display.nameText.visible = false;
      display.knowledgeText.visible = false;
      display.uniqueText.visible = false;
      display.bg.visible = false;
    }
    
    if (!leader) {
      this.leadersBg.setSize(LEADER_CONTAINER_WIDTH, this.MIN_CONTAINER_HEIGHT);
      return;
    }
  
    const totalHeight = this.calculateTotalContainerHeight(leader);
    const yOffset = totalHeight - this.CONTAINER_PADDING - this.BASE_LEADER_HEIGHT;
    const leaderId = leader.leaderId;
  
    const pendingPlacement = this.scene.gameState.player.turnActions.leaderPlacements.find(
      (p) => p.leaderId === leaderId
    );
  
    let display;
    if (this.leaderPool.has(leaderId)) {
      display = this.leaderPool.get(leaderId);
  
      // Update text content without changing font size
      const formattedText = this.formatLeaderText(leader);
      display.nameText.setText(formattedText.nameText);
      display.knowledgeText.setText(formattedText.knowledgeText);
  
      display.nameText.visible = true;
      display.knowledgeText.visible = true;
      display.uniqueText.visible = true;
      display.bg.visible = true;
  
      // Ensure font sizes remain consistent with initial creation
      display.nameText.setStyle({ fontSize: "14px", fill: "#fff" });
      display.knowledgeText.setStyle({ fontSize: "14px", fill: "#fff" });
      display.uniqueText.setStyle({ fontSize: "15px", fill: "#00ff00" });
    } else {
      const bg = this.scene.add.rectangle(0, 0, LEADER_CONTAINER_WIDTH, this.BASE_LEADER_HEIGHT - 10, 0x333333);
      bg.setInteractive();
  
      const formattedText = this.formatLeaderText(leader);
      const nameText = this.scene.add.text(10, 0, formattedText.nameText,
        { fontSize: "14px", fill: "#fff" }
      );
      const knowledgeText = this.scene.add.text(10, 20, formattedText.knowledgeText,
        { fontSize: "14px", fill: "#fff" }
      );
      const uniqueText = this.scene.add.text(10, 40, "",
        { fontSize: "15px", fill: "#00ff00" }
      );
  
      this.leadersContainer.add([bg, nameText, knowledgeText, uniqueText]);
  
      display = { bg, nameText, knowledgeText, uniqueText };
      this.leaderPool.set(leaderId, display);
  
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
  
      this.updateLeaderSelection(display, leader, leaderId);
    }
  
    display.bg.setPosition(LEADER_CONTAINER_WIDTH / 2, yOffset + (this.BASE_LEADER_HEIGHT - 10) / 2);
    display.bg.setSize(LEADER_CONTAINER_WIDTH, this.BASE_LEADER_HEIGHT - 10);
    display.nameText.setPosition(10, yOffset);
    display.knowledgeText.setPosition(10, yOffset + 30);
    display.uniqueText.setPosition(10, yOffset + 45);
  
    // Prevent text wrapping or scaling by setting a fixed width and word wrap
    const textWidth = LEADER_CONTAINER_WIDTH - 20; // 10px padding on each side
    display.nameText.setWordWrapWidth(textWidth, true);
    display.knowledgeText.setWordWrapWidth(textWidth, true);
    display.uniqueText.setWordWrapWidth(textWidth, true);
  
    this.leadersBg.setSize(LEADER_CONTAINER_WIDTH, totalHeight);
  }

  handleLeaderClick(leaderId, leader) {
    // If no leader is currently selected, select this leader
    if (!this.selectedLeader) {
      this.selectedLeader = leaderId;
      this.selectedLeaderUnique = false;
      this.updateLeaderSelection(this.leaderPool.get(leaderId), leader, leaderId);
      return;
    }

    // If we're on the same leader
    if (this.selectedLeader === leaderId) {
      // If unique ability is available and not selected, select it
      if (!leader.uniqueAbility.usedThisEra && !this.selectedLeaderUnique) {
        this.selectedLeaderUnique = true;
        this.updateLeaderSelection(this.leaderPool.get(leaderId), leader, leaderId);
        return;
      }
      
      // If unique is selected or not available, deselect the leader
      this.selectedLeader = null;
      this.selectedLeaderUnique = false;
      this.updateLeaderSelection(this.leaderPool.get(leaderId), leader, leaderId);
      return;
    }
  }

  updateLeaderSelection(display, leader, leaderId) {
    if (this.selectedLeader === leaderId) {
      if (this.selectedLeaderUnique) {
        display.bg.setFillStyle(0xdaa520); // Gold color for unique selection
        // Update unique text to show the effect
        let uniqueText = `${leader.uniqueAbility.name} (${leader.uniqueAbility.usedThisEra ? "Used" : "Available"})`;
        uniqueText += `\n${leader.uniqueAbility.description}`; // Add the effect text
        display.uniqueText.setText(uniqueText);
      } else {
        display.bg.setFillStyle(0x666666); // Grey for normal selection
        // Reset unique text to just show name and availability
        let uniqueText = `${leader.uniqueAbility.name} (${leader.uniqueAbility.usedThisEra ? "Used" : "Available"})`;
        // Add case position if placed
        const pendingPlacement = this.scene.gameState.player.turnActions.leaderPlacements.find(
          (p) => p.leaderId === leaderId
        );
        if (pendingPlacement) {
          const casePosition = this.scene.gameState.currentCases.findIndex(
            (c) => c.caseId === pendingPlacement.caseId
          ) + 1;
          if (casePosition > 0) {
            uniqueText += ` | Case: #${casePosition}`;
          }
        }
        display.uniqueText.setText(uniqueText);
      }
    } else {
      display.bg.setFillStyle(0x333333); // Default color
      // Reset unique text to just show name and availability
      let uniqueText = `${leader.uniqueAbility.name} (${leader.uniqueAbility.usedThisEra ? "Used" : "Available"})`;
      // Add case position if placed
      const pendingPlacement = this.scene.gameState.player.turnActions.leaderPlacements.find(
        (p) => p.leaderId === leaderId
      );
      if (pendingPlacement) {
        const casePosition = this.scene.gameState.currentCases.findIndex(
          (c) => c.caseId === pendingPlacement.caseId
        ) + 1;
        if (casePosition > 0) {
          uniqueText += ` | Case: #${casePosition}`;
        }
      }
      display.uniqueText.setText(uniqueText);
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

    const leader = this.scene.gameState.player.leader;
    
    if (!leader || leader.leaderId !== this.selectedLeader) return false;

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
      const leader = this.scene.gameState.player.leader;
      if (leader && leader.leaderId === serverPendingPlacement.leaderId) {
        const shortUUID = this.scene.playerUUID.substring(0, 3);
        const uniqueMarker = serverPendingPlacement.useUnique ? "*" : "";
        leaderStrings.push(
          `${leader.name}${uniqueMarker}[${shortUUID}] (Pending)`
        );
      }
    }

    // Add local pending placements
    if (localPendingPlacement) {
      const leader = this.scene.gameState.player.leader;
      if (leader && leader.leaderId === localPendingPlacement.leaderId) {
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