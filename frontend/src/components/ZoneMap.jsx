import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { api } from '../lib/axios';
import 'leaflet/dist/leaflet.css';

function getColor(pickups, maxPickups) {
  const ratio = pickups / (maxPickups || 1);
  if (ratio > 0.7) return '#ef4444'; // Red (Very High)
  if (ratio > 0.4) return '#f97316'; // Orange (High)
  if (ratio > 0.15) return '#f59e0b'; // Amber (Medium)
  return '#fbbf24'; // Yellow (Low)
}

// Fit bounds component
function FitBounds() {
  const map = useMap();
  useEffect(() => {
    map.fitBounds([
      [40.49, -74.26],
      [40.92, -73.68],
    ]);
  }, [map]);
  return null;
}

export default function ZoneMap() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredZone, setHoveredZone] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/zones/heatmap_data');
        setData(res.data);
      } catch (e) {
        console.error("Map data failed to load", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Map zones to their geographic positions returned from API
  const zonesWithPositions = useMemo(() => {
    return data
      .filter(z => z.latitude !== null && z.longitude !== null)
      .map(z => ({
        ...z,
        position: [z.latitude, z.longitude],
        pickups: z.value || 0
      }));
  }, [data]);

  const maxPickups = useMemo(() => {
    return Math.max(...data.map(z => z.value || 0), 1);
  }, [data]);

  if (loading) {
    return (
      <div className="h-[450px] rounded-2xl border border-[#222] bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-10 w-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Zone Map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden border border-[#222]" style={{ height: '450px' }}>
      <MapContainer
        center={[40.7128, -74.0060]}
        zoom={11}
        style={{ height: '100%', width: '100%', background: '#0a0a0a' }}
        zoomControl={false}
        attributionControl={false}
      >
        <FitBounds />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; CARTO'
        />

        {zonesWithPositions.map((zone) => {
          const pickups = zone.pickups;
          const radius = Math.max(4, Math.min(18, (pickups / maxPickups) * 18));
          const color = getColor(pickups, maxPickups);

          return (
            <CircleMarker
              key={zone.location_id || zone.name}
              center={zone.position}
              radius={radius}
              pathOptions={{
                fillColor: color,
                fillOpacity: 0.65,
                color: color,
                weight: 1.5,
                opacity: 0.9,
              }}
              eventHandlers={{
                mouseover: (e) => {
                  setHoveredZone(zone);
                  e.target.setStyle({ fillOpacity: 1, weight: 3 });
                },
                mouseout: (e) => {
                  setHoveredZone(null);
                  e.target.setStyle({ fillOpacity: 0.65, weight: 1.5 });
                },
              }}
            >
              <Popup>
                <div style={{ fontFamily: 'Sora, sans-serif', padding: '2px 0' }}>
                  <p style={{ fontWeight: 700, fontSize: '13px', margin: 0, color: '#111' }}>{zone.name}</p>
                  <p style={{ fontSize: '11px', color: '#777', margin: '2px 0' }}>{zone.borough}</p>
                  <p style={{ fontWeight: 700, fontSize: '15px', color: color, margin: '4px 0 0' }}>
                    {pickups.toLocaleString()} rides
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-[#111]/90 backdrop-blur-sm border border-[#333] rounded-xl px-3 py-2.5 text-xs">
        <p className="text-white font-bold mb-1.5">Demand Intensity</p>
        <div className="flex flex-col gap-1">
          {[
            { color: '#ef4444', label: 'Very High' },
            { color: '#f97316', label: 'High' },
            { color: '#f59e0b', label: 'Medium' },
            { color: '#fbbf24', label: 'Low' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-slate-400">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hovered zone tooltip */}
      {hoveredZone && (
        <div className="absolute top-4 right-4 z-[1000] bg-[#111]/90 backdrop-blur-sm border border-[#333] rounded-xl px-4 py-3">
          <p className="text-white font-bold text-sm">{hoveredZone.name}</p>
          <p className="text-slate-400 text-xs">{hoveredZone.borough}</p>
          <p className="text-orange-400 font-bold text-lg mt-1">{(hoveredZone.pickups || 0).toLocaleString()} rides</p>
        </div>
      )}
    </div>
  );
}
