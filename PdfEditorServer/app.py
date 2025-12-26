# app.py
import os
import re
import json
import base64
import mimetypes
import subprocess
import tempfile
import shutil
from typing import List, Tuple, Optional

from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = {"pdf"}
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ========= manifest helpers (pypdf) =========

def _iter_name_tree(node, reader):
    """Yield (name, file_spec_indirect_obj) pairs from a pypdf NameTree."""
    if "/Names" in node:
        arr = node["/Names"]
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
    """Return (name, data) from a pypdf FileSpec if present."""
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
            data = file_stream.get_data()
            return name, data
    except Exception:
        pass
    return None, None

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

def try_extract_manifest(path):
    """Return parsed manifest dict if present, else None."""
    manifest = _extract_manifest_with_pypdf(path)
    return manifest

# ========= image helpers / manifest flatten =========

def _data_uri(mime, raw_bytes):
    b64 = base64.b64encode(raw_bytes).decode("ascii")
    return f"data:{mime};base64,{b64}"

def _guess_mime_from_name(name: str, fallback="image/png"):
    if not name:
        return fallback
    guess, _ = mimetypes.guess_type(name)
    return guess or fallback

def _looks_like_base64(s: str) -> bool:
    if not isinstance(s, str) or len(s) < 16:
        return False
    try:
        base64.b64decode(s, validate=True)
        return True
    except Exception:
        return False

def _ensure_data_uri_from_ref_or_data(im: dict) -> Optional[str]:
    """
    Ensure a manifest image entry produces a data: URI when possible.
    """
    ref = im.get("ref")
    if isinstance(ref, str) and ref.startswith("data:"):
        return ref

    src = im.get("src")
    if isinstance(src, str) and src.startswith("data:"):
        return src

    name = im.get("name")
    mime = _guess_mime_from_name(name)

    if isinstance(ref, str) and _looks_like_base64(ref):
        try:
            raw = base64.b64decode(ref, validate=True)
            return _data_uri(mime, raw)
        except Exception:
            pass

    val = im.get("data")
    if val is not None:
        if isinstance(val, (bytes, bytearray, memoryview)):
            return _data_uri(mime, bytes(val))
        if isinstance(val, str):
            if val.startswith("data:"):
                return val
            if _looks_like_base64(val):
                try:
                    raw = base64.b64decode(val, validate=True)
                    return _data_uri(mime, raw)
                except Exception:
                    pass
    return None

def flatten_manifest_to_payload(manifest):
    """
    Convert embedded manifest into the flat list your frontend consumes.
    (No clamping of normalized coords.)
    """
    if not isinstance(manifest, dict):
        return None
    pages = manifest.get("pages")
    if not isinstance(pages, list):
        return None

    out = []
    for i, page in enumerate(pages):
        # TEXT
        text_span_counter = 0
        for t in (page.get("texts") or []):
            x_norm = t.get("xNorm")
            y_norm_top = t.get("yNormTop")
            if x_norm is None or y_norm_top is None:
                continue
            text_content = t.get("text", "")
            font_size = float(t.get("fontSize")) if t.get("fontSize") is not None else None

            z_index = t.get("zIndex", 10)
            item = {
                "text": text_content,
                "xNorm": float(x_norm),
                "yNormTop": float(y_norm_top),
                "fontSize": font_size,
                "index": i,
                "anchor": "top",
                # Use zIndex from manifest for proper layer ordering
                "zOrder": int(z_index) if z_index is not None else (2_000_000 + len(out)),
                "zIndex": int(z_index) if z_index is not None else 10,
            }
            if "boxPadding" in t and t["boxPadding"] is not None:
                try:
                    item["boxPadding"] = float(t["boxPadding"])
                except Exception:
                    pass
            if "fontFamily" in t and t["fontFamily"]:
                item["fontFamily"] = str(t["fontFamily"])
            # Include color if available (preserve original text color)
            if "color" in t and t["color"]:
                item["color"] = str(t["color"])
            # Include text item ID for annotation linking if available
            if "id" in t and t["id"]:
                item["id"] = str(t["id"])
            # Layer properties
            if "visible" in t:
                item["visible"] = bool(t["visible"])
            if "locked" in t:
                item["locked"] = bool(t["locked"])
            if "name" in t and t["name"]:
                item["name"] = str(t["name"])
            out.append(item)

        # TEXT SPANS - prefer pre-computed textSpans from manifest if available
        # Otherwise generate from texts array
        manifest_text_spans = page.get("textSpans") or []
        if manifest_text_spans:
            # Use pre-computed textSpans from manifest (accurate measurements from client)
            for ts in manifest_text_spans:
                x_norm = ts.get("xNorm")
                y_norm_top = ts.get("yNormTop")
                if x_norm is None or y_norm_top is None:
                    continue

                text_span_item = {
                    "type": "textSpan",
                    "text": ts.get("text", ""),
                    "xNorm": float(x_norm),
                    "yNormTop": float(y_norm_top),
                    "widthNorm": float(ts.get("widthNorm", 0)),
                    "heightNorm": float(ts.get("heightNorm", 0)),
                    "fontSize": float(ts.get("fontSize")) if ts.get("fontSize") is not None else None,
                    "index": i,
                    "zOrder": 2_500_000 + text_span_counter,
                }

                # Include font metrics if available
                if ts.get("ascentRatio") is not None:
                    text_span_item["ascentRatio"] = float(ts["ascentRatio"])
                if ts.get("descentRatio") is not None:
                    text_span_item["descentRatio"] = float(ts["descentRatio"])

                out.append(text_span_item)
                text_span_counter += 1
        else:
            # Fallback: generate textSpans from texts array
            for t in (page.get("texts") or []):
                x_norm = t.get("xNorm")
                y_norm_top = t.get("yNormTop")
                if x_norm is None or y_norm_top is None:
                    continue
                text_content = t.get("text", "")
                font_size = float(t.get("fontSize")) if t.get("fontSize") is not None else None

                # Only generate textSpan if we have text content and font size
                if text_content and font_size:
                    # Try to get accurate dimensions from manifest
                    width_norm = t.get("widthNorm")
                    height_norm = t.get("heightNorm")
                    ascent_ratio = t.get("ascentRatio")  # baseline position from top
                    descent_ratio = t.get("descentRatio")

                    # Fall back to estimates if not available
                    if width_norm is None:
                        # Rough character width estimate (0.5 * fontSize for average char)
                        # Assume A4 page width of 595 points (standard PDF)
                        char_width_estimate = font_size * 0.5
                        text_width_points = len(text_content) * char_width_estimate
                        width_norm = text_width_points / 595.0
                    if height_norm is None:
                        # Estimate: textHeight ≈ fontSize (ascent + descent)
                        # A4 height is 842 points
                        height_norm = font_size / 842.0

                    text_span_item = {
                        "type": "textSpan",
                        "text": text_content,
                        "xNorm": float(x_norm),
                        "yNormTop": float(y_norm_top),
                        "widthNorm": float(width_norm),
                        "heightNorm": float(height_norm),
                        "fontSize": font_size,
                        "index": i,
                        "zOrder": 2_500_000 + text_span_counter,
                    }

                    # Include font metrics if available for accurate annotation positioning
                    if ascent_ratio is not None:
                        text_span_item["ascentRatio"] = float(ascent_ratio)
                    if descent_ratio is not None:
                        text_span_item["descentRatio"] = float(descent_ratio)

                    out.append(text_span_item)
                    text_span_counter += 1

        # IMAGES
        for im in (page.get("images") or []):
            try:
                x_norm = float(im["xNorm"])
                y_norm_top = float(im["yNormTop"])
                width_norm = float(im["widthNorm"])
                height_norm = float(im["heightNorm"])
            except Exception:
                continue

            z_index = im.get("zIndex", -100)
            img_item = {
                "type": "image",
                "xNorm": x_norm,
                "yNormTop": y_norm_top,
                "widthNorm": width_norm,
                "heightNorm": height_norm,
                "index": i,
                # Use zIndex from manifest for proper layer ordering
                "zOrder": int(z_index) if z_index is not None else (1_000_000 + len(out)),
                "zIndex": int(z_index) if z_index is not None else -100,
            }

            if "name" in im:
                img_item["name"] = im.get("name")
            # Layer properties
            if "visible" in im:
                img_item["visible"] = bool(im["visible"])
            if "locked" in im:
                img_item["locked"] = bool(im["locked"])
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

            data_uri = _ensure_data_uri_from_ref_or_data(im)
            if data_uri:
                img_item["ref"] = data_uri
            else:
                if "ref" in im:
                    img_item["ref"] = im.get("ref")

            out.append(img_item)

        # SHAPES (rectangle, circle, line, arrow, triangle, diamond, freehand)
        shape_counter = 0
        for shape in (page.get("shapes") or []):
            shape_type = shape.get("type")
            if not shape_type:
                continue

            try:
                x_norm = float(shape.get("xNorm", 0))
                y_norm_top = float(shape.get("yNormTop", 0))
                width_norm = float(shape.get("widthNorm", 0))
                height_norm = float(shape.get("heightNorm", 0))
            except Exception:
                continue

            z_index = shape.get("zIndex", 0)
            shape_item = {
                "type": "shape",
                "shapeType": str(shape_type),
                "xNorm": x_norm,
                "yNormTop": y_norm_top,
                "widthNorm": width_norm,
                "heightNorm": height_norm,
                "index": i,
                # Use zIndex from manifest for proper layer ordering
                "zOrder": int(z_index) if z_index is not None else (500_000 + shape_counter),
                "zIndex": int(z_index) if z_index is not None else 0,
            }

            # Include stroke properties
            if shape.get("strokeColor"):
                shape_item["strokeColor"] = str(shape["strokeColor"])
            if shape.get("strokeWidth") is not None:
                try:
                    shape_item["strokeWidth"] = float(shape["strokeWidth"])
                except Exception:
                    pass

            # Include fill color if available
            if shape.get("fillColor") and shape["fillColor"] != "transparent":
                shape_item["fillColor"] = str(shape["fillColor"])

            # Layer properties
            if "visible" in shape:
                shape_item["visible"] = bool(shape["visible"])
            if "locked" in shape:
                shape_item["locked"] = bool(shape["locked"])
            if "name" in shape and shape["name"]:
                shape_item["name"] = str(shape["name"])

            # Include freehand points if available
            if shape_type == "freehand" and shape.get("points"):
                shape_item["points"] = shape["points"]

            out.append(shape_item)
            shape_counter += 1

        # FORM FIELDS (textInput, textarea, checkbox, radio, dropdown)
        form_field_counter = 0
        for field in (page.get("formFields") or []):
            field_type = field.get("type")
            if not field_type:
                continue

            try:
                x_norm = float(field.get("xNorm", 0))
                y_norm_top = float(field.get("yNormTop", 0))
                width_norm = float(field.get("widthNorm", 0))
                height_norm = float(field.get("heightNorm", 0))
            except Exception:
                continue

            z_index = field.get("zIndex", 100)
            form_field_item = {
                "type": "formField",
                "fieldType": str(field_type),
                "fieldName": str(field.get("fieldName", f"field_{form_field_counter}")),
                "xNorm": x_norm,
                "yNormTop": y_norm_top,
                "widthNorm": width_norm,
                "heightNorm": height_norm,
                "index": i,
                # Use zIndex from manifest for proper layer ordering
                "zOrder": int(z_index) if z_index is not None else (4_000_000 + form_field_counter),
                "zIndex": int(z_index) if z_index is not None else 100,
            }

            # Include optional properties
            if field.get("label"):
                form_field_item["label"] = str(field["label"])
            if field.get("placeholder"):
                form_field_item["placeholder"] = str(field["placeholder"])
            if field.get("defaultValue"):
                form_field_item["defaultValue"] = str(field["defaultValue"])
            if field.get("required"):
                form_field_item["required"] = bool(field["required"])

            # Radio/dropdown options
            if field.get("options") and isinstance(field["options"], list):
                form_field_item["options"] = field["options"]
            if field.get("groupName"):
                form_field_item["groupName"] = str(field["groupName"])

            # Styling properties
            if field.get("fontSize") is not None:
                try:
                    form_field_item["fontSize"] = float(field["fontSize"])
                except Exception:
                    form_field_item["fontSize"] = 14
            if field.get("fontFamily"):
                form_field_item["fontFamily"] = str(field["fontFamily"])
            if field.get("textColor"):
                form_field_item["textColor"] = str(field["textColor"])
            if field.get("backgroundColor"):
                form_field_item["backgroundColor"] = str(field["backgroundColor"])
            if field.get("borderColor"):
                form_field_item["borderColor"] = str(field["borderColor"])
            if field.get("borderWidth") is not None:
                try:
                    form_field_item["borderWidth"] = float(field["borderWidth"])
                except Exception:
                    pass

            # Layer properties
            if "visible" in field:
                form_field_item["visible"] = bool(field["visible"])
            if "locked" in field:
                form_field_item["locked"] = bool(field["locked"])
            if "name" in field and field["name"]:
                form_field_item["name"] = str(field["name"])

            out.append(form_field_item)
            form_field_counter += 1

        # ANNOTATIONS (highlight, strikethrough, underline)
        annotation_counter = 0
        for ann in (page.get("annotations") or []):
            ann_id = ann.get("id")
            ann_type = ann.get("type")
            if not ann_type:
                continue

            spans = ann.get("spans") or []
            if not spans:
                continue

            # Build span objects with all necessary fields for linked annotations
            span_items = []
            for s in spans:
                span_item = {
                    "xNorm": float(s.get("xNorm", 0)),
                    "yNormTop": float(s.get("yNormTop", 0)),
                    "widthNorm": float(s.get("widthNorm", 0)),
                    "heightNorm": float(s.get("heightNorm", 0)),
                }
                # Include text and fontSize for accurate visual rendering
                if s.get("text"):
                    span_item["text"] = str(s["text"])
                if s.get("fontSize") is not None:
                    span_item["fontSize"] = float(s["fontSize"])
                # Include relative offsets for linked annotations
                if s.get("relativeXNorm") is not None:
                    span_item["relativeXNorm"] = float(s["relativeXNorm"])
                if s.get("relativeYNorm") is not None:
                    span_item["relativeYNorm"] = float(s["relativeYNorm"])
                # Include font metrics if available
                if s.get("ascentRatio") is not None:
                    span_item["ascentRatio"] = float(s["ascentRatio"])
                if s.get("descentRatio") is not None:
                    span_item["descentRatio"] = float(s["descentRatio"])
                span_items.append(span_item)

            z_index = ann.get("zIndex", -50)
            annotation_item = {
                "type": "annotation",
                "annotationType": str(ann_type),
                "spans": span_items,
                "color": str(ann.get("color", "#FFFF00")),
                "opacity": float(ann.get("opacity", 0.4)),
                "index": i,
                # Use zIndex from manifest for proper layer ordering
                "zOrder": int(z_index) if z_index is not None else (3_000_000 + annotation_counter),
                "zIndex": int(z_index) if z_index is not None else -50,
            }

            # Include annotation ID
            if ann_id:
                annotation_item["id"] = str(ann_id)

            # Include linked text item ID for annotations linked to text items
            if ann.get("linkedTextItemId"):
                annotation_item["linkedTextItemId"] = str(ann["linkedTextItemId"])

            # Include annotated text for reference
            if ann.get("annotatedText"):
                annotation_item["annotatedText"] = str(ann["annotatedText"])

            # Layer properties
            if "visible" in ann:
                annotation_item["visible"] = bool(ann["visible"])
            if "locked" in ann:
                annotation_item["locked"] = bool(ann["locked"])
            if "name" in ann and ann["name"]:
                annotation_item["name"] = str(ann["name"])

            out.append(annotation_item)
            annotation_counter += 1

    return out

# ========= PyMuPDF extractors (text + raster) =========

def _ext_to_mime(ext: str) -> str:
    ext = (ext or "").lower().lstrip(".")
    if ext == "png":
        return "image/png"
    if ext in ("jpg", "jpeg"):
        return "image/jpeg"
    if ext == "jp2":
        return "image/jp2"
    if ext == "pam":
        return "image/x-portable-arbitrarymap"
    if ext == "pbm":
        return "image/x-portable-bitmap"
    if ext == "pgm":
        return "image/x-portable-graymap"
    if ext == "ppm":
        return "image/x-portable-pixmap"
    return "application/octet-stream"

def _data_uri_from_image_dict(img_dict: dict) -> Optional[str]:
    """
    PyMuPDF doc.extract_image(xref) returns:
      {"ext": "...", "image": b"...", "width": W, "height": H, ...}
    """
    raw = img_dict.get("image")
    if not raw:
        return None
    mime = _ext_to_mime(img_dict.get("ext"))
    return _data_uri(mime, raw)

def _extract_with_pymupdf(path):
    """
    Fallback extractor using PyMuPDF (fitz).
    Returns flat list: {type:"text"|"image", xNorm, yNormTop, ...}
    """
    import fitz  # PyMuPDF

    out = []
    doc = fitz.open(path)

    for page_index in range(len(doc)):
        page = doc[page_index]
        page_w = float(page.rect.width)
        page_h = float(page.rect.height)

        # zOrder bases to avoid collisions with pdf2svg DOM order
        Z_BASE_IMAGES = 1_000_000
        Z_BASE_TEXT   = 2_000_000
        z_counter_images = 0
        z_counter_text   = 0

        # ---------- TEXT ----------
        d = page.get_text("dict")
        z_counter_text_span = 0  # Separate counter for text spans

        for blk in d.get("blocks", []):
            if blk.get("type", 0) != 0:
                continue  # only text blocks
            for line in blk.get("lines", []):
                spans = line.get("spans", [])
                if not spans:
                    continue
                line_text = "".join(s.get("text", "") for s in spans).strip()
                if not line_text:
                    continue
                lb = line.get("bbox", None)
                if not (isinstance(lb, (list, tuple)) and len(lb) == 4):
                    continue
                x0, y0, x1, y1 = lb

                font_size = None
                for s in spans:
                    sz = s.get("size")
                    if isinstance(sz, (int, float)):
                        font_size = float(sz)
                        break

                x_norm = x0 / page_w if page_w else 0.0
                y_norm_top = y0 / page_h if page_h else 0.0

                out.append({
                    "text": line_text,
                    "xNorm": float(x_norm),
                    "yNormTop": float(y_norm_top),
                    "fontSize": float(font_size) if font_size is not None else None,
                    "index": page_index,
                    "anchor": "top",
                    "zOrder": int(Z_BASE_TEXT + z_counter_text),
                })
                z_counter_text += 1

                # ---------- TEXT SPANS (for annotation selection) ----------
                # Use LINE bbox for positioning to match text item rendering
                # This ensures annotations align with rendered text
                # We use line bbox (x0, y0, x1, y1) for consistent positioning
                out.append({
                    "type": "textSpan",
                    "text": line_text,
                    "xNorm": float(x0 / page_w if page_w else 0.0),
                    "yNormTop": float(y0 / page_h if page_h else 0.0),
                    "widthNorm": float((x1 - x0) / page_w if page_w else 0.0),
                    "heightNorm": float((y1 - y0) / page_h if page_h else 0.0),
                    "fontSize": float(font_size) if font_size is not None else None,
                    "index": page_index,
                    "zOrder": int(Z_BASE_TEXT + 500000 + z_counter_text_span),
                })
                z_counter_text_span += 1

        # ---------- IMAGES ----------
        img_list = page.get_images(full=True)
        for img in img_list:
            xref = img[0]
            try:
                rects = page.get_image_rects(xref)
            except Exception:
                rects = []

            data_uri = None
            try:
                img_dict = doc.extract_image(xref)
                if img_dict:
                    data_uri = _data_uri_from_image_dict(img_dict)
            except Exception:
                pass

            for r in rects:
                x0, y0, x1, y1 = r
                w = max(0.0, float(x1 - x0))
                h = max(0.0, float(y1 - y0))
                x_norm = x0 / page_w if page_w else 0.0
                y_norm_top = y0 / page_h if page_h else 0.0
                width_norm = w / page_w if page_w else 0.0
                height_norm = h / page_h if page_h else 0.0

                item = {
                    "xNorm": float(x_norm),
                    "yNormTop": float(y_norm_top),
                    "widthNorm": float(width_norm),
                    "heightNorm": float(height_norm),
                    "index": page_index,
                    "zOrder": int(Z_BASE_IMAGES + z_counter_images),
                }
                if data_uri:
                    item["data"] = data_uri

                out.append(item)
                z_counter_images += 1

    doc.close()
    return out

# ========= vector detection + pdf2svg export =========

def _rects_overlap(a: Tuple[float, float, float, float],
                   b: Tuple[float, float, float, float],
                   pad: float = 1.0) -> bool:
    ax0, ay0, ax1, ay1 = a
    bx0, by0, bx1, by1 = b
    return not (ax1 + pad < bx0 or bx1 + pad < ax0 or ay1 + pad < by0 or by1 + pad < ay0)

def _merge_two(a, b):
    ax0, ay0, ax1, ay1 = a
    bx0, by0, bx1, by1 = b
    return (min(ax0, bx0), min(ay0, by0), max(ax1, bx1), max(ay1, by1))

def _merge_overlapping_rects(rects: List[Tuple[float, float, float, float]], pad: float = 1.0) -> List[Tuple[float, float, float, float]]:
    rects = [tuple(map(float, r)) for r in rects]
    changed = True
    while changed and len(rects) > 1:
        changed = False
        merged = []
        used = [False] * len(rects)
        for i in range(len(rects)):
            if used[i]:
                continue
            r = rects[i]
            for j in range(i + 1, len(rects)):
                if used[j]:
                    continue
                s = rects[j]
                if _rects_overlap(r, s, pad=pad):
                    r = _merge_two(r, s)
                    used[j] = True
                    changed = True
            used[i] = True
            merged.append(r)
        rects = merged
    return rects

def _get_pdf2svg_path() -> Optional[str]:
    """
    Resolve pdf2svg executable:
      1) Same folder as app (./pdf2svg or ./pdf2svg.exe)
      2) Current working directory
      3) PATH
    """
    here = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(here, "pdf2svg.exe"),
        os.path.join(here, "pdf2svg"),
        os.path.join(os.getcwd(), "pdf2svg.exe"),
        os.path.join(os.getcwd(), "pdf2svg"),
    ]
    for c in candidates:
        if os.path.isfile(c) and os.access(c, os.X_OK):
            return c
    which = shutil.which("pdf2svg")
    return which

def _export_pages_to_svg_with_pdf2svg(pdf_path: str, out_dir: str, page_count: int) -> List[Optional[str]]:
    """
    Export each page to an SVG. Returns list of paths (index 0 => page 1).
    """
    exe = _get_pdf2svg_path()
    if not exe:
        return [None] * page_count

    os.makedirs(out_dir, exist_ok=True)
    paths: List[Optional[str]] = []

    for i in range(1, page_count + 1):
        out_path = os.path.join(out_dir, f"page-{i}.svg")
        cmd = [exe, pdf_path, out_path, str(i)]
        try:
            with subprocess.Popen(
                cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
            ) as proc:
                try:
                    _, stderr = proc.communicate(timeout=30)
                    if proc.returncode != 0:
                        paths.append(None)
                        continue
                except subprocess.TimeoutExpired:
                    proc.kill()
                    proc.communicate()
                    paths.append(None)
                    continue
        except Exception:
            paths.append(None)
            continue

        if os.path.exists(out_path) and os.path.getsize(out_path) > 0:
            paths.append(out_path)
        else:
            paths.append(None)

    return paths

def _read_text(path: str) -> Optional[str]:
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    except Exception:
        return None

def _rewrite_svg_viewbox(svg_text: str, x: float, y: float, w: float, h: float) -> str:
    """
    Naively rewrite the root <svg ... viewBox="..."> and width/height.
    pdf2svg produces a single root <svg>.
    """
    # Ensure positive dimensions
    w = max(1.0, float(w))
    h = max(1.0, float(h))

    # Inject / replace viewBox
    if 'viewBox="' in svg_text:
        svg_text = re.sub(
            r'viewBox="[^"]+"',
            f'viewBox="{x:.3f} {y:.3f} {w:.3f} {h:.3f}"',
            svg_text,
            count=1
        )
    else:
        svg_text = svg_text.replace(
            "<svg",
            f'<svg viewBox="{x:.3f} {y:.3f} {w:.3f} {h:.3f}"',
            1
        )

    # Replace width / height attributes to match crop (optional, helps renderers)
    if re.search(r'width="[^"]+"', svg_text):
        svg_text = re.sub(r'width="[^"]+"', f'width="{w:.0f}px"', svg_text, count=1)
    else:
        svg_text = svg_text.replace("<svg", f'<svg width="{w:.0f}px"', 1)

    if re.search(r'height="[^"]+"', svg_text):
        svg_text = re.sub(r'height="[^"]+"', f'height="{h:.0f}px"', svg_text, count=1)
    else:
        svg_text = svg_text.replace("<svg", f'<svg height="{h:.0f}px"', 1)

    return svg_text

def _svg_data_uri(svg_text: str) -> str:
    b = svg_text.encode("utf-8")
    return "data:image/svg+xml;base64," + base64.b64encode(b).decode("ascii")


# --------------------------------------------------------------------------
# SVG <path> parsing & filtering  (with DOM order preservation)
# --------------------------------------------------------------------------

_PATH_TAG_RE = re.compile(
    r"<path\b(?P<attrs>[^>]*?)\bd\s*=\s*([\"'])(?P<d>.+?)\2(?P<attrs2>[^>]*)>",
    re.IGNORECASE | re.DOTALL,
)

def _extract_attr(attrs_blob: str, name: str) -> str | None:
    m = re.search(r'\b' + re.escape(name) + r'\s*=\s*([\'"])(?P<v>.+?)\1', attrs_blob, re.IGNORECASE | re.DOTALL)
    return m.group("v").strip() if m else None

def _parse_inline_style(attrs_blob: str) -> dict:
    style = {}
    s = _extract_attr(attrs_blob, "style")
    if s:
        for decl in s.split(";"):
            if ":" in decl:
                k, v = decl.split(":", 1)
                style[k.strip().lower()] = v.strip()
    for k in ("fill", "stroke", "fill-rule", "stroke-width", "fill-opacity", "stroke-opacity"):
        v = _extract_attr(attrs_blob, k)
        if v is not None:
            style[k.lower()] = v.strip()
    return style

def _has_stroke_none(style: dict) -> bool:
    s = (style.get("stroke") or "").strip().lower()
    return (s == "" or s == "none")

def _has_non_none_fill(style: dict) -> bool:
    f = (style.get("fill") or "").strip().lower()
    return not (f == "" or f == "none")

def _is_white_fill(style: dict) -> bool:
    """Return True if fill color is white or near-white."""
    f = (style.get("fill") or "").strip().lower()
    if not f:
        return False
    if f in ("white", "#fff", "#ffffff"):
        return True
    if "rgb" in f:
        nums = re.findall(r"[\d.]+", f)
        if len(nums) >= 3:
            try:
                r, g, b = [float(n) for n in nums[:3]]
                # handle both rgb(255,255,255) and rgb(100%,100%,100%)
                if all(val >= 250 for val in (r, g, b)) or all(val >= 99 for val in (r, g, b)):
                    return True
            except:
                pass
    return False

def _approx_path_bbox(d: str) -> Tuple[float, float, float, float] | None:
    """Compute approximate bounding box from M/L/H/V/Z (good enough for rectangular shapes)."""
    if not isinstance(d, str) or not d.strip():
        return None
    tokens = re.findall(r"[A-Za-z]|-?\d*\.?\d+(?:e[-+]?\d+)?", d)
    if not tokens:
        return None

    xs, ys = [], []
    x = y = 0.0
    i = 0
    cmd = None

    def read_num():
        nonlocal i
        if i >= len(tokens):
            return None
        try:
            v = float(tokens[i]); i += 1; return v
        except:
            i += 1; return None

    while i < len(tokens):
        t = tokens[i]
        if re.match(r"[A-Za-z]", t):
            cmd = t; i += 1
        if cmd in ("M", "L"):
            x = read_num(); y = read_num()
            if x is None or y is None: break
            xs.append(x); ys.append(y)
            if cmd == "M": cmd = "L"
        elif cmd in ("m", "l"):
            dx = read_num(); dy = read_num()
            if dx is None or dy is None: break
            x += dx; y += dy
            xs.append(x); ys.append(y)
            if cmd == "m": cmd = "l"
        elif cmd in ("H", "h"):
            val = read_num()
            if val is None: break
            x = val if cmd == "H" else x + val
            xs.append(x); ys.append(y)
        elif cmd in ("V", "v"):
            val = read_num()
            if val is None: break
            y = val if cmd == "V" else y + val
            xs.append(x); ys.append(y)
        else:
            # absorb any remaining coordinates (approximate)
            while i < len(tokens) and not re.match(r"[A-Za-z]", tokens[i]):
                try:
                    v = float(tokens[i])
                    if len(xs) <= len(ys): xs.append(v)
                    else: ys.append(v)
                except:
                    pass
                i += 1
    if not xs or not ys:
        return None
    return (min(xs), min(ys), max(xs), max(ys))

def _extract_candidate_paths(svg_text: str) -> List[Tuple[int, str, str, Tuple[float, float, float, float]]]:
    """
    Return list of (order, d, style_str, bbox) for <path> elements that:
      - stroke is none/absent
      - fill is present and not none
      - fill is not (near-)white
    Preserves DOM order using enumerate over regex matches.
    """
    out = []
    for order, m in enumerate(_PATH_TAG_RE.finditer(svg_text)):
        attrs_blob = (m.group("attrs") or "") + " " + (m.group("attrs2") or "")
        d = m.group("d") or ""
        style = _parse_inline_style(attrs_blob)

        if not _has_stroke_none(style):
            continue
        if not _has_non_none_fill(style):
            continue
        if _is_white_fill(style):
            continue

        bbox = _approx_path_bbox(d)
        if not bbox:
            continue

        style_parts = []
        for k in ("stroke", "fill", "fill-rule", "fill-opacity"):
            if k in style:
                style_parts.append(f"{k}:{style[k]}")
        style_str = ";".join(style_parts) if style_parts else ""

        out.append((order, d, style_str, bbox))
    return out


# --------------------------------------------------------------------------
# Main vector extractor: parse pdf2svg outputs, keep DOM order for zOrder
# --------------------------------------------------------------------------
def _extract_vectors_with_pdf2svg(path: str) -> List[dict]:
    """
    Parse per-page SVGs produced by pdf2svg, find <path> elements that:
      - have fill != none,
      - stroke:none (or absent),
      - are NOT white-filled.
    Return them as image-like items (data:image/svg+xml;base64), with zOrder = DOM order.
    """
    import fitz  # PyMuPDF

    out: List[dict] = []
    exe = _get_pdf2svg_path()
    if not exe:
        return out

    doc = fitz.open(path)
    page_count = len(doc)
    if page_count == 0:
        doc.close()
        return out

    with tempfile.TemporaryDirectory(prefix="pdf2svg_") as tmpdir:
        svg_paths = _export_pages_to_svg_with_pdf2svg(path, tmpdir, page_count)

        for page_index in range(page_count):
            page = doc[page_index]
            page_w = float(page.rect.width)
            page_h = float(page.rect.height)

            svg_path = svg_paths[page_index] if page_index < len(svg_paths) else None
            if not svg_path or not os.path.exists(svg_path):
                continue

            svg_text = _read_text(svg_path)
            if not svg_text:
                continue

            candidates = _extract_candidate_paths(svg_text)
            if not candidates:
                continue

            for order, d, style_str, (x0, y0, x1, y1) in candidates:
                w = max(0.0, x1 - x0)
                h = max(0.0, y1 - y0)
                if w <= 0 or h <= 0:
                    continue

                style_attr = f' style="{style_str}"' if style_str else ""
                mini_svg = (
                    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0} {y0} {w} {h}">'
                    f'<path d="{d}"{style_attr} />'
                    f"</svg>"
                )
                data_uri = _svg_data_uri(mini_svg)

                out.append({
                    "data": data_uri,  # keep as "data" (frontend can map to ref if needed)
                    "xNorm": float(x0 / page_w if page_w else 0.0),
                    "yNormTop": float(y0 / page_h if page_h else 0.0),
                    "widthNorm": float(w / page_w if page_w else 0.0),
                    "heightNorm": float(h / page_h if page_h else 0.0),
                    "index": page_index,
                    "zOrder": int(order),  # DOM order = paint order
                })

    doc.close()
    return out

# ========= route =========

def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

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

    # 1) Preferred: embedded manifest.json (via pypdf)
    manifest = try_extract_manifest(saved_path)
    if manifest:
        payload = flatten_manifest_to_payload(manifest) or []
        # sort just in case we added zOrder above
        payload.sort(key=lambda it: (int(it.get("index", 0)), int(it.get("zOrder", 0))))
        if payload:
            return jsonify(payload), 200
        # else fall through to extractors

    # 2) Fallback: PyMuPDF-based extraction (text + raster images)
    try:
        pdf_data = _extract_with_pymupdf(saved_path)
    except Exception as e:
        return jsonify({"message": f"Extraction failed: {e}"}), 500

    # 3) Vector detection + export to SVG via pdf2svg (keeps DOM paint order)
    try:
        vector_items = _extract_vectors_with_pdf2svg(saved_path)
    except Exception:
        vector_items = []

    # Merge all items (frontend expects a flat list)
    payload = pdf_data + vector_items

    # ✅ Stable per-page paint order
    payload.sort(key=lambda it: (int(it.get("index", 0)), int(it.get("zOrder", 0))))

    return jsonify(payload), 200

if __name__ == "__main__":
    app.run(debug=True)
