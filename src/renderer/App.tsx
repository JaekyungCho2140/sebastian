import React from 'react'
import MainContent from './components/MainContent'
import Footer from './components/Footer'

const App: React.FC = () => {
  return (
    <div className="app-container">
      <MainContent />
      <Footer />
    </div>
  )
}

export default App