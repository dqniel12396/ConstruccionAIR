import asyncio
import websockets
import json
import base64
import os
import subprocess
import time
import urllib.request

EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not os.path.exists(EDGE_PATH):
    EDGE_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

CDP_PORT = 9333
TEMP_DIR = r"C:\Users\danie\AppData\Local\Temp\edge_cdp_erd"
os.makedirs(TEMP_DIR, exist_ok=True)

HTML_PATH = os.path.abspath(r"ENTREGA_FINAL_OTECH_PLATAFORMA_WEB\diagrama_bases_datos_interactivo.html")
PNG_PATH = os.path.abspath(r"ENTREGA_FINAL_OTECH_PLATAFORMA_WEB\diagrama_bases_datos_otech.png")
SVG_PATH = os.path.abspath(r"ENTREGA_FINAL_OTECH_PLATAFORMA_WEB\diagrama_bases_datos_otech.svg")

async def cdp_command(ws, req_id, method, params=None):
    msg = {"id": req_id, "method": method, "params": params or {}}
    await ws.send(json.dumps(msg))
    while True:
        resp = await ws.recv()
        data = json.loads(resp)
        if data.get("id") == req_id:
            return data

async def run():
    print(f"Launching Edge on port {CDP_PORT}...")
    cmd = [
        EDGE_PATH,
        f"--remote-debugging-port={CDP_PORT}",
        f"--user-data-dir={TEMP_DIR}",
        "--no-first-run",
        "--no-default-browser-check",
        "--headless=new",
        "--window-size=2400,1800"
    ]
    proc = subprocess.Popen(cmd)
    await asyncio.sleep(2.5)

    try:
        url = f"http://127.0.0.1:{CDP_PORT}/json"
        with urllib.request.urlopen(url) as response:
            tabs = json.loads(response.read().decode())
        
        ws_url = tabs[0]["webSocketDebuggerUrl"]
        print(f"Connecting to CDP: {ws_url}")

        async with websockets.connect(ws_url, max_size=100_000_000) as ws:
            req_id = 1

            # 1. Page.enable
            await cdp_command(ws, req_id, "Page.enable"); req_id += 1

            # 2. Navegar al archivo HTML
            file_url = f"file:///{HTML_PATH.replace(os.sep, '/')}"
            print(f"Navigating to {file_url}...")
            await cdp_command(ws, req_id, "Page.navigate", {"url": file_url}); req_id += 1

            # 3. Esperar a que el diagrama SVG de Mermaid termine de renderizar
            print("Esperando renderizado de Mermaid...")
            for _ in range(30):
                await asyncio.sleep(0.5)
                eval_res = await cdp_command(ws, req_id, "Runtime.evaluate", {
                    "expression": "document.querySelector('#diagram-container svg') !== null"
                }); req_id += 1
                if eval_res.get("result", {}).get("result", {}).get("value") is True:
                    print("SVG renderizado detectado exitosamente.")
                    break

            # Dar 1 segundo extra para layout completo
            await asyncio.sleep(1.0)

            # 4. Extraer el código SVG vectorial
            svg_eval = await cdp_command(ws, req_id, "Runtime.evaluate", {
                "expression": "document.querySelector('#diagram-container svg').outerHTML"
            }); req_id += 1
            svg_code = svg_eval.get("result", {}).get("result", {}).get("value")
            if svg_code:
                with open(SVG_PATH, "w", encoding="utf-8") as f:
                    f.write(svg_code)
                print(f"Archivo SVG vectorial guardado en: {SVG_PATH}")

            # 5. Obtener dimensiones del contenedor para captura perfecta
            bounds_res = await cdp_command(ws, req_id, "Runtime.evaluate", {
                "expression": """
                (() => {
                    const el = document.body;
                    return {
                        width: Math.max(el.scrollWidth, 2400),
                        height: Math.max(el.scrollHeight, 1600)
                    };
                })()
                """,
                "returnByValue": True
            }); req_id += 1
            dims = bounds_res.get("result", {}).get("result", {}).get("value", {"width": 2400, "height": 1800})
            print(f"Dimensiones de página: {dims['width']} x {dims['height']}")

            # Ajustar viewport al tamaño total
            await cdp_command(ws, req_id, "Emulation.setDeviceMetricsOverride", {
                "width": int(dims["width"]),
                "height": int(dims["height"]),
                "deviceScaleFactor": 1.5,
                "mobile": False
            }); req_id += 1

            await asyncio.sleep(0.5)

            # 6. Tomar screenshot PNG
            print("Capturando imagen PNG...")
            shot_res = await cdp_command(ws, req_id, "Page.captureScreenshot", {
                "format": "png",
                "fromSurface": True
            }); req_id += 1
            
            b64_img = shot_res.get("result", {}).get("data")
            if b64_img:
                with open(PNG_PATH, "wb") as f:
                    f.write(base64.b64decode(b64_img))
                print(f"¡Imagen PNG generada exitosamente en: {PNG_PATH}!")
                print(f"Tamaño de imagen: {os.path.getsize(PNG_PATH) // 1024} KB")

    finally:
        proc.terminate()
        print("Edge finalizado.")

if __name__ == "__main__":
    asyncio.run(run())
