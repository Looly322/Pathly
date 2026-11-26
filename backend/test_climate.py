import unittest
from climate import aggregate
class ClimateTests(unittest.TestCase):
 def test_reference_not_forecast(self):
  raw={'daily':{'time':['2021-11-26','2022-11-26','2023-11-26'],'temperature_2m_max':[10,12,14],'temperature_2m_min':[2,4,6],'precipitation_sum':[0,2,4]}}
  r=aggregate(raw,['2026-11-26'],2021,2025)['2026-11-26']
  self.assertEqual(r['type'],'historical_climate');self.assertEqual(r['high'],12);self.assertFalse(r['isForecast']);self.assertNotIn('rain',r)
  self.assertEqual(aggregate(raw,['2026-11-27'],2021,2025)['2026-11-27']['type'],'monthly_climate')
 def test_no_data(self):
  self.assertEqual(aggregate({},['2027-01-27'],2021,2025)['2027-01-27']['type'],'unavailable')
