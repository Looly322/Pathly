"""Vercel entrypoint; reuse the local backend without starting a server."""
import sys
from pathlib import Path
from urllib.parse import urlsplit, parse_qsl, urlencode
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from server import Handler

class handler(Handler):
    def do_GET(self):
        url = urlsplit(self.path)
        params = parse_qsl(url.query, keep_blank_values=True)
        route = next((value for key, value in params if key == '__path'), None)
        if url.path in ('/api/pathly', '/api/pathly.py') and route is not None:
            self.path = '/api/' + route.lstrip('/')
            query = urlencode([(key, value) for key, value in params if key != '__path'])
            if query:
                self.path += '?' + query
        super().do_GET()
