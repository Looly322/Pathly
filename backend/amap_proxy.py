"""JS API security proxy. No Web Service key is assumed or exposed."""
import os
import re
from urllib.parse import urlsplit, parse_qsl, urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
import settings
from global_places import CONTEXT, ApiError

def upstream_url(path):
    parsed=urlsplit(path)
    tail=parsed.path.removeprefix('/_AMapService')
    if not re.fullmatch(r'/[A-Za-z0-9_./-]+',tail) or '..' in tail:
        raise ApiError('INVALID_AMAP_PATH',400)
    host='webapi.amap.com' if tail=='/v4/map/styles' else 'restapi.amap.com'
    key=os.environ.get('AMAP_JS_KEY','');secret=os.environ.get('AMAP_SECURITY_CODE','')
    if not key or not secret:raise ApiError('AMAP_NOT_CONFIGURED',503)
    params=[(k,v) for k,v in parse_qsl(parsed.query,keep_blank_values=True) if k not in ('jscode','key')]
    params.extend([('key',key),('jscode',secret)])
    return 'https://'+host+tail+'?'+urlencode(params)

def fetch(path):
    url=upstream_url(path)
    try:
        with urlopen(Request(url,headers={'User-Agent':'Pathly/1.0','Accept':'*/*'}),context=CONTEXT,timeout=15) as response:
            body=response.read(8_000_001)
            if len(body)>8_000_000:raise ApiError('AMAP_RESPONSE_TOO_LARGE',502)
            # Never reflect credentials, even if an upstream error includes its URL.
            for value in (os.environ.get('AMAP_SECURITY_CODE',''),os.environ.get('AMAP_JS_KEY','')):
                if value:body=body.replace(value.encode(),b'[redacted]')
            return body,response.headers.get('Content-Type','application/json')
    except HTTPError as error:raise ApiError('AMAP_HTTP_'+str(error.code),502) from None
    except (URLError,TimeoutError):raise ApiError('AMAP_NETWORK_ERROR',502) from None
