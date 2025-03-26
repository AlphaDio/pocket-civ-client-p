export default class AttributionManager {
  static addGameJamAttribution() {
    const jamLink = document.createElement('a');
    jamLink.href = 'https://jam.pieter.com';
    jamLink.target = '_blank';
    jamLink.style.cssText = `
      font-family: 'system-ui', sans-serif;
      position: fixed;
      bottom: -1px;
      right: -1px;
      padding: 7px;
      font-size: 14px;
      font-weight: bold;
      background: #fff;
      color: #000;
      text-decoration: none;
      z-index: 10000;
      border-top-left-radius: 12px;
      border: 1px solid #fff;
    `;
    jamLink.textContent = '🕹️ Vibe Jam 2025';
    document.body.appendChild(jamLink);
  }
} 