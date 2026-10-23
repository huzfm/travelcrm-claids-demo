// Development-only PDF preview page
// Use: http://localhost:3000/preview/pdf

'use client';

import { useState } from 'react';

export default function PDFPreviewPage() {
  const [, setPreviewType] = useState<'single' | 'multi' | null>(null);
  const [sampleData, setSampleData] = useState<any>(null);

  const generateSampleData = () => {
    const days = Array.from({ length: 3 }, (_, i) => ({
      dayNumber: i + 1,
      destination: `Destination ${i + 1}`,
      hotel: `Hotel ${i + 1}`,
      hotelAddress: `${i + 1} Hotel Street, City`,
      hotelStars: 4,
      hotelImage: 'https://picsum.photos/seed/hotel' + (i + 1) + '/400/300',
      selectedRoomType: { name: 'Deluxe', bedType: 'Double', basePrice: 100 + i * 20 },
      numberOfRooms: 1,
      images: [],
      activities: [],
      vehicleName: `Vehicle ${i + 1}`,
      vehicleImage: 'https://picsum.photos/seed/vehicle' + (i + 1) + '/400/300',
    }));

    const itinerary = {
      title: 'Sample Itinerary',
      destination: 'Dubai',
      branch: {
        name: 'Tripoday',
        email: 'info@claidspheresolutions.com',
        address: '123 Main Street, Dubai, UAE',
        whatsappNumber: '+971501234567',
      },
      leads: [],
      quotes: [],
      options: [],
    };

    setSampleData({ itinerary, days });
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>PDF Preview</h1>

      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => setPreviewType('single')} style={btnStyle}>
          Single Option PDF
        </button>
        <button onClick={() => setPreviewType('multi')} style={{ ...btnStyle, marginLeft: '10px' }}>
          Multi Option PDF
        </button>
        <button onClick={generateSampleData} style={{ ...btnStyle, marginLeft: '10px' }}>
          Load Sample Data
        </button>
      </div>

      {!sampleData && (
        <p>Click &quot;Load Sample Data&quot; to generate sample days for preview.</p>
      )}

      {sampleData && (
        <div style={{ border: '1px solid #ccc', padding: '20px', marginTop: '20px' }}>
          <h3>Loaded {sampleData.days.length} days</h3>
          <p>Hotel: {sampleData.days[0]?.hotel}</p>
          <p>Hotel Image: {sampleData.days[0]?.hotelImage}</p>
        </div>
      )}

      <div style={{ marginTop: '40px' }}>
        <h3>Test Hotel Image Preloading</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ width: '200px', border: '1px solid #eee', padding: '10px' }}>
              <img
                src={`https://picsum.photos/seed/hotel${i}/400/300`}
                alt={`Hotel ${i}`}
                style={{ width: '100%', height: '100px', objectFit: 'cover' }}
                onError={e => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <p>Hotel {i}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const btnStyle = {
  padding: '10px 20px',
  fontSize: '14px',
  cursor: 'pointer',
  backgroundColor: '#1a1918',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
};
