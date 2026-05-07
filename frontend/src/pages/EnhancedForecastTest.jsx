// Simple test component to verify routing works
export default function EnhancedForecastTest() {
  return (
    <div style={{ padding: '40px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minHeight: '100vh', color: 'white' }}>
      <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>🎉 Enhanced Forecast Page Works!</h1>
      <p style={{ fontSize: '24px', marginBottom: '40px' }}>If you can see this, the routing is working correctly!</p>
      
      <div style={{ background: 'rgba(255,255,255,0.1)', padding: '30px', borderRadius: '20px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '32px', marginBottom: '15px' }}>✅ This is the NEW Enhanced Forecast Page</h2>
        <p style={{ fontSize: '18px' }}>This page should show:</p>
        <ul style={{ fontSize: '18px', marginTop: '15px', lineHeight: '2' }}>
          <li>☁️ Real-time Weather Data</li>
          <li>🎵 Upcoming Events</li>
          <li>🚇 Transit Disruptions</li>
          <li>✈️ Airport Traffic</li>
          <li>📊 24-Hour Enhanced Forecast</li>
          <li>🎯 30% Better Accuracy</li>
        </ul>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.1)', padding: '30px', borderRadius: '20px' }}>
        <h3 style={{ fontSize: '24px', marginBottom: '10px' }}>Current URL:</h3>
        <p style={{ fontSize: '18px', fontFamily: 'monospace' }}>{window.location.href}</p>
        <p style={{ fontSize: '16px', marginTop: '10px', opacity: 0.8 }}>
          Should be: http://localhost:5173/enhanced-forecast
        </p>
      </div>
    </div>
  );
}
