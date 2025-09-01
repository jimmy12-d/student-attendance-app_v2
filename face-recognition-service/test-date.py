from datetime import date, datetime

print("Testing Python date generation...")
print(f"date.today().isoformat(): {date.today().isoformat()}")
print(f"datetime.now().date().isoformat(): {datetime.now().date().isoformat()}")

# Test timezone awareness
import os
print(f"TZ environment variable: {os.getenv('TZ')}")
