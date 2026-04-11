path = r'c:\Users\yadav\OneDrive\Desktop\TAXI_OJT\Taxi-Demand-Forecasting-System-\frontend\src\pages\Dashboard.jsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# We only want to replace cyan with emerald inside DriverShiftConfigurator.
# Let's find the start of DriverShiftConfigurator and the end of it.
start_idx = text.find("function DriverShiftConfigurator({ zones }) {")
if start_idx != -1:
    end_idx = text.find("export default function Dashboard() {")
    if end_idx != -1:
        configurator_text = text[start_idx:end_idx]
        new_configurator_text = configurator_text.replace("cyan", "emerald")
        text = text[:start_idx] + new_configurator_text + text[end_idx:]
        with open(path, 'w', encoding='utf-8') as f:
            f.write(text)
        print("Updated cyan to emerald inside DriverShiftConfigurator.")
    else:
        print("Couldn't find end of DriverShiftConfigurator")
else:
    print("Couldn't find DriverShiftConfigurator")
