import os
from string import Formatter

ALLOWED_TEMPLATE_FIELDS = {"base", "index", "range"}
ALLOWED_PDF_PREFIX_BYTES = b"\x00\t\n\f\r "
PDF_HEADER_READ_BYTES = 1024

def validate_file_size(file_path, max_size_mb=200):
    """Validate file size is within limits"""
    file_size = os.path.getsize(file_path)
    max_size_bytes = max_size_mb * 1024 * 1024
    
    if file_size > max_size_bytes:
        raise ValueError(f"File size ({file_size / 1024 / 1024:.1f} MB) exceeds limit of {max_size_mb} MB")
    
    return True

def generate_filename(template, base_name, index, **kwargs):
    """Generate filename from template"""
    return template.format(
        base=base_name,
        index=index,
    )

def validate_naming_template(template):
    """Allow only safe naming template placeholders and deny path characters."""
    template = (template or "").strip()
    if not template:
        return "{base}_part{index}"

    if len(template) > 120:
        raise ValueError("Naming template is too long")

    if "/" in template or "\\" in template or ".." in template:
        raise ValueError("Naming template cannot contain path separators")

    for _, field_name, _, _ in Formatter().parse(template):
        if field_name and field_name not in ALLOWED_TEMPLATE_FIELDS:
            raise ValueError(
                "Naming template can only use {base}, {index}, and {range}"
            )

    return template

def validate_pdf_header(file_stream):
    """
    Validate that the file has a proper PDF header (Magic Number).
    Reads the first 1024 bytes (sufficient for standard and some non-standard PDFs).
    """
    try:
        header = file_stream.read(PDF_HEADER_READ_BYTES)
        file_stream.seek(0)  # Reset stream position
        marker_index = header.find(b"%PDF-")
        if marker_index < 0:
            return False

        # Allow only whitespace/null bytes before header to reject common polyglots.
        prefix = header[:marker_index]
        return all(byte in ALLOWED_PDF_PREFIX_BYTES for byte in prefix)
    except Exception:
        return False
