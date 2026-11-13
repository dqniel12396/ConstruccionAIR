import os

html_path = r"plataforma_web\portal.html"
with open(html_path, "r", encoding="utf-8") as f:
    content = f.read()

# Buscar botón de reportes
target_button = '<span>Reportes & Auditoría CAR/EPA</span>\n      </button>'
if target_button not in content:
    # Buscar con texto genérico
    target_button = '<span>Reportes & Auditoría'

idx = content.find("btn-tab-reportes")
if idx != -1:
    end_btn = content.find("</button>", idx) + 9
    btn_html = """

      <button onclick="switchTab('tab-database')" id="btn-tab-database" class="tab-btn flex items-center gap-2 px-3 py-2 rounded-lg bg-teal-500/15 text-teal-300 border border-teal-500/30 hover:bg-teal-500/25 transition">
        <i data-lucide="database" class="w-4 h-4 text-teal-400"></i>
        <span class="font-bold">Diagrama Base de Datos (ERD)</span>
      </button>"""
    content = content[:end_btn] + btn_html + content[end_btn:]
    print("Boton de base de datos agregado.")

# Agregar la seccion antes de </main>
tab_database_section = """
    <!-- ========================================== -->
    <!-- TAB 7: DIAGRAMA ENTIDAD-RELACIÓN (ERD)     -->
    <!-- ========================================== -->
    <section id="tab-database" class="tab-content hidden space-y-6">
      <div class="gradient-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-lg font-bold text-slate-100 flex items-center gap-2">
            <i data-lucide="database" class="w-5 h-5 text-teal-400"></i>
            Diagrama Entidad-Relación de la Base de Datos (PostgreSQL + TimescaleDB)
          </h2>
          <p class="text-xs text-slate-400">Persistencia Multi-Tenant, Hiper-tablas de Telemetría (Series de Tiempo) y Trazabilidad QA/QC.</p>
        </div>
        <div class="flex items-center gap-3">
          <a href="diagrama_bases_datos_otech.png" target="_blank" class="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-teal-500/20">
            <i data-lucide="external-link" class="w-4 h-4"></i>
            Abrir Imagen HD en Nueva Pestaña
          </a>
          <a href="schema_database_otech.sql" download class="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition">
            <i data-lucide="code" class="w-4 h-4"></i>
            Descargar Script .SQL
          </a>
        </div>
      </div>

      <!-- Visor de la Imagen con zoom/scroll -->
      <div class="gradient-card rounded-2xl p-4 overflow-hidden border border-slate-800 shadow-2xl">
        <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs text-slate-400 font-mono">
          <span class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-teal-400"></span> Resolución Imagen: 3600 x 2400 px (Ultra HD 4K)</span>
          <span class="text-teal-400">Haz clic sobre la imagen para verla en tamaño completo</span>
        </div>
        <div class="w-full overflow-auto max-h-[750px] rounded-xl border border-slate-800/80 bg-[#070b12] p-2 flex justify-center">
          <img src="diagrama_bases_datos_otech.png" alt="Diagrama Entidad Relacion Base de Datos OTech" class="w-full h-auto min-w-[1200px] rounded-lg shadow-2xl cursor-zoom-in" onclick="window.open('diagrama_bases_datos_otech.png', '_blank')">
        </div>
      </div>
    </section>
"""

if "</main>" in content:
    content = content.replace("</main>", tab_database_section + "\n  </main>")
    print("Seccion tab-database agregada a main.")

with open(html_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Archivo index.html actualizado con exito.")

