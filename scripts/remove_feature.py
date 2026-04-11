import re

path = r'c:\Users\yadav\OneDrive\Desktop\TAXI_OJT\Taxi-Demand-Forecasting-System-\frontend\src\pages\Dashboard.jsx'
with open(path, 'r', encoding='utf-8') as f: text = f.read()

# 1. Remove the mounting block
mount_block = """      {/* Driver Optimal Shift Feature */}
      {user?.role === 'driver' && (
        <section className="mb-6">
          <DriverShiftConfigurator zones={zones} />
        </section>
      )}"""
text = text.replace(mount_block, "")

# 2. Extract and remove the DriverShiftConfigurator component definition
start_idx = text.find("function DriverShiftConfigurator")
if start_idx != -1:
    end_idx = text.find("export default function Dashboard() {")
    if end_idx != -1:
        text = text[:start_idx] + text[end_idx:]

with open(path, 'w', encoding='utf-8') as f: f.write(text)
print("Removed Optimal Shift Configurator")
