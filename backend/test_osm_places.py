import unittest
from unittest.mock import patch
from urllib.parse import parse_qs,urlparse
from osm_places import search_osm
from global_places import ApiError
class OsmTests(unittest.TestCase):
 def test_destination_coordinates_and_real_fields(self):
  with patch('osm_places.get_json',return_value={'elements':[{'type':'node','id':1,'lat':-23.55,'lon':-46.64,'tags':{'name':'Museu','tourism':'museum','website':'https://example.org'}},{'type':'node','id':2,'lat':40,'lon':-74,'tags':{'name':'Wrong city','tourism':'museum'}}]}) as request:
   result=search_osm({'latitude':-23.5475,'longitude':-46.63611})
   self.assertEqual(len(result['places']),1);self.assertEqual(result['places'][0]['source'],'openstreetmap')
   self.assertNotIn('rating',result['places'][0]);self.assertIsNone(result['places'][0]['image'])
   self.assertIn('-23.',parse_qs(urlparse(request.call_args.args[0]).query)['data'][0])
 def test_failure_not_mock(self):
  with patch('osm_places.get_json',side_effect=ApiError('UPSTREAM_504',504)):
   with self.assertRaises(ApiError):search_osm({'latitude':1,'longitude':2})
 def test_bad_coordinates(self):
  for params in [{},{'latitude':'NaN','longitude':0},{'latitude':0,'longitude':999}]:
   with self.assertRaises(ApiError):search_osm(params)
