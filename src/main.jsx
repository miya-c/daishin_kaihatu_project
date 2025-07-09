import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import PropertySelect from './components/PropertySelect.jsx'
import RoomSelect from './components/RoomSelect.jsx'
import MeterReading from './components/MeterReading.jsx'
import './styles/main.css'

// Create root and render app with routing
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<PropertySelect />} />
        <Route path="/property_select" element={<PropertySelect />} />
        <Route path="/room_select" element={<RoomSelect />} />
        <Route path="/meter_reading" element={<MeterReading />} />
      </Routes>
    </Router>
  </React.StrictMode>
)