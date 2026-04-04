import requests

# Test Operator Registration
data_operator = {
    "name": "Test Op",
    "email": "operator4@test.com",
    "password": "password123",
    "fleet_size": 10
}
try:
    res = requests.post("http://localhost:8000/auth/register/operator", json=data_operator)
    print("Operator Registration Response:", res.status_code, res.text)
except Exception as e:
    print("Operator Error:", e)

# Test Driver Registration
data_driver = {
    "name": "Test Driver",
    "email": "driver4@test.com",
    "password": "password123"
}
try:
    res = requests.post("http://localhost:8000/auth/register/driver", json=data_driver)
    print("Driver Registration Response:", res.status_code, res.text)
except Exception as e:
    print("Driver Error:", e)
