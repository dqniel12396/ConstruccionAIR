import http.server
import socketserver
import json
import base64
import os
import subprocess
import time

PORT = 8089
OUTPUT_DIR = r'f:\Proyectos\Modelo de construccion de software\imagenes_documento'
os.makedirs(OUTPUT_DIR, exist_ok=True)

done = False

class CaptureHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        global done
        if self.path == '/upload_screenshot':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length).decode('utf-8')
            data = json.loads(body)
            fname = data['name']
            img_b64 = data['data'].split(',', 1)[1]
            raw_bytes = base64.b64decode(img_b64)
            out_path = os.path.join(OUTPUT_DIR, fname)
            with open(out_path, 'wb') as fp:
                fp.write(raw_bytes)
            print(f"[OK] Saved {fname} ({len(raw_bytes)} bytes)")
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b'{"status":"ok"}')
        elif self.path == '/capture_done':
            print("[INFO] All captures completed by browser!")
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b'{"status":"done"}')
            done = True
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

print(f"Starting capture server on port {PORT}...")
httpd = socketserver.TCPServer(("", PORT), CaptureHandler)
httpd.timeout = 1.0

# Launch browser with the capture query
edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
url = f"http://localhost:{PORT}/index.html?autocapture=1"
print(f"Launching Edge at {url}...")
proc = subprocess.Popen([edge_path, url])

start_time = time.time()
while not done and time.time() - start_time < 30:
    httpd.handle_request()

print("Server finished. Closing browser...")
try:
    proc.terminate()
except Exception:
    pass

httpd.server_close()
print("Capture script completed successfully!")
