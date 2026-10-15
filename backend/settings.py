"""沿用后端 .env；密钥不进入前端、不打印。系统环境优先。"""
import os
from pathlib import Path
for line in (Path(__file__).parent/'.env').read_text().splitlines() if (Path(__file__).parent/'.env').exists() else []:
    if '=' in line and not line.lstrip().startswith('#'):
        key,value=line.split('=',1);os.environ.setdefault(key.strip(),value.strip().strip('\"\''))
