#!/usr/bin/env python3
"""Única fuente del reglamento: sources/*.docx -> REGLAMENTO.md, docs/index.html y _data/manual.json.

Se parsea el .docx una sola vez y se emiten los tres formatos desde la misma
lista de bloques, para que el manual del repo, la web y el compendio de Foundry
no puedan divergir.
"""
import hashlib
import html
import json
import pathlib
import re
import zipfile
from xml.etree import ElementTree as ET

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
RAIZ = pathlib.Path(__file__).resolve().parent.parent
FUENTE = next((RAIZ / "sources").glob("*.docx"))
VERSION = "0.5.5"

# Estilos del manuscrito maquetado -> tipo de bloque.
ESTILOS = {
    "Title": "h1", "Heading1": "h1", "Heading2": "h2", "Heading3": "h3",
    "RBLead": "lead", "RBQuote": "quote", "RBRule": "rule",
    "RBLabel": "rule", "RBSmall": "small",
}


def texto(nodo):
    partes = []
    for hijo in nodo.iter():
        if hijo.tag == f"{W}t":
            partes.append(hijo.text or "")
        elif hijo.tag == f"{W}tab":
            partes.append(" ")
        elif hijo.tag == f"{W}br":
            partes.append("\n")
    return "".join(partes).strip()


def estilo(p):
    pPr = p.find(f"{W}pPr")
    if pPr is None:
        return ""
    s = pPr.find(f"{W}pStyle")
    return s.get(f"{W}val") if s is not None else ""


def es_lista(p):
    pPr = p.find(f"{W}pPr")
    return pPr is not None and pPr.find(f"{W}numPr") is not None


def leer_bloques():
    raiz = ET.fromstring(zipfile.ZipFile(FUENTE).read("word/document.xml"))
    bloques = []
    for el in raiz.find(f"{W}body"):
        if el.tag == f"{W}p":
            t = texto(el)
            if not t:
                continue
            tipo = ESTILOS.get(estilo(el), "")
            if not tipo:
                if t.startswith("•"):
                    tipo, t = "li", t.lstrip("• ").strip()
                elif es_lista(el):
                    tipo = "li-num"
                else:
                    tipo = "p"
            bloques.append({"tipo": tipo, "texto": t})
        elif el.tag == f"{W}tbl":
            filas = []
            for tr in el.findall(f"{W}tr"):
                celdas = [" ".join(x for x in (texto(p) for p in tc.findall(f"{W}p")) if x)
                          for tc in tr.findall(f"{W}tc")]
                celdas = [c for c in celdas if c]
                if celdas:
                    filas.append(celdas)
            if not filas:
                continue
            # Una tabla de una sola fila es una caja destacada, no una tabla.
            if len(filas) == 1 and len(filas[0]) <= 2:
                lineas = "\n".join(filas[0]).split("\n")
                bloques.append({"tipo": "caja", "titulo": lineas[0].strip(),
                                "cuerpo": [x.strip() for x in lineas[1:] if x.strip()]})
            else:
                ancho = max(len(f) for f in filas)
                bloques.append({"tipo": "tabla", "filas": [f + [""] * (ancho - len(f)) for f in filas]})
    return bloques


def capitulos(bloques):
    """Agrupa por Heading1. El primer grupo es la portada.

    El capítulo "Contenido" se descarta: en la web lo sustituye el índice lateral
    y en Foundry, la lista de páginas del diario.
    """
    grupos, actual = [], {"titulo": "Portada", "bloques": []}
    for b in bloques:
        if b["tipo"] == "h1":
            if actual["bloques"]:
                grupos.append(actual)
            actual = {"titulo": b["texto"], "bloques": []}
        else:
            actual["bloques"].append(b)
    if actual["bloques"]:
        grupos.append(actual)
    return [g for g in grupos if g["titulo"] != "Contenido"]


# --------------------------------------------------------------------------- Markdown

def a_markdown(caps):
    salida = [f"# RUIDO BLANCO\n",
              "*Juego de rol de investigación contemporánea emergente.*\n",
              f"**v{VERSION} · Edición de blind playtest**\n",
              "> **LAS PISTAS SON REALES. SU SIGNIFICADO INTERPRETABLE.**\n"]
    for cap in caps:
        if cap["titulo"] == "Portada":
            cap = dict(cap, bloques=[b for b in cap["bloques"]
                                     if not (b["tipo"] == "caja" and b["titulo"].startswith("RUIDO BLANCO"))])
        if cap["titulo"] != "Portada":
            salida.append(f"\n## {cap['titulo']}\n")
        for b in cap["bloques"]:
            t = b["tipo"]
            if t == "h2":
                salida.append(f"\n### {b['texto']}\n")
            elif t == "h3":
                salida.append(f"\n#### {b['texto']}\n")
            elif t == "lead":
                salida.append(f"\n*{b['texto']}*\n")
            elif t == "quote":
                salida.append(f"\n> {b['texto']}\n")
            elif t in ("rule",):
                salida.append(f"\n**{b['texto']}**\n")
            elif t == "li":
                salida.append(f"- {b['texto']}")
            elif t == "li-num":
                salida.append(f"1. {b['texto']}")
            elif t == "caja":
                salida.append("")
                salida.append(f"> **{b['titulo']}**")
                salida.extend(f"> {x}" for x in b["cuerpo"])
                salida.append("")
            elif t == "tabla":
                f = b["filas"]
                n = len(f[0])
                salida.append("")
                salida.append("| " + " | ".join(c.replace("|", "\\|") for c in f[0]) + " |")
                salida.append("|" + "---|" * n)
                salida.extend("| " + " | ".join(c.replace("|", "\\|") for c in fila) + " |" for fila in f[1:])
                salida.append("")
            else:
                salida.append(f"\n{b['texto']}\n")
    return re.sub(r"\n{3,}", "\n\n", "\n".join(salida)).strip() + "\n"


# --------------------------------------------------------------------------- HTML

def a_html(bloques):
    """Bloques -> HTML. Agrupa las viñetas consecutivas en una sola lista."""
    out, lista = [], None
    def cerrar():
        nonlocal lista
        if lista:
            out.append(f"</{lista}>")
            lista = None
    for b in bloques:
        t = b["tipo"]
        if t in ("li", "li-num"):
            etiqueta = "ul" if t == "li" else "ol"
            if lista != etiqueta:
                cerrar()
                out.append(f"<{etiqueta}>")
                lista = etiqueta
            out.append(f"<li>{html.escape(b['texto'])}</li>")
            continue
        cerrar()
        if t == "h2":
            out.append(f"<h3>{html.escape(b['texto'])}</h3>")
        elif t == "h3":
            out.append(f"<h4>{html.escape(b['texto'])}</h4>")
        elif t == "lead":
            out.append(f'<p class="rb-lead">{html.escape(b["texto"])}</p>')
        elif t == "quote":
            out.append(f"<blockquote>{html.escape(b['texto'])}</blockquote>")
        elif t == "rule":
            out.append(f'<p class="rb-rule">{html.escape(b["texto"])}</p>')
        elif t == "small":
            out.append(f'<p class="rb-small">{html.escape(b["texto"])}</p>')
        elif t == "caja":
            cuerpo = "".join(f"<p>{html.escape(x)}</p>" for x in b["cuerpo"])
            out.append(f'<aside class="rb-caja"><h5>{html.escape(b["titulo"])}</h5>{cuerpo}</aside>')
        elif t == "tabla":
            f = b["filas"]
            cab = "".join(f"<th>{html.escape(c)}</th>" for c in f[0])
            cuerpo = "".join("<tr>" + "".join(f"<td>{html.escape(c)}</td>" for c in fila) + "</tr>" for fila in f[1:])
            out.append(f"<table><thead><tr>{cab}</tr></thead><tbody>{cuerpo}</tbody></table>")
        else:
            out.append(f"<p>{html.escape(b['texto'])}</p>")
    cerrar()
    return "\n".join(out)


def slug(t):
    t = re.sub(r"[^a-z0-9]+", "-", t.lower().replace("á", "a").replace("é", "e")
               .replace("í", "i").replace("ó", "o").replace("ú", "u").replace("ñ", "n"))
    return t.strip("-")


def ident(semilla):
    """Id estable de 16 caracteres: recompilar no debe mover los documentos."""
    return hashlib.sha1(semilla.encode()).hexdigest()[:16]


# --------------------------------------------------------------------------- Salidas

def escribir_pages(caps):
    portada, resto = caps[0], caps[1:]
    nav = "\n".join(
        f'<li><a href="#{slug(c["titulo"])}">{html.escape(c["titulo"])}</a></li>' for c in resto)
    secciones = "\n".join(
        f'<section id="{slug(c["titulo"])}"><h2>{html.escape(c["titulo"])}</h2>\n{a_html(c["bloques"])}</section>'
        for c in resto)
    bloques_portada = [b for b in portada["bloques"]
                       if not (b["tipo"] == "caja" and b["titulo"].startswith("RUIDO BLANCO"))]
    plantilla = (RAIZ / "scripts/pagina.html").read_text()
    (RAIZ / "docs/index.html").write_text(
        plantilla.replace("{{VERSION}}", VERSION).replace("{{NAV}}", nav)
                 .replace("{{SECCIONES}}", secciones)
                 .replace("{{PORTADA}}", a_html(bloques_portada)))


def escribir_pack(caps):
    entrada_id = ident("manual")
    paginas = []
    for i, cap in enumerate(caps[1:], start=1):
        paginas.append({
            "_id": ident(f"pagina-{cap['titulo']}"),
            "name": cap["titulo"],
            "type": "text",
            "title": {"show": True, "level": 1},
            "text": {"format": 1, "content": a_html(cap["bloques"])},
            "sort": i * 100000,
            "ownership": {"default": -1}
        })
    (RAIZ / "_data/manual.json").write_text(json.dumps({"documents": [{
        "_id": entrada_id,
        "name": f"RUIDO BLANCO · Manual del investigador (v{VERSION})",
        "pages": paginas,
        "ownership": {"default": 0}
    }]}, ensure_ascii=False, indent=2) + "\n")


def main():
    caps = capitulos(leer_bloques())
    (RAIZ / "REGLAMENTO.md").write_text(a_markdown(caps))
    escribir_pages(caps)
    escribir_pack(caps)
    print(f"{len(caps) - 1} capítulos -> REGLAMENTO.md, docs/index.html, _data/manual.json")


if __name__ == "__main__":
    main()
