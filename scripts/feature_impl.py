import re

path_heatmap = r'c:\Users\yadav\OneDrive\Desktop\TAXI_OJT\Taxi-Demand-Forecasting-System-\frontend\src\components\CityHeatmap.jsx'
with open(path_heatmap, 'r', encoding='utf-8') as f: 
    text_hm = f.read()

# Replace Imports
text_hm = text_hm.replace(
    "import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';",
    "import { Treemap, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';\nimport { X } from 'lucide-react';"
)

text_hm = text_hm.replace(
    "const { depth, x, y, width, height, index, name } = props;",
    "const { depth, x, y, width, height, index, name, onZoneClick } = props;"
)

text_hm = text_hm.replace(
    "<g>",
    "<g onClick={() => onZoneClick && onZoneClick({ name, value: props.value, index })}>"
)

replacement_state = """
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
"""

text_hm = text_hm.replace("""export default function CityHeatmap() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);""", replacement_state)

text_hm = text_hm.replace("content={<CustomizedContent colors={COLORS} />}", "content={<CustomizedContent colors={COLORS} onZoneClick={setSelectedZone} />}")

modal_ui = """
      {selectedZone && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-[#0f0f0f] border border-[#333] rounded-3xl w-full max-w-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col">
              <div className="flex justify-between items-center px-6 py-4 border-b border-[#222] bg-[#1a1a1a]">
                 <div>
                   <p className="text-cyan-500 font-bold tracking-widest text-xs uppercase mb-1">Zone Analytics</p>
                   <h3 className="text-white text-xl font-bold">{selectedZone.name}</h3>
                 </div>
                 <button onClick={() => setSelectedZone(null)} className="w-10 h-10 rounded-full hover:bg-[#333] flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer">
                    <X size={20} />
                 </button>
              </div>
              <div className="p-6 h-[350px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getSimulatedHourlyData(selectedZone.value)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                      <XAxis dataKey="time" stroke="#666" tick={{fill: '#888', fontSize: 12}} tickMargin={10} minTickGap={20} />
                      <YAxis stroke="#666" tick={{fill: '#888', fontSize: 12}} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '12px' }}
                        itemStyle={{ color: '#0ea5e9', fontWeight: 'bold' }}
                      />
                      <Line type="monotone" dataKey="demand" stroke="#0ea5e9" strokeWidth={4} dot={false} activeDot={{ r: 8, fill: '#0ea5e9', stroke: '#fff', strokeWidth: 2 }} />
                    </LineChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>
      )}
    </div>
  );
"""

text_hm = text_hm.replace("    </div>\n  );\n}", modal_ui + "\n}")
with open(path_heatmap, 'w', encoding='utf-8') as f: f.write(text_hm)
print("Updated CityHeatmap.jsx")

path_dash = r'c:\Users\yadav\OneDrive\Desktop\TAXI_OJT\Taxi-Demand-Forecasting-System-\frontend\src\pages\Dashboard.jsx'
with open(path_dash, 'r', encoding='utf-8') as f: text_dash = f.read()

configurator_component = """
function DriverShiftConfigurator({ zones }) {
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("16:00");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const calculateOptimalShift = () => {
    setLoading(true);
    setTimeout(() => {
       // Mocked AI Output
       setResult({
           projectedFares: Math.floor(Math.random() * 200) + 150,
           estRides: Math.floor(Math.random() * 15) + 12,
           startZone: "Upper East Side South",
           midZone: "Midtown Center",
           endZone: "JFK Airport"
       });
       setLoading(false);
    }, 1200);
  };

  return (
    <div className="rounded-3xl border border-[#222] bg-[#0a0a0a] overflow-hidden p-6 relative shadow-2xl">
      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-[50px] pointer-events-none" />
      <p className="text-cyan-400 text-xs font-bold uppercase tracking-[0.3em] mb-4">Solo Driver Tactics</p>
      <h3 className="text-2xl font-extrabold text-white mb-2">Optimal Shift Configurator</h3>
      <p className="text-slate-400 text-sm mb-6 max-w-2xl">Input your intended driving hours and our AI will simulate the optimal zone route to maximize your projected fare capture.</p>
      
      <div className="flex flex-col md:flex-row gap-4 mb-8">
         <div className="flex-1 border border-[#333] rounded-xl p-4 bg-[#111]">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Shift Start</label>
            <input type="time" value={start} onChange={e => setStart(e.target.value)} className="w-full bg-transparent text-white font-bold text-lg outline-none custom-time-input p-1" style={{ colorScheme: 'dark' }} />
         </div>
         <div className="flex-1 border border-[#333] rounded-xl p-4 bg-[#111]">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Shift End</label>
            <input type="time" value={end} onChange={e => setEnd(e.target.value)} className="w-full bg-transparent text-white font-bold text-lg outline-none custom-time-input p-1" style={{ colorScheme: 'dark' }} />
         </div>
         <button onClick={calculateOptimalShift} disabled={loading} className="w-full md:w-auto px-8 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50">
            {loading ? 'Simulating...' : 'Calculate Route'}
         </button>
      </div>

      {result && (
         <div className="border border-cyan-500/30 bg-cyan-950/20 rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-2">
            <h4 className="text-white font-bold text-lg mb-4">Recommended Shift Itinerary</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                   <p className="text-cyan-400 text-sm font-bold mb-1">Start Here</p>
                   <p className="text-white font-medium">{result.startZone}</p>
                </div>
                <div>
                   <p className="text-cyan-400 text-sm font-bold mb-1">Peak Mid-Shift Migration</p>
                   <p className="text-white font-medium">{result.midZone}</p>
                </div>
                <div>
                   <p className="text-cyan-400 text-sm font-bold mb-1">End Shift Near</p>
                   <p className="text-white font-medium">{result.endZone}</p>
                </div>
            </div>
            
            <div className="h-px w-full bg-[#333] my-6" />
            
            <div className="flex items-center gap-8">
               <div>
                  <p className="text-slate-400 text-sm mb-1">Projected Fares</p>
                  <p className="text-white text-3xl font-black">${result.projectedFares}</p>
               </div>
               <div>
                  <p className="text-slate-400 text-sm mb-1">Estimated Optimal Rides</p>
                  <p className="text-white text-3xl font-black">{result.estRides}</p>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}

"""

text_dash = text_dash.replace("export default function Dashboard() {", configurator_component + "export default function Dashboard() {")

mounting_code = """
      {/* Driver Optimal Shift Feature */}
      {user?.role === 'driver' && (
        <section className="mb-6">
          <DriverShiftConfigurator zones={zones} />
        </section>
      )}
"""
text_dash = text_dash.replace("{/* Driver AI Dispatch Feature */}", mounting_code + "      {/* Driver AI Dispatch Feature */}")

with open(path_dash, 'w', encoding='utf-8') as f: f.write(text_dash)
print("Updated Dashboard.jsx")
