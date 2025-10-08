import '@style/LoadingPage.css';
import { useEffect, useState } from 'react';

export default function LoadingPage() {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length < 3 ? prev + '.' : ''));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="loading-page" role="status" aria-live="polite">
      <div className="loading-container">
        {/* Coffee Cup */ }
        <div className="loading-coffee">
          <div className="loading-cup">
            <div className="loading-liquid"></div>
            <div className="loading-handle"></div>
          </div>
          {/* Steam */ }
          <div className="loading-steam-container">
            <div className="loading-steam"></div>
            <div className="loading-steam loading-steam2"></div>
            <div className="loading-steam loading-steam3"></div>
          </div>
        </div>
        {/* Text */ }
        <h1 className="loading-title">
          Brewing Your Coffee{ dots }
        </h1>
        <p className="loading-subtitle">Please wait while we prepare your perfect cup!</p>
        {/* Progress Bar */ }
        <div className="loading-progress-bar">
          <div className="loading-progress-fill"></div>
        </div>
      </div>
    </div>
  );
}
