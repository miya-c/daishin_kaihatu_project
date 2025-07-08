import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const RoomSelect = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const propertyId = searchParams.get('propertyId');
  const propertyName = sessionStorage.getItem('selectedPropertyName');
  const gasWebAppUrl = sessionStorage.getItem('gasWebAppUrl');

  useEffect(() => {
    const fetchRooms = async () => {
      if (!propertyId || !gasWebAppUrl) {
        setError('物件情報が不足しています。物件選択画面からやり直してください。');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${gasWebAppUrl}?action=getRooms&propertyId=${propertyId}`);
        if (!response.ok) {
          throw new Error(`Network response was not ok. Status: ${response.status}`);
        }
        const data = await response.json();
        if (data.success === false) {
          throw new Error(`GASエラー: ${data.error || 'Unknown error'}`);
        }
        const actualData = data.data.rooms || data.data || data;
        setRooms(actualData);
        sessionStorage.setItem('selectedRooms', JSON.stringify(actualData));
      } catch (fetchError) {
        setError(`部屋情報の取得に失敗しました: ${fetchError.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, [propertyId, gasWebAppUrl]);

  const handleRoomSelect = (room) => {
    navigate(`/meter_reading?propertyId=${propertyId}&roomId=${room.id}`);
  };

  const handleCompleteInspection = async () => {
    if (!confirm('この物件の検針を完了しますか？')) return;

    try {
      const today = new Date();
      const completionDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const response = await fetch(`${gasWebAppUrl}?action=completeInspection&propertyId=${propertyId}&completionDate=${completionDate}`);
      const result = await response.json();
      if (result.success) {
        alert('検針完了日を保存しました。');
        navigate('/');
      } else {
        throw new Error(result.error || '検針完了処理に失敗しました');
      }
    } catch (error) {
      alert(`エラー: ${error.message}`);
    }
  };

  if (loading) return <div>部屋情報を読み込み中...</div>;
  if (error) return <div>エラー: {error}</div>;

  return (
    <div>
      <button onClick={() => navigate(-1)}>戻る</button>
      <h1>{propertyName || '部屋選択'}</h1>
      <div>
        {rooms.sort((a, b) => String(a.name || a['部屋名']).localeCompare(String(b.name || b['部屋名']), 'ja', { numeric: true })).map((room) => (
          <div key={room.id} onClick={() => handleRoomSelect(room)}>
            <p>{room.name || room['部屋名']}</p>
            <p>{room.readingStatus === 'completed' ? '検針済み' : '未検針'}</p>
          </div>
        ))}
      </div>
      <button onClick={handleCompleteInspection}>この物件の検針を完了する</button>
    </div>
  );
};

export default RoomSelect;
