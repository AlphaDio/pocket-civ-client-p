export const HELP_PANEL_CONFIG = {
  widthPercent: 0.8, // 80% of screen width
  heightPercent: 0.8, // 80% of screen height
  minWidth: 300, // minimum width for very small screens
  minHeight: 200, // minimum height for very small screens
  maxWidth: 650, // maximum width for large screens
  maxHeight: 375, // maximum height for large screens
  titleY: -165,
  tipsStartY: -145,
  tipSpacing: 20,
  indicatorOffset: 40
};

export const helpContent = {
  page1: {
    position: 1,
    title: "Game Basics:",
    tips: [
      "• Click leader, then click a case to place that leader",
      "• Leaders Explore or Claim cases by applying knowledge",
      "• Explore: gain resources",
      "• Claim: gain effects & Era points",
      "• Cases go to History at era end",
      "• Upgrade claimed cases in History once for effects",
      "• Double-click a leader for unique ability",
      "• Player with most Era points wins",
      "• Click on cases to see their effects",
    ]
  },
  page2: {
    position: 2,
    title: "How to Read Leader Info:",
    tips: [
      "Each leader shows two ranges (R1 and R2):",
      "• Range format: (R1: X Dir Range; R2: Y Dir Range)",
      "  where X and Y are the number of cases affected",
      "• Dir can be: Uni (left-to-right), Left, or Right",
      "• Knowledge format: R1: Type: +N; R2: Type: +M",
      "  where Type is the resource type and N, M are amounts",
      "• Example: (R1: 2 Uni Range; R2: 1 Left Range)",
      "  means Range 1 affects 2 cases left-to-right",
      "  and Range 2 affects 1 case to the left"
    ]
  },
  page3: {
    position: 3,
    title: "Resources:",
    tips: [
      "• M for Might",
      "• E for Education",
      "• G for Gold",
      "• Fa for Faith",
      "• Fo for Food",
      "• I for Influence",
      "",
      "Resources are used to purchase updates."
    ]
  },
  page4: {
    position: 4,
    title: "Case Type Knowledge Modifiers:",
    tips: [
      "Case Type     | M  | S  | E  | R  | C  | D",
      "-------------|----|----|----|----|----|----",
      "City         | +2 | -2 | +2 | +1 | +2 | +2",
      "Conquest     | +3 | +1 | -3 | -1 | -2 | -3",
      "Wonder       |  0 | +2 | +1 | +2 | +3 | +1",
      "Innovation   | +1 | +3 | +2 |  0 | +1 | +1",
      "Discovery    | +1 | +3 | +2 |  0 | +1 | +1",
      "Great Work   | -2 | +1 | +1 | +2 | +3 | +2",
      "Strategic    | +3 | +1 | +2 |  0 |  0 | +1",
      "Hub          | -2 |  0 | +2 | +1 | +1 | +3",
      "Growth       | -2 | +1 | +3 |  0 | +2 | +1",
      "Icon         | +1 | -2 | -3 | +1 | +2 |  0",
      "Great People | -3 |  0 |  0 | +2 | +1 | +2",
      "",
      "M=Military, S=Scientific, E=Economic, R=Religious, C=Cultural, D=Diplomatic"
    ]
  }
}; 