@echo off
REM ====================================================================
REM Acceso Directo de Consola: Convertidor Markdown a PDF OTech
REM Uso: md2pdf archivo.md [salida.pdf]
REM ====================================================================
python "%~dp0md_to_pdf.py" %*
