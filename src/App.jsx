import './App.css'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import Game from './components/Game'
import Cases from './components/Cases.jsx'

function App() {
  return (
    <Router>
      <div>
        <Routes>
          <Route path="/" element={<Game />} />
          <Route path="/cases" element={<Cases />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App 