import json
import time
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def capture_auth_flow():
    # Initialize Chrome with HAR capture
    chrome_options = Options()
    # Remove headless mode to show the browser
    # chrome_options.add_argument('--headless')
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--window-size=1920,1080')  # Set window size
    
    # Enable performance logging
    chrome_options.set_capability('goog:loggingPrefs', {'performance': 'ALL'})
    
    driver = webdriver.Chrome(options=chrome_options)
    
    # Start HAR capture
    driver.execute_cdp_cmd('Network.enable', {})
    
    try:
        # Navigate to your frontend
        print("\n=== Authentication Flow Capture ===")
        print("1. Browser window will open automatically")
        print("2. Navigate to the login page")
        print("3. Complete the login process")
        print("4. After successful login, press Enter in this terminal")
        print("5. The script will capture the network logs and save them")
        print("===================================\n")
        
        # Navigate to your frontend
        print("Opening frontend...")
        driver.get("https://d3h9rtejibs9gc.cloudfront.net")
        
        # Wait for user to complete login
        input("\nPress Enter after you've completed the login process...")
        
        # Capture the current state
        print("\nCapturing network logs...")
        logs = driver.get_log('performance')
        
        # Convert to HAR format
        har_entries = []
        for entry in logs:
            try:
                log = json.loads(entry['message'])['message']
                if 'Network.responseReceived' in log['method']:
                    har_entries.append({
                        'startedDateTime': datetime.now().isoformat(),
                        'request': {
                            'method': log.get('params', {}).get('request', {}).get('method', ''),
                            'url': log.get('params', {}).get('request', {}).get('url', ''),
                            'headers': log.get('params', {}).get('request', {}).get('headers', {}),
                        },
                        'response': {
                            'status': log.get('params', {}).get('response', {}).get('status', ''),
                            'headers': log.get('params', {}).get('response', {}).get('headers', {}),
                        }
                    })
            except Exception as e:
                print(f"Error processing log entry: {e}")
        
        # Create HAR file
        har_data = {
            'log': {
                'version': '1.2',
                'creator': {'name': 'Auth Flow Capture', 'version': '1.0'},
                'entries': har_entries
            }
        }
        
        # Save HAR file
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'auth_flow_{timestamp}.har'
        with open(filename, 'w') as f:
            json.dump(har_data, f, indent=2)
        
        print(f"\nHAR file saved as: {filename}")
        print("\nPlease review the file and redact any sensitive information before sharing with AWS Support.")
        
    finally:
        input("\nPress Enter to close the browser and exit...")
        driver.quit()

if __name__ == "__main__":
    capture_auth_flow() 