import requests
import json

def test_cors():
    # Test endpoints
    base_url = "http://localhost:8000"
    test_endpoints = [
        "/health",
        "/api/health",
        "/personas/run"
    ]
    
    # Test origins
    test_origins = [
        "http://localhost:3000",
        "https://d3h9rtejibs9gc.cloudfront.net"
    ]
    
    print("\n=== Testing CORS Configuration ===\n")
    
    for origin in test_origins:
        print(f"\nTesting origin: {origin}")
        headers = {
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Content-Type,Authorization"
        }
        
        for endpoint in test_endpoints:
            url = f"{base_url}{endpoint}"
            print(f"\nTesting endpoint: {endpoint}")
            
            # Test OPTIONS (preflight)
            try:
                opt_response = requests.options(url, headers=headers)
                print("OPTIONS Response:")
                print(f"Status: {opt_response.status_code}")
                print("Headers:")
                for key, value in opt_response.headers.items():
                    print(f"  {key}: {value}")
            except Exception as e:
                print(f"OPTIONS request failed: {e}")
            
            # Test actual request
            try:
                get_response = requests.get(url, headers={"Origin": origin})
                print("\nGET Response:")
                print(f"Status: {get_response.status_code}")
                print("Headers:")
                for key, value in get_response.headers.items():
                    print(f"  {key}: {value}")
            except Exception as e:
                print(f"GET request failed: {e}")

if __name__ == "__main__":
    test_cors() 