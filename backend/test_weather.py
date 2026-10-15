import unittest,tempfile,json
from pathlib import Path
from unittest.mock import patch,MagicMock
import weather
from global_places import ApiError
class WeatherTests(unittest.TestCase):
    def test_cache_and_official_forecast_parameters(self):
        with tempfile.TemporaryDirectory() as folder,patch.object(weather,'ROOT',Path(folder)),patch.object(weather,'urlopen') as call:
            response=MagicMock();response.read.return_value=json.dumps({'timezone':'Asia/Tokyo','daily':{'time':['2026-10-15']}}).encode();call.return_value.__enter__.return_value=response
            a=weather.forecast({'latitude':'35.6762','longitude':'139.6503'});b=weather.forecast({'latitude':'35.6762','longitude':'139.6503'})
            self.assertEqual(a,b);self.assertEqual(call.call_count,1)
            url=call.call_args.args[0].full_url;self.assertIn('api.open-meteo.com/v1/forecast',url);self.assertIn('timezone=auto',url);self.assertIn('forecast_days=16',url);self.assertNotIn('past_days',url)
    def test_invalid_coordinates_and_failure(self):
        with self.assertRaises(ApiError):weather.forecast({'latitude':'nan','longitude':'0'})
        with tempfile.TemporaryDirectory() as folder,patch.object(weather,'ROOT',Path(folder)),patch.object(weather,'urlopen',side_effect=TimeoutError()):
            with self.assertRaisesRegex(ApiError,'WEATHER_UNAVAILABLE'):weather.forecast({'latitude':'1','longitude':'2'})
            self.assertEqual(len(list(Path(folder).glob('*.json'))),1) # 仅计数，不缓存失败为预报
