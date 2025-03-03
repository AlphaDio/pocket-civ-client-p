export const HELP_PANEL_CONFIG = {
  width: 650,
  height: 300,
  titleY: -125,
  tipsStartY: -85,
  tipSpacing: 30,
  indicatorOffset: 40
};

export const helpContent = {
  page1: {
    title: "Game Basics:",
    tips: [
      "• Click leader, then click a case to place that leader",
      "• Leaders Explore or Claim cases",
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
    title: "How to Read Leader Info:",
    tips: [
      "Each leader shows two ranges (R1 and R2):",
      "• Range format: (1: X Dir Range; 2: Y Dir Range)",
      "  where X and Y are the number of cases affected",
      "• Dir can be: Uni (left-to-right), Left, or Right",
      "• Knowledge format: R1: Type: +N; R2: Type: +M",
      "  where Type is the resource type and N, M are amounts",
      "• Example: (1: 2 Uni Range; 2: 1 Left Range)",
      "  means Range 1 affects 2 cases left-to-right",
      "  and Range 2 affects 1 case to the left"
    ]
  },
  page3: {
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
  }
}; 