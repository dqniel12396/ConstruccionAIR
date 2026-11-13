# ==============================================================================
# OTech AirNet - Script Automatizado para Autodesk Fusion 360 (Python API)
# Instrucciones de uso en Fusion 360:
# 1. En Fusion 360, ve a la pestaña "UTILIDADES" (Utilities) -> "Scripts y complementos" (Scripts and Add-Ins).
# 2. Haz clic en "Crear" (Create) o presiona el icono verde "+" para añadir un nuevo script en Python.
# 3. Pega este código y presiona "Ejecutar" (Run).
# Fusion creará automáticamente los sólidos paramétricos de la estación exterior con historial de operaciones.
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

        rootComp = design.rootComponent
        sketches = rootComp.sketches
        extrudes = rootComp.features.extrudeFeatures
        xyPlane = rootComp.xYConstructionPlane
        xzPlane = rootComp.xZConstructionPlane

        # -------------------------------------------------------------
        # 1. BASE Y GABINETE IP65 (Cuerpo Cilíndrico Principal)
        # -------------------------------------------------------------
        sketch1 = sketches.add(xzPlane)
        sketch1.name = "Boceto_Gabinete_IP65"
        circles1 = sketch1.sketchCurves.sketchCircles
        # Diámetro exterior 110 mm (radio 5.5 cm)
        c1 = circles1.addByCenterRadius(adsk.core.Point3D.create(0, 0, 0), 5.5)
        
        prof1 = sketch1.profiles.item(0)
        extInput1 = extrudes.createInput(prof1, adsk.fusion.FeatureOperations.NewBodyFeatureOperation)
        dist1 = adsk.core.ValueInput.createByReal(8.0) # 80 mm altura
        extInput1.setDistanceExtent(False, dist1)
        extrude1 = extrudes.add(extInput1)
        extrude1.bodies.item(0).name = "Gabinete_Principal_IP65"

        # -------------------------------------------------------------
        # 2. CÁMARA STEVENSON DE ADMISIÓN (5 Anillos de Branquias)
        # -------------------------------------------------------------
        sketch2 = sketches.add(xzPlane)
        sketch2.name = "Boceto_Camara_Stevenson"
        circles2 = sketch2.sketchCurves.sketchCircles
        circles2.addByCenterRadius(adsk.core.Point3D.create(0, 0, 0), 5.5)
        circles2.addByCenterRadius(adsk.core.Point3D.create(0, 0, 0), 4.8)

        prof2 = sketch2.profiles.item(0)
        extInput2 = extrudes.createInput(prof2, adsk.fusion.FeatureOperations.NewBodyFeatureOperation)
        dist2 = adsk.core.ValueInput.createByReal(-4.5) # -45 mm hacia abajo
        extInput2.setDistanceExtent(False, dist2)
        extrude2 = extrudes.add(extInput2)
        extrude2.bodies.item(0).name = "Camara_Stevenson_Admision"

        # -------------------------------------------------------------
        # 3. CÚPULA SOLAR SUPERIOR (Inclinación 12°)
        # -------------------------------------------------------------
        sketch3 = sketches.add(xzPlane)
        sketch3.name = "Boceto_Cupula_Solar"
        circles3 = sketch3.sketchCurves.sketchCircles
        circles3.addByCenterRadius(adsk.core.Point3D.create(0, 0, 0), 6.5)

        prof3 = sketch3.profiles.item(0)
        extInput3 = extrudes.createInput(prof3, adsk.fusion.FeatureOperations.NewBodyFeatureOperation)
        # Crear a 80 mm de altura
        dist3 = adsk.core.ValueInput.createByReal(1.5)
        extInput3.setDistanceExtent(False, dist3)
        extrude3 = extrudes.add(extInput3)
        body3 = extrude3.bodies.item(0)
        body3.name = "Cupula_Solar_Superior"
        
        # Mover la cúpula encima del gabinete
        bodiesToMove = adsk.core.ObjectCollection.create()
        bodiesToMove.add(body3)
        transform = adsk.core.Matrix3D.create()
        transform.translation = adsk.core.Vector3D.create(0, 0, 8.0)
        moveInput = rootComp.features.moveFeatures.createInput(bodiesToMove, transform)
        rootComp.features.moveFeatures.add(moveInput)

        ui.messageBox('¡Modelo 3D OTech AirNet generado exitosamente en Fusion 360!\nPuedes editar bocetos, aplicar apariencias y renderizar.')

    except:
        if ui:
            ui.messageBox('Fallo al ejecutar el script:\n{}'.format(traceback.format_exc()))
