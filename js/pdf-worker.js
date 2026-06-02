/**
 * PDF Splitter Web Worker
 * Processes PDF splitting in a background thread to keep the UI responsive.
 * Uses pdf-lib for PDF manipulation and JSZip for multi-file output.
 */

importScripts('vendor/pdf-lib.min.js', 'vendor/jszip.min.js');

const { PDFDocument } = PDFLib;

// ── Helpers ──────────────────────────────────────────────────────────────────

function reportProgress(percent, message) {
  self.postMessage({ type: 'progress', percent, message });
}

function formatName(template, baseName, index, range) {
  const formatted = template
    .replace(/\{base\}/g, baseName)
    .replace(/\{index\}/g, String(index))
    .replace(/\{range\}/g, range);
  const safeName = sanitizeFilePart(formatted) || `part_${index}`;
  return safeName.slice(0, 100);
}

function sanitizeFilePart(value) {
  return String(value || '')
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/[\\/]/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/[^A-Za-z0-9._() -]/g, '_')
    .replace(/^\.+/, '')
    .trim();
}

function parseRanges(rangesStr, totalPages) {
  if (!rangesStr.trim()) throw new Error('No ranges specified');
  const ranges = [];

  for (const part of rangesStr.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-', 2);
      const start = startStr.trim() ? parseInt(startStr.trim(), 10) : 1;
      const end = endStr.trim() ? parseInt(endStr.trim(), 10) : totalPages;

      if (isNaN(start) || isNaN(end)) throw new Error(`Invalid range: "${trimmed}"`);
      if (start < 1 || start > totalPages) throw new Error(`Invalid start page: ${start}`);
      if (end < start) throw new Error(`End page ${end} cannot be less than start page ${start}`);
      if (end > totalPages) throw new Error(`End page ${end} exceeds total pages (${totalPages})`);

      ranges.push([start, Math.min(end, totalPages)]);
    } else {
      const page = parseInt(trimmed, 10);
      if (isNaN(page)) throw new Error(`Invalid page number: "${trimmed}"`);
      if (page < 1 || page > totalPages) throw new Error(`Page ${page} is out of range (1-${totalPages})`);
      ranges.push([page, page]);
    }
  }

  if (ranges.length === 0) throw new Error('No valid ranges specified');
  return ranges;
}

// ── Split by Pages ───────────────────────────────────────────────────────────

async function splitByPages(pdfDoc, pagesPerSplit, namingTemplate, baseName) {
  if (pagesPerSplit <= 0) throw new Error('Pages per split must be positive');

  const totalPages = pdfDoc.getPageCount();
  const results = [];
  const totalChunks = Math.ceil(totalPages / pagesPerSplit);

  for (let i = 0; i < totalPages; i += pagesPerSplit) {
    const chunkIndex = Math.floor(i / pagesPerSplit) + 1;
    const endPage = Math.min(i + pagesPerSplit, totalPages);
    const pageIndices = [];
    for (let j = i; j < endPage; j++) pageIndices.push(j);

    reportProgress(
      15 + (chunkIndex / totalChunks) * 70,
      `Creating part ${chunkIndex} of ${totalChunks}...`
    );

    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
    copiedPages.forEach(page => newPdf.addPage(page));

    const bytes = await newPdf.save();
    const startPage = i + 1;
    const rangeLabel = `${startPage}-${endPage}`;
    const filename = formatName(namingTemplate, baseName, chunkIndex, rangeLabel) + '.pdf';
    results.push({ bytes, filename });
  }

  return results;
}

// ── Split by Ranges ──────────────────────────────────────────────────────────

async function splitByRanges(pdfDoc, rangesStr, namingTemplate, baseName) {
  const totalPages = pdfDoc.getPageCount();
  const ranges = parseRanges(rangesStr, totalPages);
  const results = [];

  for (let i = 0; i < ranges.length; i++) {
    const [start, end] = ranges[i];
    reportProgress(
      15 + ((i + 1) / ranges.length) * 70,
      `Extracting range ${start}-${end}...`
    );

    const pageIndices = [];
    for (let j = start - 1; j < Math.min(end, totalPages); j++) pageIndices.push(j);

    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
    copiedPages.forEach(page => newPdf.addPage(page));

    const bytes = await newPdf.save();
    const rangeLabel = end === totalPages ? `${start}-` : `${start}-${end}`;
    const filename = formatName(namingTemplate, baseName, i + 1, rangeLabel) + '.pdf';
    results.push({ bytes, filename });
  }

  return results;
}

// ── Split by Size ────────────────────────────────────────────────────────────

async function splitBySize(pdfDoc, maxSizeMB, namingTemplate, baseName) {
  if (maxSizeMB <= 0) throw new Error('Max size must be positive');

  const totalPages = pdfDoc.getPageCount();
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  const results = [];

  // Phase 1: Estimate per-page sizes
  reportProgress(15, 'Estimating page sizes...');
  const pageSizes = [];

  for (let i = 0; i < totalPages; i++) {
    if (i % 10 === 0) {
      reportProgress(
        15 + (i / totalPages) * 35,
        `Analyzing page ${i + 1} of ${totalPages}...`
      );
    }

    const tempPdf = await PDFDocument.create();
    const [page] = await tempPdf.copyPages(pdfDoc, [i]);
    tempPdf.addPage(page);
    const bytes = await tempPdf.save();
    pageSizes.push(bytes.byteLength);
  }

  // Phase 2: Group pages greedily using estimated sizes with safety factor
  reportProgress(50, 'Grouping pages into chunks...');
  const SAFETY_FACTOR = 0.85;
  let currentStart = 0;
  let chunkIndex = 1;

  while (currentStart < totalPages) {
    let estimatedSize = 0;
    let endPage = currentStart;

    // Greedily add pages until estimated size exceeds limit
    while (endPage < totalPages) {
      const adjustedPageSize = pageSizes[endPage] * SAFETY_FACTOR;
      if (estimatedSize + adjustedPageSize > maxSizeBytes && endPage > currentStart) {
        break;
      }
      estimatedSize += adjustedPageSize;
      endPage++;
    }

    // Ensure at least one page per chunk
    if (endPage === currentStart) endPage = currentStart + 1;

    reportProgress(
      50 + (endPage / totalPages) * 35,
      `Creating chunk ${chunkIndex}...`
    );

    // Build and verify actual size
    const chunkPdf = await PDFDocument.create();
    const indices = [];
    for (let j = currentStart; j < endPage; j++) indices.push(j);
    const copiedPages = await chunkPdf.copyPages(pdfDoc, indices);
    copiedPages.forEach(p => chunkPdf.addPage(p));
    let bytes = await chunkPdf.save();

    // If actual size exceeds limit, trim pages one at a time
    while (bytes.byteLength > maxSizeBytes && endPage > currentStart + 1) {
      endPage--;
      const retryPdf = await PDFDocument.create();
      const retryIndices = [];
      for (let j = currentStart; j < endPage; j++) retryIndices.push(j);
      const retryPages = await retryPdf.copyPages(pdfDoc, retryIndices);
      retryPages.forEach(p => retryPdf.addPage(p));
      bytes = await retryPdf.save();
    }

    const startPage = currentStart + 1;
    const rangeLabel = `${startPage}-${endPage}`;
    const filename = formatName(namingTemplate, baseName, chunkIndex, rangeLabel) + '.pdf';
    results.push({ bytes, filename });

    currentStart = endPage;
    chunkIndex++;
  }

  return results;
}

// ── Main Message Handler ─────────────────────────────────────────────────────

self.onmessage = async function (e) {
  const { action, pdfBytes, options } = e.data;

  try {
    reportProgress(5, 'Loading PDF...');

    const loadOptions = {};
    if (options.password) loadOptions.password = options.password;
    loadOptions.ignoreEncryption = false;

    let pdfDoc;
    try {
      pdfDoc = await PDFDocument.load(pdfBytes, loadOptions);
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('password') || msg.includes('encrypt') || msg.includes('Password')) {
        throw new Error('Invalid or missing password. Please check and try again.');
      }
      throw new Error('Could not open this PDF. It may be corrupted or use unsupported encryption.');
    }

    const totalPages = pdfDoc.getPageCount();
    reportProgress(15, `PDF loaded. ${totalPages} pages found.`);

    // Send page count info back
    self.postMessage({ type: 'info', totalPages });

    let results;
    const baseName = options.baseName || 'document';
    const namingTemplate = options.namingTemplate || '{base}_part{index}';

    switch (action) {
      case 'splitByPages':
        results = await splitByPages(pdfDoc, options.pagesPerSplit, namingTemplate, baseName);
        break;
      case 'splitBySize':
        results = await splitBySize(pdfDoc, options.maxSizeMB, namingTemplate, baseName);
        break;
      case 'splitByRanges':
        results = await splitByRanges(pdfDoc, options.ranges, namingTemplate, baseName);
        break;
      default:
        throw new Error('Invalid split mode');
    }

    // Create ZIP if multiple files, otherwise return single PDF
    reportProgress(90, 'Preparing download...');

    if (results.length === 1) {
      const transferable = [results[0].bytes.buffer];
      self.postMessage({
        type: 'complete',
        fileType: 'pdf',
        filename: results[0].filename,
        data: results[0].bytes
      }, transferable);
    } else {
      reportProgress(92, `Zipping ${results.length} files...`);
      const zip = new JSZip();
      for (const result of results) {
        zip.file(result.filename, result.bytes);
      }
      const zipBlob = await zip.generateAsync(
        { type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 1 } },
        function (metadata) {
          reportProgress(92 + metadata.percent * 0.06, 'Zipping files...');
        }
      );

      const transferable = [zipBlob.buffer];
      self.postMessage({
        type: 'complete',
        fileType: 'zip',
        filename: 'split_pdfs.zip',
        data: zipBlob
      }, transferable);
    }

  } catch (error) {
    self.postMessage({ type: 'error', message: error.message || 'An unknown error occurred' });
  }
};
