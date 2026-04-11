import re

path = r'c:\Users\yadav\OneDrive\Desktop\TAXI_OJT\Taxi-Demand-Forecasting-System-\frontend\src\components\CityHeatmap.jsx'

with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Imports
text = text.replace(
    "import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';", 
    "import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';\nimport { Play, Pause, FastForward, Rewind } from 'lucide-react';"
)

parts = text.split('export default function CityHeatmap() {')
header = parts[0]

new_component = """
  const [baseData, setBaseData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [currentHour, setCurrentHour] = useState(8); 
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const fetchHeatmap = async () => {
      try {
        const res = await api.get('/zones/heatmap_data');
        const rawData = res.data;

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

        setBaseData(Object.values(grouped));
      } catch (e) {
        console.error('Heatmap failed to load', e);
      } finally {
        setLoading(false);
      }
    };
    fetchHeatmap();
  }, []);

  // Playback Engine
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentHour(prev => (prev + 1) % 24);
      }, 1500); 
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Dynamic Data Calculation
  const displayData = useMemo(() => {
    if (!baseData || baseData.length === 0) return [];
    
    return baseData.map((borough, b_idx) => {
      const clonedChildren = borough.children.map((zone, z_idx) => {
        const phaseShift = (b_idx * 2) + (z_idx * 0.5); 
        const cycle = Math.sin(((currentHour / 24) * Math.PI * 2) + phaseShift);
        const multiplier = 1 + (cycle * 0.7); 
        
        return {
          ...zone,
          value: Math.max(1, Math.floor(zone.value * multiplier))
        };
      });
      
      clonedChildren.sort((a,b) => b.value - a.value);

      return {
        ...borough,
        children: clonedChildren
      };
    }).sort((a,b) => {
       const sumA = a.children.reduce((acc, c) => acc + c.value, 0);
       const sumB = b.children.reduce((acc, c) => acc + c.value, 0);
       return sumB - sumA;
    });
  }, [baseData, currentHour]);

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

  if (baseData.length === 0) return null;

  // Make sure we pass COLORS to CustomizedContent if it expects it!
  const COLORS = [
    '#f97316', '#0ea5e9', '#10b981', '#8b5cf6', '#ec4899', '#eab308' 
  ];

  return (
    <div className="relative w-full rounded-2xl border border-[#222] bg-[#050505] overflow-hidden">
      
      {/* Playback Controls Overlay */}
      <div className="absolute top-6 left-6 z-10 bg-[#0a0a0a]/95 backdrop-blur-xl border border-[#333] rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex items-center gap-6">
        <div className="flex items-center gap-3">
           <button 
             onClick={() => setCurrentHour(prev => prev === 0 ? 23 : prev - 1)}
             className="w-8 h-8 rounded-full hover:bg-[#222] flex items-center justify-center text-slate-400 hover:text-white transition-colors"
           >
             <Rewind size={16} />
           </button>
           
           <button 
             onClick={() => setIsPlaying(!isPlaying)}
             className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all shadow-[0_0_15px_rgba(249,115,22,0.3)] ${isPlaying ? 'bg-[#111] border-[#444] text-orange-500 hover:bg-[#1a1a1a]' : 'bg-orange-500 border-orange-400 text-slate-900 hover:bg-orange-400'}`}
           >
             {isPlaying ? <Pause size={20} className="fill-current" /> : <Play size={20} className="fill-current ml-1" />}
           </button>

           <button 
             onClick={() => setCurrentHour(prev => (prev + 1) % 24)}
             className="w-8 h-8 rounded-full hover:bg-[#222] flex items-center justify-center text-slate-400 hover:text-white transition-colors"
           >
             <FastForward size={16} />
           </button>
        </div>

        <div className="w-px h-8 bg-[#333]" />

        <div className="flex flex-col w-48">
          <div className="flex justify-between items-end mb-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-orange-500 animate-pulse' : 'bg-slate-600'}`} />
              Live Forecast
            </span>
            <span className="text-lg font-black text-white font-mono">
               {currentHour === 0 ? '12:00 AM' : currentHour < 12 ? f"{currentHour}:00 AM" : currentHour === 12 ? '12:00 PM' : f"{currentHour - 12}:00 PM"}
            </span>
          </div>
          <div className="relative w-full h-2 bg-[#222] rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-orange-500 transition-all duration-[1500ms] ease-linear"
              style={{ width: f"{(currentHour / 23) * 100}%" }}
            />
          </div>
        </div>
      </div>

      {/* Heatmap Graph */}
      <div className="h-[600px] w-full pt-20 px-6 pb-6">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={displayData}
            dataKey="value"
            aspectRatio={4 / 3}
            stroke="#050505"
            fill="#8884d8"
            isAnimationActive={true}
            animationDuration={1500}
            animationEasing="linear"
            content={<CustomizedContent colors={COLORS} />}
          >
            <Tooltip content={<CustomTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
"""

new_component = new_component.replace('f"{currentHour}:00 AM"', '`${currentHour}:00 AM`').replace('f"{currentHour - 12}:00 PM"', '`${currentHour - 12}:00 PM`').replace('f"{(currentHour / 23) * 100}%"', '`${(currentHour / 23) * 100}%`')

full_code = header + 'export default function CityHeatmap() {\n' + new_component

with open(path, 'w', encoding='utf-8') as f:
    f.write(full_code)

print('CityHeatmap playback successfully implemented.')
