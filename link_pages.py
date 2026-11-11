import re

with open('index.html', 'r', encoding='utf-8') as f:
    c = f.read()

target = 'id="btn-view-plant"'
idx = c.find(target)
if idx != -1:
    end_btn = c.find('</button>', idx) + 9
    btn_link = """
          <a href="portal.html" class="mode-switch-btn" style="text-decoration:none;display:inline-flex;align-items:center;gap:6px;background:rgba(20,184,166,0.15);border:1px solid #14b8a6;color:#2dd4bf;font-weight:600;" title="Ir a la Plataforma Web de Gestión, Estadísticas y Aparatos">
            <i data-lucide="layout-dashboard"></i> Portal Cloud & Datos
          </a>"""
    c = c[:end_btn] + btn_link + c[end_btn:]
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(c)
    print("index.html actualizado.")
else:
    print("btn-view-plant no encontrado.")

# También en portal.html vincular al gemelo 3D
with open('portal.html', 'r', encoding='utf-8') as f:
    p = f.read()

target_p = 'id="orgSelector"'
idx_p = p.find(target_p)
if idx_p != -1:
    # Buscar el final del div padre
    end_div = p.find('</div>', idx_p) + 6
    end_outer = p.find('</div>', end_div) + 6
    link_3d = """
      <a href="index.html" class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-teal-400 text-teal-300 text-xs font-semibold transition shadow-inner">
        <i data-lucide="box" class="w-4 h-4 text-teal-400"></i>
        <span>Gemelo 3D</span>
      </a>"""
    p = p[:end_outer] + link_3d + p[end_outer:]
    with open('portal.html', 'w', encoding='utf-8') as f:
        f.write(p)
    print("portal.html actualizado.")
