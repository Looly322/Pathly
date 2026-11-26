import unittest
from unittest.mock import patch
import commons_images as c
class CommonsTests(unittest.TestCase):
 def test_low_res_and_unlicensed_rejected(self):
  self.assertIsNone(c.photo_info({'width':400,'height':300}))
  self.assertIsNone(c.photo_info({'width':4000,'height':3000,'extmetadata':{'Artist':{'value':'Author'}}}))
 def test_wrong_entity_coordinates_rejected_before_search(self):
  e={'labels':{'en':{'value':'Tokyo Tower'}},'claims':{'P625':[{'mainsnak':{'datavalue':{'value':{'latitude':0,'longitude':0}}}}]}}
  with patch.object(c,'get_json',return_value={'entities':{'Q183536':e}}) as call:
   r=c._resolve({'wikidata':'Q183536'},'Tokyo Tower',35.65,139.74,'place')
   self.assertEqual(r['matchStatus'],'unverified');self.assertEqual(call.call_count,1)
 def test_copyright_metadata_is_plain_text(self):
  info={'width':2000,'height':1200,'url':'https://upload.wikimedia.org/a.jpg','thumburl':'https://upload.wikimedia.org/thumb/a.jpg','extmetadata':{'Artist':{'value':'<b>Author</b>'},'LicenseShortName':{'value':'CC BY-SA 4.0'},'LicenseUrl':{'value':'https://creativecommons.org/licenses/by-sa/4.0/'}}}
  self.assertEqual(c.photo_info(info)['author'],'Author')
