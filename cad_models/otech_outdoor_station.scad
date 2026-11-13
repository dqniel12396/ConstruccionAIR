// ====================================================================
// OTech AirNet - Estación de Monitoreo Exterior de Calidad del Aire
// Modelo Paramétrico 3D para Fabricación (Impresión 3D ASA/PETG o Inyección)
// Basado en la evolución industrial del concepto CanAirIO
// ====================================================================

$fn = 60; // Resolución de círculos

// --- PARÁMETROS GENERALES (mm) ---
casing_outer_diameter = 110;    // Diámetro exterior principal
casing_inner_diameter = 100;    // Diámetro interior
wall_thickness = 3.0;          // Grosor de pared resistente a intemperie
total_height = 240;            // Altura total del ensamble
louver_angle = 45;             // Ángulo de branquias Stevenson contra lluvia
louver_count = 5;              // Número de anillos deflectores
pole_clamp_diameter = 50;      // Diámetro de mástil estándar (2 pulgadas)

// Selector de pieza a renderizar:
// 0 = Ensamble Completo
// 1 = Cúpula Solar Superior (Top Weather Hood)
// 2 = Cámara Stevenson de Flujo de Aire (Louvered Chamber)
// 3 = Gabinete Principal Hermético IP65 (Main Sealed Enclosure)
// 4 = Bandeja Interna Deslizable de Sensores (Internal Sensor Chassis)
// 5 = Soporte de Montaje en Mástil/Pared (Pole & Wall Mount Bracket)
part_selector = 0;

module main() {
    if (part_selector == 0) {
        assembly();
    } else if (part_selector == 1) {
        top_solar_hood();
    } else if (part_selector == 2) {
        stevenson_intake_chamber();
    } else if (part_selector == 3) {
        main_electronics_enclosure();
    } else if (part_selector == 4) {
        internal_sensor_chassis();
    } else if (part_selector == 5) {
        pole_mount_bracket();
    }
}

// ==========================================
// 1. ENSAMBLE COMPLETO
// ==========================================
module assembly() {
    // 1. Cúpula Solar Superior
    translate([0, 0, 185])
        color([0.2, 0.2, 0.25, 0.95]) top_solar_hood();

    // 2. Gabinete Electrónica Hermético IP65
    translate([0, 0, 85])
        color([0.9, 0.92, 0.94, 0.9]) main_electronics_enclosure();

    // 3. Bandeja Interna (Dentro del gabinete)
    translate([0, 0, 95])
        color([0.1, 0.6, 0.8, 0.85]) internal_sensor_chassis();

    // 4. Cámara de Muestreo Stevenson (Inferior para protección solar)
    translate([0, 0, 20])
        color([0.85, 0.88, 0.9, 0.95]) stevenson_intake_chamber();

    // 5. Soporte de Mástil / Base
    translate([0, 0, 0])
        color([0.3, 0.35, 0.4, 1.0]) pole_mount_bracket();
}

// ==========================================
// 2. CÚPULA SOLAR SUPERIOR (Top Solar Hood)
// ==========================================
module top_solar_hood() {
    difference() {
        union() {
            // Techo inclinado a 12° para escurrimiento de lluvia y radiación solar óptima
            translate([0, 0, 25])
                rotate([12, 0, 0])
                cylinder(r1 = casing_outer_diameter/2 + 25, r2 = casing_outer_diameter/2 + 15, h = 12);
            
            // Panel solar integrado simulado
            translate([0, 0, 36])
                rotate([12, 0, 0])
                color([0.05, 0.08, 0.15])
                cube([80, 80, 4], center = true);

            // Cuello de acople con canal para junta tórica O-Ring
            cylinder(r = casing_inner_diameter/2, h = 25);
            cylinder(r = casing_outer_diameter/2, h = 5);
        }
        
        // Vaciado interno
        translate([0, 0, -1])
            cylinder(r = casing_inner_diameter/2 - wall_thickness, h = 28);
        
        // Canal de junta tórica (O-Ring groove para IP65)
        translate([0, 0, 12])
            difference() {
                cylinder(r = casing_inner_diameter/2 + 1, h = 3);
                cylinder(r = casing_inner_diameter/2 - 2, h = 3.1);
            }
        
        // Barrenos para tornillos de fijación M4 inoxidables
        for (a = [0, 90, 180, 270]) {
            rotate([0, 0, a])
                translate([casing_outer_diameter/2 - 4, 0, -2])
                cylinder(r = 2.1, h = 30);
        }
    }
}

// ==========================================
// 3. GABINETE ELECTRÓNICA HERMÉTICO (IP65)
// ==========================================
module main_electronics_enclosure() {
    difference() {
        union() {
            // Cuerpo cilíndrico robusto
            cylinder(r = casing_outer_diameter/2, h = 100);
            
            // Salientes para montaje de prensaestopas PG7 / PG9
            translate([casing_outer_diameter/2 - 2, 0, 25])
                rotate([0, 90, 0])
                cylinder(r = 12, h = 10);
            
            // Puntos de fijación traseros reforzados
            translate([-casing_outer_diameter/2 - 6, -20, 15])
                cube([10, 40, 70]);
        }
        
        // Vaciado interior
        translate([0, 0, -1])
            cylinder(r = casing_inner_diameter/2, h = 102);
        
        // Orificio para prensaestopas PG9 (Entrada de energía / PoE / Sensores auxiliares)
        translate([casing_outer_diameter/2 - 5, 0, 25])
            rotate([0, 90, 0])
            cylinder(r = 8, h = 25);
            
        // Tornillería superior e inferior
        for (a = [45, 135, 225, 315]) {
            rotate([0, 0, a]) {
                translate([casing_outer_diameter/2 - 4, 0, 80])
                    cylinder(r = 1.8, h = 25);
                translate([casing_outer_diameter/2 - 4, 0, -5])
                    cylinder(r = 1.8, h = 25);
            }
        }
    }
    
    // Rieles guía para deslizamiento de la bandeja interior
    translate([-casing_inner_diameter/2 + 2, -3, 0])
        cube([4, 6, 100]);
    translate([casing_inner_diameter/2 - 6, -3, 0])
        cube([4, 6, 100]);
}

// ==========================================
// 4. BANDEJA INTERNA DESLIZABLE (Chasis Sensores)
// ==========================================
module internal_sensor_chassis() {
    difference() {
        union() {
            // Placa base de montaje vertical
            translate([-40, -2, 0])
                cube([80, 4, 90]);
            
            // Soporte para Módulo ESP32-S3 / LoRa / OTech Core
            translate([-35, 2, 50])
                cube([30, 25, 35]);
            
            // Soporte amortiguado para Sensor Láser PM2.5 (Sensirion SPS30 / PMS7003)
            translate([-35, 2, 5])
                cube([45, 35, 40]);
                
            // Compartimento para Batería LiFePO4 18650 / 21700
            translate([5, 2, 10])
                cube([25, 25, 75]);
        }
        
        // Vaciados para alivio de peso y ventilación interna
        translate([-25, -5, 10])
            cube([20, 10, 30]);
            
        // Orificios para tornillos de sujeción PCB
        translate([-20, 10, 65])
            rotate([90, 0, 0])
            cylinder(r = 1.5, h = 20);
            
        // Alojamiento del sensor SPS30 (41 x 41 x 12 mm)
        translate([-33, 4, 7])
            cube([42, 32, 36]);
    }
}

// ==========================================
// 5. CÁMARA DE MUESTREO STEVENSON (Air Intake)
// ==========================================
module stevenson_intake_chamber() {
    difference() {
        union() {
            cylinder(r = casing_outer_diameter/2, h = 65);
        }
        
        // Vaciado central de la cámara
        translate([0, 0, -1])
            cylinder(r = casing_inner_diameter/2, h = 67);
            
        // Branquias deflectoras louvered a 45° (Evitan entrada de lluvia directa)
        for (i = [0 : louver_count-1]) {
            translate([0, 0, 10 + i * 10])
                for (a = [0 : 30 : 330]) {
                    rotate([0, 0, a])
                        rotate([louver_angle, 0, 0])
                        translate([-6, casing_outer_diameter/2 - 10, 0])
                        cube([12, 16, 4]);
                }
        }
    }
    
    // Cono deflector de condensación inferior (Evita estancamiento de agua)
    translate([0, 0, 0])
        cylinder(r1 = casing_outer_diameter/2, r2 = casing_inner_diameter/2 - 5, h = 8);
        
    // Anillo interior de soporte para malla micro-filtrante de acero inox anti-insectos
    difference() {
        cylinder(r = casing_inner_diameter/2, h = 65);
        cylinder(r = casing_inner_diameter/2 - 2, h = 66);
    }
}

// ==========================================
// 6. SOPORTE DE MONTAJE (Pole & Wall Mount)
// ==========================================
module pole_mount_bracket() {
    difference() {
        union() {
            // Base inferior del cilindro
            cylinder(r = casing_outer_diameter/2, h = 20);
            
            // Brazo de acople a poste
            translate([-35, -casing_outer_diameter/2 - 35, 0])
                cube([70, 45, 20]);
                
            // Mordaza curva para mástil de 2 pulgadas
            translate([0, -casing_outer_diameter/2 - 35, 0])
                cylinder(r = pole_clamp_diameter/2 + 10, h = 20);
        }
        
        // Vaciado para el mástil
        translate([0, -casing_outer_diameter/2 - 35, -1])
            cylinder(r = pole_clamp_diameter/2, h = 22);
            
        // Ranuras para abrazaderas metálicas sinfín (Hose clamps)
        translate([-40, -casing_outer_diameter/2 - 40, 5])
            cube([80, 50, 4]);
        translate([-40, -casing_outer_diameter/2 - 40, 12])
            cube([80, 50, 4]);
            
        // Barrenos para fijación en pared (Tornillos y chazos M6)
        translate([-25, -casing_outer_diameter/2 - 25, -1])
            cylinder(r = 3.5, h = 22);
        translate([25, -casing_outer_diameter/2 - 25, -1])
            cylinder(r = 3.5, h = 22);
            
        // Orificio central de drenaje de emergencia
        translate([0, 0, -1])
            cylinder(r = 4, h = 22);
    }
}

main();
