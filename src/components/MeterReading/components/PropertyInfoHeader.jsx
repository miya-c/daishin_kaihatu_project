import React from 'react';

const PropertyInfoHeader = ({ propertyName, roomName }) => (
  <div className="property-info-card">
    <h2 className="property-name">{String(propertyName || '物件名未設定')}</h2>
    <p className="room-info">部屋: {String(roomName || '部屋名未設定')}</p>
  </div>
);

export default PropertyInfoHeader;
