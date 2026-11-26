"""Optional, explicitly enabled LibreTranslate instance. Never auto-enroll."""
import os,json,hashlib
from urllib.parse import urlparse
from urllib.request import Request,urlopen
from global_places import CONTEXT
import reference_cache as cache
def translate_name(name):
 endpoint=os.environ.get('LIBRETRANSLATE_URL','').rstrip('/')
 if os.environ.get('ENABLE_NAME_TRANSLATION')!='1' or not endpoint:return None
 u=urlparse(endpoint)
 if u.scheme!='https' and not(u.scheme=='http' and u.hostname in ('localhost','127.0.0.1')):return None
 if not name or len(name)>160:return None
 key='translation:'+hashlib.sha256((endpoint+'|zh|'+name).encode()).hexdigest()
 saved=cache.get(key)
 if saved:return saved
 try:
  payload={'q':name,'source':'auto','target':'zh','format':'text'}
  if os.environ.get('LIBRETRANSLATE_API_KEY'):payload['api_key']=os.environ['LIBRETRANSLATE_API_KEY']
  with urlopen(Request(endpoint+'/translate',data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'}),context=CONTEXT,timeout=4) as r:text=json.load(r).get('translatedText','')
  if not text or len(text)>240:return None
  result={'translatedNameZh':text,'nameTranslationSource':'LibreTranslate','nameTranslationVerified':False}
  cache.put(key,result,2592000);return result
 except Exception:return None
