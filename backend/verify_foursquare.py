"""独立的服务端验证脚本；不被 Vue 导入，不输出认证头，不使用旧版 API。"""
import json
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError

ROOT = Path(__file__).resolve().parent

def main():
    values = dict(line.strip().split('=', 1) for line in (ROOT / '.env').read_text().splitlines()
                  if line.strip() and not line.lstrip().startswith('#') and '=' in line)
    key = values['FOURSQUARE_API_KEY'].strip().strip('\"\'')
    url = 'https://places-api.foursquare.com/places/search?' + urlencode({
        'll': '39.9163,116.3972', 'radius': 3000, 'query': '故宫博物院', 'limit': 5,
    })
    request = Request(url, headers={
        'Authorization': f'Bearer {key}',
        'X-Places-Api-Version': '2025-06-17',
        'Accept': 'application/json',
    })
    try:
        response = urlopen(request, timeout=30)
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
    (ROOT / 'foursquare-search-response.json').write_text(output + '\n')
    print(output)
    if report['http_status'] in (401, 403):
        print('认证失败，已停止；未调用详情、Tips、照片或旧版 API。')

if __name__ == '__main__':
    main()
