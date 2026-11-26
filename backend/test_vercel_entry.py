import importlib.util
import json
from pathlib import Path
import threading
import unittest
from http.server import ThreadingHTTPServer
from urllib.request import urlopen
from unittest.mock import patch

class VercelEntryTests(unittest.TestCase):
    def test_rewritten_search_preserves_query_and_health(self):
        spec=importlib.util.spec_from_file_location('vercel_entry',Path(__file__).resolve().parents[1]/'api/index.py')
        module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        server=ThreadingHTTPServer(('127.0.0.1',0),module.handler)
        worker=threading.Thread(target=server.serve_forever,daemon=True);worker.start()
        base='http://127.0.0.1:'+str(server.server_port)
        try:
            for path in ['/api/health','/api/index?__path=health']:
                with urlopen(base+path) as r:self.assertTrue(json.load(r)['ok'])
            with patch('server.resolve_destinations',return_value=[{'name':'Paris'}]) as resolver:
                with urlopen(base+'/api/index?__path=destinations%2Fsearch&q=Paris%2C+France') as r:
                    self.assertEqual(json.load(r)['destinations'][0]['name'],'Paris')
                resolver.assert_called_once_with('Paris, France')
        finally:server.shutdown();server.server_close();worker.join()
