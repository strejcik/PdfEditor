# app.py
import os
import re
import json
import base64
import mimetypes
from statistics import median
from flask import Flask, jsonify, request
from flask_cors import CORS

# Fallback text/image extraction (if no manifest.json)
from pdfminer.high_level import extract_pages
from pdfminer.layout import (
    LTTextContainer,
    LTTextLineHorizontal,
    LTChar,
    LTImage,
    LTFigure,
)
from pdfminer.pdftypes import resolve1  # resolve indirect objects in pdfminer

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
        # [name, filespec, name, filespec, ...]
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


def _build_xobject_dim_map(path):
    """
    Return dict {(page_index, '/ImName'): (width, height)} using pypdf.
    Provides a reliable fallback for pixelWidth/pixelHeight.
    """
    dim_map = {}
    try:
        from pypdf import PdfReader
    except Exception:
        return dim_map

    try:
        reader = PdfReader(path)
        for p_idx, page in enumerate(reader.pages):
            try:
                resources = page.get("/Resources") or {}
                xobj = resources.get("/XObject")
                if not xobj:
                    continue
                xobj = xobj.get_object()
                for name, ref in (xobj.items() if hasattr(xobj, "items") else []):
                    try:
                        obj = ref.get_object()
                        if obj.get("/Subtype") == "/Image":
                            w = obj.get("/Width")
                            h = obj.get("/Height")
                            dim_map[(p_idx, str(name))] = (
                                int(w) if w is not None else None,
                                int(h) if h is not None else None,
                            )
                    except Exception:
                        continue
            except Exception:
                continue
    except Exception:
        pass
    return dim_map


def _build_xobject_data_map(path):
    """
    Return dict {(page_index, '/ImName'): (bytes, mime)} using pypdf.
    Lets us build base64 when pdfminer can't provide ready-to-emit bytes.
    """
    out = {}
    try:
        from pypdf import PdfReader
    except Exception:
        return out

    try:
        reader = PdfReader(path)
        for p_idx, page in enumerate(reader.pages):
            try:
                resources = page.get("/Resources") or {}
                xobj = resources.get("/XObject")
                if not xobj:
                    continue
                xobj = xobj.get_object()
                for name, ref in (xobj.items() if hasattr(xobj, "items") else []):
                    try:
                        obj = ref.get_object()
                        if obj.get("/Subtype") != "/Image":
                            continue
                        # Determine mime from /Filter
                        filt = obj.get("/Filter")
                        filt_list = _filters_to_list(filt)
                        mime = _mime_from_filters(filt_list)
                        if not mime:
                            continue  # skip non-self-contained encodings
                        raw = obj.get_data()
                        if not raw:
                            continue
                        out[(p_idx, str(name))] = (raw, mime)
                    except Exception:
                        continue
            except Exception:
                continue
    except Exception:
        pass
    return out


def _extract_file_from_filespec(fs):
    """
    Given a pypdf FileSpec dictionary, return (name, data) if present, else (None, None).
    """
    try:
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
    """Try reading an embedded 'manifest.json' using pypdf."""
    try:
        from pypdf import PdfReader
        from pypdf.generic import DictionaryObject
    except Exception:
        return None

    try:
        reader = PdfReader(path)
        # 0) Non-standard: reader.embeddedFiles
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

        # 1) Catalog /Names -> /EmbeddedFiles
        def _iter_name_tree_local(node):
            if "/Names" in node:
                arr = node["/Names"]
                for i in range(0, len(arr), 2):
                    yield arr[i], arr[i + 1]
            if "/Kids" in node:
                for kid in node["/Kids"]:
                    kid_obj = kid.get_object()
                    if kid_obj:
                        yield from _iter_name_tree_local(kid_obj)

        names = root.get("/Names")
        if names and "/EmbeddedFiles" in names:
            ef_tree = names["/EmbeddedFiles"]
            ef_tree_obj = ef_tree.get_object()
            if ef_tree_obj:
                for name_obj, fs_indirect in _iter_name_tree_local(ef_tree_obj):
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

        # 2) Catalog /AF
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

        # 3) Page-level /AF
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
        return json.loads(b.decode("utf-8", "ignore"))
    except Exception:
        return None

def _extract_manifest_with_pdfminer(path):
    """Try reading an embedded 'manifest.json' with pdfminer name tree."""
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
    except Exception:
        return None

    return None

def try_extract_manifest(path):
    """Return parsed manifest dict if present, else None."""
    manifest = _extract_manifest_with_pypdf(path)
    if manifest:
        return manifest
    return _extract_manifest_with_pdfminer(path)

# ---- image data helpers ----

def _filters_to_list(filters):
    """
    Normalize the /Filter entry into a list of filter names without leading slash.
    e.g. '/DCTDecode' -> ['DCTDecode'], ['/FlateDecode', '/DCTDecode'] -> ['FlateDecode','DCTDecode']
    """
    out = []
    if filters is None:
        return out
    if not isinstance(filters, (list, tuple)):
        filters = [filters]
    for f in filters:
        try:
            s = str(f)
        except Exception:
            continue
        s = s.strip()
        if s.startswith("/"):
            s = s[1:]
        out.append(s)
    return out

def _mime_from_filters(filter_list):
    """
    Return a usable MIME if the image stream is already in a self-contained format.
    We support:
      - DCTDecode -> image/jpeg
      - JPXDecode -> image/jp2
    """
    if "DCTDecode" in filter_list:
        return "image/jpeg"
    if "JPXDecode" in filter_list:
        return "image/jp2"
    return None  # others would need re-encoding

def _data_uri(mime, raw_bytes):
    b64 = base64.b64encode(raw_bytes).decode("ascii")
    return f"data:{mime};base64,{b64}"

def _image_to_data_uri_from_manifest(im: dict):
    """
    Build a data URI from a manifest image entry.
    Accepts:
      - im["ref"] if already a data: URI (pass-through)
      - im["data"] (bytes/base64/dataURI)
      - im["src"]  (if already a data: URI)
      - im["name"] (for MIME guess)
    """
    # If manifest already stores a data URI in ref, return it
    ref = im.get("ref")
    if isinstance(ref, str) and ref.startswith("data:"):
        return ref

    # If src is a data URI, pass-through
    src = im.get("src")
    if isinstance(src, str) and src.startswith("data:"):
        return src

    # Decide mime from file name (fallback png)
    mime = "image/png"
    name = im.get("name")
    if name:
        guess, _ = mimetypes.guess_type(name)
        if guess:
            mime = guess

    raw_bytes = None
    val = im.get("data")

    if val is not None:
        if isinstance(val, (bytes, bytearray, memoryview)):
            raw_bytes = bytes(val)
        elif isinstance(val, str):
            if val.startswith("data:"):
                return val
            try:
                raw_bytes = base64.b64decode(val, validate=False)
            except Exception:
                raw_bytes = val.encode("utf-8")

    if raw_bytes:
        return _data_uri(mime, raw_bytes)
    return None

# ---- manifest → payload ----

def flatten_manifest_to_payload(manifest):
    """
    Convert embedded manifest into the flat list your frontend consumes.

    Shape expected (minimum):
      {
        "pageSize": { "width": W, "height": H },
        "pages": [
          {
            "texts": [
              { "text": "...", "xNorm": 0.12, "yNormTop": 0.08, "fontSize": 16, ... }
            ],
            "images": [
              {
                "xNorm": 0.10, "yNormTop": 0.23,
                "widthNorm": 0.98, "heightNorm": 0.76,
                "ref": "...",              # can be data URI or client ref
                "data": <bytes|b64|dataURI>,  # optional; we embed into ref if present
                "name": "file.png",        # optional (MIME guess)
                "pixelWidth": 1200,        # optional
                "pixelHeight": 800         # optional
              }
            ]
          }
        ]
      }

    Notes:
      - No clamping of normals.
      - For images, we embed base64 into 'ref' when possible (using im.data/src/ref).
    """
    if not isinstance(manifest, dict):
        return None
    pages = manifest.get("pages")
    if not isinstance(pages, list):
        return None

    out = []
    for i, page in enumerate(pages):
        # ---- TEXTS ----
        for t in (page.get("texts") or []):
            x_norm = t.get("xNorm")
            y_norm_top = t.get("yNormTop")
            if x_norm is None or y_norm_top is None:
                continue
            item = {
                "type": "text",
                "text": t.get("text", ""),
                "xNorm": float(x_norm),
                "yNormTop": float(y_norm_top),
                "fontSize": float(t.get("fontSize")) if t.get("fontSize") is not None else None,
                "index": i,
                "anchor": "top",
            }
            if "boxPadding" in t and t["boxPadding"] is not None:
                try:
                    item["boxPadding"] = float(t["boxPadding"])
                except Exception:
                    pass
            if "fontFamily" in t and t["fontFamily"]:
                item["fontFamily"] = str(t["fontFamily"])
            out.append(item)

        # ---- IMAGES ---- (match what your frontend saves)
        for im in (page.get("images") or []):
            try:
                x_norm = float(im["xNorm"])
                y_norm_top = float(im["yNormTop"])
                width_norm = float(im["widthNorm"])
                height_norm = float(im["heightNorm"])
            except Exception:
                # Skip malformed entries
                continue

            img_item = {
                "type": "image",
                "xNorm": x_norm,
                "yNormTop": y_norm_top,
                "widthNorm": width_norm,
                "heightNorm": height_norm,
                "index": i,
            }

            # Optional passthrough metadata
            if "name" in im:
                img_item["name"] = im.get("name")
            if "pixelWidth" in im:
                try:
                    img_item["pixelWidth"] = int(im["pixelWidth"]) if im["pixelWidth"] is not None else None
                except Exception:
                    img_item["pixelWidth"] = None
            if "pixelHeight" in im:
                try:
                    img_item["pixelHeight"] = int(im["pixelHeight"]) if im["pixelHeight"] is not None else None
                except Exception:
                    img_item["pixelHeight"] = None

            # If manifest provides bytes/base64/src, embed base64 into 'ref'
            data_uri = _image_to_data_uri_from_manifest(im)
            if data_uri:
                img_item["ref"] = data_uri
            else:
                # Fall back to any existing 'ref' string (client ID/path/etc.)
                if "ref" in im:
                    img_item["ref"] = im.get("ref")

            # If you also want to echo original src (even if not data URI), keep it:
            if "src" in im and isinstance(im["src"], str):
                img_item["src"] = im["src"]

            # Optionally include original 'data' field
            if "data" in im:
                img_item["data"] = im["data"]

            out.append(img_item)

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

def _extract_images_recursive(node, page_bbox, page_index, out_list, xobj_dim_map, xobj_data_map):
    """
    Recursively collect LTImage (and images inside LTFigure) with normalized
    top-left position and size. Also fill pixelWidth/pixelHeight and 'ref' data URI where possible.
    """
    x0p, y0p, x1p, y1p = page_bbox
    page_w = float(x1p - x0p)
    page_h = float(y1p - y0p)

    # Recurse into children if present
    children = getattr(node, "_objs", None)
    if children:
        for child in children:
            _extract_images_recursive(child, page_bbox, page_index, out_list, xobj_dim_map, xobj_data_map)

    # Capture LTImage nodes
    if isinstance(node, LTImage):
        try:
            ix0, iy0, ix1, iy1 = node.bbox  # PDF coords (bottom-left origin)
            img_w = float(ix1 - ix0)
            img_h = float(iy1 - iy0)

            # Top-left normalized coordinates
            x_norm = (ix0 - x0p) / page_w
            y_norm_top = (y1p - iy1) / page_h
            width_norm = img_w / page_w
            height_norm = img_h / page_h

            # pdfminer image name (typically 'Im0'); create '/Im0' to match pypdf map
            name_plain = getattr(node, "name", None)
            name_slash = f"/{name_plain}" if name_plain and not str(name_plain).startswith("/") else name_plain

            # Intrinsic pixel size from stream attrs (resolve indirections)
            pixel_w = None
            pixel_h = None
            data_uri = None

            try:
                if getattr(node, "stream", None) is not None:
                    attrs = getattr(node.stream, "attrs", {}) or {}
                    attrs = resolve1(attrs) if attrs else {}

                    # sizes
                    w = attrs.get("Width")
                    h = attrs.get("Height")
                    if w is not None:
                        try:
                            pixel_w = int(resolve1(w))
                        except Exception:
                            pixel_w = int(w)
                    if h is not None:
                        try:
                            pixel_h = int(resolve1(h))
                        except Exception:
                            pixel_h = int(h)

                    # Try to build data URI from filters we can map
                    filt_list = _filters_to_list(attrs.get("Filter"))
                    mime = _mime_from_filters(filt_list)
                    if mime:
                        try:
                            raw = node.stream.get_data()  # decoded by pdfminer
                            if raw:
                                data_uri = _data_uri(mime, raw)
                        except Exception:
                            pass
            except Exception:
                pass

            # Fallbacks via pypdf maps
            if (pixel_w is None or pixel_h is None) and name_slash is not None:
                pw_ph = xobj_dim_map.get((page_index, str(name_slash)))
                if pw_ph:
                    pw, ph = pw_ph
                    if pixel_w is None:
                        pixel_w = pw
                    if pixel_h is None:
                        pixel_h = ph

            if data_uri is None and name_slash is not None:
                bytes_mime = xobj_data_map.get((page_index, str(name_slash)))
                if bytes_mime:
                    raw, mime = bytes_mime
                    data_uri = _data_uri(mime, raw)

            out_list.append({
                "type": "image",
                "xNorm": float(x_norm),
                "yNormTop": float(y_norm_top),
                "widthNorm": float(width_norm),
                "heightNorm": float(height_norm),
                "index": page_index,
                "ref": data_uri,  # base64 when available
            })
        except Exception:
            # ignore malformed image objects
            pass

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

    # 1) Preferred: try embedded manifest.json for exact normalized positions & refs
    manifest = try_extract_manifest(saved_path)
    if manifest:
        payload = flatten_manifest_to_payload(manifest)
        if payload:
            return jsonify(payload), 200
        # else fall through to pdfminer if manifest was empty/invalid

    # 2) Fallback: pdfminer-based text & image extraction (normalized)
    pdf_data = []

    # Build XObject maps once (for pixelWidth/Height and base64 fallback)
    xobj_dim_map = _build_xobject_dim_map(saved_path)
    xobj_data_map = _build_xobject_data_map(saved_path)

    for page_index, page_layout in enumerate(extract_pages(saved_path)):
        x0, y0, x1, y1 = page_layout.bbox
        page_w = float(x1 - x0)
        page_h = float(y1 - y0)
        if page_w <= 0 or page_h <= 0:
            continue

        # ---- TEXT ----
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

                # Normalize (no clamping)
                x_norm = (x_left_pdf - x0) / page_w
                y_norm_top = (y1 - y_top_pdf) / page_h

                pdf_data.append({
                    "type": "text",
                    "text": text,
                    "xNorm": float(x_norm),
                    "yNormTop": float(y_norm_top),
                    "fontSize": float(font_size) if font_size else None,
                    "index": page_index,
                    "anchor": "top",
                })

        # ---- IMAGES (LTImage, also within LTFigure) ----
        _extract_images_recursive(page_layout, page_layout.bbox, page_index, pdf_data, xobj_dim_map, xobj_data_map)

    return jsonify(pdf_data), 200


if __name__ == "__main__":
    app.run(debug=True)
