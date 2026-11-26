"""仅绑定本机的开发代理，生产部署需由同源反向代理转发 /api。"""
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs
from global_places import destinations, search_places, ApiError

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        url = urlparse(self.path)
        params = {k: v[0] for k, v in parse_qs(url.query).items()}
        try:
            if url.path == '/api/destinations/search':
                data = {'destinations': destinations(params.get('q', ''))}
            elif url.path == '/api/places/search':
                data = search_places(params)
            elif url.path == '/api/health':
                data = {'ok': True}
            else:
                raise ApiError('NOT_FOUND', 404)
            status = 200
        except ApiError as error:
            status, data = error.status, {'error': str(error)}
        except Exception:
            status, data = 500, {'error': 'INTERNAL_ERROR'}
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

if __name__ == '__main__':
    print('Pathly backend: http://127.0.0.1:8787', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 8787), Handler).serve_forever()
