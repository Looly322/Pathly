import unittest,tempfile,json
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError
import opentripmap as api
from global_places import ApiError
class OtmTests(unittest.TestCase):
 def test_categories_are_internal(self):
  self.assertEqual(api.classify('interesting_places,museums,cultural')[0],'MUSEUM')
  self.assertEqual(api.classify('natural,gardens_and_parks')[1],'NATURE')
 def test_dedupe_reliable_ids_and_nearby_names(self):
  p={'id':'1','name':'Museum','latitude':1,'longitude':2,'wikidata':'Q1'}
  self.assertEqual(len(api.dedupe([p,{**p,'id':'2'},{**p,'id':'3','wikidata':None}])),1)
 def test_bounded_search_and_no_fake_name(self):
  with patch.object(api,'request',return_value=[{'xid':'N1','name':'','point':{'lat':1,'lon':2}},{'xid':'N2','name':'Museum','kinds':'museums','rate':3,'point':{'lat':1,'lon':2}}]) as req:
   data=api.search({'latitude':1,'longitude':2,'interests':'NATURE'})
   self.assertEqual(data['radii'],[4000,8000,15000]);self.assertEqual(len(data['places']),1)
   self.assertEqual(req.call_count,3);self.assertNotIn('rating',data['places'][0])
 def test_auth_failure_never_cached_or_retried(self):
  with tempfile.TemporaryDirectory() as folder,patch.object(api,'ROOT',Path(folder)),patch.dict(api.os.environ,{'OPEN_TRIP_MAP_API_KEY':'test-not-a-key'}),patch.object(api,'urlopen',side_effect=HTTPError('private',401,'Unauthorized',{},None)) as fetch:
   with self.assertRaises(ApiError) as e:api.request('geoname',{'name':'Test'})
   self.assertEqual(str(e.exception),'OTM_AUTH_401');self.assertEqual(fetch.call_count,1)
   self.assertEqual(len(list(Path(folder).glob('*.json'))),1)
 def test_cache_avoids_repeated_requests(self):
  with tempfile.TemporaryDirectory() as folder,patch.object(api,'ROOT',Path(folder)),patch.dict(api.os.environ,{'OPEN_TRIP_MAP_API_KEY':'test-not-a-key'}):
   import io
   with patch.object(api,'urlopen',return_value=io.BytesIO(b'{"name":"Place"}')) as fetch:
    self.assertEqual(api.request('geoname',{'name':'Place'}),api.request('geoname',{'name':'Place'}));self.assertEqual(fetch.call_count,1)
 def test_invalid_coordinates_and_path(self):
  with self.assertRaises(ApiError):api.search({'latitude':'nan','longitude':2})
  with self.assertRaises(ApiError):api.details('../../env')
