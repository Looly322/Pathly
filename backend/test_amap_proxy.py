import unittest
from unittest.mock import patch
from urllib.parse import urlsplit,parse_qs
import amap_proxy as proxy
from global_places import ApiError
class AmapProxyTests(unittest.TestCase):
 def test_server_injects_credentials_and_only_fixed_upstream(self):
  with patch.dict(proxy.os.environ,{'AMAP_JS_KEY':'fixture-key','AMAP_SECURITY_CODE':'fixture-secret'}):
   u=proxy.upstream_url('/_AMapService/v3/place/text?keywords=故宫&key=attacker&jscode=attacker')
   self.assertEqual(urlsplit(u).hostname,'restapi.amap.com')
   p=parse_qs(urlsplit(u).query);self.assertEqual(p['key'],['fixture-key']);self.assertEqual(p['jscode'],['fixture-secret'])
   self.assertEqual(urlsplit(proxy.upstream_url('/_AMapService/v4/map/styles?id=1')).hostname,'webapi.amap.com')
 def test_traversal_rejected(self):
  for p in ['/_AMapService/../secret','/_AMapService/https://evil.test']:
   with self.assertRaises(ApiError):proxy.upstream_url(p)
