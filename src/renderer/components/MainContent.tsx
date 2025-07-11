import React from 'react'
import SuccessButton from './SuccessButton'

const MainContent: React.FC = () => {
  return (
    <div className="main-content">
      <div className="success-button-container">
        <SuccessButton />
      </div>
      <div className="text-center">
        <h1 className="mb-4 font-semibold">Sebastian</h1>
      </div>
    </div>
  )
}

export default MainContent