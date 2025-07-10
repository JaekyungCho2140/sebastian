import React from 'react'
import SuccessButton from './SuccessButton'

const MainContent: React.FC = () => {
  return (
    <div className="main-content">
      <div className="text-center">
        <h1 className="mb-4 font-semibold">Sebastian Demo</h1>
        <p className="mb-4">Electron-Vite-React 애플리케이션</p>
        <SuccessButton />
      </div>
    </div>
  )
}

export default MainContent