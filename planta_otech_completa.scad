/*
========================================================================================
Modelo Paramétrico Sólido OpenSCAD: Complejo Industrial y Corporativo OTech AirNet
EDIFICIO DE DOS (2) PISOS (400 m² por planta = 800 m² construidos)
- PISO 1 (Z = 0.0m): Planta de Producción y Ensamble (500 uds/mes), Almacén BOM/FGS, Celda en U, IQC/OQC, Esclusa ESD.
- PISO 2 (Z = 3.8m): Sede Corporativa, Dirección General (CEO), Sala de Juntas, CTO Software, COO Centro NOC, Lab R&D, Showroom y Mezzanine mirador.
- Conexión Vertical: Escalera arquitectónica y vano de mezzanine.
========================================================================================
*/

$fn = 24;

module muro(x, y, z, w, l, h) {
    translate([x, y, z]) cube([w, l, h]);
}

module persona(x, y, z, rot=0, es_esd=true, sentado=false) {
    translate([x, y, z]) rotate([0, 0, rot]) {
        if (sentado) {
            // Silla
            color([0.1, 0.1, 0.15]) {
                translate([-0.2, -0.2, 0]) cube([0.4, 0.4, 0.45]);
                translate([-0.2, -0.2, 0.45]) cube([0.4, 0.08, 0.5]);
            }
            // Torso
            color(es_esd ? [0.05, 0.45, 0.85] : [0.3, 0.35, 0.45])
                translate([-0.18, -0.12, 0.45]) cube([0.36, 0.24, 0.5]);
            // Cabeza
            color([0.92, 0.75, 0.65])
                translate([0, 0, 1.05]) sphere(r=0.14);
        } else {
            // Piernas
            color([0.15, 0.2, 0.25]) {
                translate([-0.12, -0.08, 0]) cube([0.1, 0.16, 0.8]);
                translate([0.02, -0.08, 0]) cube([0.1, 0.16, 0.8]);
            }
            // Torso
            color(es_esd ? [0.05, 0.45, 0.85] : [0.3, 0.35, 0.45])
                translate([-0.2, -0.12, 0.8]) cube([0.4, 0.24, 0.6]);
            // Cabeza
            color([0.92, 0.75, 0.65])
                translate([0, 0, 1.45]) sphere(r=0.14);
        }
    }
}

// Selector de vista:
// 0 = Edificio Completo 2 Pisos
// 1 = Solo Piso 1 (Planta Fabril)
// 2 = Solo Piso 2 (Sede Corporativa)
modo_vista = 0;

module piso1_fabrica() {
    // Piso Epóxico General
    color([0.22, 0.26, 0.30]) translate([0, 0, -0.25]) cube([20, 20, 0.25]);
    
    // Área EPA / ESD Azul
    color([0.05, 0.45, 0.75]) translate([3, 3, 0.01]) cube([14, 12, 0.02]);
    // Franjas Amarillas de Seguridad
    color([0.95, 0.80, 0.05]) {
        translate([2.8, 2.8, 0.02]) cube([14.4, 0.2, 0.02]);
        translate([2.8, 15.0, 0.02]) cube([14.4, 0.2, 0.02]);
        translate([2.8, 2.8, 0.02]) cube([0.2, 12.4, 0.02]);
        translate([17.0, 2.8, 0.02]) cube([0.2, 12.4, 0.02]);
    }

    // Muros Exteriores Piso 1 (H = 3.8m)
    color([0.85, 0.88, 0.9]) {
        muro(0, 0, 0, 8, 0.2, 3.8);
        muro(12, 0, 0, 8, 0.2, 3.8); // Portón
        muro(0, 0, 0, 0.2, 20, 3.8);
        muro(19.8, 0, 0, 0.2, 20, 3.8);
        muro(0, 19.8, 0, 7, 0.2, 3.8);
        muro(11, 19.8, 0, 9, 0.2, 3.8);
    }
    // Puerta Vidrio Acceso
    color([0.4, 0.7, 0.9, 0.4]) muro(7, 19.85, 0, 4, 0.08, 3.8);

    // Racks Industriales
    color([0.18, 0.38, 0.65]) {
        muro(0.8, 12, 0, 1.6, 4.8, 2.8); // IQC
        muro(0.8, 4, 0, 1.6, 4.8, 2.8);  // BOM
        muro(17.6, 4, 0, 1.6, 4.8, 2.8); // FGS
    }

    // Estaciones de Trabajo Celda en U
    // Mesas ESD
    color([0.3, 0.33, 0.38]) {
        muro(4, 5, 0, 2.2, 1.1, 0.85);   // Estación 1
        muro(7.5, 5, 0, 2.2, 1.1, 0.85); // Estación 2
        muro(11, 5, 0, 2.2, 1.1, 0.85);  // Estación 3
        muro(14.5, 8, 0, 2.2, 1.1, 0.85); // Estación 7
    }
    // Cámara Inox Calibración (Estación 5)
    color([0.8, 0.82, 0.85]) muro(7.5, 10.5, 0, 2.2, 1.3, 1.5);
    // Rack Burn-In Abierto Técnico (Estación 6, profundidad reducida a 0.6m)
    color([0.15, 0.18, 0.22]) {
        muro(4, 10.5, 0, 2.2, 0.6, 2.4);
        muro(4.1, 10.55, 0.6, 2.0, 0.5, 0.05);
        muro(4.1, 10.55, 1.2, 2.0, 0.5, 0.05);
        muro(4.1, 10.55, 1.8, 2.0, 0.5, 0.05);
    }
    color([0.8, 0.2, 0.15, 0.35]) muro(4.05, 11.05, 0.2, 2.1, 0.05, 2.1);

    // Línea transportadora de rodillos (Pista continua en U)
    color([0.2, 0.25, 0.30]) {
        muro(3.5, 7.0, 0.5, 10.0, 0.6, 0.15);
        muro(13.0, 7.0, 0.5, 0.6, 2.6, 0.15);
        muro(3.5, 9.0, 0.5, 10.0, 0.6, 0.15);
    }

    // Ensamble Progresivo Pieza por Pieza en la Cinta
    // 1. Chasis + Sensores
    color([0.1, 0.6, 0.2]) muro(4.4, 7.2, 0.65, 0.4, 0.3, 0.06);
    color([0.8, 0.8, 0.8]) muro(4.5, 7.25, 0.71, 0.18, 0.15, 0.12);
    // 2. ICT Flasheo TLS
    color([0.1, 0.6, 0.2]) muro(7.4, 7.2, 0.65, 0.4, 0.3, 0.06);
    color([0.0, 0.9, 0.5]) muro(7.6, 7.25, 0.71, 0.08, 0.08, 0.08);
    // 3. Gabinete ASA blanco + Batería
    color([0.95, 0.95, 0.98]) translate([10.5, 7.3, 0.65]) cylinder(r=0.22, h=0.4);
    color([0.05, 0.45, 0.85]) translate([10.5, 7.3, 0.70]) cylinder(r=0.09, h=0.25);
    // 4. Banco Hermeticidad (O-Ring)
    color([0.95, 0.95, 0.98]) translate([13.3, 8.3, 0.65]) cylinder(r=0.22, h=0.4);
    color([0.1, 0.1, 0.15]) translate([13.3, 8.3, 1.05]) cylinder(r=0.23, h=0.03);
    // 5. Cámara Stevenson Louvered
    color([0.95, 0.95, 0.98]) {
        translate([10.5, 9.3, 0.85]) cylinder(r=0.22, h=0.35);
        translate([10.5, 9.3, 0.70]) cylinder(r=0.26, h=0.03);
        translate([10.5, 9.3, 0.75]) cylinder(r=0.26, h=0.03);
    }
    // 6. Cúpula Solar 12° en Burn-In
    color([0.95, 0.95, 0.98]) translate([7.5, 9.3, 0.85]) cylinder(r=0.22, h=0.35);
    color([0.15, 0.18, 0.25]) translate([7.5, 9.3, 1.20]) cylinder(r=0.28, h=0.12);
    // 7. Empaque Final en Caja
    color([0.72, 0.58, 0.42]) muro(4.15, 9.05, 0.65, 0.7, 0.5, 0.45);
    color([0.95, 0.95, 0.98]) translate([4.5, 9.3, 0.75]) cylinder(r=0.18, h=0.4);

    // Operarios Fábrica (con bata ESD)
    persona(5.1, 4.5, 0, 0, true, false);
    persona(8.6, 4.5, 0, 0, true, false);
    persona(12.1, 4.5, 0, 0, true, false);
    persona(15.6, 7.5, 0, 0, true, false);

    // Escalera Arquitectónica al Piso 2 (Noroeste)
    color([0.35, 0.38, 0.42]) {
        for (i = [0:17]) {
            translate([1.2, 16.0 + i * (3.0/18), i * (3.8/18)])
                cube([1.8, 0.28, 3.8/18]);
        }
    }
    // Pasamanos continuo
    color([0.2, 0.7, 0.9]) translate([2.95, 16.0, 0.9]) cube([0.05, 3.0, 0.05]);

    // =========================================================================
    // COLUMNAS ESTRUCTURALES Y SUSTENTACIÓN PISO 2 (CERO ELEMENTOS FLOTANTES)
    // =========================================================================
    // Cuadrícula de 16 columnas con dados de cimentación y capiteles
    for (col_x = [2.0, 7.5, 13.0, 18.0]) {
        for (col_y = [2.0, 7.5, 13.0, 18.0]) {
            // Dado de cimentación en hormigón armado
            color([0.5, 0.52, 0.55])
                translate([col_x - 0.35, col_y - 0.35, 0]) cube([0.7, 0.7, 0.35]);
            // Fuste de columna estructural IPE/HEB
            color([0.18, 0.22, 0.28])
                translate([col_x - 0.2, col_y - 0.2, 0.35]) cube([0.4, 0.4, 3.1]);
            // Capitel / Placa de anclaje a la losa superior
            color([0.25, 0.30, 0.36])
                translate([col_x - 0.3, col_y - 0.3, 3.45]) cube([0.6, 0.6, 0.35]);
        }
    }

    // =========================================================================
    // SISTEMA INDUSTRIAL DE RECOLECCIÓN DE AGUA PLUVIAL (10.000 L)
    // =========================================================================
    // Losa de asiento de tanques
    color([0.4, 0.43, 0.48])
        translate([17.2, 0.6, 0]) cube([2.2, 4.4, 0.2]);

    // 2x Tanques cilíndricos verticales de 5.000 L cada uno
    color([0.05, 0.40, 0.65]) {
        translate([18.3, 1.6, 0.2]) cylinder(r=0.9, h=3.0);
        translate([18.3, 3.8, 0.2]) cylinder(r=0.9, h=3.0);
    }
    // Cúpulas superiores de inspección
    color([0.08, 0.50, 0.80]) {
        translate([18.3, 1.6, 3.2]) cylinder(r=0.35, h=0.25);
        translate([18.3, 3.8, 3.2]) cylinder(r=0.35, h=0.25);
    }
    // Bajante pluvial desde cubierta y colector
    color([0.2, 0.25, 0.3]) {
        translate([19.4, 1.6, 0.2]) cylinder(r=0.08, h=3.6);
        translate([18.3, 1.6, 1.2]) rotate([90, 0, 0]) cylinder(r=0.06, h=2.2);
    }
    // Skid de Bombeo Presurizado Dúplex con variador
    color([0.12, 0.15, 0.20]) translate([17.4, 1.4, 0.2]) cube([0.6, 0.8, 0.7]);
}

module piso2_corporativo() {
    translate([0, 0, 3.8]) {
        // Losa Estructural de Entrepiso con vano de escalera
        color([0.65, 0.68, 0.72]) {
            translate([0, 0, -0.25]) cube([20, 15.5, 0.25]);
            translate([3.5, 15.5, -0.25]) cube([16.5, 4.5, 0.25]);
        }
        // Piso Madera Corporativa
        color([0.78, 0.72, 0.65]) {
            translate([0, 0, 0]) cube([20, 15.5, 0.02]);
            translate([3.5, 15.5, 0]) cube([16.5, 4.5, 0.02]);
        }
        // Barandilla Mezzanine Vidrio
        color([0.4, 0.7, 0.9, 0.4]) translate([3.45, 15.5, 0]) cube([0.05, 4.3, 0.95]);

        // Muros Exteriores con Ventanales Piso 2
        color([0.85, 0.88, 0.9]) {
            muro(0, 0, 0, 20, 0.2, 0.9);
            muro(0, 0, 3.1, 20, 0.2, 0.7);
            muro(0, 0, 0, 0.2, 20, 3.8);
            muro(19.8, 0, 0, 0.2, 20, 3.8);
            muro(0, 19.8, 0, 20, 0.2, 0.9);
            muro(0, 19.8, 3.1, 20, 0.2, 0.7);
        }
        // Ventanales Vidrio
        color([0.4, 0.7, 0.9, 0.4]) {
            muro(0, 0.05, 0.9, 20, 0.08, 2.2);
            muro(0, 19.85, 0.9, 20, 0.08, 2.2);
        }

        // Divisiones Vidriadas Interiores
        color([0.4, 0.7, 0.9, 0.4]) {
            muro(0.2, 9, 0, 19.6, 0.08, 2.8);
            muro(3.5, 11, 0, 16.3, 0.08, 2.8);
        }
        color([0.92, 0.93, 0.95]) {
            muro(6, 0.2, 0, 0.12, 8.8, 2.8); // CEO / Sala Juntas
            muro(13, 0.2, 0, 0.12, 8.8, 2.8); // Sala Juntas / NOC
            muro(12, 11, 0, 0.12, 8.8, 2.8); // CTO / Lab R&D
        }

        // Mobiliario Piso 2:
        // Recepción y Showroom
        color([0.15, 0.17, 0.20]) muro(5, 16, 0, 2.4, 0.9, 1.1);
        persona(5.8, 15.3, 0, 0, false, true);

        // Despacho CEO
        color([0.85, 0.80, 0.75]) muro(1.8, 4, 0, 2.4, 1.2, 0.75);
        persona(3.0, 5.2, 0, 180, false, true);

        // Sala de Juntas (Directorio)
        color([0.85, 0.80, 0.75]) muro(7.5, 3, 0, 4.2, 2.0, 0.75);
        color([0.08, 0.75, 0.95]) muro(8.5, 8.8, 1.2, 2.2, 0.1, 1.2); // Pantalla 4K
        persona(8.2, 2.4, 0, 0, false, true);
        persona(9.5, 2.4, 0, 0, false, true);
        persona(10.8, 2.4, 0, 0, false, true);
        persona(8.2, 5.6, 0, 180, false, true);
        persona(9.5, 5.6, 0, 180, false, true);
        persona(10.8, 5.6, 0, 180, false, true);

        // Centro NOC (COO)
        color([0.08, 0.75, 0.95]) muro(14, 8.8, 1.0, 5.4, 0.15, 2.2); // Video Wall
        color([0.85, 0.80, 0.75]) muro(14.5, 4.5, 0, 4.8, 1.2, 0.75);
        persona(15.5, 3.8, 0, 0, false, true);
        persona(18.0, 3.8, 0, 0, false, true);

        // CTO Software Devs
        color([0.85, 0.80, 0.75]) {
            muro(4.5, 13, 0, 6.5, 1.1, 0.75);
            muro(4.5, 16, 0, 6.5, 1.1, 0.75);
        }
        persona(5.5, 12.6, 0, 0, false, true);
        persona(7.8, 12.6, 0, 0, false, true);
        persona(10.0, 12.6, 0, 0, false, true);

        // Hardware Lab R&D
        color([0.3, 0.33, 0.38]) muro(13, 13.5, 0, 6.0, 1.3, 0.85);
        persona(15.5, 12.5, 0, 0, true, false);

        // =========================================================================
        // INFRAESTRUCTURA DE DATOS & SERVIDORES CLOUD IOT (PISO 2)
        // =========================================================================
        // Sala de Servidores / Tier II Data Center
        color([0.15, 0.18, 0.22]) {
            // Fila de 6 Racks 42U de servidores
            for (rk = [0 : 5]) {
                muro(14.0 + rk * 0.9, 17.2, 0, 0.75, 1.1, 2.2);
            }
            // Unidades de Climatización CRAC de precisión
            muro(13.2, 17.2, 0, 0.6, 1.1, 2.3);
            muro(19.5, 17.2, 0, 0.6, 1.1, 2.3);
        }
        // Luces LED de Telemetría en Racks
        color([0.02, 0.75, 0.85]) {
            for (rk = [0 : 5]) {
                muro(14.05 + rk * 0.9, 17.18, 0.4, 0.65, 0.05, 1.6);
            }
        }
        // Bandeja aérea de fibra óptica (Amarillo de seguridad)
        color([0.95, 0.80, 0.05]) {
            muro(13.0, 17.6, 2.4, 7.2, 0.3, 0.08);
        }

        // =========================================================================
        // PARQUE SOLAR FOTOVOLTAICO EN CUBIERTA (13.2 kWp)
        // =========================================================================
        // 24 Módulos Solares Monocristalinos inclinados 15°
        color([0.08, 0.22, 0.45]) {
            for (fila = [0 : 2]) {
                for (col = [0 : 7]) {
                    translate([2.5 + col * 2.0, 1.5 + fila * 2.4, 3.85])
                        rotate([15, 0, 0])
                            cube([1.8, 1.1, 0.05]);
                }
            }
        }
        // Inversor Solar Trifásico de Cubierta
        color([0.05, 0.50, 0.75]) muro(18.5, 2.0, 3.85, 1.0, 0.6, 0.9);
    }
}

if (modo_vista == 0) {
    piso1_fabrica();
    piso2_corporativo();
} else if (modo_vista == 1) {
    piso1_fabrica();
} else if (modo_vista == 2) {
    piso2_corporativo();
}
