import unittest,tempfile,json,time
from pathlib import Path
from unittest.mock import patch
import place_media as media

class MediaTests(unittest.TestCase):
    def test_verified_photo_survives_upstream_failure(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(media,'MEDIA',Path(folder)):
            params={'name':'Verified place','latitude':1,'longitude':2,'image':'1'}
            result={'photo':{'url':'https://example.org/verified.jpg'},'photoStatus':'ready'}
            with patch.object(media,'localized_place',return_value=result) as lookup:
                self.assertEqual(media.get_presentation(params),result)
                self.assertEqual(media.get_presentation(params),result)
                lookup.assert_called_once()
    def test_missing_photo_is_not_permanent(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(media,'MEDIA',Path(folder)):
            params={'name':'Place','latitude':1,'longitude':2}
            with patch.object(media,'localized_place',return_value={'photoStatus':'missing'}) as lookup:
                media.get_presentation(params);media.get_presentation(params)
                self.assertEqual(lookup.call_count,1)
                path=next(Path(folder).glob('*.json'));record=json.loads(path.read_text());record['at']=time.time()-601;path.write_text(json.dumps(record))
                media.get_presentation(params)
                self.assertEqual(lookup.call_count,2)
class RecoveryTests(unittest.TestCase):
    def test_manual_retry_bypasses_negative_cache(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(media,'MEDIA',Path(folder)),patch.object(media,'localized_place',side_effect=[{'photoStatus':'missing'},{'photoStatus':'ready','photo':{'url':'https://example.org/photo'}}]) as lookup:
            p={'name':'Place','latitude':1,'longitude':2,'image':'1'}
            media.get_presentation(p)
            self.assertEqual(media.get_presentation({**p,'refresh':'1'})['photoStatus'],'ready')
            self.assertEqual(lookup.call_count,2)
    def test_errors_are_not_persisted_as_missing(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(media,'MEDIA',Path(folder)),patch.object(media,'localized_place',return_value={'photoStatus':'error'}):
            media.get_presentation({'name':'Place','latitude':1,'longitude':2})
            self.assertFalse(list(Path(folder).glob('*.json')))
