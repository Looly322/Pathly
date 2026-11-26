import unittest
from unittest.mock import patch
from urllib.parse import parse_qs,urlparse
from osm_places import search_osm, search_named
from global_places import ApiError
class OsmTests(unittest.TestCase):
 def test_destination_coordinates_and_real_fields(self):
  with patch('osm_places.get_json',return_value={'elements':[{'type':'node','id':1,'lat':-23.55,'lon':-46.64,'tags':{'name':'Museu','tourism':'museum','opening_hours':'Mo-Fr 09:00-17:00','website':'https://example.org'}},{'type':'node','id':2,'lat':40,'lon':-74,'tags':{'name':'Wrong city','tourism':'museum'}}]}) as request:
   result=search_osm({'latitude':-23.5475,'longitude':-46.63611})
   self.assertEqual(len(result['places']),1);self.assertEqual(result['places'][0]['source'],'openstreetmap')
   self.assertEqual(result['places'][0]['openingHoursText'],'Mo-Fr 09:00-17:00');self.assertNotIn('rating',result['places'][0]);self.assertIsNone(result['places'][0]['image'])
   self.assertIn('-23.',parse_qs(urlparse(request.call_args.args[0]).query)['data'][0])
 def test_failure_not_mock(self):
  with patch('osm_places.get_json',side_effect=ApiError('UPSTREAM_504',504)):
   with self.assertRaises(ApiError):search_osm({'latitude':1,'longitude':2})
 def test_bad_coordinates(self):
  for params in [{},{'latitude':'NaN','longitude':0},{'latitude':0,'longitude':999}]:
   with self.assertRaises(ApiError):search_osm(params)

 def test_named_preserves_identity_and_hours(self):
  payload={'elements':[{'type':'way','id':7,'center':{'lat':35.68,'lon':139.69},'tags':{'name':'Restaurant Test','name:zh':'测试餐厅','opening_hours':'Mo-Fr 11:00-20:00','amenity':'restaurant'}}]}
  with patch('osm_places.get_json',return_value=payload) as request:
   result=search_named({'latitude':35.68,'longitude':139.69,'query':'Test.*','kind':'restaurant','city':'Tokyo','countryCode':'JP'})
   self.assertEqual(result['places'][0]['id'],'osm-way-7')
   self.assertEqual(result['places'][0]['openingHoursText'],'Mo-Fr 11:00-20:00')
   self.assertEqual(result['places'][0]['coordinateSystem'],'WGS84')
   query=parse_qs(urlparse(request.call_args.args[0]).query)['data'][0]
   self.assertIn('amenity',query);self.assertNotIn('~"Test.*"',query)
 def test_named_fallback_and_rate_limit(self):
  params={'latitude':35,'longitude':139,'query':'Test','kind':'hotel'}
  with patch('osm_places.get_json',side_effect=[ApiError('UPSTREAM',502),{'elements':[]}]) as request:
   self.assertEqual(search_named(params)['places'],[]);self.assertEqual(request.call_count,2)
  with patch('osm_places.get_json',side_effect=ApiError('RATE_LIMIT',429)) as request:
   with self.assertRaises(ApiError):search_named(params)
   self.assertEqual(request.call_count,1)
 def test_named_invalid_query(self):
  with self.assertRaises(ApiError):search_named({'latitude':0,'longitude':0,'query':'x','kind':'hotel'})
