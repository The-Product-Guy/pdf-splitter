"""
Minimal static file server for Railway deployment.
Serves the browser-based PDF splitter as static files with clean URL support.
"""

import http.server
import os
import sys


class CleanURLHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP handler that supports clean URLs (e.g., /about → /about.html)."""

    def do_GET(self):
        # Health check endpoint
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"status":"healthy","service":"pdf-splitter"}')
            return

        # Clean URL support: /about → /about.html
        if self.path != '/' and '.' not in self.path.split('/')[-1]:
            html_path = self.path.rstrip('/') + '.html'
            test_path = self.translate_path(html_path)
            if os.path.isfile(test_path):
                self.path = html_path

        return super().do_GET()

    def end_headers(self):
        # Add security headers
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')

        # Cache static assets aggressively
        if any(self.path.startswith(p) for p in ['/css/', '/js/', '/img/']):
            self.send_header('Cache-Control', 'public, max-age=31536000, immutable')
        elif self.path.endswith('.html') or self.path == '/':
            self.send_header('Cache-Control', 'public, max-age=3600')

        super().end_headers()

    def log_message(self, format, *args):
        # Suppress noisy request logs in production; keep errors
        pass


def main():
    port = int(os.environ.get('PORT', 8000))
    server = http.server.HTTPServer(('0.0.0.0', port), CleanURLHandler)
    print(f'Serving static files on port {port}')
    sys.stdout.flush()
    server.serve_forever()


if __name__ == '__main__':
    main()
