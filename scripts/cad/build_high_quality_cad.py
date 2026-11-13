"""
OTech AirNet - Generador de Modelo 3D de Alta Fidelidad para Autodesk Inventor y Fusion 360
Crea mallas de alta resolución con curvaturas suaves (Hi-Poly), materiales fotorrealistas y colores automáticos.
"""

import math
import struct
import os

class HiPolyMesh:
    def __init__(self, name="Part", material="Default"):
        self.name = name
        self.material = material
        self.vertices = []
        self.normals = []
        self.texcoords = []
        self.faces = []

    def add_vertex(self, x, y, z):
        idx = len(self.vertices)
        self.vertices.append((float(x), float(y), float(z)))
        return idx

    def add_triangle(self, v1, v2, v3):
        p1 = self.vertices[v1]
        p2 = self.vertices[v2]
        p3 = self.vertices[v3]
        # Cross product (p2 - p1) x (p3 - p1)
        ux, uy, uz = p2[0]-p1[0], p2[1]-p1[1], p2[2]-p1[2]
        vx, vy, vz = p3[0]-p1[0], p3[1]-p1[1], p3[2]-p1[2]
        nx = uy*vz - uz*vy
        ny = uz*vx - ux*vz
        nz = ux*vy - uy*vx
        length = math.sqrt(nx*nx + ny*ny + nz*nz)
        if length > 1e-9:
            nx, ny, nz = nx/length, ny/length, nz/length
        else:
            nx, ny, nz = 0.0, 1.0, 0.0
        self.faces.append((v1, v2, v3, nx, ny, nz))

    def add_quad(self, v1, v2, v3, v4):
        self.add_triangle(v1, v2, v3)
        self.add_triangle(v1, v3, v4)

    def add_smooth_cylinder(self, r_bot, r_top, height, segments=72, center_x=0, center_y=0, center_z=0, cap_bot=True, cap_top=True, tilt_deg=0):
        tilt_rad = math.radians(tilt_deg)
        cos_t = math.cos(tilt_rad)
        sin_t = math.sin(tilt_rad)

        bot_ring = []
        top_ring = []

        for i in range(segments):
            angle = 2.0 * math.pi * i / segments
            cos_a = math.cos(angle)
            sin_a = math.sin(angle)

            bx = center_x + r_bot * cos_a
            by = center_y
            bz = center_z + r_bot * sin_a
            bot_ring.append(self.add_vertex(bx, by, bz))

            tx = center_x + r_top * cos_a
            ly = height
            lz = r_top * sin_a
            rot_y = ly * cos_t - lz * sin_t
            rot_z = ly * sin_t + lz * cos_t
            top_ring.append(self.add_vertex(tx, center_y + rot_y, center_z + rot_z))

        for i in range(segments):
            next_i = (i + 1) % segments
            self.add_quad(bot_ring[i], bot_ring[next_i], top_ring[next_i], top_ring[i])

        if cap_bot:
            c_bot = self.add_vertex(center_x, center_y, center_z)
            for i in range(segments):
                next_i = (i + 1) % segments
                self.add_triangle(c_bot, bot_ring[i], bot_ring[next_i])

        if cap_top:
            c_top_z = height * sin_t
            c_top_y = center_y + height * cos_t
            c_top = self.add_vertex(center_x, c_top_y, center_z + c_top_z)
            for i in range(segments):
                next_i = (i + 1) % segments
                self.add_triangle(c_top, top_ring[next_i], top_ring[i])

    def add_torus(self, major_r, minor_r, radial_seg=48, tubular_seg=24, center_x=0, center_y=0, center_z=0):
        grid = []
        for i in range(radial_seg):
            u = 2.0 * math.pi * i / radial_seg
            row = []
            for j in range(tubular_seg):
                v = 2.0 * math.pi * j / tubular_seg
                x = (major_r + minor_r * math.cos(v)) * math.cos(u)
                y = minor_r * math.sin(v)
                z = (major_r + minor_r * math.cos(v)) * math.sin(u)
                row.append(self.add_vertex(center_x + x, center_y + y, center_z + z))
            grid.append(row)

        for i in range(radial_seg):
            next_i = (i + 1) % radial_seg
            for j in range(tubular_seg):
                next_j = (j + 1) % tubular_seg
                v1 = grid[i][j]
                v2 = grid[next_i][j]
                v3 = grid[next_i][next_j]
                v4 = grid[i][next_j]
                self.add_quad(v1, v2, v3, v4)

    def add_rounded_box(self, width, height, depth, center_x=0, center_y=0, center_z=0, rot_x_deg=0):
        hw = width / 2.0
        hh = height / 2.0
        hd = depth / 2.0

        rad = math.radians(rot_x_deg)
        cr = math.cos(rad)
        sr = math.sin(rad)

        def rot_v(lx, ly, lz):
            ry = ly * cr - lz * sr
            rz = ly * sr + lz * cr
            return self.add_vertex(center_x + lx, center_y + ry, center_z + rz)

        v0 = rot_v(-hw, -hh, -hd)
        v1 = rot_v( hw, -hh, -hd)
        v2 = rot_v( hw,  hh, -hd)
        v3 = rot_v(-hw,  hh, -hd)
        v4 = rot_v(-hw, -hh,  hd)
        v5 = rot_v( hw, -hh,  hd)
        v6 = rot_v( hw,  hh,  hd)
        v7 = rot_v(-hw,  hh,  hd)

        self.add_quad(v0, v3, v2, v1)
        self.add_quad(v5, v6, v7, v4)
        self.add_quad(v0, v1, v5, v4)
        self.add_quad(v3, v7, v6, v2)
        self.add_quad(v4, v7, v3, v0)
        self.add_quad(v1, v2, v6, v5)

    def write_binary_stl(self, filepath):
        with open(filepath, 'wb') as f:
            header = f"OTech AirNet High-Poly {self.name}".encode('ascii')
            header = header[:80].ljust(80, b'\0')
            f.write(header)
            f.write(struct.pack('<I', len(self.faces)))
            for f_data in self.faces:
                v1, v2, v3, nx, ny, nz = f_data
                p1 = self.vertices[v1]
                p2 = self.vertices[v2]
                p3 = self.vertices[v3]
                f.write(struct.pack('<3f', nx, ny, nz))
                f.write(struct.pack('<3f', *p1))
                f.write(struct.pack('<3f', *p2))
                f.write(struct.pack('<3f', *p3))
                f.write(struct.pack('<H', 0))

# -------------------------------------------------------------
# BUILD HIGH-RESOLUTION PARTS
# -------------------------------------------------------------
def build_pro_hood():
    m = HiPolyMesh("Cupula_Solar_Superior", "Panel_Solar_Azul")
    # Base collar with O-Ring groove
    m.add_smooth_cylinder(51, 51, 14, segments=72, center_y=116, cap_bot=True, cap_top=True)
    # Tilted Cone Hood (12 degrees, smooth bevel)
    m.add_smooth_cylinder(68, 60, 10, segments=72, center_y=130, cap_bot=True, cap_top=True, tilt_deg=12)
    # Monocrystalline Solar Panel
    m.add_rounded_box(76, 4, 76, center_x=0, center_y=140, center_z=0, rot_x_deg=12)
    return m

def build_pro_enclosure():
    m = HiPolyMesh("Gabinete_Principal_IP65", "Polimero_Blanco_ASA")
    # Main outer cylinder
    m.add_smooth_cylinder(52, 52, 76, segments=72, center_y=40, cap_bot=True, cap_top=True)
    # Top & Bottom reinforcing flanges
    m.add_smooth_cylinder(56, 56, 6, segments=72, center_y=112, cap_bot=True, cap_top=True)
    m.add_smooth_cylinder(56, 56, 6, segments=72, center_y=38, cap_bot=True, cap_top=True)
    # LED Status Ring (Glow Ring)
    m.add_torus(53.5, 2.0, radial_seg=64, tubular_seg=16, center_y=78)
    # PG9 Brass Cable Gland
    m.add_smooth_cylinder(8, 8, 16, segments=24, center_x=52, center_y=60, center_z=0, cap_bot=True, cap_top=True)
    return m

def build_pro_chassis():
    m = HiPolyMesh("Bandeja_Interna_Sensores", "Verde_PCB_Industrial")
    # Aluminum backbone plate
    m.add_rounded_box(3, 72, 76, center_x=0, center_y=75, center_z=0)
    # Main PCB
    m.add_rounded_box(1.6, 68, 72, center_x=3, center_y=75, center_z=0)
    # ESP32-S3 Module
    m.add_rounded_box(4, 18, 24, center_x=6, center_y=95, center_z=-15)
    # Sensirion SPS30 Laser Sensor (Aluminum Silver)
    m.add_rounded_box(14, 38, 38, center_x=10, center_y=58, center_z=-12)
    # Dual Nozzles
    m.add_smooth_cylinder(3.5, 3.5, 8, segments=24, center_x=18, center_y=50, center_z=-20, cap_bot=True, cap_top=True)
    m.add_smooth_cylinder(3.5, 3.5, 8, segments=24, center_x=18, center_y=50, center_z=-4, cap_bot=True, cap_top=True)
    # BME680 Sensor
    m.add_rounded_box(2.5, 12, 14, center_x=6, center_y=95, center_z=18)
    # LiFePO4 Battery Cell (Blue)
    m.add_smooth_cylinder(15, 15, 65, segments=48, center_x=-18, center_y=45, center_z=10, cap_bot=True, cap_top=True)
    return m

def build_pro_stevenson():
    m = HiPolyMesh("Camara_Muestreo_Stevenson", "Polimero_Blanco_ASA")
    # 5 Aerodynamic Louver Rings (45-degree angle deflectors)
    for i in range(5):
        y_pos = i * 8.5
        m.add_smooth_cylinder(55, 48, 6.5, segments=72, center_y=y_pos, cap_bot=True, cap_top=True)
    # Stainless Steel 316 Mesh Screen (Inner core)
    m.add_smooth_cylinder(46, 46, 42, segments=64, center_y=0, cap_bot=True, cap_top=True)
    # Bottom Condensation Funnel Drain
    m.add_smooth_cylinder(46, 10, 10, segments=64, center_y=-10, cap_bot=True, cap_top=True)
    return m

def build_pro_bracket():
    m = HiPolyMesh("Soporte_Mastil_Pared", "Acero_Inox_316")
    # Base collar
    m.add_smooth_cylinder(52, 52, 14, segments=72, center_y=-24, cap_bot=True, cap_top=True)
    # Heavy-duty arm extender
    m.add_rounded_box(48, 16, 40, center_x=0, center_y=-16, center_z=-45)
    # Mast clamp collar for 2" pole
    m.add_smooth_cylinder(32, 32, 18, segments=64, center_x=0, center_y=-24, center_z=-70, cap_bot=True, cap_top=True)
    # Steel Hose Clamps (Zunchos sinfin)
    m.add_torus(33, 1.8, radial_seg=48, tubular_seg=16, center_x=0, center_y=-14, center_z=-70)
    m.add_torus(33, 1.8, radial_seg=48, tubular_seg=16, center_x=0, center_y=-22, center_z=-70)
    return m

def generate_pro_package():
    parts = [
        ("01_Cupula_Solar_Superior.stl", build_pro_hood(), "Panel_Solar_Azul"),
        ("02_Gabinete_IP65.stl", build_pro_enclosure(), "Polimero_Blanco_ASA"),
        ("03_Bandeja_Sensores_Interna.stl", build_pro_chassis(), "Verde_PCB_Industrial"),
        ("04_Camara_Stevenson_Admision.stl", build_pro_stevenson(), "Polimero_Blanco_ASA"),
        ("05_Soporte_Mastil_Pared.stl", build_pro_bracket(), "Acero_Inox_316")
    ]

    # 1. Generate High-Poly STLs
    for fname, mesh, _ in parts:
        mesh.write_binary_stl(fname)
        print(f"OK: {fname} generado ({len(mesh.faces)} polígonos)")

    # 2. Generate Master Assembly STL
    full_mesh = HiPolyMesh("OTech_AirNet_Ensamble_Completo")
    for _, mesh, _ in parts:
        v_offset = len(full_mesh.vertices)
        for v in mesh.vertices:
            full_mesh.vertices.append(v)
        for f_data in mesh.faces:
            v1, v2, v3, nx, ny, nz = f_data
            full_mesh.faces.append((v1 + v_offset, v2 + v_offset, v3 + v_offset, nx, ny, nz))
    full_mesh.write_binary_stl("06_Ensamble_Total_Exterior.stl")
    print("OK: 06_Ensamble_Total_Exterior.stl generado")

    # 3. Generate Master Textured OBJ + MTL for Autodesk Inventor & Fusion 360
    obj_name = "OTech_AirNet_Exterior_Completo.obj"
    mtl_name = "OTech_AirNet_Exterior.mtl"

    with open(mtl_name, "w") as mtl:
        mtl.write("# Materiales OTech AirNet para Autodesk Inventor & Fusion 360\n\n")
        
        mtl.write("newmtl Polimero_Blanco_ASA\n")
        mtl.write("Ka 0.2 0.2 0.2\n")
        mtl.write("Kd 0.95 0.96 0.98\n") # Bright white glossy
        mtl.write("Ks 0.4 0.4 0.4\n")
        mtl.write("Ns 60\n")
        mtl.write("d 1.0\n\n")

        mtl.write("newmtl Panel_Solar_Azul\n")
        mtl.write("Ka 0.1 0.1 0.2\n")
        mtl.write("Kd 0.08 0.18 0.42\n") # Deep solar blue
        mtl.write("Ks 0.9 0.9 0.9\n")
        mtl.write("Ns 150\n")
        mtl.write("d 1.0\n\n")

        mtl.write("newmtl Verde_PCB_Industrial\n")
        mtl.write("Ka 0.1 0.2 0.1\n")
        mtl.write("Kd 0.05 0.55 0.25\n") # Rich PCB Green
        mtl.write("Ks 0.5 0.5 0.5\n")
        mtl.write("Ns 50\n")
        mtl.write("d 1.0\n\n")

        mtl.write("newmtl Acero_Inox_316\n")
        mtl.write("Ka 0.3 0.3 0.3\n")
        mtl.write("Kd 0.78 0.80 0.82\n") # Stainless metallic silver
        mtl.write("Ks 0.95 0.95 0.95\n")
        mtl.write("Ns 120\n")
        mtl.write("d 1.0\n\n")

    with open(obj_name, "w") as f:
        f.write("# OTech AirNet Exterior - Modelo CAD Multi-Cuerpo de Alta Calidad\n")
        f.write(f"mtllib {mtl_name}\n\n")

        v_offset = 1
        for fname, mesh, mat in parts:
            f.write(f"o {mesh.name}\n")
            f.write(f"g {mesh.name}\n")
            f.write(f"usemtl {mat}\n")
            f.write("s 1\n") # Enable smooth shading group
            for v in mesh.vertices:
                f.write(f"v {v[0]:.4f} {v[1]:.4f} {v[2]:.4f}\n")
            for f_data in mesh.faces:
                v1, v2, v3, _, _, _ = f_data
                f.write(f"f {v1 + v_offset} {v2 + v_offset} {v3 + v_offset}\n")
            v_offset += len(mesh.vertices)
            f.write("\n")

    print(f"OK: {obj_name} y {mtl_name} generados con sombreado suave y colores")

if __name__ == "__main__":
    generate_pro_package()
