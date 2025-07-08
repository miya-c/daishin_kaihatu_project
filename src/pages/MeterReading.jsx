import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const MeterReading = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meterReadings, setMeterReadings] = useState([]);
  const [propertyName, setPropertyName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [allRooms, setAllRooms] = useState([]);
  const [currentRoomIndex, setCurrentRoomIndex] = useState(-1);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const propertyId = searchParams.get('propertyId');
  const roomId = searchParams.get('roomId');
  const gasWebAppUrl = sessionStorage.getItem('gasWebAppUrl');

  const fetchMeterReadings = useCallback(async (pId, rId) => {
    if (!gasWebAppUrl) return;
    setLoading(true);
    try {
      const response = await fetch(`${gasWebAppUrl}?action=getMeterReadings&propertyId=${pId}&roomId=${rId}`);
      if (!response.ok) throw new Error('Network response was not ok.');
      const data = await response.json();
      if (data.success === false) throw new Error(data.error || '検針データの取得に失敗');
      
      setPropertyName(data.data.propertyName || '');
      setRoomName(data.data.roomName || '');
      setMeterReadings(data.data.readings || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [gasWebAppUrl]);

  useEffect(() => {
    const rooms = JSON.parse(sessionStorage.getItem('selectedRooms') || '[]');
    const filteredRooms = rooms.filter(room => room.readingStatus !== 'not-needed');
    setAllRooms(filteredRooms);

    if (propertyId && roomId) {
      fetchMeterReadings(propertyId, roomId);
      const currentIndex = filteredRooms.findIndex(room => String(room.id) === String(roomId));
      setCurrentRoomIndex(currentIndex);
    }
  }, [propertyId, roomId, fetchMeterReadings]);

  const navigateToRoom = (index) => {
    if (index >= 0 && index < allRooms.length) {
      const nextRoom = allRooms[index];
      navigate(`/meter_reading?propertyId=${propertyId}&roomId=${nextRoom.id}`);
    }
  };

  const handleUpdateReadings = async () => {
    // This is a simplified version. 
    // In a real app, you would get the updated values from the form fields.
    alert('検針データを更新しました（ダミー処理）');
  };

  if (loading) return <div>検針データを読み込み中...</div>;
  if (error) return <div>エラー: {error}</div>;

  return (
    <div>
      <button onClick={() => navigate(`/room_select?propertyId=${propertyId}`)}>部屋選択に戻る</button>
      <h1>{propertyName} - {roomName}</h1>
      
      <div>
        {meterReadings.map((reading, index) => (
          <div key={index}>
            <p>検針日時: {reading.date}</p>
            <p>今回指示数: <input type="number" defaultValue={reading.currentReading} /></p>
            <p>前回指示数: {reading.previousReading}</p>
            <p>使用量: {reading.usage}</p>
          </div>
        ))}
      </div>

      <button onClick={handleUpdateReadings}>更新</button>

      <div>
        <button onClick={() => navigateToRoom(currentRoomIndex - 1)} disabled={currentRoomIndex <= 0}>前の部屋</button>
        <span>{currentRoomIndex + 1} / {allRooms.length}</span>
        <button onClick={() => navigateToRoom(currentRoomIndex + 1)} disabled={currentRoomIndex >= allRooms.length - 1}>次の部屋</button>
      </div>
    </div>
  );
};

export default MeterReading;
