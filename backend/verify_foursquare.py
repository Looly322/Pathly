"""独立的服务端验证脚本；不被 Vue 导入，不输出认证头，不使用旧版 API。"""
import json
import ssl
import argparse
import sys
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError

ROOT = Path(__file__).resolve().parent

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--place-id', help='从搜索结果取得的 fsq_place_id')
    parser.add_argument('--resource', choices=['details', 'tips', 'photos'], default='details')
    args = parser.parse_args()
    values = dict(line.strip().split('=', 1) for line in (ROOT / '.env').read_text().splitlines()
                  if line.strip() and not line.lstrip().startswith('#') and '=' in line)
    key = values['FOURSQUARE_API_KEY'].strip().strip('\"\'')
    url = 'https://places-api.foursquare.com/places/search?' + urlencode({
        'll': '39.9163,116.3972', 'radius': 3000, 'query': '故宫博物院', 'limit': 5,
    })
    filename = 'foursquare-search-response.json'
    if args.place_id:
        if not args.place_id.isalnum():
            parser.error('Invalid place ID')
        url = 'https://places-api.foursquare.com/places/' + args.place_id
        if args.resource == 'details':
            url += '?' + urlencode({'fields': 'fsq_place_id,name,latitude,longitude,rating,popularity,stats,tips,photos,categories,website'})
        elif args.resource == 'tips':
            url += '/tips?' + urlencode({'limit': 3, 'fields': 'fsq_tip_id,text,created_at,lang,agree_count,disagree_count,photo'})
        else:
            url += '/photos?' + urlencode({'limit': 3})
        filename = f'foursquare-{args.place_id}-{args.resource}.json'
    request = Request(url, headers={
        'Authorization': f'Bearer {key}',
        'X-Places-Api-Version': '2025-06-17',
        'Accept': 'application/json',
    })
    try:
        # macOS 独立 Python 的默认证书库可能为空，使用系统 CA，仍严格校验证书。
        ca_file = '/etc/ssl/cert.pem'
        context = ssl.create_default_context(cafile=ca_file if Path(ca_file).exists() else None)
        response = urlopen(request, timeout=30, context=context)
    except HTTPError as error:
        response = error
    with response:
        raw = response.read().decode('utf-8', errors='replace')
        try:
            body = json.loads(raw)
        except json.JSONDecodeError:
            body = raw
        report = {'endpoint': url, 'http_status': response.code,
                  'response_body': body, 'raw_response': raw}
    output = json.dumps(report, ensure_ascii=False, indent=2)
    # 响应单独保存，不保存请求认证头或环境变量。
    (ROOT / filename).write_text(output + '\n')
    print(json.dumps({k: v for k, v in report.items() if k != 'raw_response'}, ensure_ascii=False, indent=2))
    if report['http_status'] in (401, 403):
        print('认证或权限失败，停止后续验证。')
    elif report['http_status'] == 429:
        print('额度或频率受限，停止后续验证。')
    return 0 if 200 <= report['http_status'] < 300 else 1

if __name__ == '__main__':
    sys.exit(main())
