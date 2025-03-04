import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BACKEND_URL } from '../scenes/utils/constants';
import CaseDetails from './CaseDetails';
import './Cases.css';

const Cases = () => {
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const { caseId } = useParams();

  useEffect(() => {
    console.log('Current caseId:', caseId);
    if (caseId) {
      fetchSingleCase();
    } else {
      fetchCases();
    }
  }, [caseId]);

  const fetchCases = async () => {
    try {
      const response = await fetch(BACKEND_URL + '/api/games/cases');
      const data = await response.json();
      console.log('Fetched cases:', data);
      setCases(data);
    } catch (error) {
      console.error('Error fetching cases:', error);
    }
  };

  const fetchSingleCase = async () => {
    try {
      console.log('Fetching case with ID:', caseId);
      const response = await fetch(BACKEND_URL + `/api/games/cases/${caseId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Fetched single case:', data);
      setSelectedCase(data[0]);
    } catch (error) {
      console.error('Error fetching case:', error);
      setSelectedCase(null);
    }
  };

  if (caseId && selectedCase) {
    return <CaseDetails case_={selectedCase} />;
  }

  return (
    <div className="cases-container">
      <h1 className="cases-title">Cases Database</h1>

      <div className="cases-grid">
        {cases.map((case_) => (
          <Link to={`/cases/${case_.caseId}`} key={case_.caseId} className="case-card">
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
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Cases; 