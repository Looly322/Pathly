import unittest
from unittest.mock import patch
from urllib.parse import urlparse, parse_qs
import global_places as api

class GlobalTests(unittest.TestCase):
    def test_previous_provider_is_disabled_even_with_an_existing_key(self):
        with patch.object(api,'get_json') as request, patch.dict(api.os.environ, {'FOURSQUARE_API_KEY':'test-only'}):
            with self.assertRaises(api.ApiError) as error:
                api.search_places({'latitude':48.85,'longitude':2.35})
        self.assertEqual(error.exception.status,410)
        request.assert_not_called()

    def test_missing_or_invalid_coordinates_never_fall_back_to_ip(self):
        for params in [{},{'latitude':'NaN','longitude':0},{'latitude':0,'longitude':999}]:
            with self.assertRaises(api.ApiError): api.search_places(params)

    def test_failure_has_no_mock_fallback(self):
        with patch.object(api,'get_json',side_effect=api.ApiError('UPSTREAM_429',429)):
            with self.assertRaises(api.ApiError):
                api.search_places({'latitude':48.85,'longitude':2.35})

    def test_localization_rejects_nearby_different_name_and_distant_namesake(self):
        hit={'id':'Q1','label':'Museum'}
        def entity(lat):
            return {'entities':{'Q1':{'labels':{'zh':{'value':'博物馆'}},'claims':{'P625':[{'mainsnak':{'datavalue':{'value':{'latitude':lat,'longitude':2.35}}}}]}}}}
        for name,lat,expected in [('Museum',48.85,'博物馆'),('Museum Shop',48.85,None),('Museum',40,None)]:
            with patch.object(api,'get_json',side_effect=[{'search':[hit]},entity(lat),{'query':{'pages':{}}}]):
                self.assertEqual(api.localized_place({'name':name,'latitude':48.85,'longitude':2.35})['nameZh'],expected)

    def test_exact_alias_is_accepted_only_with_matching_coordinates(self):
        entity={'entities':{'Q1':{'labels':{'zh':{'value':'纪念馆'}},'aliases':{'en':[{'value':'Memorial'}]},'claims':{'P625':[{'mainsnak':{'datavalue':{'value':{'latitude':40.71,'longitude':-74.01}}}}]}}}}
        with patch.object(api,'get_json',side_effect=[{'search':[{'id':'Q1','label':'Memorial and Museum'}]},entity]):
            self.assertEqual(api.localized_place({'name':'Memorial','latitude':40.71,'longitude':-74.01})['nameZh'],'纪念馆')

    def test_exact_alias_is_accepted_only_with_matching_coordinates(self):
        entity={'entities':{'Q1':{'labels':{'zh':{'value':'纪念馆'}},'aliases':{'en':[{'value':'Memorial'}]},'claims':{'P625':[{'mainsnak':{'datavalue':{'value':{'latitude':40.71,'longitude':-74.01}}}}]}}}}
        with patch.object(api,'get_json',side_effect=[{'search':[{'id':'Q1','label':'Memorial and Museum'}]},entity]):
            self.assertEqual(api.localized_place({'name':'Memorial','latitude':40.71,'longitude':-74.01})['nameZh'],'纪念馆')

    def test_photo_requires_credit_and_uses_commons_thumbnail(self):
        info={'thumburl':'https://thumb.wikimedia.org/example.jpg','descriptionurl':'https://commons.wikimedia.org/wiki/File:example.jpg','extmetadata':{'Artist':{'value':'<b>Author</b>'},'LicenseShortName':{'value':'CC BY 4.0'}}}
        with patch.object(api,'get_json',return_value={'query':{'pages':{'1':{'imageinfo':[info]}}}}):
            self.assertEqual(api.commons_photo('example.jpg')['author'],'Author')
            info['extmetadata']={}
            self.assertIsNone(api.commons_photo('example.jpg'))

    def test_same_name_neighbourhood_is_not_a_park_photo(self):
        entity={'entities':{'Q1':{'descriptions':{'en':{'value':'neighborhood in Atlanta'}},'claims':{'P625':[{'mainsnak':{'datavalue':{'value':{'latitude':33.74,'longitude':-84.37}}}}]}}}}
        with patch.object(api,'get_json',side_effect=[{'search':[{'id':'Q1','label':'Grant Park'}]},entity,{'query':{'pages':{}}}]):
            result=api.localized_place({'name':'Grant Park','category':'Park','latitude':33.74,'longitude':-84.37,'image':'1'})
        self.assertNotIn('photo',result)
        self.assertEqual(result['photoStatus'],'missing')

    def test_same_name_neighbourhood_is_not_a_park_photo(self):
        entity={'entities':{'Q1':{'descriptions':{'en':{'value':'neighborhood in Atlanta'}},'claims':{'P625':[{'mainsnak':{'datavalue':{'value':{'latitude':33.74,'longitude':-84.37}}}}]}}}}
        with patch.object(api,'get_json',side_effect=[{'search':[{'id':'Q1','label':'Grant Park'}]},entity,{'query':{'pages':{}}}]):
            result=api.localized_place({'name':'Grant Park','category':'Park','latitude':33.74,'longitude':-84.37,'image':'1'})
        self.assertNotIn('photo',result)
        self.assertEqual(result['photoStatus'],'missing')

    def test_all_categories_are_distinct(self):
        self.assertEqual(len(set(api.CATEGORIES.values())),8)

if __name__ == '__main__': unittest.main()
