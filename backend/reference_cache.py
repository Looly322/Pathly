"""Small SQLite TTL cache for optional reference data; no credentials stored."""
import sqlite3,json,time
from global_places import CACHE
DB=CACHE/'references.sqlite3'
def connection():
 c=sqlite3.connect(DB,timeout=3)
 c.execute('CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, expires REAL, data TEXT)')
 return c
def get(key):
 with connection() as c:r=c.execute('SELECT data FROM cache WHERE key=? AND expires>?',(key,time.time())).fetchone()
 return json.loads(r[0]) if r else None
def put(key,data,ttl):
 with connection() as c:c.execute('INSERT OR REPLACE INTO cache VALUES (?,?,?)',(key,time.time()+ttl,json.dumps(data,ensure_ascii=False)))

def delete(key):
 with connection() as c:c.execute('DELETE FROM cache WHERE key=?',(key,))
