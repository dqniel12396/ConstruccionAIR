import asyncio
import websockets
import json
import base64
import os
import subprocess
import time
import urllib.request

EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
OUTPUT_DIR = r"f:\Proyectos\Modelo de construccion de software\imagenes_documento"
TEMP_DIR = r"C:\Users\danie\AppData\Local\Temp\edge_cdp_shot"
os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

CDP_PORT = 9222

async def cdp_command(ws, req_id, method, params=None):
    msg = {"id": req_id, "method": method, "params": params or {}}
    await ws.send(json.dumps(msg))
    while True:
        resp = await ws.recv()
        data = json.loads(resp)
        if data.get("id") == req_id:
            return data

async def run():
    print("Launching Edge...")
    cmd = [
        EDGE_PATH,
        f"--remote-debugging-port={CDP_PORT}",
        f"--user-data-dir={TEMP_DIR}",
        "--no-first-run",
        "--no-default-browser-check",
        "--headless=new",
        "--use-gl=angle",
        "--window-size=1600,1000"
    ]
    proc = subprocess.Popen(cmd)
    time.sleep(2)

    try:
        req = urllib.request.urlopen(f"http://localhost:{CDP_PORT}/json")
        tabs = json.loads(req.read().decode())
        page_tab = None
        for t in tabs:
            if t.get("type") == "page":
                page_tab = t
                break
        if not page_tab:
            page_tab = tabs[0]

        ws_url = page_tab["webSocketDebuggerUrl"]
        print(f"Connecting to CDP: {ws_url}...")

        async with websockets.connect(ws_url, max_size=50*1024*1024) as ws:
            req_id = 1
            await cdp_command(ws, req_id, "Page.enable"); req_id += 1

            print("Navigating to http://localhost:8089/index.html...")
            await cdp_command(ws, req_id, "Page.navigate", {"url": "http://localhost:8089/index.html"}); req_id += 1
            await asyncio.sleep(4.5)

            shots = [
                {
                    "name": "03_planta_vista_general_isometrika.png",
                    "desc": "Campus Exterior Global con Parqueaderos, Autos, Camiones y Edificio con Techo",
                    "js": """
                        setAppMode('plant');
                        setPlantFloorView('all');
                        state.showPlantRoof = true;
                        if (window.plantRoofGroup) window.plantRoofGroup.visible = true;
                        camera.position.set(-175, 140, 280);
                        controls.target.set(0, 20, 60);
                        controls.update();
                        renderer.render(scene, camera);
                    """
                },
                {
                    "name": "03b_parqueadero_bahias_ev_acceso.png",
                    "desc": "Parqueadero de Empleados, Vehiculos, Bahias de Carga EV y Acceso",
                    "js": """
                        setAppMode('plant');
                        setPlantFloorView('all');
                        state.showPlantRoof = true;
                        if (window.plantRoofGroup) window.plantRoofGroup.visible = true;
                        camera.position.set(-135, 45, 190);
                        controls.target.set(-105, 5, 125);
                        controls.update();
                        renderer.render(scene, camera);
                    """
                },
                {
                    "name": "04_planta_piso1_celda_manufactura.png",
                    "desc": "Piso 1: Celda de Ensamble en 'U', Area EPA/ESD, Almacen BOM y Tanques Pluviales",
                    "js": """
                        setAppMode('plant');
                        setPlantFloorView('p1');
                        state.showPlantRoof = false;
                        if (window.plantRoofGroup) window.plantRoofGroup.visible = false;
                        camera.position.set(-65, 80, 95);
                        controls.target.set(0, 10, -10);
                        controls.update();
                        renderer.render(scene, camera);
                    """
                },
                {
                    "name": "06_planta_piso2_sede_corporativa.png",
                    "desc": "Piso 2: Sede Corporativa, Oficinas de Cristal, Open-Dev y Centro NOC 24/7",
                    "js": """
                        setAppMode('plant');
                        setPlantFloorView('p2');
                        state.showPlantRoof = false;
                        if (window.plantRoofGroup) window.plantRoofGroup.visible = false;
                        camera.position.set(-75, 75, 85);
                        controls.target.set(0, 0, -10);
                        controls.update();
                        renderer.render(scene, camera);
                    """
                },
                {
                    "name": "08_planta_vista_explosionada_niveles.png",
                    "desc": "Vista 3D de Ambos Pisos Integrados Estructuralmente con Patio de Maniobras",
                    "js": """
                        setAppMode('plant');
                        setPlantFloorView('split');
                        state.showPlantRoof = true;
                        if (window.plantRoofGroup) window.plantRoofGroup.visible = true;
                        camera.position.set(-130, 130, 230);
                        controls.target.set(0, 30, 0);
                        controls.update();
                        renderer.render(scene, camera);
                    """
                },
                {
                    "name": "01_producto_estacion_exterior_3d.png",
                    "desc": "Estacion Exterior OTech AirNet 3D con Mastil, Panel Solar y Camara Stevenson",
                    "js": """
                        setAppMode('product');
                        camera.position.set(135, 105, 195);
                        controls.target.set(0, 35, 0);
                        controls.update();
                        renderer.render(scene, camera);
                    """
                },
                {
                    "name": "02_producto_gabinete_ip65_cupula.png",
                    "desc": "Detalle del Gabinete Estanco IP65, Cupula Protectora y Bandeja de Sensores",
                    "js": """
                        setAppMode('product');
                        camera.position.set(75, 60, 100);
                        controls.target.set(0, 40, 0);
                        controls.update();
                        renderer.render(scene, camera);
                    """
                }
            ]

            for s in shots:
                print(f"Executing shot: {s['desc']}...")
                await cdp_command(ws, req_id, "Runtime.evaluate", {"expression": s["js"]})
                req_id += 1
                await asyncio.sleep(1.0)

                eval_res = await cdp_command(ws, req_id, "Runtime.evaluate", {
                    "expression": "renderer.domElement.toDataURL('image/png')"
                })
                req_id += 1
                data_url = eval_res.get("result", {}).get("result", {}).get("value", "")
                
                if "," in data_url:
                    b64 = data_url.split(",", 1)[1]
                    raw_bytes = base64.b64decode(b64)
                    out_path = os.path.join(OUTPUT_DIR, s["name"])
                    with open(out_path, "wb") as fp:
                        fp.write(raw_bytes)
                    print(f"  [SAVED] {s['name']} ({len(raw_bytes)} bytes)")

    finally:
        proc.terminate()
        print("Edge closed.")

if __name__ == "__main__":
    asyncio.run(run())
