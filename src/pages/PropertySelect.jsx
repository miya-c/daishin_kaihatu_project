import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const PropertySelect = () => {
  const [properties, setProperties] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const gasWebAppUrl = import.meta.env.VITE_GAS_WEB_APP_URL;

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await fetch(`${gasWebAppUrl}?action=getProperties`);
        if (!response.ok) {
          throw new Error(`Network response was not ok. Status: ${response.status}`);
        }
        const data = await response.json();
        if (data.success === false) {
          throw new Error(`GASエラー: ${data.error || 'Unknown error'}`);
        }
        const actualData = data.data || data;
        setProperties(actualData);
      } catch (fetchError) {
        setError(`物件情報の取得に失敗しました: ${fetchError.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [gasWebAppUrl]);

  const handlePropertySelect = (property) => {
    sessionStorage.setItem('selectedPropertyId', String(property.id));
    sessionStorage.setItem('selectedPropertyName', String(property.name));
    sessionStorage.setItem('gasWebAppUrl', gasWebAppUrl);
    navigate(`/room_select?propertyId=${encodeURIComponent(property.id)}`);
  };

  const filteredProperties = properties.filter(property => {
    const propertyIdString = String(property.id != null ? property.id : '');
    const propertyNameString = String(property.name != null ? property.name : '');
    return propertyIdString.toLowerCase().includes(searchTerm.toLowerCase()) ||
           propertyNameString.toLowerCase().includes(searchTerm.toLowerCase());
  }).sort((a, b) => {
    const idA = String(a.id || '').trim();
    const idB = String(b.id || '').trim();
    return idA.localeCompare(idB, 'ja', { numeric: true, sensitivity: 'base' });
  });

  if (loading) return <div>物件情報を読み込み中です...</div>;
  if (error) return <div>エラー: {error}</div>;

  return (
    <div>
      <h1>物件選択</h1>
      <input
        type="text"
        placeholder="物件IDまたは物件名で検索..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <div>
        {filteredProperties.map((property) => (
          <div key={property.id} onClick={() => handlePropertySelect(property)}>
            <p>ID: {property.id}</p>
            <p>{property.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PropertySelect;
