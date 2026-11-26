import unittest
from unittest.mock import patch
import media_delivery as m
from global_places import ApiError
class MediaDeliveryTests(unittest.TestCase):
 def test_only_attributed_exact_commons_media_is_proxied(self):
  photo={'url':'https://upload.wikimedia.org/wikipedia/commons/a/a1/Exact.jpg','source':'wikimedia-commons','author':'Photographer','license':'CC BY 4.0'}
  with patch.object(m.cache,'put') as put:
   result=m.normalize({'photo':photo,'photoStatus':'ready','nameZh':'名称'},{'name':'Original'})
   self.assertTrue(result['photo']['url'].startswith('/api/place-image?id='));self.assertEqual(result['photo']['author'],'Photographer');self.assertEqual(result['original_name'],'Original');put.assert_called_once()
 def test_untrusted_host_and_missing_credit_not_proxied(self):
  self.assertFalse(m.allowed('https://upload.wikimedia.org.evil.test/file.jpg'))
  self.assertFalse(m.allowed('http://upload.wikimedia.org/file.jpg'))
  photo={'url':'https://upload.wikimedia.org/file.jpg','source':'wikimedia-commons'}
  self.assertEqual(m.normalize({'photo':photo},{})['photo']['url'],photo['url'])
 def test_bad_reference_rejected(self):
  with self.assertRaises(ApiError):m.image('../../secret')
