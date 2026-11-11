"""
========================================================================================
Herramienta Universal de Conversión de Markdown a PDF Corporativo
========================================================================================
Autor: Antigravity / OTech S.A.S.
Uso en consola:
    python md_to_pdf.py archivo.md [archivo_salida.pdf]
    o simplemente: md2pdf archivo.md

Características:
- No requiere instalar dependencias pesadas (usa el motor de renderizado de Edge/Chrome).
- Estilo corporativo premium (Tipografía moderna, tablas con bordes sombreados,
  bloques de código destacados, alertas de GitHub, numeración de páginas).
- Soporte para saltos de página inteligentes (@page, avoid-page-break).
========================================================================================
"""

import sys
import os
import re
import html
import subprocess
import tempfile

def find_browser_executable():
    """Busca el ejecutable de Microsoft Edge o Google Chrome en rutas estándar."""
    candidates = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe")
    ]
    for path in candidates:
        if os.path.isfile(path):
            return path
    return None

def parse_markdown_to_html(md_text):
    """
    Parser robusto de Markdown a HTML autónomo.
    Soporta: Headings (# - ######), Tablas GFM, Bloques de Código, Citas / Alertas,
    Listas ordenadas y no ordenadas, Negrita, Cursiva, Enlaces, Reglas horizontales.
    """
    lines = md_text.replace('\r\n', '\n').split('\n')
    html_lines = []
    
    in_code_block = False
    code_lang = ""
    code_buffer = []
    
    in_table = False
    table_headers = []
    table_rows = []
    
    in_list = False
    list_type = None # 'ul' o 'ol'
    
    def inline_format(text):
        # Escape HTML básico primero
        t = html.escape(text)
        # Código en línea `code`
        t = re.sub(r'`([^`]+)`', r'<code>\1</code>', t)
        # Negrita y Cursiva ***text*** o ___text___
        t = re.sub(r'\*\*\*([^*]+)\*\*\*', r'<strong><em>\1</em></strong>', t)
        # Negrita **text** o __text__
        t = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', t)
        t = re.sub(r'__([^_]+)__', r'<strong>\1</strong>', t)
        # Cursiva *text* o _text_
        t = re.sub(r'\*([^*]+)\*', r'<em>\1</em>', t)
        t = re.sub(r'_([^_]+)_', r'<em>\1</em>', t)
        # Imágenes ![texto](url)
        t = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)', r'<figure style="text-align:center; margin:14px 0;"><img src="\2" alt="\1" style="max-width:92%; height:auto; border-radius:6px; border:1px solid #cbd5e1; box-shadow:0 2px 6px rgba(0,0,0,0.08);"><figcaption style="font-size:8.5pt; color:#64748b; font-style:italic; margin-top:4px;">\1</figcaption></figure>', t)
        # Enlaces [texto](url)
        t = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', t)
        return t

    def flush_table():
        nonlocal in_table, table_headers, table_rows
        if not in_table:
            return ""
        out = ['<div class="table-wrapper"><table>']
        if table_headers:
            out.append('<thead><tr>')
            for th in table_headers:
                out.append(f'<th>{inline_format(th.strip())}</th>')
            out.append('</tr></thead>')
        if table_rows:
            out.append('<tbody>')
            for row in table_rows:
                out.append('<tr>')
                for td in row:
                    out.append(f'<td>{inline_format(td.strip())}</td>')
                out.append('</tr>')
            out.append('tbody')
        out.append('</table></div>')
        in_table = False
        table_headers = []
        table_rows = []
        return '\n'.join(out)

    def flush_list():
        nonlocal in_list, list_type
        if not in_list:
            return ""
        tag = list_type
        in_list = False
        list_type = None
        return f'</{tag}>\n'

    for line in lines:
        stripped = line.strip()
        
        # Bloques de código ```
        if stripped.startswith('```'):
            if in_code_block:
                # Cerrar bloque
                code_content = html.escape('\n'.join(code_buffer))
                html_lines.append(f'<pre><code class="language-{code_lang}">{code_content}</code></pre>')
                code_buffer = []
                in_code_block = False
                code_lang = ""
            else:
                if in_table:
                    html_lines.append(flush_table())
                if in_list:
                    html_lines.append(flush_list())
                in_code_block = True
                code_lang = stripped[3:].strip()
            continue

        if in_code_block:
            code_buffer.append(line)
            continue

        # Tablas Markdown (| col1 | col2 |)
        if stripped.startswith('|') and stripped.endswith('|'):
            if in_list:
                html_lines.append(flush_list())
            cols = [c.strip() for c in stripped.strip('|').split('|')]
            # Detectar fila separadora |:---|:---| o |---|---|
            if all(re.match(r'^:?-+:?$', c) for c in cols if c):
                continue
            if not in_table:
                in_table = True
                table_headers = cols
            else:
                table_rows.append(cols)
            continue
        else:
            if in_table:
                html_lines.append(flush_table())

        # Listas No Ordenadas (*, -, +)
        list_match_ul = re.match(r'^[\*\-\+]\s+(.*)$', stripped)
        # Listas Ordenadas (1., 2., etc.)
        list_match_ol = re.match(r'^\d+\.\s+(.*)$', stripped)

        if list_match_ul or list_match_ol:
            target_type = 'ul' if list_match_ul else 'ol'
            content = list_match_ul.group(1) if list_match_ul else list_match_ol.group(1)
            
            if not in_list or list_type != target_type:
                if in_list:
                    html_lines.append(flush_list())
                in_list = True
                list_type = target_type
                html_lines.append(f'<{list_type}>')
            
            html_lines.append(f'<li>{inline_format(content)}</li>')
            continue
        else:
            if in_list:
                html_lines.append(flush_list())

        # Líneas Vacías
        if not stripped:
            continue

        # Regla Horizontal (---, ***, ___)
        if re.match(r'^(\-{3,}|\*{3,}|_{3,})$', stripped):
            html_lines.append('<hr>')
            continue

        # Encabezados (# a ######)
        heading_match = re.match(r'^(#{1,6})\s+(.*)$', stripped)
        if heading_match:
            level = len(heading_match.group(1))
            htext = heading_match.group(2)
            html_lines.append(f'<h{level}>{inline_format(htext)}</h{level}>')
            continue

        # Citas y Alertas (> [!NOTE], > [!IMPORTANT], etc.)
        if stripped.startswith('>'):
            quote_text = stripped.lstrip('> ').strip()
            # Detectar Callout tipo GitHub
            alert_match = re.match(r'^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)$', quote_text, re.IGNORECASE)
            if alert_match:
                alert_type = alert_match.group(1).upper()
                alert_content = alert_match.group(2)
                html_lines.append(f'<div class="callout callout-{alert_type.lower()}"><div class="callout-header">{alert_type}</div><div class="callout-body">{inline_format(alert_content)}</div></div>')
            else:
                html_lines.append(f'<blockquote><p>{inline_format(quote_text)}</p></blockquote>')
            continue

        # Párrafos regulares
        html_lines.append(f'<p>{inline_format(stripped)}</p>')

    # Limpiezas finales si quedaron abiertas
    if in_table:
        html_lines.append(flush_table())
    if in_list:
        html_lines.append(flush_list())
    if in_code_block:
        code_content = html.escape('\n'.join(code_buffer))
        html_lines.append(f'<pre><code class="language-{code_lang}">{code_content}</code></pre>')

    return '\n'.join(html_lines)

def build_full_html_document(body_html, doc_title="Documento Técnico OTech"):
    """Envuelve el cuerpo HTML con una plantilla CSS corporativa optimizada para impresión en PDF."""
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>{html.escape(doc_title)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');

  @page {{
    size: A4 portrait;
    margin: 20mm 18mm 22mm 18mm;
    @bottom-right {{
      content: counter(page);
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 8pt;
      color: #64748b;
    }}
  }}

  * {{
    box-sizing: border-box;
  }}

  body {{
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1e293b;
    background: #ffffff;
    line-height: 1.6;
    font-size: 10pt;
  }}

  /* Encabezados */
  h1 {{
    font-size: 20pt;
    font-weight: 800;
    color: #0f172a;
    border-bottom: 2.5px solid #0284c7;
    padding-bottom: 8px;
    margin-top: 0;
    margin-bottom: 12px;
    page-break-after: avoid;
  }}

  h2 {{
    font-size: 14pt;
    font-weight: 700;
    color: #0369a1;
    margin-top: 20px;
    margin-bottom: 8px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 4px;
    page-break-after: avoid;
  }}

  h3 {{
    font-size: 11.5pt;
    font-weight: 700;
    color: #0f172a;
    margin-top: 14px;
    margin-bottom: 6px;
    page-break-after: avoid;
  }}

  h4 {{
    font-size: 10.5pt;
    font-weight: 600;
    color: #334155;
    margin-top: 10px;
    margin-bottom: 4px;
    page-break-after: avoid;
  }}

  p {{
    margin: 0 0 8px 0;
    color: #334155;
  }}

  /* Bloques de Código */
  pre {{
    background: #0f172a;
    color: #f8fafc;
    font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
    font-size: 8pt;
    padding: 12px 14px;
    border-radius: 6px;
    overflow-x: auto;
    margin: 10px 0;
    page-break-inside: avoid;
    line-height: 1.4;
    border: 1px solid #1e293b;
  }}

  code {{
    font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
    font-size: 8.5pt;
    background: #f1f5f9;
    color: #0369a1;
    padding: 2px 5px;
    border-radius: 4px;
    border: 1px solid #e2e8f0;
  }}

  pre code {{
    background: transparent;
    color: inherit;
    padding: 0;
    border: none;
    font-size: 8pt;
  }}

  /* Tablas Corporativas */
  .table-wrapper {{
    margin: 12px 0;
    page-break-inside: avoid;
  }}

  table {{
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5pt;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    overflow: hidden;
  }}

  th {{
    background: #0f172a;
    color: #ffffff;
    font-weight: 700;
    text-align: left;
    padding: 7px 10px;
    border: 1px solid #334155;
    font-size: 8.5pt;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }}

  td {{
    padding: 6px 10px;
    border: 1px solid #e2e8f0;
    color: #334155;
    vertical-align: top;
  }}

  tr:nth-child(even) td {{
    background: #f8fafc;
  }}

  /* Listas */
  ul, ol {{
    margin: 4px 0 10px 0;
    padding-left: 20px;
  }}

  li {{
    margin-bottom: 4px;
    color: #334155;
  }}

  /* Citas y Callouts */
  blockquote {{
    border-left: 4px solid #0284c7;
    margin: 10px 0;
    padding: 8px 14px;
    background: #f0f9ff;
    border-radius: 0 6px 6px 0;
    font-style: normal;
  }}

  .callout {{
    margin: 10px 0;
    padding: 10px 14px;
    border-radius: 6px;
    border-left: 4px solid;
    page-break-inside: avoid;
  }}

  .callout-note {{
    border-color: #0284c7;
    background: #f0f9ff;
  }}

  .callout-tip {{
    border-color: #10b981;
    background: #ecfdf5;
  }}

  .callout-important {{
    border-color: #8b5cf6;
    background: #f5f3ff;
  }}

  .callout-warning {{
    border-color: #f59e0b;
    background: #fffbeb;
  }}

  .callout-caution {{
    border-color: #ef4444;
    background: #fef2f2;
  }}

  .callout-header {{
    font-weight: 700;
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }}

  hr {{
    border: none;
    height: 1px;
    background: #cbd5e1;
    margin: 16px 0;
  }}

  strong {{
    font-weight: 700;
    color: #0f172a;
  }}

  a {{
    color: #0284c7;
    text-decoration: none;
  }}

  /* Footer en cada página */
  .footer-header {{
    position: running(docFooter);
    font-size: 7.5pt;
    color: #94a3b8;
    display: flex;
    justify-content: space-between;
    border-top: 1px solid #e2e8f0;
    padding-top: 4px;
  }}
</style>
</head>
<body>
{body_html}
</body>
</html>
"""

def convert_md_to_pdf(md_file_path, output_pdf_path=None):
    """Convierte un archivo Markdown en un PDF profesional."""
    if not os.path.isfile(md_file_path):
        print(f"Error: No se encontró el archivo '{md_file_path}'")
        return False

    if not output_pdf_path:
        base_name = os.path.splitext(md_file_path)[0]
        output_pdf_path = f"{base_name}.pdf"

    # 1. Leer contenido Markdown
    with open(md_file_path, "r", encoding="utf-8") as f:
        md_text = f.read()

    # Extraer título del primer H1 si existe
    title_match = re.search(r'^#\s+(.+)$', md_text, re.MULTILINE)
    doc_title = title_match.group(1) if title_match else os.path.basename(md_file_path)

    # 2. Parsear a HTML con estilos
    body_html = parse_markdown_to_html(md_text)
    full_html = build_full_html_document(body_html, doc_title)

    # 3. Guardar HTML temporal
    temp_html_path = os.path.join(tempfile.gettempdir(), f"temp_{os.path.basename(md_file_path)}.html")
    with open(temp_html_path, "w", encoding="utf-8") as f:
        f.write(full_html)

    # 4. Buscar navegador para renderizar a PDF
    browser_exe = find_browser_executable()
    if not browser_exe:
        print("Error: No se encontró Microsoft Edge o Google Chrome para renderizar a PDF.")
        return False

    abs_output_pdf = os.path.abspath(output_pdf_path)
    abs_temp_html = os.path.abspath(temp_html_path)

    # 5. Ejecutar Headless Print to PDF
    cmd = [
        browser_exe,
        "--headless=new",
        "--disable-gpu",
        "--allow-file-access-from-files",
        f"--print-to-pdf={abs_output_pdf}",
        "--no-pdf-header-footer",
        abs_temp_html
    ]

    try:
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if os.path.exists(temp_html_path):
            os.remove(temp_html_path)
        print(f"¡Conversión exitosa! PDF generado en: {abs_output_pdf}")
        return True
    except Exception as e:
        print(f"Error al generar PDF: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python md_to_pdf.py <archivo.md> [archivo_salida.pdf]")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    convert_md_to_pdf(input_file, output_file)
