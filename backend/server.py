"""仅绑定本机的开发代理，生产部署需由同源反向代理转发 /api。"""
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs
from global_places import destinations, search_places, localized_place, current_places, ApiError

from weather import forecast as weather_forecast
from climate import climate
from media_delivery import normalize as normalize_media, image as media_image
from place_media import get_presentation
from osm_places import search_osm
from opentripmap import search as otm_search, details as otm_details, resolve_destinations


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        url = urlparse(self.path)
        params = {k: v[0] for k, v in parse_qs(url.query).items()}
        try:
            if url.path.startswith('/_AMapService/'):
                from amap_proxy import fetch
                body,content_type=fetch(self.path)
                self.send_response(200)
                self.send_header('Content-Type',content_type)
                self.send_header('Cache-Control','no-store')
                self.send_header('Content-Length',str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
            elif url.path == '/api/place-image':
                body=media_image(params.get('id',''))
                self.send_response(200)
                self.send_header('Content-Type','image/png' if body.startswith(b'\x89PNG') else 'image/webp' if body.startswith(b'RIFF') else 'image/jpeg')
                self.send_header('Cache-Control','public, max-age=86400')
                self.send_header('Content-Length',str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
            elif url.path == '/api/commons-image':
                from commons_images import search_images
                from global_places import REQUEST_DEADLINE
                import time
                REQUEST_DEADLINE.at=time.monotonic()+22
                data=normalize_media(search_images(params),params)
            elif url.path == '/api/climate':
                data = climate(params)
            elif url.path == '/api/weather':
                data = weather_forecast(params)
            elif url.path == '/api/destinations/search':
                from global_places import REQUEST_DEADLINE
                import time
                REQUEST_DEADLINE.at=time.monotonic()+22
                data = {'destinations': resolve_destinations(params.get('q', ''))}
            elif url.path == '/api/otm/places':
                from global_places import REQUEST_DEADLINE
                import time
                REQUEST_DEADLINE.at=time.monotonic()+40
                data = otm_search(params)
            elif url.path == '/api/otm/details':
                from global_places import REQUEST_DEADLINE
                import time
                REQUEST_DEADLINE.at=time.monotonic()+20
                data = normalize_media(otm_details(params.get('xid',''),params.get('part','all'),params.get('refresh')=='1'),params)
            elif url.path == '/api/named-places':
                from osm_places import search_named
                from global_places import REQUEST_DEADLINE
                import time
                REQUEST_DEADLINE.at=time.monotonic()+25
                data=search_named(params)
            elif url.path == '/api/open-places':
                data = search_osm(params)
            elif url.path == '/api/current-places':
                data = current_places(params)
            elif url.path == '/api/places/search':
                data = search_places(params)
            elif url.path == '/api/places/localize':
                from global_places import REQUEST_DEADLINE
                import time
                REQUEST_DEADLINE.at=time.monotonic()+20
                data = normalize_media(get_presentation(params),params)
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
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass

if __name__ == '__main__':
    print('Pathly backend: http://127.0.0.1:8787', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 8787), Handler).serve_forever()
