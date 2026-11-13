"""
========================================================================================
Generador de Modelo 3D Arquitectónico e Industrial de Alta Fidelidad para Autodesk & Web
PROYECTO: COMPLEJO INDUSTRIAL Y CORPORATIVO OTECH S.A.S. - EDIFICIO DE DOS (2) PISOS
- PISO 1 (Nivel 0.0m): Planta de Producción y Ensamble (500 uds/mes), Almacén BOM/FGS, Celda en U, IQC/OQC, Esclusa ESD.
- PISO 2 (Nivel +3.8m): Sede Corporativa, Dirección General (CEO), Sala de Juntas, CTO Software, COO Centro NOC, Lab R&D, Showroom y Mezzanine mirador.
- Conexión Vertical: Escalera arquitectónica con barandilla y montacargas industrial.
========================================================================================
"""

import os
import math

def generate_detailed_plant_obj(output_obj_path, output_mtl_path):
    mtl_content = """# Materiales Profesionales Complejo OTech AirNet 2 Pisos
newmtl MuroHormigon
Kd 0.88 0.90 0.92
Ka 0.20 0.20 0.20
Ks 0.10 0.10 0.10
d 1.0

newmtl MuroInteriorDrywall
Kd 0.92 0.93 0.95
Ka 0.25 0.25 0.25
d 1.0

newmtl MarcoAluminio
Kd 0.15 0.17 0.20
Ks 0.50 0.50 0.50
d 1.0

newmtl VidrioOficina
Kd 0.40 0.70 0.90
Ks 0.95 0.95 0.95
d 0.35

newmtl PisoEpoxicoFabrica
Kd 0.22 0.26 0.30
d 1.0

newmtl PisoESDAzul
Kd 0.05 0.45 0.75
d 1.0

newmtl PisoMaderaOficina
Kd 0.78 0.72 0.65
d 1.0

newmtl LosaEntrepisoHormigon
Kd 0.65 0.68 0.72
d 1.0

newmtl FranjaAmarilla
Kd 0.95 0.80 0.05
d 1.0

newmtl MesaTrabajo
Kd 0.30 0.33 0.38
d 1.0

newmtl MaderaEscritorio
Kd 0.85 0.80 0.75
d 1.0

newmtl SillaOficina
Kd 0.12 0.14 0.18
d 1.0

newmtl PantallaMonitor
Kd 0.05 0.60 0.90
d 1.0

newmtl VideoWallNOC
Kd 0.08 0.75 0.95
d 1.0

newmtl PersonaBataESD
Kd 0.08 0.50 0.85
d 1.0

newmtl PersonaRopaCasual
Kd 0.25 0.35 0.55
d 1.0

newmtl PersonaPiel
Kd 0.92 0.76 0.65
d 1.0

newmtl RackAcero
Kd 0.18 0.38 0.65
d 1.0

newmtl CajaKanbanAmarilla
Kd 0.92 0.70 0.10
d 1.0

newmtl CajaKanbanAzul
Kd 0.10 0.55 0.85
d 1.0

newmtl CamaraInox
Kd 0.80 0.82 0.85
Ks 0.80 0.80 0.80
d 1.0

newmtl RackBurnInRojo
Kd 0.80 0.20 0.15
d 1.0

newmtl EstacionProducto
Kd 0.95 0.96 0.98
d 1.0

newmtl PcbVerde
Kd 0.08 0.55 0.22
d 1.0

newmtl SensorSps30Plata
Kd 0.78 0.80 0.82
Ks 0.85 0.85 0.85
d 1.0

newmtl BateriaLitioAzul
Kd 0.05 0.45 0.85
d 1.0

newmtl CeldaSolarNegra
Kd 0.08 0.12 0.25
Ks 0.90 0.90 0.90
d 1.0

newmtl CajaEmpaqueCarton
Kd 0.72 0.58 0.42
d 1.0

newmtl AnilloLedGlow
Kd 0.10 0.85 0.95
d 1.0

newmtl EscaleraMetal
Kd 0.35 0.38 0.42
Ks 0.60 0.60 0.60
d 1.0

newmtl TanqueAguaAzul
Kd 0.05 0.38 0.65
Ks 0.40 0.40 0.40
d 1.0

newmtl ServidorRackData
Kd 0.12 0.14 0.18
Ks 0.70 0.70 0.70
d 1.0

newmtl FibraBandejaAmarilla
Kd 0.95 0.80 0.05
d 1.0
"""
    with open(output_mtl_path, "w", encoding="utf-8") as f:
        f.write(mtl_content)

    vertices = []
    faces = []

    def add_box(x, y, z, w, l, h, mtl_name):
        """Añade un prisma rectangular sólido (12 triángulos)."""
        base_v = len(vertices) + 1
        v = [
            (x, y, z),
            (x + w, y, z),
            (x + w, y + l, z),
            (x, y + l, z),
            (x, y, z + h),
            (x + w, y, z + h),
            (x + w, y + l, z + h),
            (x, y + l, z + h)
        ]
        vertices.extend(v)
        f_list = [
            (base_v+0, base_v+2, base_v+1), (base_v+0, base_v+3, base_v+2),
            (base_v+4, base_v+5, base_v+6), (base_v+4, base_v+6, base_v+7),
            (base_v+0, base_v+1, base_v+5), (base_v+0, base_v+5, base_v+4),
            (base_v+3, base_v+6, base_v+2), (base_v+3, base_v+7, base_v+6),
            (base_v+0, base_v+4, base_v+7), (base_v+0, base_v+7, base_v+3),
            (base_v+1, base_v+2, base_v+6), (base_v+1, base_v+6, base_v+5)
        ]
        faces.append((mtl_name, f_list))

    def add_cylinder(cx, cy, cz, radius, height, mtl_name, segments=12):
        base_v = len(vertices) + 1
        for i in range(segments):
            angle = 2 * math.pi * i / segments
            x = cx + radius * math.cos(angle)
            y = cy + radius * math.sin(angle)
            vertices.append((x, y, cz))
        for i in range(segments):
            angle = 2 * math.pi * i / segments
            x = cx + radius * math.cos(angle)
            y = cy + radius * math.sin(angle)
            vertices.append((x, y, cz + height))
        
        v_bottom_center = len(vertices) + 1
        vertices.append((cx, cy, cz))
        v_top_center = len(vertices) + 1
        vertices.append((cx, cy, cz + height))

        f_list = []
        for i in range(segments):
            next_i = (i + 1) % segments
            f_list.append((base_v + i, base_v + next_i, base_v + segments + next_i))
            f_list.append((base_v + i, base_v + segments + next_i, base_v + segments + i))
            f_list.append((v_bottom_center, base_v + next_i, base_v + i))
            f_list.append((v_top_center, base_v + segments + i, base_v + segments + next_i))
        faces.append((mtl_name, f_list))

    def add_human(x, y, z, rotation_deg, is_esd_worker=True, is_seated=False):
        rad = math.radians(rotation_deg)
        cos_r = math.cos(rad)
        sin_r = math.sin(rad)

        def rot_box(lx, ly, lz, w, l, h, mtl):
            rx = x + (lx * cos_r - ly * sin_r)
            ry = y + (lx * sin_r + ly * cos_r)
            add_box(rx - w/2, ry - l/2, z + lz, w, l, h, mtl)

        clothing_mtl = "PersonaBataESD" if is_esd_worker else "PersonaRopaCasual"

        if is_seated:
            rot_box(0, 0, 0, 0.45, 0.45, 0.45, "SillaOficina")
            rot_box(0, -0.2, 0.45, 0.45, 0.1, 0.50, "SillaOficina")
            rot_box(-0.12, 0.15, 0.20, 0.14, 0.35, 0.15, "PersonaRopaCasual")
            rot_box(0.12, 0.15, 0.20, 0.14, 0.35, 0.15, "PersonaRopaCasual")
            rot_box(0, 0, 0.45, 0.42, 0.26, 0.55, clothing_mtl)
            rot_box(0, 0, 1.05, 0.22, 0.22, 0.24, "PersonaPiel")
            rot_box(-0.25, 0.15, 0.65, 0.12, 0.35, 0.12, clothing_mtl)
            rot_box(0.25, 0.15, 0.65, 0.12, 0.35, 0.12, clothing_mtl)
        else:
            rot_box(-0.12, 0, 0, 0.15, 0.18, 0.80, "PersonaRopaCasual")
            rot_box(0.12, 0, 0, 0.15, 0.18, 0.80, "PersonaRopaCasual")
            rot_box(0, 0, 0.80, 0.44, 0.28, 0.60, clothing_mtl)
            rot_box(0, 0, 1.45, 0.22, 0.22, 0.24, "PersonaPiel")
            rot_box(-0.26, 0.12, 0.95, 0.12, 0.30, 0.12, clothing_mtl)
            rot_box(0.26, 0.12, 0.95, 0.12, 0.30, 0.12, clothing_mtl)

    # Dimensiones del Edificio de Dos Pisos
    BUILDING_W = 20.0 # Ancho (Eje X: 20 metros)
    BUILDING_L = 20.0 # Largo (Eje Y: 20 metros)
    FLOOR_H = 3.8     # Altura libre por piso
    TOTAL_H = 7.6     # Altura total (2 pisos)
    WALL_TH = 0.20    # Espesor de muros exteriores

    # =========================================================================
    # NIVEL 1 (PISO 1 - Nivel 0.00m): PLANTA FABRIL Y LOGÍSTICA (400 m²)
    # =========================================================================
    # Piso Industrial Epóxico de la Nave (20m x 20m)
    add_box(0, 0, -0.25, BUILDING_W, BUILDING_L, 0.25, "PisoEpoxicoFabrica")

    # Zona EPA / ESD (14m x 12m)
    add_box(3.0, 3.0, 0.01, 14.0, 12.0, 0.02, "PisoESDAzul")
    # Demarcación perimetral amarilla
    add_box(2.8, 2.8, 0.02, 14.4, 0.2, 0.02, "FranjaAmarilla")
    add_box(2.8, 15.0, 0.02, 14.4, 0.2, 0.02, "FranjaAmarilla")
    add_box(2.8, 2.8, 0.02, 0.2, 12.4, 0.02, "FranjaAmarilla")
    add_box(17.0, 2.8, 0.02, 0.2, 12.4, 0.02, "FranjaAmarilla")

    # Muros Exteriores del Piso 1 (H = 3.8m)
    # Fachada Sur (Portón industrial de carga 4m)
    add_box(0, 0, 0, 8.0, WALL_TH, FLOOR_H, "MuroHormigon")
    add_box(12.0, 0, 0, 8.0, WALL_TH, FLOOR_H, "MuroHormigon")
    # Fachada Oeste
    add_box(0, 0, 0, WALL_TH, BUILDING_L, FLOOR_H, "MuroHormigon")
    # Fachada Este
    add_box(BUILDING_W - WALL_TH, 0, 0, WALL_TH, BUILDING_L, FLOOR_H, "MuroHormigon")
    # Fachada Norte (Acceso de personal y visitantes)
    add_box(0, BUILDING_L - WALL_TH, 0, 7.0, WALL_TH, FLOOR_H, "MuroHormigon")
    add_box(11.0, BUILDING_L - WALL_TH, 0, 9.0, WALL_TH, FLOOR_H, "MuroHormigon")
    add_box(7.0, BUILDING_L - WALL_TH + 0.05, 0, 4.0, 0.08, FLOOR_H, "VidrioOficina")

    # Racks de Almacén Industrial (Piso 1)
    def create_detailed_rack(rx, ry, num_shelves=4):
        add_box(rx, ry, 0, 1.6, 4.8, 2.8, "RackAcero")
        for s in range(num_shelves):
            for k in range(3):
                kx = rx + 0.2
                ky = ry + 0.4 + k * 1.4
                color_box = "CajaKanbanAzul" if (s + k) % 2 == 0 else "CajaKanbanAmarilla"
                add_box(kx, ky, 0.2 + s * 0.75, 1.2, 1.1, 0.5, color_box)

    create_detailed_rack(0.8, 12.0) # Rack IQC
    create_detailed_rack(0.8, 4.0)  # Rack Kanban BOM
    create_detailed_rack(17.6, 4.0) # Rack FGS Producto Terminado

    # Celda de Manufactura en 'U' (Piso 1)
    stations_p1 = [
        ("Est1", 4.0, 5.0, "Pre-ensamble Chasis", True),
        ("Est2", 7.5, 5.0, "Flasheo ICT Pogo-Pin", True),
        ("Est3", 11.0, 5.0, "Integración IP65", True),
        ("Est4", 11.0, 10.5, "Prueba Hermeticidad", False),
        ("Est5", 7.5, 10.5, "Calibración Gases", False),
        ("Est6", 4.0, 10.5, "Rack Burn-In 48h", False),
        ("Est7", 14.5, 8.0, "OQC & Empaque", True)
    ]

    for sid, sx, sy, sname, has_worker in stations_p1:
        if sid == "Est6":
            # Rack de Burn-In abierto técnico (profundidad reducida a 0.6m, no obstruye la visibilidad)
            add_box(sx, sy, 0, 2.2, 0.6, 2.4, "RackBurnInRojo")
            for sh_z in [0.6, 1.2, 1.8]:
                add_box(sx + 0.1, sy + 0.05, sh_z, 2.0, 0.5, 0.05, "MarcoAluminio")
            add_box(sx + 0.05, sy + 0.55, 0.2, 2.1, 0.05, 2.1, "VidrioOficina")
        elif sid == "Est5":
            add_box(sx, sy, 0, 2.2, 1.3, 1.5, "CamaraInox")
            add_cylinder(sx + 0.4, sy - 0.4, 0, 0.2, 1.4, "MarcoAluminio")
            add_cylinder(sx + 1.2, sy - 0.4, 0, 0.2, 1.4, "MarcoAluminio")
        else:
            add_box(sx, sy, 0, 2.2, 1.1, 0.85, "MesaTrabajo")
            add_box(sx + 0.1, sy + 0.1, 0.85, 2.0, 0.9, 0.03, "PisoESDAzul")
            add_box(sx + 0.5, sy + 0.8, 0.88, 0.8, 0.06, 0.5, "PantallaMonitor")
            if has_worker:
                add_human(sx + 1.1, sy - 0.5, 0, 0, is_esd_worker=True, is_seated=False)

    # Línea de transporte con rodillos continua (Pista en 'U')
    add_box(3.5, 7.0, 0.5, 10.0, 0.6, 0.15, "MarcoAluminio")
    add_box(13.0, 7.0, 0.5, 0.6, 2.6, 0.15, "MarcoAluminio")
    add_box(3.5, 9.0, 0.5, 10.0, 0.6, 0.15, "MarcoAluminio")

    # =========================================================================
    # ENSAMBLE PROGRESIVO PIEZA POR PIEZA EN LA CINTA TRANSPORTADORA
    # Muestra la evolución física real de la estación a lo largo de las 7 fases:
    # =========================================================================
    # Etapa 1 (Post-Est1, x=4.5, y=7.3): Bandeja Chasis + PCB verde + Sensor SPS30
    add_box(4.3, 7.15, 0.65, 0.5, 0.35, 0.05, "MarcoAluminio") # Palet ESD
    add_box(4.35, 7.2, 0.70, 0.4, 0.25, 0.03, "PcbVerde")       # PCB OTech
    add_box(4.4, 7.25, 0.73, 0.18, 0.14, 0.12, "SensorSps30Plata") # Sensor SPS30

    # Etapa 2 (Post-Est2, x=7.5, y=7.3): Chasis ICT testeado con firmware TLS
    add_box(7.3, 7.15, 0.65, 0.5, 0.35, 0.05, "MarcoAluminio")
    add_box(7.35, 7.2, 0.70, 0.4, 0.25, 0.03, "PcbVerde")
    add_box(7.4, 7.25, 0.73, 0.18, 0.14, 0.12, "SensorSps30Plata")
    add_box(7.6, 7.22, 0.73, 0.06, 0.06, 0.06, "AnilloLedGlow") # LED ICT OK

    # Etapa 3 (Post-Est3, x=10.5, y=7.3): Gabinete ASA blanco + Batería LiFePO4
    add_box(10.3, 7.15, 0.65, 0.5, 0.35, 0.05, "MarcoAluminio")
    add_cylinder(10.55, 7.3, 0.70, 0.20, 0.40, "EstacionProducto") # Gabinete blanco ASA
    add_cylinder(10.55, 7.3, 0.75, 0.08, 0.25, "BateriaLitioAzul") # Batería LiFePO4 interior

    # Etapa 4 (Post-Est4, x=13.3, y=8.3): Gabinete hermético IP65 con sello O-Ring
    add_box(13.05, 8.1, 0.65, 0.5, 0.4, 0.05, "MarcoAluminio")
    add_cylinder(13.3, 8.3, 0.70, 0.20, 0.40, "EstacionProducto")
    add_cylinder(13.3, 8.3, 1.10, 0.21, 0.03, "MarcoAluminio") # Junta O-Ring estanca
    add_cylinder(13.3, 8.3, 0.72, 0.21, 0.04, "AnilloLedGlow") # Anillo difusor

    # Etapa 5 (Post-Est5, x=10.5, y=9.3): Cámara Stevenson Louvered (branquias 45°)
    add_box(10.3, 9.15, 0.65, 0.5, 0.35, 0.05, "MarcoAluminio")
    add_cylinder(10.55, 9.3, 0.90, 0.20, 0.35, "EstacionProducto") # Gabinete superior
    for bg_i in range(4):
        add_cylinder(10.55, 9.3, 0.70 + bg_i * 0.05, 0.24, 0.03, "EstacionProducto") # Branquias Stevenson
    add_cylinder(10.55, 9.3, 0.68, 0.08, 0.06, "CamaraInox") # Malla inoxidable 316

    # Etapa 6 (Post-Est6, x=7.5, y=9.3): Cúpula Solar 12° ETFE montada (Estación Completa en Burn-In)
    add_box(7.3, 9.15, 0.65, 0.5, 0.35, 0.05, "MarcoAluminio")
    add_cylinder(7.55, 9.3, 0.88, 0.20, 0.35, "EstacionProducto")
    for bg_i in range(4):
        add_cylinder(7.55, 9.3, 0.70 + bg_i * 0.05, 0.24, 0.03, "EstacionProducto")
    add_cylinder(7.55, 9.3, 1.23, 0.26, 0.12, "CeldaSolarNegra") # Cúpula solar cónica ETFE
    add_cylinder(7.55, 9.3, 0.82, 0.21, 0.04, "AnilloLedGlow")   # Anillo LED en Burn-In activo

    # Etapa 7 (Post-Est7, x=4.5, y=9.3): Soporte Mástil Inox y Empaque Final en Caja OTech
    add_box(4.15, 9.05, 0.65, 0.70, 0.50, 0.45, "CajaEmpaqueCarton") # Caja industrial OTech
    add_box(4.2, 9.1, 0.70, 0.60, 0.40, 0.38, "MarcoAluminio")       # Foam protector ESD negro
    add_cylinder(4.5, 9.3, 0.75, 0.18, 0.40, "EstacionProducto")      # Estación embalada interior
    add_box(4.7, 9.25, 0.80, 0.10, 0.15, 0.25, "SensorSps30Plata")   # Soporte de mástil Inox 316 adjunto

    # =========================================================================
    # ESCALERA ARQUITECTÓNICA DE COMUNICACIÓN VERTICAL (Piso 1 a Piso 2)
    # Ubicada en la esquina Noroeste (x=1.0..3.5, y=16.0..19.5)
    # =========================================================================
    num_steps = 18
    step_h = FLOOR_H / num_steps
    step_l = 0.28
    for st in range(num_steps):
        st_y = 16.0 + st * (3.0 / num_steps)
        st_z = st * step_h
        add_box(1.2, st_y, st_z, 1.8, step_l, step_h, "EscaleraMetal")
    # Barandilla de escalera
    add_box(1.15, 16.0, 0.9, 0.05, 3.2, 0.9, "MarcoAluminio")
    add_box(3.05, 16.0, 0.9, 0.05, 3.2, 0.9, "VidrioOficina")

    # =========================================================================
    # COLUMNAS ESTRUCTURALES DE SUSTENTACIÓN DEL PISO 2 (CERO ELEMENTOS FLOTANTES)
    # =========================================================================
    for col_x in [2.0, 7.5, 13.0, 18.0]:
        for col_y in [2.0, 7.5, 13.0, 18.0]:
            # Dado de cimentación en hormigón armado
            add_box(col_x - 0.35, col_y - 0.35, 0, 0.7, 0.7, 0.35, "LosaEntrepisoHormigon")
            # Fuste de columna estructural IPE/HEB
            add_box(col_x - 0.2, col_y - 0.2, 0.35, 0.4, 0.4, FLOOR_H - 0.6, "MarcoAluminio")
            # Capitel estructural de anclaje
            add_box(col_x - 0.3, col_y - 0.3, FLOOR_H - 0.25, 0.6, 0.6, 0.25, "MarcoAluminio")

    # =========================================================================
    # SISTEMA INDUSTRIAL DE RECOLECCIÓN DE AGUA PLUVIAL (10.000 L)
    # =========================================================================
    # Losa de asiento de tanques
    add_box(17.2, 0.6, 0, 2.4, 4.4, 0.2, "LosaEntrepisoHormigon")
    # 2x Tanques cilíndricos verticales de 5.000 L
    add_cylinder(18.4, 1.7, 0.2, 0.9, 3.0, "TanqueAguaAzul")
    add_cylinder(18.4, 3.9, 0.2, 0.9, 3.0, "TanqueAguaAzul")
    # Bajante pluvial y grupo de bombeo
    add_cylinder(19.4, 1.7, 0.2, 0.08, 3.6, "MarcoAluminio")
    add_box(17.4, 1.4, 0.2, 0.6, 0.8, 0.7, "MarcoAluminio")

    # =========================================================================
    # LOSA ESTRUCTURAL DE ENTREPISO (Nivel Z = +3.80m)
    # Deja un hueco (Vano/Mezzanine) para la escalera y mirador
    # =========================================================================
    # Losa completa Piso 2 (20m x 20m con vano de escalera de 2m x 4m)
    add_box(0, 0, FLOOR_H - 0.25, BUILDING_W, 15.5, 0.25, "LosaEntrepisoHormigon")
    add_box(3.5, 15.5, FLOOR_H - 0.25, 16.5, 4.5, 0.25, "LosaEntrepisoHormigon")
    # Piso de madera corporativa en Piso 2
    add_box(0, 0, FLOOR_H, BUILDING_W, 15.5, 0.02, "PisoMaderaOficina")
    add_box(3.5, 15.5, FLOOR_H, 16.5, 4.5, 0.02, "PisoMaderaOficina")

    # Barandilla de cristal en el vano del Mezzanine (Z = +3.8m)
    add_box(3.4, 15.5, FLOOR_H, 0.1, 4.3, 1.0, "MarcoAluminio")
    add_box(3.45, 15.5, FLOOR_H + 0.1, 0.05, 4.3, 0.85, "VidrioOficina")

    # =========================================================================
    # NIVEL 2 (PISO 2 - Nivel +3.80m): SEDE CORPORATIVA, ADMIN & R&D (400 m²)
    # =========================================================================
    P2_Z = FLOOR_H # 3.8 metros

    # Muros Exteriores del Piso 2 (Con ventanales perimetrales continuos)
    # Fachada Sur (Ventanales hacia el exterior)
    add_box(0, 0, P2_Z, BUILDING_W, WALL_TH, 0.9, "MuroHormigon") # Antepecho
    add_box(0, 0, P2_Z + 0.9, BUILDING_W, 0.08, 2.2, "VidrioOficina") # Ventanal
    add_box(0, 0, P2_Z + 3.1, BUILDING_W, WALL_TH, 0.7, "MuroHormigon") # Viga dintel
    # Fachada Oeste
    add_box(0, 0, P2_Z, WALL_TH, BUILDING_L, FLOOR_H, "MuroHormigon")
    # Fachada Este
    add_box(BUILDING_W - WALL_TH, 0, P2_Z, WALL_TH, BUILDING_L, FLOOR_H, "MuroHormigon")
    # Fachada Norte
    add_box(0, BUILDING_L - WALL_TH, P2_Z, BUILDING_W, WALL_TH, 0.9, "MuroHormigon")
    add_box(0, BUILDING_L - WALL_TH, P2_Z + 0.9, BUILDING_W, 0.08, 2.2, "VidrioOficina")
    add_box(0, BUILDING_L - WALL_TH, P2_Z + 3.1, BUILDING_W, WALL_TH, 0.7, "MuroHormigon")

    # Divisiones Interiores Vidriadas del Piso 2 (Altura 2.8m)
    GLASS_H = 2.8

    # Pasillo central longitudinal (y = 9.0 a 11.0)
    add_box(0.2, 9.0, P2_Z, 19.6, 0.08, GLASS_H, "VidrioOficina")
    add_box(3.5, 11.0, P2_Z, 16.3, 0.08, GLASS_H, "VidrioOficina")

    # Tabiques de separación entre despachos y áreas de Piso 2:
    # 1. Dirección General (CEO) (x=0..6, y=0..9)
    add_box(6.0, 0.2, P2_Z, 0.12, 8.8, GLASS_H, "MuroInteriorDrywall")
    
    # 2. Gran Sala de Juntas (Boardroom) (x=6..13, y=0..9)
    add_box(13.0, 0.2, P2_Z, 0.12, 8.8, GLASS_H, "MuroInteriorDrywall")

    # 3. Operaciones & Centro NOC (COO) (x=13..19.8, y=0..9)
    # Área abierta con Video Wall

    # 4. CTO - Software, Datos y Nube (x=3.5..12, y=11..19.8)
    add_box(12.0, 11.0, P2_Z, 0.12, 8.8, GLASS_H, "MuroInteriorDrywall")

    # 5. Laboratorio Hardware e I+D (R&D Lab) (x=12..19.8, y=11..19.8)
    # Área técnica de prototipado

    # =========================================================================
    # MOBILIARIO Y PUESTOS CORPORATIVOS EN EL PISO 2
    # =========================================================================
    # A. Lobby / Recepción del Piso 2 (x=5.0, y=16.5)
    add_box(5.0, 16.0, P2_Z, 2.4, 0.9, 1.1, "MarcoAluminio")
    add_box(5.1, 16.1, P2_Z + 1.1, 2.2, 0.7, 0.05, "MaderaEscritorio")
    add_human(5.8, 15.3, P2_Z, 0, is_esd_worker=False, is_seated=True)
    # Vitrina Showroom OTech AirNet
    add_box(8.0, 16.0, P2_Z, 1.4, 0.6, 1.8, "VidrioOficina")
    add_cylinder(8.7, 16.3, P2_Z + 0.9, 0.15, 0.35, "EstacionProducto")

    # B. Dirección General (CEO) (x=3.0, y=4.5)
    add_box(1.8, 4.0, P2_Z, 2.4, 1.2, 0.75, "MaderaEscritorio")
    add_box(2.2, 4.4, P2_Z + 0.75, 1.0, 0.1, 0.5, "PantallaMonitor")
    add_human(3.0, 5.2, P2_Z, 180, is_esd_worker=False, is_seated=True)

    # C. Gran Sala de Juntas (Boardroom) (x=9.5, y=4.5)
    add_box(7.5, 3.0, P2_Z, 4.2, 2.0, 0.75, "MaderaEscritorio") # Gran mesa
    add_box(8.5, 8.8, P2_Z + 1.2, 2.2, 0.1, 1.2, "VideoWallNOC") # Video 4K
    for px in [8.2, 9.5, 10.8]:
        add_human(px, 2.4, P2_Z, 0, is_esd_worker=False, is_seated=True)
        add_human(px, 5.6, P2_Z, 180, is_esd_worker=False, is_seated=True)

    # D. Operaciones & Centro NOC (COO) (x=16.5, y=4.5)
    add_box(14.0, 8.8, P2_Z + 1.0, 5.4, 0.15, 2.2, "VideoWallNOC") # Gran Video Wall NOC
    add_box(14.5, 4.5, P2_Z, 4.8, 1.2, 0.75, "MaderaEscritorio")
    add_human(15.5, 3.8, P2_Z, 0, is_esd_worker=False, is_seated=True)
    add_human(18.0, 3.8, P2_Z, 0, is_esd_worker=False, is_seated=True)

    # E. Software, Datos y Nube (CTO) - Open Dev Space (x=7.5, y=15.0)
    for row_y in [13.0, 16.0]:
        add_box(4.5, row_y, P2_Z, 6.5, 1.1, 0.75, "MaderaEscritorio")
        for dev_x in [5.5, 7.8, 10.0]:
            add_box(dev_x - 0.4, row_y + 0.4, P2_Z + 0.75, 0.8, 0.08, 0.45, "PantallaMonitor")
            add_box(dev_x + 0.4, row_y + 0.4, P2_Z + 0.75, 0.8, 0.08, 0.45, "PantallaMonitor")
            add_human(dev_x, row_y - 0.4, P2_Z, 0, is_esd_worker=False, is_seated=True)

    # F. Hardware e IoT - Laboratorio R&D (x=16.0, y=15.0)
    add_box(13.0, 13.5, P2_Z, 6.0, 1.3, 0.85, "MesaTrabajo")
    add_box(14.0, 14.0, P2_Z + 0.85, 1.4, 0.5, 0.6, "CamaraInox") # Osciloscopio / R&D
    add_human(15.5, 12.5, P2_Z, 0, is_esd_worker=True, is_seated=False) # Ingeniero R&D con bata

    # =========================================================================
    # G. INFRAESTRUCTURA DE DATOS & SERVIDORES CLOUD IOT (PISO 2)
    # =========================================================================
    for rk in range(6):
        add_box(14.0 + rk * 0.9, 17.2, P2_Z, 0.75, 1.1, 2.2, "ServidorRackData")
        add_box(14.05 + rk * 0.9, 17.18, P2_Z + 0.4, 0.65, 0.05, 1.6, "AnilloLedGlow")
    add_box(13.2, 17.2, P2_Z, 0.6, 1.1, 2.3, "ServidorRackData") # CRAC Norte
    add_box(19.5, 17.2, P2_Z, 0.6, 1.1, 2.3, "ServidorRackData") # CRAC Sur
    add_box(13.0, 17.6, P2_Z + 2.4, 7.2, 0.3, 0.08, "FibraBandejaAmarilla")

    # =========================================================================
    # H. PARQUE SOLAR FOTOVOLTAICO EN CUBIERTA (13.2 kWp)
    # =========================================================================
    ROOF_Z = P2_Z + FLOOR_H
    add_box(0, 0, ROOF_Z, BUILDING_W, BUILDING_L, 0.2, "LosaEntrepisoHormigon")
    for fila in range(3):
        for col in range(8):
            add_box(2.5 + col * 2.0, 1.5 + fila * 2.4, ROOF_Z + 0.2, 1.8, 1.1, 0.06, "CeldaSolarNegra")
    add_box(18.5, 2.0, ROOF_Z + 0.2, 1.0, 0.6, 0.9, "MarcoAluminio")

    # Escribir archivo OBJ multi-cuerpo
    with open(output_obj_path, "w", encoding="utf-8") as f:
        f.write(f"# Modelo 3D Arquitectonico Complejo OTech AirNet - 2 Pisos\n")
        f.write(f"mtllib {os.path.basename(output_mtl_path)}\n\n")

        for vx, vy, vz in vertices:
            f.write(f"v {vx:.4f} {vy:.4f} {vz:.4f}\n")

        current_mtl = None
        for mtl_name, f_list in faces:
            if mtl_name != current_mtl:
                f.write(f"\nusemtl {mtl_name}\n")
                current_mtl = mtl_name
            for p1, p2, p3 in f_list:
                f.write(f"f {p1} {p2} {p3}\n")

    print(f"Modelo 3D de 2 Pisos exportado exitosamente en: {output_obj_path}")

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    obj_path = os.path.join(base_dir, "planta_otech_3d.obj")
    mtl_path = os.path.join(base_dir, "planta_otech_3d.mtl")
    generate_detailed_plant_obj(obj_path, mtl_path)
