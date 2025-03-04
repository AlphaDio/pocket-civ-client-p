import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Game from './components/Game'

function App() {
  return (
    <Router>
      <div>
        <Routes>
          <Route path="/" element={<Game />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App 