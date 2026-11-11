"""
OTech AirNet - Generador Mejorado de Modelos STL y OBJ con Normales Optimizadas para Autodesk Inventor
"""

import math
import struct

class Mesh:
    def __init__(self, name="Part"):
        self.name = name
        self.vertices = []
        self.faces = [] # list of (v1, v2, v3, nx, ny, nz)

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
        # CCW winding
        self.add_triangle(v1, v2, v3)
        self.add_triangle(v1, v3, v4)

    def add_cylinder(self, r_bottom, r_top, height, segments=48, center_x=0, center_y=0, center_z=0, cap_bottom=True, cap_top=True, tilt_deg=0):
        tilt_rad = math.radians(tilt_deg)
        cos_t = math.cos(tilt_rad)
        sin_t = math.sin(tilt_rad)

        bot_indices = []
        top_indices = []

        for i in range(segments):
            angle = 2.0 * math.pi * i / segments
            cos_a = math.cos(angle)
            sin_a = math.sin(angle)

            # Bottom ring (CCW viewed from bottom)
            bx = center_x + r_bottom * cos_a
            by = center_y
            bz = center_z + r_bottom * sin_a
            bot_indices.append(self.add_vertex(bx, by, bz))

            # Top ring (with tilt)
            tx = center_x + r_top * cos_a
            local_y = height
            local_z = r_top * sin_a
            rot_y = local_y * cos_t - local_z * sin_t
            rot_z = local_y * sin_t + local_z * cos_t
            top_indices.append(self.add_vertex(tx, center_y + rot_y, center_z + rot_z))

        # Side quads with outward-facing normals
        for i in range(segments):
            next_i = (i + 1) % segments
            b1 = bot_indices[i]
            b2 = bot_indices[next_i]
            t1 = top_indices[i]
            t2 = top_indices[next_i]
            self.add_quad(b1, b2, t2, t1)

        # Bottom cap (Normal pointing down -Y)
        if cap_bottom:
            bot_center = self.add_vertex(center_x, center_y, center_z)
            for i in range(segments):
                next_i = (i + 1) % segments
                self.add_triangle(bot_center, bot_indices[i], bot_indices[next_i])

        # Top cap (Normal pointing up +Y)
        if cap_top:
            top_center_z = height * sin_t
            top_center_y = center_y + height * cos_t
            top_center = self.add_vertex(center_x, top_center_y, center_z + top_center_z)
            for i in range(segments):
                next_i = (i + 1) % segments
                self.add_triangle(top_center, top_indices[next_i], top_indices[i])

    def add_box(self, width, height, depth, center_x=0, center_y=0, center_z=0, rot_x_deg=0):
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

        # 8 corners
        v0 = rot_v(-hw, -hh, -hd)
        v1 = rot_v( hw, -hh, -hd)
        v2 = rot_v( hw,  hh, -hd)
        v3 = rot_v(-hw,  hh, -hd)
        v4 = rot_v(-hw, -hh,  hd)
        v5 = rot_v( hw, -hh,  hd)
        v6 = rot_v( hw,  hh,  hd)
        v7 = rot_v(-hw,  hh,  hd)

        # 6 faces with proper outward CCW winding
        self.add_quad(v0, v3, v2, v1) # Front (-Z)
        self.add_quad(v5, v6, v7, v4) # Back (+Z)
        self.add_quad(v0, v1, v5, v4) # Bottom (-Y)
        self.add_quad(v3, v7, v6, v2) # Top (+Y)
        self.add_quad(v4, v7, v3, v0) # Left (-X)
        self.add_quad(v1, v2, v6, v5) # Right (+X)

    def write_binary_stl(self, filepath):
        with open(filepath, 'wb') as f:
            header = f"OTech AirNet {self.name}".encode('ascii')
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

def build_hood():
    m = Mesh("Cupula_Solar_Superior")
    # Base collar
    m.add_cylinder(50, 50, 15, segments=48, center_y=115, cap_bottom=True, cap_top=True)
    # Tilted Cone Hood (12 degrees)
    m.add_cylinder(68, 58, 12, segments=48, center_y=130, cap_bottom=True, cap_top=True, tilt_deg=12)
    # Solar Panel
    m.add_box(76, 4, 76, center_x=0, center_y=140, center_z=0, rot_x_deg=12)
    return m

def build_enclosure():
    m = Mesh("Gabinete_Principal_IP65")
    # Main outer cylinder
    m.add_cylinder(52, 52, 76, segments=48, center_y=40, cap_bottom=True, cap_top=True)
    # Top & Bottom mounting flanges
    m.add_cylinder(56, 56, 6, segments=48, center_y=112, cap_bottom=True, cap_top=True)
    m.add_cylinder(56, 56, 6, segments=48, center_y=38, cap_bottom=True, cap_top=True)
    # PG9 Brass Cable Gland
    m.add_box(18, 14, 14, center_x=58, center_y=60, center_z=0)
    # LED status ring band
    m.add_cylinder(54, 54, 4, segments=48, center_y=80, cap_bottom=True, cap_top=True)
    return m

def build_chassis():
    m = Mesh("Bandeja_Interna_Sensores")
    # Main PCB Backbone
    m.add_box(4, 70, 75, center_x=0, center_y=75, center_z=0)
    # ESP32-S3 Module
    m.add_box(4, 18, 24, center_x=6, center_y=95, center_z=-15)
    # Sensirion SPS30 Laser Particle Sensor
    m.add_box(14, 38, 38, center_x=10, center_y=60, center_z=-12)
    # BME680 Sensor
    m.add_box(3, 12, 14, center_x=6, center_y=95, center_z=18)
    # LiFePO4 32650 Battery
    m.add_cylinder(15, 15, 65, segments=32, center_x=-18, center_y=45, center_z=10, cap_bottom=True, cap_top=True)
    return m

def build_stevenson():
    m = Mesh("Camara_Muestreo_Stevenson")
    # 5 Louvered Angled Rings
    for i in range(5):
        y_pos = i * 8.0
        m.add_cylinder(55, 48, 6, segments=48, center_y=y_pos, cap_bottom=True, cap_top=True)
    # Inner Mesh Cylinder
    m.add_cylinder(46, 46, 40, segments=36, center_y=0, cap_bottom=True, cap_top=True)
    # Bottom condensation drain cone
    m.add_cylinder(46, 12, 10, segments=36, center_y=-10, cap_bottom=True, cap_top=True)
    return m

def build_bracket():
    m = Mesh("Soporte_Mastil_Pared")
    # Collar to station
    m.add_cylinder(52, 52, 14, segments=48, center_y=-24, cap_bottom=True, cap_top=True)
    # Heavy Duty Extension Arm
    m.add_box(48, 16, 40, center_x=0, center_y=-16, center_z=-45)
    # Mast Clamp Jaw
    m.add_cylinder(32, 32, 18, segments=36, center_x=0, center_y=-24, center_z=-70, cap_bottom=True, cap_top=True)
    # 2 Hose Clamps
    m.add_box(68, 4, 10, center_x=0, center_y=-14, center_z=-70)
    m.add_box(68, 4, 10, center_x=0, center_y=-22, center_z=-70)
    return m

def export_all():
    parts = [
        ("01_Cupula_Solar_Superior.stl", build_hood()),
        ("02_Gabinete_IP65.stl", build_enclosure()),
        ("03_Bandeja_Sensores_Interna.stl", build_chassis()),
        ("04_Camara_Stevenson_Admision.stl", build_stevenson()),
        ("05_Soporte_Mastil_Pared.stl", build_bracket())
    ]

    for fname, mesh in parts:
        mesh.write_binary_stl(fname)
        print(f"Actualizado STL: {fname}")

    # Full assembly
    full_mesh = Mesh("OTech_AirNet_Ensamble_Completo")
    for _, mesh in parts:
        v_offset = len(full_mesh.vertices)
        for v in mesh.vertices:
            full_mesh.vertices.append(v)
        for f_data in mesh.faces:
            v1, v2, v3, nx, ny, nz = f_data
            full_mesh.faces.append((v1 + v_offset, v2 + v_offset, v3 + v_offset, nx, ny, nz))
    full_mesh.write_binary_stl("06_Ensamble_Total_Exterior.stl")

if __name__ == "__main__":
    export_all()
