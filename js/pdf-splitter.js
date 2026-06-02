/**
 * PDF Splitter - Main Thread Orchestrator
 * Handles UI interactions, file reading, Web Worker communication,
 * and download triggering.
 */

(function () {
  'use strict';

  // ── Naming Template Validation ───────────────────────────────────────────

  const ALLOWED_TEMPLATE_FIELDS = new Set(['base', 'index', 'range']);

  function validateNamingTemplate(template) {
    template = (template || '').trim();
    if (!template) return '{base}_part{index}';
    if (template.length > 120) throw new Error('Naming template is too long');
    if (template.includes('/') || template.includes('\\') || template.includes('..')) {
      throw new Error('Naming template cannot contain path separators');
    }

    const fields = [...template.matchAll(/\{([^{}]+)\}/g)].map(match => match[1]);
    for (const field of fields) {
      if (!ALLOWED_TEMPLATE_FIELDS.has(field)) {
        throw new Error('Naming template can only use {base}, {index}, and {range}');
      }
    }

    const remaining = template.replace(/\{(?:base|index|range)\}/g, '');
    if (remaining.includes('{') || remaining.includes('}')) {
      throw new Error('Naming template contains invalid braces');
    }

    return template;
  }

  // ── Download Helper ──────────────────────────────────────────────────────

  let currentBlobUrl = null;

  function triggerDownload(data, filename, mimeType) {
    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl);
      currentBlobUrl = null;
    }

    const blob = new Blob([data], { type: mimeType });
    currentBlobUrl = URL.createObjectURL(blob);

    const downloadLink = document.getElementById('downloadLink');
    downloadLink.href = currentBlobUrl;
    downloadLink.download = filename;
  }

  function cleanupBlob() {
    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl);
      currentBlobUrl = null;
    }
  }

  // ── Anonymous Analytics Helpers ─────────────────────────────────────────

  function trackUsageEvent(eventName, properties) {
    if (!window.umami || typeof window.umami.track !== 'function') return;

    try {
      window.umami.track(eventName, properties);
    } catch (e) {
      // Analytics must never interrupt PDF processing.
    }
  }

  function getFileSizeBucket(file) {
    const sizeMB = file.size / 1024 / 1024;
    if (sizeMB < 5) return 'under_5mb';
    if (sizeMB < 25) return '5_to_25mb';
    if (sizeMB < 100) return '25_to_100mb';
    if (sizeMB < 250) return '100_to_250mb';
    if (sizeMB < 500) return '250_to_500mb';
    return 'over_500mb';
  }

  function getCountBucket(count) {
    if (!Number.isFinite(count) || count < 1) return 'unknown';
    if (count === 1) return '1';
    if (count <= 5) return '2_to_5';
    if (count <= 20) return '6_to_20';
    return 'over_20';
  }

  function getPageCountBucket(count) {
    if (!Number.isFinite(count) || count < 1) return 'unknown';
    if (count <= 10) return '1_to_10';
    if (count <= 50) return '11_to_50';
    if (count <= 200) return '51_to_200';
    if (count <= 500) return '201_to_500';
    return 'over_500';
  }

  function getErrorCategory(error) {
    const message = String(error && error.message ? error.message : '').toLowerCase();

    if (message.includes('password') || message.includes('encrypt')) return 'encrypted_or_password';
    if (message.includes('corrupted') || message.includes('unsupported')) return 'invalid_or_unsupported_pdf';
    if (message.includes('range') || message.includes('page')) return 'invalid_page_range';
    if (message.includes('read')) return 'file_read_error';
    if (message.includes('processing')) return 'worker_error';
    return 'unknown';
  }

  // ── UI Helpers ───────────────────────────────────────────────────────────

  const form = document.getElementById('splitForm');
  const fileInput = document.getElementById('pdfFile');
  const uploadArea = document.getElementById('uploadArea');
  const uploadText = document.getElementById('uploadText');
  const submitBtn = document.getElementById('submitBtn');
  const errorDiv = document.getElementById('error');
  const processingView = document.getElementById('processingView');
  const successView = document.getElementById('successView');
  const resetBtn = document.getElementById('resetBtn');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');

  function showProcessing() {
    form.style.display = 'none';
    processingView.classList.add('active');
    successView.classList.remove('active');
    updateProgress(0, 'Starting...');
    // Initialize AdSense ad now that the container is visible
    try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
  }

  function showSuccess() {
    form.style.display = 'none';
    processingView.classList.remove('active');
    successView.classList.add('active');
    // Initialize AdSense ad now that the container is visible
    try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
  }

  function showForm() {
    form.style.display = 'block';
    processingView.classList.remove('active');
    successView.classList.remove('active');
  }

  function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }

  function updateProgress(percent, message) {
    if (progressFill) progressFill.style.width = percent + '%';
    if (progressText) progressText.textContent = message || '';
  }

  // ── File Upload Handling ─────────────────────────────────────────────────

  uploadArea.addEventListener('click', () => fileInput.click());

  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      fileInput.files = files;
      updateUploadText(files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      updateUploadText(e.target.files[0]);
    }
  });

  function updateUploadText(file) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(1);
    uploadText.textContent = '';
    const name = document.createElement('strong');
    name.textContent = file.name;
    uploadText.append(name, document.createElement('br'), `${sizeMB} MB`);
    errorDiv.style.display = 'none';

    // Memory warning for very large files
    if (file.size > 500 * 1024 * 1024) {
      const needed = Math.ceil((file.size / 1024 / 1024) * 2.5);
      showError(
        `Large file detected (${sizeMB} MB). Processing may use up to ${needed} MB of memory. ` +
        `Ensure your device has enough available RAM.`
      );
    }
  }

  // ── Mode Toggle ──────────────────────────────────────────────────────────

  document.querySelectorAll('.toggle-option').forEach(option => {
    option.addEventListener('click', () => {
      document.querySelectorAll('.toggle-option').forEach(opt => opt.classList.remove('active'));
      option.classList.add('active');

      const mode = option.getAttribute('data-mode');
      document.getElementById('pagesGroup').style.display = mode === 'pages' ? 'block' : 'none';
      document.getElementById('sizeGroup').style.display = mode === 'size' ? 'block' : 'none';
      document.getElementById('rangesGroup').style.display = mode === 'ranges' ? 'block' : 'none';
    });
  });

  // ── Advanced Options Toggle ──────────────────────────────────────────────

  const advancedToggle = document.getElementById('advancedToggle');
  const advancedContent = document.getElementById('advancedContent');

  advancedToggle.addEventListener('click', () => {
    const isVisible = advancedContent.style.display !== 'none';
    advancedContent.style.display = isVisible ? 'none' : 'block';
    advancedToggle.classList.toggle('active');
    advancedToggle.setAttribute('aria-expanded', !isVisible);
  });

  // ── PDF Processing via Web Worker ────────────────────────────────────────

  function processPDF(file, action, options) {
    return new Promise((resolve, reject) => {
      const worker = new Worker('js/pdf-worker.js?v=20260602-usage-layout');

      worker.onmessage = function (e) {
        const { type } = e.data;
        if (type === 'progress') {
          updateProgress(e.data.percent, e.data.message);
        } else if (type === 'info') {
          // Page count info — could display if needed
        } else if (type === 'complete') {
          resolve(e.data);
          worker.terminate();
        } else if (type === 'error') {
          reject(new Error(e.data.message));
          worker.terminate();
        }
      };

      worker.onerror = function (error) {
        reject(new Error('Processing error: ' + (error.message || 'Unknown error')));
        worker.terminate();
      };

      // Read file as ArrayBuffer and send to worker
      const reader = new FileReader();
      reader.onload = function () {
        const pdfBytes = new Uint8Array(reader.result);
        worker.postMessage(
          { action, pdfBytes, options },
          [reader.result] // Transfer the ArrayBuffer
        );
      };
      reader.onerror = function () {
        reject(new Error('Failed to read the file'));
        worker.terminate();
      };

      updateProgress(2, 'Reading file...');
      reader.readAsArrayBuffer(file);
    });
  }

  // ── Form Submission ──────────────────────────────────────────────────────

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const file = fileInput.files[0];
    if (!file) {
      showError('Please select a PDF file');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      showError('File must be a PDF');
      return;
    }

    const activeMode = document.querySelector('.toggle-option.active').getAttribute('data-mode');
    const password = document.getElementById('password').value;

    let namingTemplate;
    try {
      namingTemplate = validateNamingTemplate(document.getElementById('naming').value);
    } catch (err) {
      showError(err.message);
      return;
    }

    const baseName = file.name.replace(/\.pdf$/i, '');
    const options = { password, namingTemplate, baseName };

    let action;
    if (activeMode === 'pages') {
      const pagesPerSplit = parseInt(document.getElementById('pageCount').value, 10) || 100;
      if (pagesPerSplit <= 0) { showError('Pages per split must be positive'); return; }
      options.pagesPerSplit = pagesPerSplit;
      action = 'splitByPages';
    } else if (activeMode === 'size') {
      const maxSizeMB = parseInt(document.getElementById('sizeLimit').value, 10) || 50;
      if (maxSizeMB <= 0) { showError('Max size must be positive'); return; }
      options.maxSizeMB = maxSizeMB;
      action = 'splitBySize';
    } else if (activeMode === 'ranges') {
      options.ranges = document.getElementById('ranges').value;
      action = 'splitByRanges';
    }

    const analyticsContext = {
      mode: activeMode,
      file_size_bucket: getFileSizeBucket(file)
    };

    showProcessing();
    errorDiv.style.display = 'none';
    trackUsageEvent('pdf_split_started', analyticsContext);

    try {
      const result = await processPDF(file, action, options);

      const mimeType = result.fileType === 'zip' ? 'application/zip' : 'application/pdf';
      triggerDownload(result.data, result.filename, mimeType);

      updateProgress(100, 'Done!');
      trackUsageEvent('pdf_split_completed', {
        ...analyticsContext,
        output_type: result.fileType || 'unknown',
        output_count_bucket: getCountBucket(result.fileCount),
        page_count_bucket: getPageCountBucket(result.totalPages)
      });
      showSuccess();
    } catch (error) {
      trackUsageEvent('pdf_split_failed', {
        ...analyticsContext,
        error_category: getErrorCategory(error)
      });
      showError(error.message);
      showForm();
    }
  });

  // ── Reset ────────────────────────────────────────────────────────────────

  resetBtn.addEventListener('click', () => {
    cleanupBlob();
    form.reset();
    fileInput.value = '';
    uploadText.innerHTML = '<strong>Drop your PDF here</strong><br>or click to browse<br><small>No server upload limit &mdash; browser memory is the practical limit</small>';
    errorDiv.style.display = 'none';
    showForm();
  });
})();
