# app.py
import os
import re
import json
from statistics import median
from flask import Flask, jsonify, request
from flask_cors import CORS

# Fallback text extraction (if no manifest.json)
from pdfminer.high_level import extract_pages
from pdfminer.layout import LTTextContainer, LTTextLineHorizontal, LTChar

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = {"pdf"}
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# -------------------------
# Helpers: embedded manifest (pypdf first, then pdfminer)
# -------------------------

def _iter_name_tree(node, reader):
    """Yield (name, file_spec_indirect_obj) pairs from a pypdf NameTree."""
    if "/Names" in node:
        arr = node["/Names"]
        # Array is [name, filespec, name, filespec, ...]
        for i in range(0, len(arr), 2):
            name_obj = arr[i]
            spec_obj = arr[i + 1]
            try:
                name_str = str(name_obj)
            except Exception:
                name_str = ""
            try:
                fs = spec_obj.get_object()
            except Exception:
                fs = None
            if fs is not None:
                yield name_str, fs
    if "/Kids" in node:
        for kid in node["/Kids"]:
            try:
                kid_obj = kid.get_object()
            except Exception:
                kid_obj = None
            if kid_obj is not None:
                yield from _iter_name_tree(kid_obj, reader)

def _extract_file_from_filespec(fs):
    """
    Given a pypdf FileSpec dictionary, return (name, data) if present, else (None, None).
    It looks at /F (filename), /UF (unicode filename), and embedded file stream at /EF/F.
    """
    try:
        # Prefer Unicode filename (/UF); fallback to /F
        name = fs.get("/UF") or fs.get("/F") or fs.get("/Desc") or ""
        if hasattr(name, "get_object"):
            name = name.get_object()
        if not isinstance(name, str):
            try:
                name = str(name)
            except Exception:
                name = ""

        ef = fs.get("/EF")
        if ef and "/F" in ef:
            file_stream = ef["/F"].get_object()
            data = file_stream.get_data()  # decompressed bytes
            return name, data
    except Exception:
        pass
    return None, None

def _extract_manifest_with_pypdf(path):
    """Try reading an embedded 'manifest.json' using pypdf, covering:
       - reader.embeddedFiles (custom/JS-like shapes: {name,fileName,embedder:{fileData}})
       - Catalog /Names -> /EmbeddedFiles name tree
       - Catalog /AF (Associated Files)
       - Page-level /AF
    """
    try:
        from pypdf import PdfReader
        from pypdf.generic import DictionaryObject
    except Exception:
        return None

    try:
        reader = PdfReader(path)
        print(reader)
        # --- 0) Non-standard: reader.embeddedFiles (array of dicts) ---
        if hasattr(reader, "embeddedFiles") and reader.embeddedFiles:
            for ef in reader.embeddedFiles:
                if not isinstance(ef, dict):
                    continue
                name = (
                    ef.get("name")
                    or ef.get("fileName")
                    or ef.get("filename")
                    or ef.get("Name")
                    or ""
                )
                data = (
                    (ef.get("embedder") or {}).get("fileData")
                    or ef.get("fileData")
                    or ef.get("data")
                )
                data_bytes = _coerce_to_bytes(data)
                if not data_bytes:
                    continue

                if isinstance(name, bytes):
                    try:
                        name = name.decode("utf-8", "ignore")
                    except Exception:
                        name = "manifest.json"

                if str(name).lower().endswith("manifest.json"):
                    manifest = _decode_json_bytes(data_bytes)
                    if manifest is not None:
                        return manifest

        root = reader.trailer.get("/Root", {})

        # --- 1) Catalog /Names -> /EmbeddedFiles ---
        def _iter_name_tree(node):
            if "/Names" in node:
                arr = node["/Names"]
                for i in range(0, len(arr), 2):
                    yield arr[i], arr[i + 1]
            if "/Kids" in node:
                for kid in node["/Kids"]:
                    kid_obj = kid.get_object()
                    if kid_obj:
                        yield from _iter_name_tree(kid_obj)

        names = root.get("/Names")
        if names and "/EmbeddedFiles" in names:
            ef_tree = names["/EmbeddedFiles"]
            ef_tree_obj = ef_tree.get_object()
            if ef_tree_obj:
                for name_obj, fs_indirect in _iter_name_tree(ef_tree_obj):
                    try:
                        name_str = str(name_obj)
                    except Exception:
                        name_str = ""
                    if name_str.lower().endswith("manifest.json"):
                        fs = fs_indirect.get_object()
                        name, data = _extract_file_from_filespec(fs)
                        if data:
                            manifest = _decode_json_bytes(data)
                            if manifest is not None:
                                return manifest

        # --- 2) Catalog /AF (associated files) ---
        af = root.get("/AF")
        if af:
            for item in (af if isinstance(af, list) else [af]):
                fs = item.get_object()
                if not isinstance(fs, DictionaryObject):
                    continue
                name, data = _extract_file_from_filespec(fs)
                if data and str(name).lower().endswith("manifest.json"):
                    manifest = _decode_json_bytes(data)
                    if manifest is not None:
                        return manifest

        # --- 3) Page-level /AF ---
        for page in reader.pages:
            af = page.get("/AF")
            if not af:
                continue
            for item in (af if isinstance(af, list) else [af]):
                fs = item.get_object()
                if not isinstance(fs, DictionaryObject):
                    continue
                name, data = _extract_file_from_filespec(fs)
                if data and str(name).lower().endswith("manifest.json"):
                    manifest = _decode_json_bytes(data)
                    if manifest is not None:
                        return manifest

    except Exception:
        return None

    return None


# --- helpers ---

def _coerce_to_bytes(value):
    """Accept bytes, bytearray, memoryview, or base64-encoded str."""
    if value is None:
        return None
    if isinstance(value, (bytes, bytearray, memoryview)):
        return bytes(value)
    if isinstance(value, str):
        # likely base64
        import base64
        try:
            return base64.b64decode(value, validate=False)
        except Exception:
            return None
    return None

def _decode_json_bytes(b):
    """Try multiple decodings to turn bytes into JSON."""
    if not b:
        return None
    for enc in ("utf-8", "latin-1"):
        try:
            return json.loads(b.decode(enc))
        except Exception:
            pass
    try:
        # last resort: ignore errors
        return json.loads(b.decode("utf-8", "ignore"))
    except Exception:
        return None

def _extract_manifest_with_pdfminer(path):
    """
    Try reading an embedded 'manifest.json' with pdfminer name tree.
    This catches some PDFs where pypdf lookups fail.
    """
    try:
        from pdfminer.pdfparser import PDFParser
        from pdfminer.pdfdocument import PDFDocument
        from pdfminer.pdftypes import resolve1, stream_value
    except Exception:
        return None

    try:
        with open(path, "rb") as fp:
            parser = PDFParser(fp)
            doc = PDFDocument(parser)

            catalog = getattr(doc, "catalog", None)
            if not catalog or "Names" not in catalog:
                return None
            names_dict = resolve1(catalog["Names"])
            if not names_dict or "EmbeddedFiles" not in names_dict:
                return None

            ef_tree = resolve1(names_dict["EmbeddedFiles"])
            if not ef_tree:
                return None

            names = ef_tree.get("Names")
            if isinstance(names, list):
                for i in range(0, len(names), 2):
                    name = names[i]
                    file_spec = resolve1(names[i + 1])
                    if isinstance(name, bytes):
                        try:
                            name = name.decode("utf-8", "ignore")
                        except Exception:
                            pass
                    if isinstance(name, str) and name.lower().endswith("manifest.json"):
                        ef = file_spec.get("EF")
                        if ef and "F" in ef:
                            file_stream = resolve1(ef["F"])
                            data = stream_value(file_stream).get_data()
                            try:
                                return json.loads(data.decode("utf-8"))
                            except Exception:
                                try:
                                    return json.loads(data.decode("latin-1"))
                                except Exception:
                                    try:
                                        return json.loads(data.decode("utf-8", "ignore"))
                                    except Exception:
                                        pass
            # If Kids tree exists, you could recurse similarly
    except Exception:
        return None

    return None

def try_extract_manifest(path):
    """Return parsed manifest dict if present, else None."""
    manifest = _extract_manifest_with_pypdf(path)
    if manifest:
        return manifest
    return _extract_manifest_with_pdfminer(path)

def flatten_manifest_to_payload(manifest):
    """
    Convert your embedded manifest into the flat list your frontend consumes.
    Expected manifest shape:
      {
        "pageSize": { "width": W, "height": H },
        "pages": [
          { "texts": [{ text, xNorm, yNormTop, fontSize, ... }], "images": [...] },
          ...
        ]
      }

    Note: We do not clamp xNorm / yNormTop; values may be <0 or >1.
    """
    if not isinstance(manifest, dict):
        return None
    pages = manifest.get("pages")
    if not isinstance(pages, list):
        return None

    out = []
    for i, page in enumerate(pages):
        for t in (page.get("texts") or []):
            x_norm = t.get("xNorm")
            y_norm_top = t.get("yNormTop")
            if x_norm is None or y_norm_top is None:
                continue
            out.append({
                "text": t.get("text", ""),
                "xNorm": float(x_norm),
                "yNormTop": float(y_norm_top),
                "fontSize": float(t.get("fontSize")) if t.get("fontSize") is not None else None,
                "index": i,
                "anchor": "top",
            })
        # You can also add images here if you export them
    return out

# ----------------------------
# Fallback: pdfminer extraction
# ----------------------------

def _iter_chars(layout_obj):
    if isinstance(layout_obj, LTChar):
        yield layout_obj
    if hasattr(layout_obj, "_objs"):
        for child in layout_obj._objs:
            yield from _iter_chars(child)

def _median_font_size(obj):
    sizes = [float(ch.size) for ch in _iter_chars(obj) if getattr(ch, "size", None)]
    if not sizes:
        return None
    sizes.sort()
    mid = len(sizes) // 2
    return float(sizes[mid] if len(sizes) % 2 == 1 else (sizes[mid - 1] + sizes[mid]) / 2.0)

# Tune these for best fidelity vs your export font
FONT_ASCENT_RATIO = {
    "LATO": 0.960,
    "LATO-REGULAR": 0.960,
    "HELVETICA": 0.718,
    "TIMES-ROMAN": 0.662,
}
DEFAULT_ASCENT_RATIO = 0.96

def _canonical_fontname(name: str) -> str:
    if not name:
        return ""
    n = str(name).strip().strip("/")
    n = re.sub(r"^[A-Z]{6}\+", "", n)  # strip subset prefix ABCDEF+
    return n.upper()

def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

# -------------------------
# Route
# -------------------------
@app.route("/upload-pdf", methods=["POST"])
def upload_pdf():
    if "pdf" not in request.files:
        return jsonify({"message": "No file part"}), 400

    file = request.files["pdf"]
    if file.filename == "":
        return jsonify({"message": "No selected file"}), 400

    if not (file and allowed_file(file.filename)):
        return jsonify({"message": "Invalid file type. Only PDF files are allowed."}), 400

    # Save uploaded file
    unique_prefix = str(int(os.path.getmtime(os.path.abspath(__file__))))
    filename = f"{unique_prefix}-{file.filename}"
    saved_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    file.save(saved_path)

    # 1) Preferred: try embedded manifest.json for exact normalized positions
    manifest = try_extract_manifest(saved_path)
    if manifest:
        payload = flatten_manifest_to_payload(manifest)
        print(payload)
        if payload:
            return jsonify(payload), 200
        # else fall through to pdfminer if manifest was empty/invalid

    # 2) Fallback: pdfminer-based text extraction & normalization
    pdf_data = []
    for page_index, page_layout in enumerate(extract_pages(saved_path)):
        x0, y0, x1, y1 = page_layout.bbox
        page_w = float(x1 - x0)
        page_h = float(y1 - y0)
        if page_w <= 0 or page_h <= 0:
            continue

        for container in page_layout:
            if not isinstance(container, LTTextContainer):
                continue

            for line in container:
                if not isinstance(line, LTTextLineHorizontal):
                    continue

                chars = [ch for ch in line if isinstance(ch, LTChar)]
                if not chars:
                    continue

                text = line.get_text().strip()
                if not text:
                    continue

                # Baseline approximation (lowest glyph bottom)
                baseline_pdf = max(ch.y0 for ch in chars)

                # Font size & ascent ratio
                font_size = _median_font_size(line) or _median_font_size(container) or 0.0
                fontname_raw = getattr(chars[0], "fontname", "") if chars else ""
                font_key = _canonical_fontname(fontname_raw)
                ascent_ratio = FONT_ASCENT_RATIO.get(font_key, DEFAULT_ASCENT_RATIO)
                ascent = float(font_size) * float(ascent_ratio)

                # Rebuild the top used during export
                y_top_pdf = baseline_pdf + ascent

                # Left-most glyph
                x_left_pdf = min(ch.x0 for ch in chars)

                # Normalize relative to page size (no clamping).
                # These may be <0 if content starts left/above the page,
                # or >1 if it extends beyond right/bottom.
                x_norm = (x_left_pdf - x0) / page_w
                # y_norm_top: 0 at top edge, 1 at bottom; can be <0 or >1
                y_norm_top = (y1 - y_top_pdf) / page_h

                pdf_data.append({
                    "text": text,
                    "xNorm": float(x_norm),
                    "yNormTop": float(y_norm_top),
                    "fontSize": float(font_size) if font_size else None,
                    "index": page_index,
                    "anchor": "top",
                })

    return jsonify(pdf_data), 200


if __name__ == "__main__":
    app.run(debug=True)
