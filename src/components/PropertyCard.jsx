import React, { memo } from 'react';

// Memoized PropertyCard component to prevent unnecessary re-renders
const PropertyCard = memo(({ property, index, loading, isNavigating, onPropertySelect, formatCompletionDate }) => {
  const handleClick = () => {
    if (!(loading || isNavigating)) {
      onPropertySelect(property);
    }
  };

  const completionText = formatCompletionDate(property.completionDate);

  return (
    <div 
      data-property-id={property.id}
      className={`MuiCard-root ${(loading || isNavigating) ? 'MuiCard-disabled' : ''}`}
      onClick={handleClick}
      style={{
        opacity: (loading || isNavigating) ? 0.6 : 1,
        cursor: (loading || isNavigating) ? 'not-allowed' : 'pointer',
        animationDelay: `${index * 0.1}s`
      }}
    >
      <div className="MuiCardContent-root">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '16px'
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px',
              flexWrap: 'wrap'
            }}>
              <div className="MuiChip-root" style={{
                backgroundColor: 'var(--mui-palette-grey-100)',
                color: 'var(--mui-palette-grey-900)',
                fontSize: '0.875rem',
                fontWeight: 600,
                padding: '8px 12px',
                borderRadius: '12px',
                border: '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}>
                ID: {String(property.id || 'IDなし')}
              </div>
              
              {completionText && (
                <div className="MuiChip-root" style={{
                  backgroundColor: '#e8f5e8',
                  color: '#2e7d32',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '6px 10px',
                  borderRadius: '12px',
                  border: '1px solid #c8e6c9',
                  boxShadow: '0 2px 8px rgba(46, 125, 50, 0.15)'
                }}>
                  {completionText}
                </div>
              )}
            </div>
            
            <div className="MuiTypography-root" style={{
              fontSize: '1.125rem',
              fontWeight: 500,
              color: 'var(--mui-palette-grey-900)',
              lineHeight: 1.4,
              margin: 0,
              letterSpacing: '0.00938em'
            }}>
              {String(property.name || '名称なし')}
            </div>
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            color: 'var(--mui-palette-primary-main)',
            flexShrink: 0,
            transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
});

PropertyCard.displayName = 'PropertyCard';

export default PropertyCard;