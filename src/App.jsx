import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PropertySelect from './pages/PropertySelect';
import RoomSelect from './pages/RoomSelect';
import MeterReading from './pages/MeterReading';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PropertySelect />} />
        <Route path="/property_select" element={<PropertySelect />} />
        <Route path="/room_select" element={<RoomSelect />} />
        <Route path="/meter_reading" element={<MeterReading />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
