import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const MapView = () => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (!mapInstance.current && mapRef.current) {
      mapInstance.current = L.map(mapRef.current).setView([4.95, 7.93], 8);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(mapInstance.current);

      // Sample facilities
      const facilities = [
        { name: 'Ikot Abasi PHC', lat: 4.57, lng: 7.56, coverage: 82, risk: 'high' },
        { name: 'Eastern Obolo HC', lat: 4.53, lng: 7.75, coverage: 79, risk: 'high' },
        { name: 'Uyo General Hospital', lat: 5.03, lng: 7.92, coverage: 89, risk: 'low' },
        { name: 'Itu Health Centre', lat: 5.20, lng: 7.98, coverage: 93, risk: 'low' },
        { name: 'Mkpat Enin Clinic', lat: 4.73, lng: 7.82, coverage: 91, risk: 'medium' },
      ];

      facilities.forEach(f => {
        const color = f.risk === 'high' ? '#F44336' : f.risk === 'medium' ? '#FF9800' : '#4CAF50';
        L.circleMarker([f.lat, f.lng], {
          radius: 12,
          fillColor: color,
          color: '#fff',
          weight: 2,
          fillOpacity: 0.8,
        })
        .bindPopup(`<b>${f.name}</b><br>Coverage: ${f.coverage}%<br>Risk: ${f.risk.toUpperCase()}`)
        .addTo(mapInstance.current);
      });

      // Heat spots
      L.circle([4.57, 7.56], { radius: 15000, color: '#F44336', fillOpacity: 0.1, weight: 2 }).addTo(mapInstance.current);
      L.circle([4.53, 7.75], { radius: 12000, color: '#FF9800', fillOpacity: 0.1, weight: 2 }).addTo(mapInstance.current);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  return <Box ref={mapRef} sx={{ width: '100%', height: '100%', borderRadius: 1 }} />;
};

export default MapView;