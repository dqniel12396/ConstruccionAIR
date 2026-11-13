import docx
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls
import os

DOC_PATH = r'f:\Proyectos\Modelo de construccion de software\DOCUMENTOS FAINLES\OTech_Esquema_Constitucion_Final.docx'
SAVE_PATH = r'f:\Proyectos\Modelo de construccion de software\DOCUMENTOS FAINLES\OTech_Esquema_Constitucion_Final_Actualizado.docx'
IMG_DIR = r'f:\Proyectos\Modelo de construccion de software\imagenes_documento'

# We will reload from the fresh base or update cleanly
# Let's inspect paragraphs to find Section 13 and ANEXO B
doc = docx.Document(DOC_PATH)

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=90, bottom=90, left=130, right=130):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def add_heading_styled(doc, text, level):
    h = doc.add_heading(text, level=level)
    h.paragraph_format.keep_with_next = True
    if level == 1:
        h.paragraph_format.space_before = Pt(14)
        h.paragraph_format.space_after = Pt(6)
        if h.runs:
            h.runs[0].font.name = 'Aptos'
            h.runs[0].font.size = Pt(15)
            h.runs[0].font.bold = True
            h.runs[0].font.color.rgb = RGBColor(0x1F, 0x4E, 0x79)
    elif level == 2:
        h.paragraph_format.space_before = Pt(12)
        h.paragraph_format.space_after = Pt(4)
        if h.runs:
            h.runs[0].font.name = 'Aptos'
            h.runs[0].font.size = Pt(12.5)
            h.runs[0].font.bold = True
            h.runs[0].font.color.rgb = RGBColor(0x1F, 0x4E, 0x79)
    elif level == 3:
        h.paragraph_format.space_before = Pt(8)
        h.paragraph_format.space_after = Pt(2)
        if h.runs:
            h.runs[0].font.name = 'Aptos'
            h.runs[0].font.size = Pt(11)
            h.runs[0].font.bold = True
            h.runs[0].font.color.rgb = RGBColor(0x1F, 0x4E, 0x79)
    return h

def add_p_styled(doc, text, bold_prefix="", space_after=4):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        r_bold = p.add_run(bold_prefix)
        r_bold.font.name = 'Aptos'
        r_bold.font.size = Pt(10.5)
        r_bold.font.bold = True
        r_bold.font.color.rgb = RGBColor(0x26, 0x26, 0x26)
    r = p.add_run(text)
    r.font.name = 'Aptos'
    r.font.size = Pt(10.5)
    r.font.color.rgb = RGBColor(0x26, 0x26, 0x26)
    return p

def add_bullet_styled(doc, text, bold_prefix=""):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(2.5)
    p.paragraph_format.line_spacing = 1.10
    if bold_prefix:
        r_bold = p.add_run(bold_prefix)
        r_bold.font.name = 'Aptos'
        r_bold.font.size = Pt(10.0)
        r_bold.font.bold = True
        r_bold.font.color.rgb = RGBColor(0x26, 0x26, 0x26)
    r = p.add_run(text)
    r.font.name = 'Aptos'
    r.font.size = Pt(10.0)
    r.font.color.rgb = RGBColor(0x26, 0x26, 0x26)
    return p

def add_image_styled(doc, img_rel_name, caption_text, width_in=5.8):
    img_path = os.path.join(IMG_DIR, img_rel_name)
    if not os.path.exists(img_path):
        print(f"WARNING: Image not found: {img_path}")
        return None
    p_img = doc.add_paragraph()
    p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_img.paragraph_format.space_before = Pt(8)
    p_img.paragraph_format.space_after = Pt(2)
    p_img.paragraph_format.keep_with_next = True
    r = p_img.add_run()
    r.add_picture(img_path, width=Inches(width_in))
    
    p_cap = doc.add_paragraph()
    p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cap.paragraph_format.space_before = Pt(0)
    p_cap.paragraph_format.space_after = Pt(8)
    r_cap = p_cap.add_run(caption_text)
    r_cap.font.name = 'Aptos'
    r_cap.font.size = Pt(9.0)
    r_cap.font.italic = True
    r_cap.font.color.rgb = RGBColor(0x59, 0x59, 0x59)
    return p_img

def add_table_styled(doc, headers, rows_data, col_widths=None):
    t = doc.add_table(rows=len(rows_data)+1, cols=len(headers))
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.style = 'Table Grid'
    
    # Format header row
    hdr_row = t.rows[0]
    trPr = hdr_row._tr.get_or_add_trPr()
    trPr.append(parse_xml(f'<w:tblHeader {nsdecls("w")}/>'))
    for c_idx, h_text in enumerate(headers):
        cell = hdr_row.cells[c_idx]
        set_cell_background(cell, "1F4E79")
        set_cell_margins(cell, top=90, bottom=90, left=110, right=110)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(h_text)
        r.font.name = 'Aptos'
        r.font.size = Pt(9.0)
        r.font.bold = True
        r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        
    # Format data rows
    for r_idx, r_data in enumerate(rows_data):
        row = t.rows[r_idx + 1]
        fill_color = "F2F5F8" if (r_idx % 2 == 1) else "FFFFFF"
        for c_idx, val in enumerate(r_data):
            cell = row.cells[c_idx]
            if fill_color != "FFFFFF":
                set_cell_background(cell, fill_color)
            set_cell_margins(cell, top=70, bottom=70, left=110, right=110)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(str(val))
            r.font.name = 'Aptos'
            r.font.size = Pt(8.5)
            r.font.color.rgb = RGBColor(0x26, 0x26, 0x26)
            
    if col_widths:
        for row in t.rows:
            for c_idx, w in enumerate(col_widths):
                row.cells[c_idx].width = Inches(w)
                
    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_before = Pt(0)
    p_sp.paragraph_format.space_after = Pt(6)
    return t

print("Updating Section 13 image...")
# In Section 13, replace picture in paragraph before Figura 3
for i, p in enumerate(doc.paragraphs):
    if "Figura 3. Vista general del modelo de planta de producción y sede de OTech" in p.text:
        prev_p = doc.paragraphs[i-1]
        prev_p.text = ""
        prev_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        prev_p.paragraph_format.space_before = Pt(8)
        prev_p.paragraph_format.space_after = Pt(2)
        r = prev_p.add_run()
        r.add_picture(os.path.join(IMG_DIR, "03_planta_vista_general_isometrika.png"), width=Inches(5.8))
        p.text = "Figura 3. Vista general del modelo 3D del complejo OTech, incluyendo el campus exterior, zona de parqueaderos y edificio principal."
        if p.runs:
            p.runs[0].font.name = 'Aptos'
            p.runs[0].font.size = Pt(9.0)
            p.runs[0].font.italic = True
            p.runs[0].font.color.rgb = RGBColor(0x59, 0x59, 0x59)
        break

# Now, let's truncate everything after ANEXO B header and rewrite ANEXO B with SIMPLIFIED language and CURRENT images
anexo_b_start = None
for i, p in enumerate(doc.paragraphs):
    if "ANEXO B. DISEÑO DE PRODUCTO Y PLANTA DE PRODUCCIÓN" in p.text.upper():
        anexo_b_start = i
        break

print(f"ANEXO B begins at paragraph {anexo_b_start}")

# Remove elements after anexo_b_start + 1
# We will identify all body elements after the second paragraph of Anexo B
body = doc._body._element
anexo_p = doc.paragraphs[anexo_b_start]._p
intro_p = doc.paragraphs[anexo_b_start + 1]._p

# Find index of intro_p in body
intro_idx = body.index(intro_p)
elements_to_remove = list(body)[intro_idx + 1:]
print(f"Removing {len(elements_to_remove)} old trailing elements in Anexo B...")
for el in elements_to_remove:
    body.remove(el)

# Now append simplified, clean, and complete content to ANEXO B:

# B.1 MODELO DEL PRODUCTO
add_heading_styled(doc, "B.1. Modelo del Producto: Estación Exterior OTech AirNet", level=2)

add_p_styled(doc,
    "La estación exterior OTech AirNet es un dispositivo diseñado para medir la calidad del aire de forma continua en exteriores. "
    "Nace a partir del proyecto de código abierto CanAirIO, pero se rediseñó para que pueda soportar sol directo, lluvias fuertes, "
    "viento y polvo durante años sin dañarse, ideal para alcaldías, colegios, empresas y proyectos ambientales.",
    bold_prefix="B.1.1. ¿Qué es la estación OTech AirNet?: ")

add_p_styled(doc,
    "El equipo está compuesto por cinco partes principales que se ensamblan de forma modular y sencilla:",
    bold_prefix="B.1.2. Partes principales del equipo: ")

add_bullet_styled(doc,
    "Tapa inclinada a 12° para que el agua de lluvia y el polvo resbalen sin acumularse. Lleva un panel solar de 5W en la parte superior y un empaque de caucho para evitar filtraciones.",
    bold_prefix="1. Tapa superior con panel solar: ")

add_bullet_styled(doc,
    "Carcasa hermética que protege los circuitos electrónicos, el procesador central, el módulo de comunicaciones y la batería recargable. Cuenta con conectores especiales que impiden el paso de humedad.",
    bold_prefix="2. Caja principal protectora (Sellada contra agua y polvo): ")

add_bullet_styled(doc,
    "Cámara cilíndrica con ranuras inclinadas hacia abajo que permiten la entrada del aire pero evitan que entre agua de lluvia, incluso con viento fuerte. Lleva una malla metálica muy fina para que no entren insectos.",
    bold_prefix="3. Cámara de toma de aire protegida: ")

add_bullet_styled(doc,
    "Bandeja interna deslizante que sostiene los sensores. Si se requiere hacer mantenimiento o cambiar un sensor, el técnico simplemente desliza la bandeja y coloca una nueva en menos de 2 minutos, sin necesidad de bajar la estación del poste.",
    bold_prefix="4. Bandeja intercambiable de sensores (Fácil mantenimiento): ")

add_bullet_styled(doc,
    "Pieza trasera resistente que permite amarrar la estación con abrazaderas metálicas a postes de luz o atornillarla directamente a paredes de concreto.",
    bold_prefix="5. Soporte de montaje para poste o pared: ")

add_image_styled(doc, "01_producto_estacion_exterior_3d.png",
    "Figura 4. Modelo 3D de la Estación Exterior OTech AirNet con mástil, panel solar superior y cámara de toma de aire.", width_in=4.8)

add_image_styled(doc, "02_producto_gabinete_ip65_cupula.png",
    "Figura 5. Detalle de la caja sellada protectora y la tapa solar cónica.", width_in=4.4)

add_heading_styled(doc, "B.1.3. Lista de Componentes y Sensores del Equipo", level=3)

bom_headers = ["Pieza / Componente", "Nombre comercial", "¿Para qué sirve en la estación?", "Datos principales"]
bom_data = [
    ["Procesador principal", "ESP32-S3 (Microcontrolador)", "Controla el equipo, lee los sensores, guarda los datos y los envía a internet.", "Conexión Wi-Fi y Bluetooth integrados."],
    ["Sensor de polvo y humo", "Sensirion SPS30", "Mide la cantidad de polvo fino y humo en el aire (partículas PM2.5 y PM10) mediante luz láser.", "Sensor de alta precisión con autolimpieza."],
    ["Sensor de clima", "Bosch BME680", "Mide la temperatura ambiental, la humedad del aire y la presión atmosférica.", "Rango de -40 °C a 85 °C y 0 a 100% humedad."],
    ["Sensor de CO2", "Sensirion SCD41", "Mide la concentración de dióxido de carbono (CO2) presente en el ambiente.", "Medición de 400 a 5.000 partes por millón."],
    ["Módulo de largo alcance", "Semtech LoRaWAN / Celular", "Permite enviar los datos de calidad del aire a kilómetros de distancia cuando no hay Wi-Fi cerca.", "Cobertura de 5 a 15 km de distancia."],
    ["Controlador de carga solar", "Módulo MPPT", "Aprovecha la luz del sol para alimentar el equipo y recargar la batería de manera automática.", "Carga eficiente y segura para la batería."],
    ["Batería recargable", "Batería LiFePO4 (3.2V)", "Almacena energía para mantener la estación encendida hasta 3 días seguidos sin luz solar.", "Batería segura que dura más de 2.500 cargas."],
    ["Panel solar", "Panel monocristalino 5W", "Capta la luz del día para recargar la batería sin necesidad de enchufar la estación a la corriente.", "Resistente a los rayos del sol y la intemperie."]
]
add_table_styled(doc, bom_headers, bom_data, col_widths=[1.5, 1.5, 2.3, 1.7])

add_p_styled(doc,
    "En ciudades húmedas o lluviosas, las pequeñas gotas de vapor en el aire pueden hacer que los sensores ópticos confundan el agua con polvo o humo. "
    "Para evitar estas falsas alarmas, el sistema de OTech incluye una corrección automática por software que ajusta las lecturas de polvo teniendo "
    "en cuenta la humedad y la temperatura medidas al mismo tiempo. Además, el diseño del equipo separa el calor de los circuitos para que no se forme condensación dentro del sensor.",
    bold_prefix="B.1.4. Protección contra la humedad y el clima: ")

add_p_styled(doc,
    "Las piezas plásticas de la carcasa se fabrican mediante impresión 3D profesional utilizando un material llamado ASA o PETG con protección contra el sol. "
    "No se utiliza plástico común (PLA) porque se deformaría con el calor del sol y se dañaría con la lluvia. Todas las uniones llevan sellos de goma para impedir el paso del agua.",
    bold_prefix="B.1.5. Materiales de fabricación: ")


# B.2 PLANTA DE PRODUCCIÓN
add_heading_styled(doc, "B.2. Manual de la Planta de Producción y Sede de OTech", level=2)

add_p_styled(doc,
    "La planta y sede de OTech S.A.S. se organiza en un edificio moderno de dos (2) pisos con un área total de 800 m² (400 m² por piso, en una base de 20 por 20 metros). "
    "En la parte exterior cuenta con un campus que incluye vías de acceso, parqueaderos y zona de carga, mientras que en el interior se distribuye la fabricación en el primer piso "
    "y las oficinas y desarrollo de software en el segundo piso. La meta de producción es de 500 estaciones al mes (unas 25 estaciones por día de trabajo).",
    bold_prefix="B.2.1. Descripción general del edificio y capacidad: ")

add_heading_styled(doc, "B.2.2. Campus Exterior, Parqueaderos y Zona de Carga", level=3)

add_p_styled(doc,
    "El exterior del complejo está diseñado para facilitar la llegada de empleados, visitantes y camiones de transporte:",
    bold_prefix="Distribución exterior: ")

add_bullet_styled(doc,
    "Cuenta con 10 puestos delimitados para automóviles de empleados y visitantes, con topes de estacionamiento y paso peatonal seguro hacia la entrada principal.",
    bold_prefix="Zona de parqueaderos: ")

add_bullet_styled(doc,
    "Dos bahías señalizadas en color verde con cargadores rápidos para fomentar el transporte ecológico en la empresa.",
    bold_prefix="Puestos de recarga para vehículos eléctricos (EV): ")

add_bullet_styled(doc,
    "Muelle amplio pavimentado donde los camiones pueden maniobrar, descargar las cajas con piezas y cargar los pedidos listos para enviar a los clientes.",
    bold_prefix="Patio de maniobras y muelle de carga: ")

add_bullet_styled(doc,
    "Calle de doble carril con líneas amarillas de separación, cruce peatonal estilo cebra, caseta de control de acceso y zonas verdes perimetrales.",
    bold_prefix="Vía de acceso y garita de seguridad: ")

add_image_styled(doc, "03_planta_vista_general_isometrika.png",
    "Figura 6. Modelo 3D del complejo OTech: vista general del edificio, vía de acceso, zona de parqueaderos exteriores y camiones en el muelle de carga.", width_in=5.8)

add_image_styled(doc, "03b_parqueadero_bahias_ev_acceso.png",
    "Figura 7. Detalle del parqueadero exterior de empleados con puestos de estacionamiento y estaciones de recarga para vehículos eléctricos.", width_in=5.2)

add_heading_styled(doc, "B.2.3. Piso 1: Planta de Producción y Ensamble (400 m²)", level=3)

add_p_styled(doc,
    "El primer piso está dedicado a la fabricación, prueba y empaque de las estaciones de calidad del aire. "
    "Toda la zona de trabajo cuenta con un piso especial de color azul que evita la electricidad estática (para no quemar los circuitos electrónicos), "
    "y el trabajo se realiza a lo largo de una línea de ensamblaje en forma de 'U' compuesta por siete (7) estaciones sencillas:",
    bold_prefix="Organización del Piso 1: ")

estaciones_data_simple = [
    ["Estación 1: Armado de la base y sensores", "12.5 minutos", "Se colocan los sensores de polvo, clima y gases en la bandeja interna usando herramientas ajustadas y soportes de goma antivibración."],
    ["Estación 2: Programación y prueba electrónica", "8.0 minutos", "Se conecta la tarjeta a un equipo de prueba rápida, se le instala el software de OTech, se guardan las claves de seguridad y se prueba que gaste poca batería."],
    ["Estación 3: Armado final y sellado de la caja", "14.0 minutos", "Se coloca la batería recargable dentro de la caja protectora, se pone el empaque de caucho y se ajustan los tornillos y protectores de cables para que no entre agua."],
    ["Estación 4: Prueba de sello contra agua (Hermeticidad)", "5.0 minutos", "Se inyecta aire a presión durante un minuto para verificar con un manómetro que la caja esté 100% sellada contra la lluvia sin necesidad de mojarla."],
    ["Estación 5: Calibración con muestras patrón", "3.0 min netos por unidad", "Se colocan las estaciones dentro de una cámara de prueba con muestras conocidas de gas y polvo para verificar que midan exactamente lo que deben."],
    ["Estación 6: Prueba de encendido continuo (48 horas)", "Proceso automático", "Las estaciones se dejan encendidas 48 horas seguidas en una estantería especial cambiando entre frío y calor para asegurar que ninguna pieza falle al salir."],
    ["Estación 7: Revisión final, empaque y despacho", "10.0 minutos", "Se limpia el equipo, se revisa visualmente, se le pega la etiqueta con su código y número de serie, y se empaca en su caja con manual y accesorios para entrega."]
]
add_table_styled(doc, ["Estación de Trabajo (Piso 1)", "Tiempo estimado", "Qué se hace en esta estación (Explicación sencilla)"], estaciones_data_simple, col_widths=[1.8, 1.2, 3.8])

add_image_styled(doc, "04_planta_piso1_celda_manufactura.png",
    "Figura 8. Planta de producción en el Piso 1: línea de armado en 'U', mesas de trabajo, piso azul antiestático y tanques de agua en la parte trasera.", width_in=5.6)

add_heading_styled(doc, "B.2.4. Piso 2: Oficinas Corporativas, Desarrollo y Monitoreo (400 m²)", level=3)

add_p_styled(doc,
    "El segundo piso reúne al equipo administrativo, los ingenieros de software, el área comercial y la sala de monitoreo. "
    "Está dividido con paneles de vidrio transparente para crear un ambiente moderno, luminoso y colaborativo:",
    bold_prefix="Organización del Piso 2: ")

piso2_roles_simple = [
    ["Gerencia General (CEO)", "Gerente y asistente", "Oficina de presidencia con ventanales grandes y sala de juntas con mesa para 10 personas y pantalla de video para reuniones importantes."],
    ["Equipo de Software y Datos (CTO)", "Programadores e ingenieros de datos", "Mesas amplias de trabajo con pantallas dobles donde se desarrolla la aplicación web, el software de los sensores y la inteligencia artificial."],
    ["Centro de Operaciones (NOC 24/7)", "Técnicos de monitoreo y soporte", "Sala con una pared de pantallas (Video Wall) para vigilar en tiempo real que todas las estaciones instaladas en las ciudades estén transmitiendo datos."],
    ["Laboratorio de Hardware (R&D)", "Ingenieros electrónicos", "Taller técnico con mesas de soldadura, instrumentos de medición e impresoras 3D para diseñar mejoras y probar nuevos modelos."],
    ["Cuarto de Servidores (Data Center)", "Ingenieros de sistemas", "Habitación segura y refrigerada con baterías de respaldo y servidores para almacenar la información de los clientes."],
    ["Vitrina y Balcón Mirador", "Visitantes y clientes", "Mesa de exhibición con estaciones encendidas para hacer demostraciones a clientes y balcón de vidrio con vista directa hacia la fábrica del primer piso."]
]
add_table_styled(doc, ["Área del Piso 2", "Quiénes trabajan allí", "Qué hay en este espacio (Explicación sencilla)"], piso2_roles_simple, col_widths=[1.7, 1.6, 3.5])

add_image_styled(doc, "06_planta_piso2_sede_corporativa.png",
    "Figura 9. Vista 3D del segundo piso: oficinas con divisiones de vidrio, sala de reuniones, zona de desarrollo de software y sala de monitoreo (NOC).", width_in=5.6)

add_heading_styled(doc, "B.2.5. Vistas de la Estructura Completa del Edificio", level=3)

add_image_styled(doc, "08_planta_vista_explosionada_niveles.png",
    "Figura 10. Vista tridimensional de los dos niveles del edificio separados, mostrando la relación entre la fábrica del primer piso y las oficinas del segundo piso.", width_in=5.8)

add_heading_styled(doc, "B.2.6. Organización del Trabajo y Capacidad Diaria", level=3)

add_p_styled(doc,
    "Para fabricar las 500 estaciones al mes se trabaja en un solo turno de 8 horas diarias. "
    "El tiempo promedio para armar y revisar cada estación a lo largo de las 7 mesas es de aproximadamente 16.8 minutos. "
    "Con un equipo de 5 personas en la planta (4 operarios armando y probando, y 1 persona empacando y recibiendo materiales), "
    "la fábrica trabaja de forma continua y ordenada sin retrasos ni acumulación de piezas.",
    bold_prefix="Ritmo de producción: ")

add_heading_styled(doc, "B.2.7. Cuidado del Medio Ambiente en las Instalaciones", level=3)

add_bullet_styled(doc,
    "El techo recoge el agua de las lluvias y la conduce a dos tanques grandes de 5.000 litros cada uno (10.000 litros en total). Esta agua pasa por filtros y se usa en los baños, aseo general y lavado, ahorrando un 65% de agua del acueducto.",
    bold_prefix="Aprovechamiento de agua lluvia: ")

add_bullet_styled(doc,
    "Sobre el techo hay instalados 24 paneles solares que generan energía limpia para abastecer cerca del 85% de la electricidad que consume la fábrica durante el día.",
    bold_prefix="Energía solar en el techo: ")

add_bullet_styled(doc,
    "El edificio está sostenido por 16 columnas de acero firmemente ancladas al suelo, con grandes ventanales y tragaluces en el techo que permiten el paso de luz natural para no depender de bombillos durante el día.",
    bold_prefix="Estructura firme y luz natural: ")

# Save the updated document!
doc.save(SAVE_PATH)
print(f"SUCCESS: Document saved to {SAVE_PATH}!")
try:
    import shutil
    shutil.copyfile(SAVE_PATH, DOC_PATH)
    print(f"SUCCESS: Also updated original file at {DOC_PATH}!")
except Exception as e:
    print(f"Note: Could not overwrite original {DOC_PATH} directly (file likely open in Word): {e}")
