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

def _int_color_to_hex(color_int: int) -> str:
    """
    Convert PyMuPDF integer color to hex string.
    PyMuPDF returns color as an integer (0xRRGGBB).
    """
    if color_int is None:
        return "#000000"
    # Ensure it's an integer
    try:
        c = int(color_int)
    except (TypeError, ValueError):
        return "#000000"
    # Extract RGB components
    r = (c >> 16) & 0xFF
    g = (c >> 8) & 0xFF
    b = c & 0xFF
    return f"#{r:02x}{g:02x}{b:02x}"

def _normalize_font_name(font_name: str) -> str:
    """
    Normalize PyMuPDF font name to a CSS-compatible font family.
    PyMuPDF returns names like 'BCDEEE+Arial-BoldMT' or 'TimesNewRomanPSMT'.

    IMPORTANT: We map ALL fonts to 'Lato' because:
    1. Lato is the ONLY font guaranteed to be loaded on the frontend
    2. Using different fonts would cause positioning mismatches since PDF metrics
       don't match browser fallback font metrics
    3. This ensures text positioning is consistent between canvas and PDF export

    The original font name is preserved in a comment for debugging purposes.
    """
    # Always return Lato - the only guaranteed font on frontend
    # This ensures positioning computed from PDF metrics matches actual rendering
    return "Lato"


# --------------------------------------------------------------------------
# Unified Content Stream Extraction
# Extracts text, images, and vectors in their true PDF paint order
# --------------------------------------------------------------------------

def _extract_unified_content_stream(path: str) -> Tuple[List[dict], dict]:
    """
    Extract all PDF content (text, images, vectors) in unified content stream order.
    This ensures elements are rendered in the exact order they appear in the PDF.

    Returns tuple: (items_list, page_dimensions)
    """
    import fitz  # PyMuPDF

    out: List[dict] = []
    page_dimensions = {"width": 595.0, "height": 842.0}  # Default A4

    try:
        doc = fitz.open(path)
    except Exception as e:
        print(f"[_extract_unified_content_stream] Failed to open PDF: {e}")
        return out, page_dimensions

    for page_index in range(len(doc)):
        page = doc[page_index]
        page_rect = page.rect
        page_w = float(page_rect.width)
        page_h = float(page_rect.height)
        page_origin_x = float(page_rect.x0)
        page_origin_y = float(page_rect.y0)

        if page_index == 0:
            page_dimensions = {"width": page_w, "height": page_h}

        # Collect all items with their approximate content stream order
        # We use a unified approach: trace through content and assign order
        page_items = []
        global_order = 0

        # --- STEP 1: Extract all drawings (vectors) with their order ---
        # PyMuPDF's get_drawings() returns paths in content stream order
        try:
            drawings = page.get_drawings()
            for draw_order, drawing in enumerate(drawings):
                rect = drawing.get("rect")
                if not rect:
                    continue

                fill_color = drawing.get("fill")
                stroke_color = drawing.get("color")
                stroke_width = drawing.get("width", 0)

                has_fill = fill_color is not None
                has_stroke = stroke_color is not None and stroke_width > 0

                if not has_fill and not has_stroke:
                    continue

                if has_fill and _is_white_color(fill_color) and not has_stroke:
                    continue

                x0 = float(rect.x0) - page_origin_x
                y0 = float(rect.y0) - page_origin_y
                x1 = float(rect.x1) - page_origin_x
                y1 = float(rect.y1) - page_origin_y
                w = x1 - x0
                h = y1 - y0

                if w < 1 or h < 1:
                    continue

                svg_path_data = _drawing_to_svg_path(drawing)
                if not svg_path_data:
                    continue

                # Build SVG
                style_parts = []
                fill_opacity = drawing.get("fill_opacity", 1)
                stroke_opacity = drawing.get("stroke_opacity", 1)

                if has_fill:
                    fill_hex = _color_to_hex(fill_color)
                    if fill_hex:
                        style_parts.append(f"fill:{fill_hex}")
                        if fill_opacity < 1:
                            style_parts.append(f"fill-opacity:{fill_opacity:.2f}")
                else:
                    style_parts.append("fill:none")

                if has_stroke:
                    stroke_hex = _color_to_hex(stroke_color)
                    if stroke_hex:
                        style_parts.append(f"stroke:{stroke_hex}")
                        style_parts.append(f"stroke-width:{stroke_width:.2f}")
                        if stroke_opacity < 1:
                            style_parts.append(f"stroke-opacity:{stroke_opacity:.2f}")
                else:
                    style_parts.append("stroke:none")

                if drawing.get("even_odd"):
                    style_parts.append("fill-rule:evenodd")

                style_str = ";".join(style_parts)
                view_x0 = float(rect.x0)
                view_y0 = float(rect.y0)

                mini_svg = (
                    f'<svg xmlns="http://www.w3.org/2000/svg" '
                    f'viewBox="{view_x0:.2f} {view_y0:.2f} {w:.2f} {h:.2f}" '
                    f'width="{w:.2f}" height="{h:.2f}">'
                    f'<path d="{svg_path_data}" style="{style_str}"/>'
                    f'</svg>'
                )
                data_uri = _svg_data_uri(mini_svg)

                page_items.append({
                    "_content_order": draw_order,  # Will be used for sorting
                    "_item_type": "vector",
                    "_y_pos": y0,  # For secondary sorting
                    "type": "vector",
                    "data": data_uri,
                    "xNorm": float(x0 / page_w if page_w else 0.0),
                    "yNormTop": float(y0 / page_h if page_h else 0.0),
                    "widthNorm": float(w / page_w if page_w else 0.0),
                    "heightNorm": float(h / page_h if page_h else 0.0),
                    "index": page_index,
                })
        except Exception as e:
            print(f"[_extract_unified] Error extracting drawings on page {page_index}: {e}")

        # --- STEP 2: Extract text with position info ---
        try:
            text_dict = page.get_text("dict")
            text_order = 0

            for blk in text_dict.get("blocks", []):
                if blk.get("type", 0) != 0:
                    continue

                for line in blk.get("lines", []):
                    spans = line.get("spans", [])
                    if not spans:
                        continue

                    line_bbox = line.get("bbox")
                    if not (isinstance(line_bbox, (list, tuple)) and len(line_bbox) == 4):
                        continue

                    line_x0, line_y0, line_x1, line_y1 = line_bbox
                    line_height = float(line_y1 - line_y0)
                    adjusted_line_y = line_y0 - page_origin_y
                    line_y_norm = adjusted_line_y / page_h if page_h else 0.0
                    line_height_norm = line_height / page_h if page_h else 0.0

                    # Group consecutive spans with same font
                    current_group = None

                    for span in spans:
                        span_text = span.get("text", "")
                        if not span_text:
                            continue

                        span_bbox = span.get("bbox")
                        if not (isinstance(span_bbox, (list, tuple)) and len(span_bbox) == 4):
                            continue

                        sx0, sy0, sx1, sy1 = span_bbox
                        span_height = float(sy1 - sy0)

                        # Font properties
                        ascender = span.get("ascender")
                        descender = span.get("descender")
                        nominal_size = span.get("size")

                        font_size = None
                        if ascender is not None and descender is not None and span_height > 0:
                            height_ratio = float(ascender) - float(descender)
                            if height_ratio > 0:
                                font_size = span_height / height_ratio
                        if font_size is None and isinstance(nominal_size, (int, float)):
                            font_size = float(nominal_size)

                        color = span.get("color")
                        font_color = _int_color_to_hex(color) if color is not None else "#000000"
                        font = span.get("font")
                        font_family = _normalize_font_name(font) if font else "sans-serif"

                        same_font = (
                            current_group is not None and
                            current_group["font_family"] == font_family and
                            abs((current_group["font_size"] or 0) - (font_size or 0)) < 0.5 and
                            current_group["font_color"] == font_color
                        )

                        if same_font:
                            current_group["text"] += span_text
                            current_group["x1"] = sx1
                        else:
                            if current_group and current_group["text"].strip():
                                adj_x0 = current_group["x0"] - page_origin_x
                                adj_x1 = current_group["x1"] - page_origin_x
                                x_norm = adj_x0 / page_w if page_w else 0.0
                                width_norm = (adj_x1 - adj_x0) / page_w if page_w else 0.0

                                text_item = {
                                    "_content_order": 1000000 + text_order,  # Text after vectors in base order
                                    "_item_type": "text",
                                    "_y_pos": adjusted_line_y,
                                    "type": "text",
                                    "text": current_group["text"].strip(),
                                    "xNorm": float(x_norm),
                                    "yNormTop": float(line_y_norm),
                                    "fontSize": float(current_group["font_size"]) if current_group["font_size"] else None,
                                    "fontFamily": current_group["font_family"],
                                    "index": page_index,
                                    "anchor": "top",
                                }
                                if current_group["font_color"] != "#000000":
                                    text_item["color"] = current_group["font_color"]

                                page_items.append(text_item)

                                # Also add textSpan
                                text_span = {
                                    "_content_order": 1000000 + text_order,
                                    "_item_type": "textSpan",
                                    "_y_pos": adjusted_line_y,
                                    "type": "textSpan",
                                    "text": current_group["text"].strip(),
                                    "xNorm": float(x_norm),
                                    "yNormTop": float(line_y_norm),
                                    "widthNorm": float(width_norm),
                                    "heightNorm": float(line_height_norm),
                                    "fontSize": float(current_group["font_size"]) if current_group["font_size"] else None,
                                    "fontFamily": current_group["font_family"],
                                    "index": page_index,
                                }
                                if current_group["font_color"] != "#000000":
                                    text_span["color"] = current_group["font_color"]
                                page_items.append(text_span)

                                text_order += 1

                            current_group = {
                                "text": span_text,
                                "font_size": font_size,
                                "font_family": font_family,
                                "font_color": font_color,
                                "x0": sx0,
                                "x1": sx1,
                            }

                    # Final group
                    if current_group and current_group["text"].strip():
                        adj_x0 = current_group["x0"] - page_origin_x
                        adj_x1 = current_group["x1"] - page_origin_x
                        x_norm = adj_x0 / page_w if page_w else 0.0
                        width_norm = (adj_x1 - adj_x0) / page_w if page_w else 0.0

                        text_item = {
                            "_content_order": 1000000 + text_order,
                            "_item_type": "text",
                            "_y_pos": adjusted_line_y,
                            "type": "text",
                            "text": current_group["text"].strip(),
                            "xNorm": float(x_norm),
                            "yNormTop": float(line_y_norm),
                            "fontSize": float(current_group["font_size"]) if current_group["font_size"] else None,
                            "fontFamily": current_group["font_family"],
                            "index": page_index,
                            "anchor": "top",
                        }
                        if current_group["font_color"] != "#000000":
                            text_item["color"] = current_group["font_color"]
                        page_items.append(text_item)

                        text_span = {
                            "_content_order": 1000000 + text_order,
                            "_item_type": "textSpan",
                            "_y_pos": adjusted_line_y,
                            "type": "textSpan",
                            "text": current_group["text"].strip(),
                            "xNorm": float(x_norm),
                            "yNormTop": float(line_y_norm),
                            "widthNorm": float(width_norm),
                            "heightNorm": float(line_height_norm),
                            "fontSize": float(current_group["font_size"]) if current_group["font_size"] else None,
                            "fontFamily": current_group["font_family"],
                            "index": page_index,
                        }
                        if current_group["font_color"] != "#000000":
                            text_span["color"] = current_group["font_color"]
                        page_items.append(text_span)
                        text_order += 1

        except Exception as e:
            print(f"[_extract_unified] Error extracting text on page {page_index}: {e}")

        # --- STEP 3: Extract images ---
        try:
            img_list = page.get_images(full=True)
            for img_order, img in enumerate(img_list):
                xref = img[0]
                try:
                    img_rects = page.get_image_rects(xref)
                    if not img_rects:
                        continue

                    base_img = doc.extract_image(xref)
                    if not base_img:
                        continue

                    img_bytes = base_img.get("image")
                    img_ext = base_img.get("ext", "png")
                    if not img_bytes:
                        continue

                    b64 = base64.b64encode(img_bytes).decode("utf-8")
                    mime = f"image/{img_ext}" if img_ext else "image/png"
                    data_uri = f"data:{mime};base64,{b64}"

                    for rect in img_rects:
                        x0 = float(rect.x0) - page_origin_x
                        y0 = float(rect.y0) - page_origin_y
                        w = float(rect.width)
                        h = float(rect.height)

                        if w < 1 or h < 1:
                            continue

                        page_items.append({
                            "_content_order": 500000 + img_order,  # Images between vectors and text
                            "_item_type": "image",
                            "_y_pos": y0,
                            "type": "image",
                            "data": data_uri,
                            "xNorm": float(x0 / page_w if page_w else 0.0),
                            "yNormTop": float(y0 / page_h if page_h else 0.0),
                            "widthNorm": float(w / page_w if page_w else 0.0),
                            "heightNorm": float(h / page_h if page_h else 0.0),
                            "pixelWidth": base_img.get("width"),
                            "pixelHeight": base_img.get("height"),
                            "index": page_index,
                        })
                except Exception as e:
                    print(f"[_extract_unified] Error processing image {xref}: {e}")
                    continue
        except Exception as e:
            print(f"[_extract_unified] Error extracting images on page {page_index}: {e}")

        # --- STEP 4: Try to determine true content stream order ---
        # Parse the actual content stream to get operation order
        try:
            content_order_map = _parse_content_stream_order(page, doc)
            if content_order_map:
                # Re-assign content order based on parsed stream
                for item in page_items:
                    item_type = item.get("_item_type")
                    y_pos = item.get("_y_pos", 0)
                    x_norm = item.get("xNorm", 0)

                    # Find matching operation in content stream
                    best_order = item.get("_content_order", 0)
                    best_distance = float('inf')

                    for op_order, op_type, op_y, op_x in content_order_map:
                        if op_type == item_type or (op_type == "path" and item_type == "vector"):
                            # Calculate distance
                            dist = abs(y_pos - op_y) + abs(x_norm * 100 - op_x * 100)
                            if dist < best_distance:
                                best_distance = dist
                                best_order = op_order

                    item["_content_order"] = best_order
        except Exception as e:
            print(f"[_extract_unified] Content stream parsing failed on page {page_index}: {e}")
            # Fall back to position-based ordering

        # --- STEP 5: Sort by content order and assign zIndex ---
        page_items.sort(key=lambda x: (x.get("_content_order", 0), x.get("_y_pos", 0)))

        for final_order, item in enumerate(page_items):
            # Remove internal keys
            item.pop("_content_order", None)
            item.pop("_item_type", None)
            item.pop("_y_pos", None)

            # Assign zIndex based on final order
            item["zIndex"] = final_order
            item["zOrder"] = final_order

            out.append(item)

    doc.close()
    return out, page_dimensions


def _parse_content_stream_order(page, doc) -> List[Tuple[int, str, float, float]]:
    """
    Parse PDF content stream to determine operation order.
    Returns list of (order, type, y_approx, x_approx) tuples.

    Types: "text", "image", "path"
    """
    import fitz

    results = []
    order = 0

    try:
        # Get content stream(s)
        xrefs = page.get_contents()
        if not xrefs:
            return results

        # Combine all content streams
        stream_bytes = b""
        for xref in xrefs:
            try:
                stream_bytes += doc.xref_stream(xref) or b""
            except:
                pass

        if not stream_bytes:
            return results

        # Decode stream
        try:
            stream_text = stream_bytes.decode("latin-1")
        except:
            stream_text = stream_bytes.decode("utf-8", errors="ignore")

        # Track graphics state for position estimation
        current_y = 0.0
        current_x = 0.0
        in_text_block = False

        # Simple operator parsing
        # This is a simplified parser - full PDF parsing is very complex
        lines = stream_text.split('\n')

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Text block markers
            if line == "BT":
                in_text_block = True
            elif line == "ET":
                in_text_block = False

            # Text positioning (Td, TD, Tm operators)
            if in_text_block:
                # Td operator: tx ty Td
                td_match = re.search(r'([-\d.]+)\s+([-\d.]+)\s+Td', line)
                if td_match:
                    try:
                        current_x = float(td_match.group(1))
                        current_y = float(td_match.group(2))
                    except:
                        pass

                # Tm operator: a b c d e f Tm (e=x, f=y)
                tm_match = re.search(r'([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+Tm', line)
                if tm_match:
                    try:
                        current_x = float(tm_match.group(5))
                        current_y = float(tm_match.group(6))
                    except:
                        pass

                # Text showing operators
                if any(op in line for op in ["Tj", "TJ", "'", '"']):
                    results.append((order, "text", current_y, current_x))
                    order += 1

            # Path operations (stroke/fill)
            if any(line.endswith(op) for op in [" S", " s", " f", " F", " f*", " B", " B*", " b", " b*"]):
                results.append((order, "path", current_y, current_x))
                order += 1

            # Image/XObject: /Name Do
            if " Do" in line:
                results.append((order, "image", current_y, current_x))
                order += 1

            # Track position from cm operator (transformation matrix)
            cm_match = re.search(r'([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+cm', line)
            if cm_match:
                try:
                    # e and f are translation components
                    current_x = float(cm_match.group(5))
                    current_y = float(cm_match.group(6))
                except:
                    pass

        return results

    except Exception as e:
        print(f"[_parse_content_stream_order] Error: {e}")
        return results


# --------------------------------------------------------------------------
# HTML-based Text Extraction for improved positioning accuracy
# --------------------------------------------------------------------------

def _extract_text_with_html_method(page, page_index: int, page_w: float, page_h: float,
                                    page_origin_x: float, page_origin_y: float,
                                    z_base_text: int) -> List[dict]:
    """
    Extract text using PyMuPDF's HTML output for more accurate positioning.

    The HTML output preserves exact visual positioning through CSS styles,
    which can be more accurate than the dict method for complex layouts.

    Returns list of text items with normalized coordinates.
    """
    import re
    from html.parser import HTMLParser
    from html import unescape

    out = []
    z_counter = 0

    try:
        # Get HTML output - this preserves exact visual positioning
        html_content = page.get_text("html")
    except Exception as e:
        print(f"[_extract_text_with_html_method] Failed to get HTML: {e}")
        return out

    # Parse CSS style values
    def parse_style(style_str: str) -> dict:
        """Parse CSS style string into dictionary."""
        styles = {}
        if not style_str:
            return styles
        for part in style_str.split(';'):
            if ':' in part:
                key, val = part.split(':', 1)
                styles[key.strip().lower()] = val.strip()
        return styles

    def parse_pt_value(val: str) -> float:
        """Parse a CSS pt/px value to float."""
        if not val:
            return 0.0
        val = val.strip().lower()
        # Remove unit suffix
        for suffix in ['pt', 'px', 'em', 'rem', '%']:
            if val.endswith(suffix):
                val = val[:-len(suffix)]
                break
        try:
            return float(val)
        except ValueError:
            return 0.0

    def parse_color(color_str: str) -> str:
        """Parse CSS color to hex."""
        if not color_str:
            return "#000000"
        color_str = color_str.strip().lower()

        # Already hex
        if color_str.startswith('#'):
            return color_str

        # RGB format: rgb(r, g, b)
        rgb_match = re.match(r'rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)', color_str)
        if rgb_match:
            r, g, b = int(rgb_match.group(1)), int(rgb_match.group(2)), int(rgb_match.group(3))
            return f"#{r:02x}{g:02x}{b:02x}"

        # Named colors
        named_colors = {
            'black': '#000000', 'white': '#ffffff', 'red': '#ff0000',
            'green': '#008000', 'blue': '#0000ff', 'yellow': '#ffff00',
        }
        return named_colors.get(color_str, "#000000")

    # Custom HTML parser to extract positioned text
    class TextExtractor(HTMLParser):
        def __init__(self):
            super().__init__()
            self.items = []
            self.current_p_style = {}
            self.current_span_style = {}
            self.in_span = False
            self.current_text = ""

        def handle_starttag(self, tag, attrs):
            attrs_dict = dict(attrs)
            style = parse_style(attrs_dict.get('style', ''))

            if tag == 'p':
                self.current_p_style = style
            elif tag == 'span':
                self.current_span_style = style
                self.in_span = True
                self.current_text = ""

        def handle_endtag(self, tag):
            if tag == 'span' and self.in_span:
                self.in_span = False
                text = self.current_text.strip()
                if text:
                    # Combine paragraph and span styles
                    combined_style = {**self.current_p_style, **self.current_span_style}

                    # Extract positioning - check both p and span for position
                    top = parse_pt_value(combined_style.get('top', '0'))
                    left = parse_pt_value(combined_style.get('left', '0'))

                    # Extract font properties
                    font_size = parse_pt_value(combined_style.get('font-size', '12'))
                    font_family = combined_style.get('font-family', 'sans-serif')
                    color = parse_color(combined_style.get('color', '#000000'))

                    # Clean font family (remove quotes)
                    font_family = font_family.strip('"\'')

                    self.items.append({
                        'text': text,
                        'top': top,
                        'left': left,
                        'font_size': font_size,
                        'font_family': font_family,
                        'color': color,
                    })
                self.current_text = ""
            elif tag == 'p':
                self.current_p_style = {}

        def handle_data(self, data):
            if self.in_span:
                self.current_text += data

    # Parse HTML
    parser = TextExtractor()
    try:
        parser.feed(html_content)
    except Exception as e:
        print(f"[_extract_text_with_html_method] HTML parsing error: {e}")
        return out

    # Convert parsed items to output format
    for item in parser.items:
        text = item['text']
        if not text:
            continue

        # Adjust for page origin and normalize
        adjusted_x = item['left'] - page_origin_x
        adjusted_y = item['top'] - page_origin_y

        x_norm = adjusted_x / page_w if page_w > 0 else 0.0
        y_norm = adjusted_y / page_h if page_h > 0 else 0.0

        # Ensure values are within valid range
        x_norm = max(0.0, min(1.0, x_norm))
        y_norm = max(0.0, min(1.0, y_norm))

        # Normalize font family
        font_family = _normalize_font_name(item['font_family'])

        text_item = {
            "type": "text",
            "text": text,
            "xNorm": float(x_norm),
            "yNormTop": float(y_norm),
            "fontSize": float(item['font_size']) if item['font_size'] else 12.0,
            "fontFamily": font_family,
            "index": page_index,
            "anchor": "top",
            "zOrder": int(z_base_text + z_counter),
        }

        if item['color'] != "#000000":
            text_item["color"] = item['color']

        out.append(text_item)
        z_counter += 1

        # Also create textSpan for annotations (estimate width/height)
        # Width estimation based on character count and font size
        char_width_factor = 0.5  # Average character width as fraction of font size
        estimated_width = len(text) * item['font_size'] * char_width_factor
        width_norm = estimated_width / page_w if page_w > 0 else 0.0
        height_norm = item['font_size'] * 1.2 / page_h if page_h > 0 else 0.0  # 1.2 for line height

        text_span_item = {
            "type": "textSpan",
            "text": text,
            "xNorm": float(x_norm),
            "yNormTop": float(y_norm),
            "widthNorm": float(width_norm),
            "heightNorm": float(height_norm),
            "fontSize": float(item['font_size']) if item['font_size'] else 12.0,
            "fontFamily": font_family,
            "index": page_index,
            "zOrder": int(z_base_text + 500000 + z_counter),
        }

        if item['color'] != "#000000":
            text_span_item["color"] = item['color']

        out.append(text_span_item)

    return out


def _extract_text_with_rawdict_method(page, page_index: int, page_w: float, page_h: float,
                                       page_origin_x: float, page_origin_y: float,
                                       z_base_text: int) -> List[dict]:
    """
    Extract text using PyMuPDF's rawdict output for character-level precision.

    The rawdict format includes character-level bounding boxes which allows
    for the most precise positioning possible.

    Returns list of text items with normalized coordinates.
    """
    out = []
    z_counter = 0
    z_counter_span = 0

    try:
        # Get rawdict output - includes character-level data
        raw_dict = page.get_text("rawdict")
    except Exception as e:
        print(f"[_extract_text_with_rawdict_method] Failed to get rawdict: {e}")
        return out

    for blk in raw_dict.get("blocks", []):
        if blk.get("type", 0) != 0:
            continue  # Only text blocks

        for line in blk.get("lines", []):
            # Get precise line bounding box
            line_bbox = line.get("bbox")
            if not (isinstance(line_bbox, (list, tuple)) and len(line_bbox) == 4):
                continue

            line_dir = line.get("dir", (1, 0))  # Text direction (for rotated text)

            spans = line.get("spans", [])
            if not spans:
                continue

            for span in spans:
                # Get span-level data
                span_bbox = span.get("bbox")
                if not (isinstance(span_bbox, (list, tuple)) and len(span_bbox) == 4):
                    continue

                sx0, sy0, sx1, sy1 = span_bbox

                # Get character-level data for precise positioning
                chars = span.get("chars", [])

                # If we have character data, use the first character's origin for precise positioning
                baseline_y = None  # Will store the exact baseline Y position
                if chars and len(chars) > 0:
                    first_char = chars[0]
                    # Use character origin point for most accurate positioning
                    char_origin = first_char.get("origin")
                    if char_origin and len(char_origin) == 2:
                        # Origin is the baseline position - this is the most accurate position
                        origin_x, origin_y = char_origin
                        baseline_y = origin_y  # Store baseline for direct use

                        # Use origin_x as left position
                        left_x = origin_x
                        # Use bbox top for top position (more reliable than calculating from ascender)
                        top_y = sy0
                    else:
                        # Fallback to bbox
                        left_x = sx0
                        top_y = sy0
                else:
                    # No character data, use span bbox
                    left_x = sx0
                    top_y = sy0

                # Build text from characters or use span text
                if chars:
                    text = "".join(c.get("c", "") for c in chars)
                else:
                    text = span.get("text", "")

                if not text or not text.strip():
                    continue

                # Get font properties
                font_size = span.get("size", 12)
                font = span.get("font", "")
                color = span.get("color")

                font_family = _normalize_font_name(font) if font else "sans-serif"
                font_color = _int_color_to_hex(color) if color is not None else "#000000"

                # Adjust for page origin and normalize
                adjusted_x = left_x - page_origin_x
                adjusted_y = top_y - page_origin_y

                x_norm = adjusted_x / page_w if page_w > 0 else 0.0
                y_norm = adjusted_y / page_h if page_h > 0 else 0.0

                # Calculate normalized baseline position (most accurate for rendering)
                y_norm_baseline = None
                if baseline_y is not None:
                    adjusted_baseline_y = baseline_y - page_origin_y
                    y_norm_baseline = adjusted_baseline_y / page_h if page_h > 0 else None

                # Calculate width from span bbox
                span_width = sx1 - sx0
                span_height = sy1 - sy0
                width_norm = span_width / page_w if page_w > 0 else 0.0
                height_norm = span_height / page_h if page_h > 0 else 0.0

                # Store ascender/descender for accurate frontend rendering
                ascender_val = span.get("ascender", 0.8)
                descender_val = span.get("descender", -0.2)

                text_item = {
                    "type": "text",
                    "text": text.strip(),
                    "xNorm": float(x_norm),
                    "yNormTop": float(y_norm),
                    "widthNorm": float(width_norm),      # PDF's exact text width
                    "heightNorm": float(height_norm),    # PDF's exact text height
                    "fontSize": float(font_size),
                    "fontFamily": font_family,
                    "ascender": float(ascender_val),     # For baseline calculation
                    "descender": float(descender_val),   # For baseline calculation
                    "index": page_index,
                    "anchor": "top",
                    "zOrder": int(z_base_text + z_counter),
                }

                # Add baseline position if available (for precise rendering)
                if y_norm_baseline is not None:
                    text_item["yNormBaseline"] = float(y_norm_baseline)

                if font_color != "#000000":
                    text_item["color"] = font_color

                out.append(text_item)
                z_counter += 1

                # Text span for annotations
                text_span_item = {
                    "type": "textSpan",
                    "text": text.strip(),
                    "xNorm": float(x_norm),
                    "yNormTop": float(y_norm),
                    "widthNorm": float(width_norm),
                    "heightNorm": float(height_norm),
                    "fontSize": float(font_size),
                    "fontFamily": font_family,
                    "index": page_index,
                    "zOrder": int(z_base_text + 500000 + z_counter_span),
                }

                if font_color != "#000000":
                    text_span_item["color"] = font_color

                out.append(text_span_item)
                z_counter_span += 1

    return out


def _extract_with_pymupdf(path):
    """
    Fallback extractor using PyMuPDF (fitz).
    Returns tuple: (items_list, page_dimensions)
      - items_list: flat list of {type:"text"|"image", xNorm, yNormTop, ...}
      - page_dimensions: {"width": float, "height": float} of first page (or default A4)
    """
    import fitz  # PyMuPDF

    out = []
    page_dimensions = {"width": 595.0, "height": 842.0}  # Default A4 dimensions
    doc = fitz.open(path)

    for page_index in range(len(doc)):
        page = doc[page_index]
        page_rect = page.rect
        page_w = float(page_rect.width)
        page_h = float(page_rect.height)

        # Get page origin offset (some PDFs have non-zero origin)
        page_origin_x = float(page_rect.x0)
        page_origin_y = float(page_rect.y0)

        # Capture dimensions from first page
        if page_index == 0:
            page_dimensions = {"width": page_w, "height": page_h}

        # zOrder bases to avoid collisions with pdf2svg DOM order
        Z_BASE_IMAGES = 1_000_000
        Z_BASE_TEXT   = 2_000_000
        z_counter_images = 0

        # ---------- TEXT (using rawdict for precise character-level positioning) ----------
        # The rawdict method provides character origin points for more accurate positioning
        text_items = _extract_text_with_rawdict_method(
            page, page_index, page_w, page_h,
            page_origin_x, page_origin_y, Z_BASE_TEXT
        )
        out.extend(text_items)

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
                img_x0, img_y0, img_x1, img_y1 = r
                # Adjust for page origin offset
                adjusted_img_x0 = img_x0 - page_origin_x
                adjusted_img_y0 = img_y0 - page_origin_y
                adjusted_img_x1 = img_x1 - page_origin_x
                adjusted_img_y1 = img_y1 - page_origin_y

                w = max(0.0, float(adjusted_img_x1 - adjusted_img_x0))
                h = max(0.0, float(adjusted_img_y1 - adjusted_img_y0))
                x_norm = adjusted_img_x0 / page_w if page_w else 0.0
                y_norm_top = adjusted_img_y0 / page_h if page_h else 0.0
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
    return out, page_dimensions

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
# Native PyMuPDF vector extraction using get_drawings()
# --------------------------------------------------------------------------

def _color_to_hex(color) -> Optional[str]:
    """Convert PyMuPDF color (tuple of 0-1 floats or int) to hex string."""
    if color is None:
        return None
    if isinstance(color, (int, float)):
        # Grayscale
        v = int(float(color) * 255)
        return f"#{v:02x}{v:02x}{v:02x}"
    if isinstance(color, (list, tuple)):
        if len(color) == 1:
            # Grayscale
            v = int(float(color[0]) * 255)
            return f"#{v:02x}{v:02x}{v:02x}"
        elif len(color) == 3:
            # RGB
            r = int(float(color[0]) * 255)
            g = int(float(color[1]) * 255)
            b = int(float(color[2]) * 255)
            return f"#{r:02x}{g:02x}{b:02x}"
        elif len(color) == 4:
            # CMYK - convert to RGB approximation
            c, m, y, k = [float(x) for x in color]
            r = int(255 * (1 - c) * (1 - k))
            g = int(255 * (1 - m) * (1 - k))
            b = int(255 * (1 - y) * (1 - k))
            return f"#{r:02x}{g:02x}{b:02x}"
    return None

def _is_white_color(color) -> bool:
    """Check if a color is white or near-white."""
    if color is None:
        return False
    hex_color = _color_to_hex(color)
    if not hex_color:
        return False
    hex_lower = hex_color.lower()
    # Check for white and near-white colors
    if hex_lower in ("#fff", "#ffffff", "#fefefe", "#fdfdfd", "#fcfcfc"):
        return True
    # Parse RGB and check if all components are >= 250
    if len(hex_lower) == 7:
        try:
            r = int(hex_lower[1:3], 16)
            g = int(hex_lower[3:5], 16)
            b = int(hex_lower[5:7], 16)
            if r >= 250 and g >= 250 and b >= 250:
                return True
        except:
            pass
    return False

def _drawing_to_svg_path(drawing: dict) -> Optional[str]:
    """
    Convert PyMuPDF drawing items to SVG path data string.

    Drawing items can be:
    - ("l", p1, p2): line from p1 to p2
    - ("re", rect): rectangle
    - ("qu", quad): quadrilateral
    - ("c", p1, p2, p3, p4): cubic bezier curve
    - ("m", point): move to
    """
    items = drawing.get("items", [])
    if not items:
        return None

    path_data = []
    current_pos = None

    for item in items:
        if not item or len(item) < 2:
            continue

        cmd = item[0]

        if cmd == "m":
            # Move to
            p = item[1]
            path_data.append(f"M {p.x:.2f} {p.y:.2f}")
            current_pos = p

        elif cmd == "l":
            # Line from p1 to p2
            p1, p2 = item[1], item[2]
            if current_pos is None or (current_pos.x != p1.x or current_pos.y != p1.y):
                path_data.append(f"M {p1.x:.2f} {p1.y:.2f}")
            path_data.append(f"L {p2.x:.2f} {p2.y:.2f}")
            current_pos = p2

        elif cmd == "re":
            # Rectangle
            rect = item[1]
            x, y, w, h = rect.x0, rect.y0, rect.width, rect.height
            path_data.append(f"M {x:.2f} {y:.2f}")
            path_data.append(f"L {x + w:.2f} {y:.2f}")
            path_data.append(f"L {x + w:.2f} {y + h:.2f}")
            path_data.append(f"L {x:.2f} {y + h:.2f}")
            path_data.append("Z")
            current_pos = None

        elif cmd == "qu":
            # Quadrilateral (4 points)
            quad = item[1]
            # quad has ul, ur, lr, ll (upper-left, upper-right, lower-right, lower-left)
            path_data.append(f"M {quad.ul.x:.2f} {quad.ul.y:.2f}")
            path_data.append(f"L {quad.ur.x:.2f} {quad.ur.y:.2f}")
            path_data.append(f"L {quad.lr.x:.2f} {quad.lr.y:.2f}")
            path_data.append(f"L {quad.ll.x:.2f} {quad.ll.y:.2f}")
            path_data.append("Z")
            current_pos = None

        elif cmd == "c":
            # Cubic bezier: p1=start, p2=control1, p3=control2, p4=end
            p1, p2, p3, p4 = item[1], item[2], item[3], item[4]
            if current_pos is None or (current_pos.x != p1.x or current_pos.y != p1.y):
                path_data.append(f"M {p1.x:.2f} {p1.y:.2f}")
            path_data.append(f"C {p2.x:.2f} {p2.y:.2f} {p3.x:.2f} {p3.y:.2f} {p4.x:.2f} {p4.y:.2f}")
            current_pos = p4

    # Close path if needed
    if drawing.get("closePath") and path_data:
        path_data.append("Z")

    return " ".join(path_data) if path_data else None


def _is_stroke_only_drawing(drawing: dict) -> bool:
    """
    Determine if a drawing should be rendered as stroke-only (no fill).

    This is a CONSERVATIVE check - only returns True when we're confident
    the drawing is meant to be a stroke without fill (like table borders).

    Returns True only if:
    - Fill opacity is explicitly 0
    - OR fill color is None AND there's no closePath
    """
    # Check if fill opacity is explicitly 0
    fill_opacity = drawing.get("fill_opacity", 1)
    if fill_opacity == 0:
        return True

    # If there's an explicit fill color, respect it
    fill_color = drawing.get("fill")
    if fill_color is not None:
        return False

    # No fill color specified - check if it's an open path (stroke only)
    # Only treat as stroke-only if path is explicitly not closed AND no fill
    if not drawing.get("closePath", False) and fill_color is None:
        # But rectangles and quads are always closed shapes
        items = drawing.get("items", [])
        has_closed_shape = any(
            item and item[0] in ("re", "qu")
            for item in items
        )
        if not has_closed_shape:
            return True

    return False


def _split_drawing_into_elements(drawing: dict) -> List[dict]:
    """
    Split a compound drawing into individual elements.
    Each line, rectangle, or curve becomes its own element.

    Returns list of mini-drawings, each with a single element.
    """
    items = drawing.get("items", [])
    if not items:
        return []

    # Common properties to inherit
    fill_color = drawing.get("fill")
    stroke_color = drawing.get("color")
    stroke_width = drawing.get("width", 0)
    fill_opacity = drawing.get("fill_opacity", 1)
    stroke_opacity = drawing.get("stroke_opacity", 1)

    elements = []
    current_element_items = []
    current_start = None

    for item in items:
        if not item or len(item) < 2:
            continue

        cmd = item[0]

        if cmd == "m":
            # Start of new sub-path - save previous if exists
            if current_element_items:
                elements.append({
                    "items": current_element_items,
                    "fill": fill_color,
                    "color": stroke_color,
                    "width": stroke_width,
                    "fill_opacity": fill_opacity,
                    "stroke_opacity": stroke_opacity,
                    "closePath": False,
                })
            current_element_items = [item]
            current_start = item[1]

        elif cmd == "re":
            # Rectangle is a complete element by itself
            if current_element_items and current_element_items[0][0] != "re":
                elements.append({
                    "items": current_element_items,
                    "fill": fill_color,
                    "color": stroke_color,
                    "width": stroke_width,
                    "fill_opacity": fill_opacity,
                    "stroke_opacity": stroke_opacity,
                    "closePath": False,
                })
                current_element_items = []

            elements.append({
                "items": [item],
                "fill": fill_color,
                "color": stroke_color,
                "width": stroke_width,
                "fill_opacity": fill_opacity,
                "stroke_opacity": stroke_opacity,
                "closePath": True,  # Rectangles are always closed
                "rect": item[1],  # Store the rect for bbox calculation
            })
            current_element_items = []
            current_start = None

        elif cmd == "qu":
            # Quadrilateral is a complete element by itself
            if current_element_items:
                elements.append({
                    "items": current_element_items,
                    "fill": fill_color,
                    "color": stroke_color,
                    "width": stroke_width,
                    "fill_opacity": fill_opacity,
                    "stroke_opacity": stroke_opacity,
                    "closePath": False,
                })
                current_element_items = []

            quad = item[1]
            elements.append({
                "items": [item],
                "fill": fill_color,
                "color": stroke_color,
                "width": stroke_width,
                "fill_opacity": fill_opacity,
                "stroke_opacity": stroke_opacity,
                "closePath": True,  # Quads are always closed
            })
            current_start = None

        elif cmd == "l":
            # Line - add to current element
            current_element_items.append(item)

        elif cmd == "c":
            # Curve - add to current element
            current_element_items.append(item)

    # Save final element
    if current_element_items:
        elements.append({
            "items": current_element_items,
            "fill": fill_color,
            "color": stroke_color,
            "width": stroke_width,
            "fill_opacity": fill_opacity,
            "stroke_opacity": stroke_opacity,
            "closePath": drawing.get("closePath", False),
        })

    return elements


def _calculate_element_rect(element: dict):
    """Calculate bounding rectangle for a drawing element."""
    import fitz

    items = element.get("items", [])
    if not items:
        return None

    # Check if rect is already stored (for rectangles)
    if "rect" in element:
        return element["rect"]

    xs = []
    ys = []

    for item in items:
        if not item or len(item) < 2:
            continue

        cmd = item[0]

        if cmd == "m":
            p = item[1]
            xs.append(p.x)
            ys.append(p.y)
        elif cmd == "l":
            p1, p2 = item[1], item[2]
            xs.extend([p1.x, p2.x])
            ys.extend([p1.y, p2.y])
        elif cmd == "re":
            rect = item[1]
            xs.extend([rect.x0, rect.x1])
            ys.extend([rect.y0, rect.y1])
        elif cmd == "qu":
            quad = item[1]
            xs.extend([quad.ul.x, quad.ur.x, quad.lr.x, quad.ll.x])
            ys.extend([quad.ul.y, quad.ur.y, quad.lr.y, quad.ll.y])
        elif cmd == "c":
            p1, p2, p3, p4 = item[1], item[2], item[3], item[4]
            xs.extend([p1.x, p2.x, p3.x, p4.x])
            ys.extend([p1.y, p2.y, p3.y, p4.y])

    if not xs or not ys:
        return None

    return fitz.Rect(min(xs), min(ys), max(xs), max(ys))

def _extract_vectors_with_pymupdf(path: str) -> List[dict]:
    """
    Extract vector graphics using native PyMuPDF get_drawings() method.

    Returns list of items with SVG data URIs for each vector path.
    - Splits compound paths into individual elements
    - Correctly handles stroke-only paths (no fill)
    - Filters out white-filled shapes and very small shapes
    """
    import fitz  # PyMuPDF

    out: List[dict] = []
    Z_BASE_VECTORS = 500_000  # Base z-order for vectors

    try:
        doc = fitz.open(path)
    except Exception as e:
        print(f"[_extract_vectors_with_pymupdf] Failed to open PDF: {e}")
        return out

    for page_index in range(len(doc)):
        page = doc[page_index]
        page_rect = page.rect
        page_w = float(page_rect.width)
        page_h = float(page_rect.height)
        page_origin_x = float(page_rect.x0)
        page_origin_y = float(page_rect.y0)

        try:
            drawings = page.get_drawings()
        except Exception as e:
            print(f"[_extract_vectors_with_pymupdf] get_drawings failed on page {page_index}: {e}")
            continue

        element_order = 0

        for drawing in drawings:
            # Use the original drawing directly (don't split)
            rect = drawing.get("rect")
            if not rect:
                continue

            # Get colors from drawing
            fill_color = drawing.get("fill")
            stroke_color = drawing.get("color")
            stroke_width = drawing.get("width", 0)
            fill_opacity = drawing.get("fill_opacity", 1)
            stroke_opacity = drawing.get("stroke_opacity", 1)

            # Determine if this should be stroke-only
            is_stroke_only = _is_stroke_only_drawing(drawing)

            # Determine actual fill/stroke status
            has_stroke = stroke_color is not None and stroke_width > 0

            # For stroke-only paths, ignore the fill color
            if is_stroke_only:
                has_fill = False
            else:
                has_fill = fill_color is not None

            # Skip if no fill and no stroke
            if not has_fill and not has_stroke:
                # If it has items but no color info, try to render with default stroke
                if drawing.get("items"):
                    has_stroke = True
                    stroke_color = (0, 0, 0)  # Default black stroke
                    stroke_width = 1.0
                else:
                    continue

            # Skip white-filled shapes without visible stroke
            if has_fill and _is_white_color(fill_color) and not has_stroke:
                continue

            # Calculate dimensions
            x0 = float(rect.x0) - page_origin_x
            y0 = float(rect.y0) - page_origin_y
            x1 = float(rect.x1) - page_origin_x
            y1 = float(rect.y1) - page_origin_y
            w = x1 - x0
            h = y1 - y0

            # Skip very small shapes (likely artifacts)
            # But allow thin lines (small width OR small height)
            if w < 0.5 and h < 0.5:
                continue

            # Convert drawing to SVG path
            svg_path_data = _drawing_to_svg_path(drawing)
            if not svg_path_data:
                continue

            # Build SVG style - be explicit about fill:none for stroke-only paths
            style_parts = []

            if has_fill and not is_stroke_only:
                fill_hex = _color_to_hex(fill_color)
                if fill_hex:
                    style_parts.append(f"fill:{fill_hex}")
                    if fill_opacity < 1:
                        style_parts.append(f"fill-opacity:{fill_opacity:.2f}")
                else:
                    style_parts.append("fill:none")
            else:
                # Explicitly set fill:none for stroke-only paths
                style_parts.append("fill:none")

            if has_stroke:
                stroke_hex = _color_to_hex(stroke_color)
                if stroke_hex:
                    style_parts.append(f"stroke:{stroke_hex}")
                    style_parts.append(f"stroke-width:{stroke_width:.2f}")
                    if stroke_opacity < 1:
                        style_parts.append(f"stroke-opacity:{stroke_opacity:.2f}")
                    # Add stroke linecap and linejoin for better line rendering
                    style_parts.append("stroke-linecap:square")
                    style_parts.append("stroke-linejoin:miter")
            else:
                style_parts.append("stroke:none")

            # Handle fill rule
            if drawing.get("even_odd"):
                style_parts.append("fill-rule:evenodd")

            style_str = ";".join(style_parts)

            # Create mini SVG with viewBox matching the original coordinates
            view_x0 = float(rect.x0)
            view_y0 = float(rect.y0)

            # Add padding to viewBox for strokes that might extend beyond bbox
            padding = stroke_width / 2 if has_stroke else 0
            view_w = max(w, 1)
            view_h = max(h, 1)

            mini_svg = (
                f'<svg xmlns="http://www.w3.org/2000/svg" '
                f'viewBox="{view_x0 - padding:.2f} {view_y0 - padding:.2f} {view_w + padding * 2:.2f} {view_h + padding * 2:.2f}" '
                f'width="{view_w + padding * 2:.2f}" height="{view_h + padding * 2:.2f}" '
                f'overflow="visible">'
                f'<path d="{svg_path_data}" style="{style_str}"/>'
                f'</svg>'
            )

            data_uri = _svg_data_uri(mini_svg)

            # Calculate zIndex that preserves paint order
            vector_z_index = -99 + (element_order / 1000.0)
            vector_z_index = min(vector_z_index, -50)

            out.append({
                "type": "vector",
                "data": data_uri,
                "xNorm": float((x0 - padding) / page_w if page_w else 0.0),
                "yNormTop": float((y0 - padding) / page_h if page_h else 0.0),
                "widthNorm": float((view_w + padding * 2) / page_w if page_w else 0.0),
                "heightNorm": float((view_h + padding * 2) / page_h if page_h else 0.0),
                "index": page_index,
                "zOrder": int(Z_BASE_VECTORS + element_order),
                "zIndex": float(vector_z_index),
            })

            element_order += 1

    doc.close()
    return out


# --------------------------------------------------------------------------
# Legacy pdf2svg extractor (kept for reference, but not used)
# --------------------------------------------------------------------------
def _extract_vectors_with_pdf2svg(path: str) -> List[dict]:
    """
    LEGACY: Parse per-page SVGs produced by pdf2svg.
    This function is kept for backwards compatibility but _extract_vectors_with_pymupdf is preferred.
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
            page_rect = page.rect
            page_w = float(page_rect.width)
            page_h = float(page_rect.height)
            # Get page origin offset (for PDFs with non-zero origin)
            page_origin_x = float(page_rect.x0)
            page_origin_y = float(page_rect.y0)

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
                # Adjust for page origin offset
                adjusted_x0 = x0 - page_origin_x
                adjusted_y0 = y0 - page_origin_y
                adjusted_x1 = x1 - page_origin_x
                adjusted_y1 = y1 - page_origin_y

                w = max(0.0, adjusted_x1 - adjusted_x0)
                h = max(0.0, adjusted_y1 - adjusted_y0)
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
                    "xNorm": float(adjusted_x0 / page_w if page_w else 0.0),
                    "yNormTop": float(adjusted_y0 / page_h if page_h else 0.0),
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

    # Default page dimensions (A4)
    page_dimensions = {"width": 595.0, "height": 842.0}

    # 1) Preferred: embedded manifest.json (via pypdf)
    manifest = try_extract_manifest(saved_path)
    if manifest:
        payload = flatten_manifest_to_payload(manifest) or []
        # sort just in case we added zOrder above
        payload.sort(key=lambda it: (int(it.get("index", 0)), int(it.get("zOrder", 0))))
        if payload:
            # Try to get page dimensions from manifest or extract from PDF
            if manifest.get("pageDimensions"):
                page_dimensions = manifest["pageDimensions"]
            else:
                # Extract dimensions from PDF even if manifest exists
                try:
                    import fitz
                    doc = fitz.open(saved_path)
                    if len(doc) > 0:
                        first_page = doc[0]
                        page_dimensions = {
                            "width": float(first_page.rect.width),
                            "height": float(first_page.rect.height)
                        }
                    doc.close()
                except Exception:
                    pass

            return jsonify({
                "items": payload,
                "pageDimensions": page_dimensions
            }), 200
        # else fall through to extractors

    # 2) Fallback: PyMuPDF-based extraction (text + raster images)
    try:
        pdf_data, page_dimensions = _extract_with_pymupdf(saved_path)
    except Exception as e:
        return jsonify({"message": f"Extraction failed: {e}"}), 500

    # 3) Vector extraction using native PyMuPDF get_drawings()
    try:
        vector_items = _extract_vectors_with_pymupdf(saved_path)
    except Exception as e:
        print(f"[upload_pdf] Vector extraction failed: {e}")
        vector_items = []

    # Merge all items (frontend expects a flat list)
    payload = pdf_data + vector_items

    # ✅ Stable per-page paint order
    payload.sort(key=lambda it: (int(it.get("index", 0)), float(it.get("zOrder", 0))))

    return jsonify({
        "items": payload,
        "pageDimensions": page_dimensions
    }), 200

if __name__ == "__main__":
    app.run(debug=True)
