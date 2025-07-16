import React from 'react'
import SuccessButton from './SuccessButton'
import TestErrorButton from './TestErrorButton'

const MainContent: React.FC = () => {
  return (
    <div className="main-content">
      <div className="button-row-container">
        <div className="success-button-container">
          <SuccessButton />
        </div>
        <div className="test-error-container">
          <TestErrorButton />
        </div>
      </div>
      <div className="text-center">
        <h1 className="mb-4 font-semibold">Sebastian++</h1>
      </div>
    </div>
  )
}

export default MainContent