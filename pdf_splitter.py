import pikepdf
import os
import tempfile
import zipfile
from pathlib import Path

class PDFSplitter:
    def __init__(self, input_path, password=None):
        self.input_path = input_path
        self.password = password
        self.temp_dir = tempfile.mkdtemp()
        
        try:
            if password:
                self.pdf = pikepdf.open(input_path, password=password)
            else:
                self.pdf = pikepdf.open(input_path)
        except pikepdf.PasswordError:
            raise ValueError("Invalid password for PDF")
        except Exception as e:
            raise ValueError(f"Could not open PDF: {str(e)}")
    
    def split_by_ranges(self, ranges_str, naming_template='{base}_part{index}'):
        """Split PDF by page ranges like '1-5,10-12,20-'"""
        if not ranges_str.strip():
            raise ValueError("No ranges specified")
            
        ranges = self._parse_ranges(ranges_str)
        output_files = []
        base_name = Path(self.input_path).stem
        
        for i, (start, end) in enumerate(ranges):
            output_filename = naming_template.format(
                base=base_name,
                index=i+1,
                range=f"{start}-{end}" if end != len(self.pdf.pages) else f"{start}-"
            )
            output_path = os.path.join(self.temp_dir, f"{output_filename}.pdf")
            
            with pikepdf.new() as new_pdf:
                for page_num in range(start-1, min(end, len(self.pdf.pages))):
                    new_pdf.pages.append(self.pdf.pages[page_num])
                new_pdf.save(output_path)
                output_files.append(output_path)
        
        return output_files
    
    def split_by_pages(self, pages_per_split=100, naming_template='{base}_part{index}'):
        """Split PDF every N pages (default 100)"""
        if pages_per_split <= 0:
            raise ValueError("Pages per split must be positive")
            
        output_files = []
        base_name = Path(self.input_path).stem
        total_pages = len(self.pdf.pages)
        
        for i in range(0, total_pages, pages_per_split):
            start_page = i + 1
            end_page = min(i + pages_per_split, total_pages)
            
            output_filename = naming_template.format(
                base=base_name,
                index=(i // pages_per_split) + 1,
                range=f"{start_page}-{end_page}"
            )
            output_path = os.path.join(self.temp_dir, f"{output_filename}.pdf")
            
            with pikepdf.new() as new_pdf:
                for page_num in range(i, end_page):
                    new_pdf.pages.append(self.pdf.pages[page_num])
                new_pdf.save(output_path)
                output_files.append(output_path)
        
        return output_files
    
    def split_by_size(self, max_size_mb=50, naming_template='{base}_part{index}'):
        """Split PDF by file size (default 50MB max per chunk)"""
        if max_size_mb <= 0:
            raise ValueError("Max size must be positive")
        
        output_files = []
        base_name = Path(self.input_path).stem
        total_pages = len(self.pdf.pages)
        max_size_bytes = max_size_mb * 1024 * 1024
        
        current_chunk = []
        current_size = 0
        chunk_index = 1
        
        for page_num in range(total_pages):
            # Create a temporary PDF with just this page to estimate size
            temp_path = os.path.join(self.temp_dir, f"temp_page_{page_num}.pdf")
            with pikepdf.new() as temp_pdf:
                temp_pdf.pages.append(self.pdf.pages[page_num])
                temp_pdf.save(temp_path)
                page_size = os.path.getsize(temp_path)
                os.remove(temp_path)
            
            # If adding this page would exceed the size limit, save current chunk
            if current_chunk and (current_size + page_size > max_size_bytes):
                self._save_chunk(current_chunk, chunk_index, base_name, naming_template, output_files)
                current_chunk = []
                current_size = 0
                chunk_index += 1
            
            current_chunk.append(page_num)
            current_size += page_size
        
        # Save the last chunk if it has pages
        if current_chunk:
            self._save_chunk(current_chunk, chunk_index, base_name, naming_template, output_files)
        
        return output_files
    
    def _save_chunk(self, page_numbers, chunk_index, base_name, naming_template, output_files):
        """Save a chunk of pages to a new PDF"""
        start_page = page_numbers[0] + 1
        end_page = page_numbers[-1] + 1
        
        output_filename = naming_template.format(
            base=base_name,
            index=chunk_index,
            range=f"{start_page}-{end_page}"
        )
        output_path = os.path.join(self.temp_dir, f"{output_filename}.pdf")
        
        with pikepdf.new() as new_pdf:
            for page_num in page_numbers:
                new_pdf.pages.append(self.pdf.pages[page_num])
            new_pdf.save(output_path)
            output_files.append(output_path)
    
    def create_zip(self, file_paths):
        """Create a ZIP file containing all split PDFs"""
        zip_path = os.path.join(self.temp_dir, "split_pdfs.zip")
        with zipfile.ZipFile(zip_path, 'w') as zip_file:
            for file_path in file_paths:
                zip_file.write(file_path, os.path.basename(file_path))
        return zip_path
    
    def _parse_ranges(self, ranges_str):
        """Parse range string like '1-5,10-12,20-' into list of (start, end) tuples"""
        ranges = []
        total_pages = len(self.pdf.pages)
        
        for range_part in ranges_str.split(','):
            range_part = range_part.strip()
            
            if '-' in range_part:
                parts = range_part.split('-', 1)
                start = int(parts[0]) if parts[0] else 1
                end = int(parts[1]) if parts[1] else total_pages
            else:
                start = end = int(range_part)
            
            if start < 1 or start > total_pages:
                raise ValueError(f"Invalid start page: {start}")
            if end < start:
                raise ValueError(f"End page {end} cannot be less than start page {start}")
                
            ranges.append((start, end))
        
        return ranges
    
    def __del__(self):
        if hasattr(self, 'pdf'):
            self.pdf.close()
        if hasattr(self, 'temp_dir') and os.path.exists(self.temp_dir):
            import shutil
            shutil.rmtree(self.temp_dir, ignore_errors=True)