import unittest
from unittest.mock import patch
from urllib.parse import urlparse, parse_qs
import global_places as api

class GlobalTests(unittest.TestCase):
    def test_only_pro_search_explicit_destination_and_no_secret_in_model(self):
        calls=[]
        def get(url, headers=None):
            calls.append(url)
            return {'results':[
                {'fsq_place_id':'a','name':'Museum','latitude':48.85,'longitude':2.35,'location':{'country':'FR'},'rating':9,'photos':[{}],'tips':[{}]},
                {'fsq_place_id':'b','name':'Wrong country','latitude':48.85,'longitude':2.35,'location':{'country':'US'}},
                {'fsq_place_id':'c','name':'Wrong city','latitude':40,'longitude':116,'location':{'country':'FR'}}]}
        with patch.object(api,'get_json',get), patch.dict(api.os.environ, {'FOURSQUARE_API_KEY':'test-only'}):
            result=api.search_places({'latitude':48.85,'longitude':2.35,'countryCode':'FR','category':'museums','fields':'photos,tips,rating'})
        self.assertEqual(len(result['places']),1)
        p=result['places'][0]
        self.assertIsNone(p['nameEnglish'])
        for key in ['photos','tips','rating','Authorization']:
            self.assertNotIn(key,p)
        url=urlparse(calls[0]); query=parse_qs(url.query)
        self.assertEqual(url.path,'/places/search')
        self.assertEqual(query['fields'],[api.PRO_FIELDS])
        self.assertEqual(query['ll'],['48.85,2.35'])
        self.assertEqual(query['fsq_category_ids'],[api.CATEGORIES['museums']])

    def test_missing_or_invalid_coordinates_never_fall_back_to_ip(self):
        for params in [{},{'latitude':'NaN','longitude':0},{'latitude':0,'longitude':999}]:
            with self.assertRaises(api.ApiError): api.search_places(params)

    def test_failure_has_no_mock_fallback(self):
        with patch.object(api,'get_json',side_effect=api.ApiError('UPSTREAM_429',429)):
            with self.assertRaises(api.ApiError):
                api.search_places({'latitude':48.85,'longitude':2.35})

    def test_all_categories_are_distinct(self):
        self.assertEqual(len(set(api.CATEGORIES.values())),8)

if __name__ == '__main__': unittest.main()
