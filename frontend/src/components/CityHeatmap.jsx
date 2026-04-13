import { useMemo, useState, useEffect } from 'react';
import { Treemap, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { X } from 'lucide-react';
import { api } from '../lib/axios';

// Warm-toned gradient: Yellow -> Amber -> Orange -> Red -> Maroon
const COLORS = [
  '#fbbf24', // Amber/Yellow (Highest Traffic)
  '#f59e0b', // Amber
  '#f97316', // Orange
  '#ef4444', // Red
  '#8e2b4b', // Maroon (Soft) 
  '#6e1a37'  // Maroon (Lowest Traffic - Primary)
];

const CustomizedContent = (props) => {
  const { depth, x, y, width, height, index, name, onZoneClick } = props;

  // Render visual blocks strictly for Boroughs (Depth 1) using the Cool Palette!
  if (depth === 1) {
    // Treemap sorts children by value descending, so index 0 is the absolute highest traffic.
    // We map the index directly to our Heat scale (0 = blinding yellow, 12+ = nearly black red).
    const heatIndex = Math.min(index, COLORS.length - 1);
    const heatColor = COLORS[heatIndex];

    return (
      <g onClick={() => onZoneClick && onZoneClick({ name, value: props.value, index })}>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: heatColor,
            stroke: '#111111',
            strokeWidth: 3,
            transition: 'all 0.3s ease',
          }}
          className="cursor-crosshair hover:brightness-125"
        />
        {width > 50 && height > 30 ? (
          <text
            x={x + width / 2}
            y={y + height / 2 + 5}
            textAnchor="middle"
            fill="#ffffff"
            fontSize={height > 100 ? 26 : 16}
            fontWeight="700"
            style={{ fontFamily: 'Sora, sans-serif', pointerEvents: 'none' }}
          >
            {name}
          </text>
        ) : null}
      </g>
    );
  }
  return null;
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-xl border border-[#333] bg-[#0a0a0a]/95 backdrop-blur-md p-4 shadow-2xl">
        <p className="text-white font-bold text-lg mb-1">{data.name}</p>
        <div className="flex items-center justify-between gap-4">
          <p className="text-slate-400 text-sm">7-Day Traffic:</p>
          <p className="text-orange-500 font-black text-xl">{data.value.toLocaleString()}</p>
        </div>
      </div>
    );
  }
  return null;
};


export default function CityHeatmap() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState(null);

  // Generate 24-hour mock data for the selected zone
  const getSimulatedHourlyData = (baseValue) => {
    const hours = [];
    const baseHourTraffic = Math.floor(baseValue / 7 / 24) || 10; 
    
    for (let i = 0; i < 24; i++) {
        // Create an organic double-peak curve (Morning rush, Evening rush)
        const mathPhase = Math.sin((i / 24) * Math.PI * 4);
        const randJitter = (Math.random() * 0.4) + 0.8;
        const val = Math.max(5, Math.floor(baseHourTraffic * (1 + (mathPhase * 0.6)) * randJitter));
        
        hours.push({
            time: i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i-12} PM`,
            demand: val
        });
    }
    return hours;
  };


  useEffect(() => {
    const fetchHeatmap = async () => {
      try {
        const res = await api.get('/zones/heatmap_data');
        const rawData = res.data;

        // Group by Borough to satisfy Recharts Treemap data structure
        const grouped = rawData.reduce((acc, curr) => {
          if (!acc[curr.borough]) {
            acc[curr.borough] = { name: curr.borough, children: [] };
          }
          acc[curr.borough].children.push({
            name: curr.name,
            value: curr.value
          });
          return acc;
        }, {});

        setData(Object.values(grouped));
      } catch (e) {
        console.error("Heatmap failed to load", e);
      } finally {
        setLoading(false);
      }
    };
    fetchHeatmap();
  }, []);

  if (loading) {
    return (
      <div className="h-[400px] rounded-2xl border border-[#222] bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-10 w-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Compiling City Heatmap...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) return null;

  return (
    <div className="relative w-full h-[500px]">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={data}
          dataKey="value"
          aspectRatio={4 / 3}
          stroke="#fff"
          fill="#8884d8"
          content={<CustomizedContent colors={COLORS} onZoneClick={setSelectedZone} />}
        >
          <Tooltip content={<CustomTooltip />} />
        </Treemap>
      </ResponsiveContainer>

      {selectedZone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-lg animate-in fade-in duration-200">
           <div className="bg-[#0a0a0a] border border-[#333] rounded-3xl w-full max-w-4xl shadow-[0_0_50px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col">
              <div className="flex justify-between items-center px-6 py-4 border-b border-[#222] bg-[#1a1a1a]">
                 <div>
                   <p className="text-orange-500 font-bold tracking-widest text-xs uppercase mb-1">Zone Analytics</p>
                   <h3 className="text-white text-xl font-bold">{selectedZone.name}</h3>
                 </div>
                 <button onClick={() => setSelectedZone(null)} className="w-10 h-10 rounded-full hover:bg-[#333] flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer">
                    <X size={20} />
                 </button>
              </div>
              <div className="p-6 h-[400px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getSimulatedHourlyData(selectedZone.value)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                      <XAxis dataKey="time" stroke="#666" tick={{fill: '#888', fontSize: 12}} tickMargin={10} minTickGap={20} />
                      <YAxis stroke="#666" tick={{fill: '#888', fontSize: 12}} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '12px' }}
                        itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                      />
                      <Line type="monotone" dataKey="demand" stroke="#10b981" strokeWidth={4} dot={false} activeDot={{ r: 8, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                    </LineChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>
      )}
    </div>
  );

}
