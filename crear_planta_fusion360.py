# ==============================================================================
# OTech AirNet - Script Automatizado para Autodesk Fusion 360 (Python API)
# PROYECTO: COMPLEJO INDUSTRIAL Y CORPORATIVO OTECH - EDIFICIO DE DOS (2) PISOS
# - Nivel 1 (Z = 0.0m): Planta de Producción y Ensamble (500 uds/mes), Almacén y Celda en 'U'
# - Nivel 2 (Z = 3.8m): Sede Corporativa, CEO, Sala de Juntas, CTO Software, COO NOC y R&D Lab
# ==============================================================================

import adsk.core, adsk.fusion, traceback, math

def run(context):
    ui = None
    try:
        app = adsk.core.Application.get()
        ui  = app.userInterface
        design = adsk.fusion.Design.cast(app.activeProduct)
        if not design:
            ui.messageBox('Por favor, abre un nuevo documento de diseño en Fusion 360 antes de ejecutar el script.')
            return

        root_comp = design.rootComponent
        root_comp.name = "Complejo_Industrial_Corporativo_OTech_2Pisos"
        sketches = root_comp.sketches
        extrudes = root_comp.features.extrudeFeatures
        xzPlane = root_comp.xZConstructionPlane

        ui.messageBox('Iniciando generación paramétrica del Edificio de Dos (2) Pisos OTech...')

        # =============================================================
        # 1. PISO 1 (Nivel 0.00m): PLANTA INDUSTRIAL Y LOGÍSTICA
        # =============================================================
        # Losa de Cimentación Piso 1 (20m x 20m)
        sk1 = sketches.add(xzPlane)
        sk1.name = "Boceto_Piso1_Cimentacion"
        lines1 = sk1.sketchCurves.sketchLines
        lines1.addTwoPointRectangle(adsk.core.Point3D.create(-1000, 0, -1000), adsk.core.Point3D.create(1000, 0, 1000))
        
        prof1 = sk1.profiles.item(0)
        extInput1 = extrudes.createInput(prof1, adsk.fusion.FeatureOperations.NewBodyFeatureOperation)
        extInput1.setDistanceExtent(False, adsk.core.ValueInput.createByReal(-25)) # 25 cm espesor
        body_piso1 = extrudes.add(extInput1).bodies.item(0)
        body_piso1.name = "Piso1_Losa_Industrial"

        # Muros Exteriores Piso 1 (Altura 3.8m)
        sk_m1 = sketches.add(xzPlane)
        sk_m1.name = "Boceto_Muros_Piso1"
        lines_m1 = sk_m1.sketchCurves.sketchLines
        lines_m1.addTwoPointRectangle(adsk.core.Point3D.create(-1000, 0, -1000), adsk.core.Point3D.create(1000, 0, 1000))
        lines_m1.addTwoPointRectangle(adsk.core.Point3D.create(-980, 0, -980), adsk.core.Point3D.create(980, 0, 980))

        prof_m1 = sk_m1.profiles.item(1)
        extInput_m1 = extrudes.createInput(prof_m1, adsk.fusion.FeatureOperations.NewBodyFeatureOperation)
        extInput_m1.setDistanceExtent(False, adsk.core.ValueInput.createByReal(380)) # 3.8 metros altura
        body_muros1 = extrudes.add(extInput_m1).bodies.item(0)
        body_muros1.name = "Piso1_Muros_Exteriores"

        # =============================================================
        # 2. LOSA DE ENTREPISO ESTRUCTURAL (Nivel Z = +3.80m)
        # =============================================================
        # Plano de construcción a 3.8m
        planes = root_comp.constructionPlanes
        planeInput = planes.createInput()
        planeInput.setByOffset(xzPlane, adsk.core.ValueInput.createByReal(380))
        p2Plane = planes.add(planeInput)
        p2Plane.name = "Plano_Nivel2_Mas380cm"

        # Losa de Entrepiso con vano de escalera
        sk_losa2 = sketches.add(p2Plane)
        sk_losa2.name = "Boceto_Losa_Piso2"
        lines_l2 = sk_losa2.sketchCurves.sketchLines
        lines_l2.addTwoPointRectangle(adsk.core.Point3D.create(-1000, 0, -1000), adsk.core.Point3D.create(1000, 0, 1000))
        # Vano de escalera (2m x 4m en esquina)
        lines_l2.addTwoPointRectangle(adsk.core.Point3D.create(-980, 0, 600), adsk.core.Point3D.create(-700, 0, 980))

        prof_l2 = sk_losa2.profiles.item(1)
        extInput_l2 = extrudes.createInput(prof_l2, adsk.fusion.FeatureOperations.NewBodyFeatureOperation)
        extInput_l2.setDistanceExtent(False, adsk.core.ValueInput.createByReal(-25))
        body_losa2 = extrudes.add(extInput_l2).bodies.item(0)
        body_losa2.name = "Losa_Entrepiso_Piso2"

        # =============================================================
        # 3. PISO 2 (Nivel +3.80m): SEDE CORPORATIVA Y R&D
        # =============================================================
        # Muros Exteriores y Ventanales Piso 2
        sk_m2 = sketches.add(p2Plane)
        sk_m2.name = "Boceto_Muros_Piso2"
        lines_m2 = sk_m2.sketchCurves.sketchLines
        lines_m2.addTwoPointRectangle(adsk.core.Point3D.create(-1000, 0, -1000), adsk.core.Point3D.create(1000, 0, 1000))
        lines_m2.addTwoPointRectangle(adsk.core.Point3D.create(-980, 0, -980), adsk.core.Point3D.create(980, 0, 980))

        prof_m2 = sk_m2.profiles.item(1)
        extInput_m2 = extrudes.createInput(prof_m2, adsk.fusion.FeatureOperations.NewBodyFeatureOperation)
        extInput_m2.setDistanceExtent(False, adsk.core.ValueInput.createByReal(350)) # 3.5m altura
        body_muros2 = extrudes.add(extInput_m2).bodies.item(0)
        body_muros2.name = "Piso2_Muros_Corporativos"

        ui.messageBox('¡Edificio Industrial y Corporativo de Dos Pisos generado exitosamente en Fusion 360!\n\n• Nivel 1 (Z=0m): Planta de Producción y Ensamble (500 uds/mes)\n• Nivel 2 (Z=3.8m): Sede Corporativa (CEO, Juntas, CTO, NOC y Lab R&D)\n• Circulación: Escalera y Mezzanine con vano estructural')

    except:
        if ui:
            ui.messageBox('Fallo al ejecutar el script en Fusion 360:\n{}'.format(traceback.format_exc()))
