import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../scenes/utils/constants';
import './Cases.css';

const Cases = () => {
  const [cases, setCases] = useState([]);

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      const response = await fetch(BACKEND_URL + '/api/games/cases');
      const data = await response.json();
      setCases(data);
    } catch (error) {
      console.error('Error fetching cases:', error);
    }
  };

  return (
    <div className="cases-container">
      <h1 className="cases-title">Cases Database</h1>

      <div className="cases-grid">
        {cases.map((case_) => (
          <div key={case_._id} className="case-card">
            <h2 className="case-title">{case_.Name}</h2>
            
            <div className="case-tags">
              <span className="case-type-tag">{case_.CaseType}</span>
              {case_.Era.map((era, index) => (
                <span key={index} className="case-era-tag">{era}</span>
              ))}
            </div>

            <p className="case-description">
              {case_.Description}
            </p>

            {(case_.ExplorationThreshold || case_.ClaimThreshold) && (
              <div className="case-thresholds">
                {case_.ExplorationThreshold && (
                  <span className="threshold-tag">
                    Exploration: {case_.ExplorationThreshold}
                  </span>
                )}
                {case_.ClaimThreshold && (
                  <span className="threshold-tag">
                    Claim: {case_.ClaimThreshold}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Cases; 