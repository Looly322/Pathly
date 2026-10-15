"""一次性验收；只使用 Search Pro 字段，失败停止该城市并如实保留结果。"""
import json
from pathlib import Path
from global_places import destinations, search_places
checks = [
 ('北京','Beijing',['故宫博物院','颐和园','天坛']),
 ('东京','Tokyo',['Tokyo Tower','Senso-ji','Meiji Shrine']),
 ('巴黎','Paris',['Eiffel Tower','Louvre Museum','Arc de Triomphe']),
 ('伦敦','London',['British Museum','Tower of London','Buckingham Palace']),
 ('纽约','New York',['Times Square','Central Park','Metropolitan Museum of Art']),
 ('罗马','Rome',['Colosseum','Pantheon','Trevi Fountain']),
 ('悉尼','Sydney',['Sydney Opera House','Sydney Harbour Bridge','Royal Botanic Garden']),
]
report = []
for zh, en, queries in checks:
    entry = {'input': zh, 'english': en}
    try:
        candidates = destinations(zh)
        entry['destination'] = city = candidates[0]
        entry['englishDestination'] = destinations(en)[0]
        entry['searches'] = []
        if city['countryCode'] != 'CN':
            for query in queries:
                result = search_places({**city, 'query':query,'limit':5,'radius':20000})
                entry['searches'].append({'query':query, **result})
                print(zh, query, [p['name'] for p in result['places'][:3]], flush=True)
    except Exception as error:
        entry['error'] = str(error)
        print(zh, 'ERROR', str(error), flush=True)
    report.append(entry)
    Path('backend/global-live-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
