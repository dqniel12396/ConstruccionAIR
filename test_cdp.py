import subprocess
import time
import json
import urllib.request
import base64
import os

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
temp_profile = r"C:\Users\danie\AppData\Local\Temp\edge_cdp_profile"
os.makedirs(temp_profile, exist_ok=True)

port = 9222
cmd = [
    edge_path,
    f"--remote-debugging-port={port}",
    f"--user-data-dir={temp_profile}",
    "--no-first-run",
    "--no-default-browser-check",
    "--headless=new",
    "--use-gl=angle",
    "--window-size=1600,1000",
    "about:blank"
]

print("Launching Edge with CDP...")
proc = subprocess.Popen(cmd)

time.sleep(2)

try:
    req = urllib.request.urlopen(f"http://localhost:{port}/json")
    tabs = json.loads(req.read().decode())
    print("CDP tabs:", len(tabs))
    for t in tabs:
        print("Tab:", t.get("title"), t.get("webSocketDebuggerUrl"))
finally:
    proc.terminate()
    print("Terminated Edge.")
