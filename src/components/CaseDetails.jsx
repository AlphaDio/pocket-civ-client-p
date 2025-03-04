import React from 'react';
import { Link } from 'react-router-dom';
import './CaseDetails.css';

const CaseDetails = ({ case_ }) => {
  if (!case_) {
    return (
      <div className="case-details">
        <div className="case-not-found">
          <h2>Case not found</h2>
          <Link to="/cases" className="back-button">Back to Cases</Link>
        </div>
      </div>
    );
  }

  const renderRewards = (amount, type) => {
    if (!amount || !type) return null;
    return (
      <div className="reward-item">
        {amount} {type}
      </div>
    );
  };

  const renderEffects = (effect) => {
    if (!effect) return null;
    return (
      <div className="effect-item">
        {effect}
      </div>
    );
  };

  const renderUpgradeCosts = (amount, type) => {
    if (!amount || !type) return null;
    return (
      <div className="upgrade-cost-item">
        {amount} {type}
      </div>
    );
  };

  return (
    <div className="case-details">
      <Link to="/cases" className="back-button">← Back to Cases</Link>
      
      <div className="case-header">
        <h1 className="case-name">{case_.Name}</h1>
        <div className="case-type">{case_.CaseType}</div>
      </div>

      <div className="case-tags">
        {case_.Tag1 && <span className="tag">{case_.Tag1}</span>}
        {case_.Tag2 && <span className="tag">{case_.Tag2}</span>}
        {case_.Tag3 && <span className="tag">{case_.Tag3}</span>}
      </div>

      <div className="case-eras">
        {case_.Era.map((era, index) => (
          <span key={index} className="era-tag">{era}</span>
        ))}
      </div>

      <div className="case-description">
        {case_.Description}
      </div>

      <div className="case-stats">
        <div className="stat-group">
          <h3>Exploration</h3>
          <div className="threshold">Threshold: {case_.ExplorationThreshold}</div>
          <div className="rewards">
            {renderRewards(case_.ExplorationRewardAmount1, case_.ExplorationReward1Type)}
            {renderRewards(case_.ExplorationRewardAmount2, case_.ExplorationReward2Type)}
          </div>
          <div className="effects">
            {renderEffects(case_.ExplorationEffect1)}
            {renderEffects(case_.ExplorationEffect2)}
          </div>
        </div>

        <div className="stat-group">
          <h3>Claim</h3>
          <div className="threshold">Threshold: {case_.ClaimThreshold}</div>
          <div className="rewards">
            {renderRewards(case_.ClaimRewardAmount1, case_.ClaimReward1Type)}
            {renderRewards(case_.ClaimRewardAmount2, case_.ClaimReward2Type)}
          </div>
          <div className="effects">
            {renderEffects(case_.ClaimEffect1)}
            {renderEffects(case_.ClaimEffect2)}
          </div>
        </div>

        {(case_.UpgradeCost1Amount || case_.UpgradeCost2Amount) && (
          <div className="stat-group">
            <h3>Upgrade</h3>
            <div className="costs">
              {renderUpgradeCosts(case_.UpgradeCost1Amount, case_.UpgradeCost1Type)}
              {renderUpgradeCosts(case_.UpgradeCost2Amount, case_.UpgradeCost2Type)}
            </div>
            <div className="effects">
              {renderEffects(case_.UpgradeEffect1)}
              {renderEffects(case_.UpgradeEffect2)}
            </div>
          </div>
        )}
      </div>

      {case_.DesignerNotes && (
        <div className="designer-notes">
          <h3>Designer Notes</h3>
          <p>{case_.DesignerNotes}</p>
        </div>
      )}

      {case_.Quote1 && (
        <div className="quote">
          <blockquote>{case_.Quote1}</blockquote>
        </div>
      )}
    </div>
  );
};

export default CaseDetails; 