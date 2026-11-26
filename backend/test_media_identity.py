import unittest
from unittest.mock import patch
import global_places as g
class IdentityTests(unittest.TestCase):
 def test_stable_entity_and_coordinates_accept_local_alias_without_fuzzy_name_search(self):
  entity={'labels':{'zh':{'value':'埃菲尔铁塔'},'en':{'value':'Eiffel Tower'}},'claims':{'P625':[{'mainsnak':{'datavalue':{'value':{'latitude':48.85826,'longitude':2.2945}}}}]}}
  with patch.object(g,'get_json',return_value={'entities':{'Q243':entity}}) as request:
   result=g.localized_place({'name':'Tour Eiffel – Paris','wikidata':'Q243','latitude':48.85826,'longitude':2.2945,'image':'0'})
   self.assertEqual(result['nameZh'],'埃菲尔铁塔');self.assertEqual(result['nameZhSourceId'],'Q243');self.assertEqual(request.call_count,1)
 def test_explicit_id_does_not_bypass_coordinate_check(self):
  entity={'labels':{'zh':{'value':'错误地点'}},'claims':{'P625':[{'mainsnak':{'datavalue':{'value':{'latitude':1,'longitude':2}}}}]}}
  with patch.object(g,'get_json',return_value={'entities':{'Q243':entity}}):
   result=g.localized_place({'name':'Tour Eiffel','wikidata':'Q243','latitude':48.85826,'longitude':2.2945,'image':'0'},_wiki_checked=True)
   self.assertFalse(result.get('nameZh'))
