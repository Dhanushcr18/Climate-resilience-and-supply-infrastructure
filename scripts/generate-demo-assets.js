const fs = require('fs');
const path = require('path');

// Ensure directories exist
const demoDir = path.join(__dirname, '..', 'public', 'demo-photos');
const samplesDir = path.join(__dirname, '..', 'public', 'samples');
fs.mkdirSync(demoDir, { recursive: true });
fs.mkdirSync(samplesDir, { recursive: true });

// 1. Valid minimal 1x1 or small JPEG buffer helper
// Standard 1x1 JPEG bytes
const minimalJpgBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
const jpgBuffer = Buffer.from(minimalJpgBase64, 'base64');

// Write the 3 bundled demo photos
fs.writeFileSync(path.join(demoDir, 'flood-deep.jpg'), jpgBuffer);
fs.writeFileSync(path.join(demoDir, 'landslide-blocked.jpg'), jpgBuffer);
fs.writeFileSync(path.join(demoDir, 'puddle-passable.jpg'), jpgBuffer);

// Also write metadata json describing the demo photos
const demoPhotosMeta = [
  {
    id: 'flood-deep',
    filename: 'flood-deep.jpg',
    title: 'Severe Flood - 55cm Inundation',
    suggestedEdgeId: 'HAS-MNG',
    edgeName: 'NH-75 Shiradi Ghat',
    expectedLabel: 'blocked',
    confidence: 0.94,
    waterDepthCm: 55,
    passable: false,
    description: 'Submerged dual carriageway with fast-moving turbulent brown water covering lane markers.'
  },
  {
    id: 'landslide-blocked',
    filename: 'landslide-blocked.jpg',
    title: 'Mountain Slope Debris & Mudslide',
    suggestedEdgeId: 'WYN-KZD',
    edgeName: 'NH-766 Thamarassery Ghat',
    expectedLabel: 'blocked',
    confidence: 0.92,
    waterDepthCm: 15,
    passable: false,
    description: 'Boulders and mud washed across hairpin bend, blocking both lanes completely.'
  },
  {
    id: 'puddle-passable',
    filename: 'puddle-passable.jpg',
    title: 'Shallow Surface Puddling',
    suggestedEdgeId: 'BLR-MYS',
    edgeName: 'NH-275 Mysore Expressway',
    expectedLabel: 'clear',
    confidence: 0.88,
    waterDepthCm: 8,
    passable: true,
    description: 'Rain runoff with minor puddling along curb; center lane asphalt fully passable.'
  }
];

fs.writeFileSync(
  path.join(demoDir, 'manifest.json'),
  JSON.stringify(demoPhotosMeta, null, 2)
);

// 2. Sample Official Alerts JSON
const sampleAlerts = [
  {
    id: 'ALERT-NDMA-2026-081',
    agency: 'National Disaster Management Authority (NDMA)',
    issuedAt: '2026-11-20T14:30:00Z',
    severity: 'Extreme',
    event: 'Flash Flood & Mudslide',
    corridorId: 'HAS-MNG',
    corridorName: 'NH-75 Shiradi Ghat',
    headline: 'Red Alert: Shiradi Ghat corridor closed due to major road collapse',
    instructions: 'All heavy commercial freight traffic held at Sakleshpur interchange. Avoid NH-75.',
    status: 'blocked',
    confidence: 0.98
  },
  {
    id: 'ALERT-KSDMA-2026-104',
    agency: 'Kerala State Disaster Management Authority',
    issuedAt: '2026-11-20T15:00:00Z',
    severity: 'Severe',
    event: 'River Spate & Waterlogging',
    corridorId: 'TSR-KCH',
    corridorName: 'NH-544 Periyar Lowland',
    headline: 'Orange Alert: Periyar river rising above warning levels near Aluva',
    instructions: 'Commercial vehicles advised caution; slow movement reported.',
    status: 'degraded',
    confidence: 0.82
  }
];

fs.writeFileSync(
  path.join(samplesDir, 'alerts-sample.json'),
  JSON.stringify(sampleAlerts, null, 2)
);

// 3. Sample Satellite GeoJSON
const sampleSatelliteGeoJson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        satellite: 'Sentinel-1 SAR C-Band',
        passHour: 18,
        correlatedEdgeId: 'HAS-MNG',
        surfaceWaterConfidence: 0.95
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [75.60, 12.85],
            [75.80, 12.95],
            [75.85, 12.88],
            [75.65, 12.78],
            [75.60, 12.85]
          ]
        ]
      }
    }
  ]
};

fs.writeFileSync(
  path.join(samplesDir, 'satellite-flood-sample.geojson'),
  JSON.stringify(sampleSatelliteGeoJson, null, 2)
);

console.log('Demo assets and sample files generated successfully.');
