import requests
import json

api_key = "AIzaSyAqlg9WMKHWQTBCp6Bj3DbxMjED06LqEyE"
base_url = "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key=" + api_key

models_to_test = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-001",
    "gemini-1.5-flash-latest",
    "gemini-pro",
    "gemini-1.0-pro"
]

data = {
    "contents": [{
        "parts": [{"text": "Hello"}]
    }]
}

print("Testing Gemini API Endpoints...")
for model in models_to_test:
    url = base_url.format(model)
    try:
        response = requests.post(url, headers={"Content-Type": "application/json"}, json=data)
        print(f"Model: {model} -> Status: {response.status_code}")
        if response.status_code == 200:
            print(f"SUCCESS! Found working model: {model}")
            break
        else:
            print(f"Response: {response.text[:100]}...")
    except Exception as e:
        print(f"Error testing {model}: {e}")
