import json
import sys
from datetime import datetime

def redact_sensitive_info(har_data):
    # Create a copy to avoid modifying the original
    redacted = json.loads(json.dumps(har_data))
    
    # Only redact truly sensitive information
    sensitive_headers = [
        'Authorization',
        'Cookie',
        'Set-Cookie',
        'X-Amz-Cf-Id'  # CloudFront ID is not needed for troubleshooting
    ]
    
    # Process each entry
    for entry in redacted['log']['entries']:
        # Redact request headers
        if 'request' in entry and 'headers' in entry['request']:
            for header in sensitive_headers:
                if header in entry['request']['headers']:
                    entry['request']['headers'][header] = '[REDACTED]'
        
        # Redact response headers
        if 'response' in entry and 'headers' in entry['response']:
            for header in sensitive_headers:
                if header in entry['response']['headers']:
                    entry['response']['headers'][header] = '[REDACTED]'
        
        # Keep URL parameters but redact sensitive values
        if 'request' in entry and 'url' in entry['request']:
            url = entry['request']['url']
            if '?' in url:
                base_url, params = url.split('?', 1)
                # Keep the parameter names but redact values
                param_pairs = []
                for param in params.split('&'):
                    if '=' in param:
                        name, value = param.split('=', 1)
                        if any(sensitive in name.lower() for sensitive in ['token', 'auth', 'key', 'secret']):
                            param_pairs.append(f"{name}=[REDACTED]")
                        else:
                            param_pairs.append(f"{name}={value}")
                    else:
                        param_pairs.append(param)
                entry['request']['url'] = base_url + '?' + '&'.join(param_pairs)
    
    return redacted

def main():
    if len(sys.argv) != 2:
        print("Usage: python redact_har.py <input_har_file>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    
    try:
        # Read the HAR file
        with open(input_file, 'r') as f:
            har_data = json.load(f)
        
        # Redact sensitive information
        redacted_data = redact_sensitive_info(har_data)
        
        # Generate output filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_file = f'redacted_{timestamp}.har'
        
        # Save redacted data
        with open(output_file, 'w') as f:
            json.dump(redacted_data, f, indent=2)
        
        print(f"\nRedacted HAR file saved as: {output_file}")
        print("\nThe following information has been redacted:")
        print("- Authorization tokens and cookies")
        print("- CloudFront IDs")
        print("- Sensitive URL parameter values")
        print("\nThe following information has been preserved for troubleshooting:")
        print("- CORS headers")
        print("- Origin headers")
        print("- Request/Response status codes")
        print("- URL paths and non-sensitive parameters")
        print("- CloudFront POP locations")
        print("- Cache and ETag information")
        
    except Exception as e:
        print(f"Error processing HAR file: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 