import os

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
        **kwargs
    )