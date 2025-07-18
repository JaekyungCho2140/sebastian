import React, { useState } from 'react'
import SuccessButton from './SuccessButton'
import TestErrorButton from './TestErrorButton'
import M4DialogueButton from './M4DialogueButton'
import M4StringButton from './M4StringButton'
import PerformanceMonitor from './PerformanceMonitor'

const MainContent: React.FC = () => {
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false);
  
  return (
    <div className="main-content">
      <div className="button-row-container">
        <div className="success-button-container">
          <SuccessButton />
        </div>
        <div className="test-error-container">
          <TestErrorButton />
        </div>
        <div className="m4-dialogue-container">
          <M4DialogueButton />
        </div>
        <div className="m4-string-container">
          <M4StringButton />
        </div>
      </div>
      <div className="text-center">
        <h1 className="mb-4 font-semibold">Sebastian</h1>
      </div>
      
      {/* Performance Monitor Toggle Button */}
      <button
        className="performance-monitor-toggle"
        onClick={() => setShowPerformanceMonitor(!showPerformanceMonitor)}
        title="Toggle Performance Monitor"
      >
        ⚡
      </button>
      
      {/* Performance Monitor Component */}
      <PerformanceMonitor
        isVisible={showPerformanceMonitor}
        onClose={() => setShowPerformanceMonitor(false)}
      />
    </div>
  )
}

export default MainContent