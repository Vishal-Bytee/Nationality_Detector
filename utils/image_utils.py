import imghdr
from PIL import Image
import io


MAX_SIZE_MB = 10
MIN_DIM = 50
MAX_DIM = 8000
ALLOWED_TYPES = {'jpeg', 'jpg', 'png', 'webp', 'bmp'}


def validate_image(file_storage) -> tuple:

    file_storage.seek(0)
    raw = file_storage.read()
    file_storage.seek(0)

    # ── Size check ──
    size_mb = len(raw) / (1024 * 1024)
    if size_mb > MAX_SIZE_MB:
        return False, f' File too large ({size_mb:.1f} MB). Max allowed: {MAX_SIZE_MB} MB.'

    detected = imghdr.what(None, h=raw)
    if detected not in ALLOWED_TYPES and detected != 'jpeg':
        return False, f' Unsupported image format: {detected}. Use JPG, PNG, WEBP, or BMP.'

    try:
        img = Image.open(io.BytesIO(raw))
        w, h = img.size
        if w < MIN_DIM or h < MIN_DIM:
            return False, f' Image too small ({w}x{h}px). Minimum: {MIN_DIM}x{MIN_DIM}px.'
        if w > MAX_DIM or h > MAX_DIM:
            return False, f' Image too large ({w}x{h}px). Maximum: {MAX_DIM}x{MAX_DIM}px.'
    except Exception:
        return False, 'Could not open image. File may be corrupted.'

    return True, None
