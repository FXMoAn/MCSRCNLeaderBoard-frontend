#!/usr/bin/env python3
"""Emit the review report + Postgres migration for the 1.16.1/RSG & 1.15.2/RSG import.

Reads the doc snapshots and the BV->mid cache from this directory, and pulls the
current runs/users rows from Supabase with the anon key in the repo's .env.local.
"""
import json, os, re, subprocess
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
C = json.load(open(os.path.join(HERE, 'bili_bvid_owner.json'), encoding='utf-8'))
BOARDS = [('1.16.1', 'RSG', os.path.join(HERE, 'doc_1.16.1_RSG.tsv')),
          ('1.15.2', 'RSG', os.path.join(HERE, 'doc_1.15.2_RSG.tsv'))]


def rest(path):
    env = {}
    for line in open(os.path.join(ROOT, '.env.local'), encoding='utf-8'):
        if '=' in line:
            k, v = line.strip().split('=', 1)
            env[k] = v
    out = subprocess.run(
        ['curl', '-sS', '--max-time', '60', env['VITE_SUPABASE_URL'] + '/rest/v1/' + path,
         '-H', 'apikey: ' + env['VITE_SUPABASE_ANON_KEY'],
         '-H', 'Authorization: Bearer ' + env['VITE_SUPABASE_ANON_KEY']],
        capture_output=True, text=True)
    if out.returncode != 0:
        raise SystemExit('curl failed: ' + out.stderr[:200])
    return json.loads(out.stdout)


RUNS = rest('runs?select=*&limit=5000&order=id.asc')
USERS = rest('users?select=*&limit=5000&order=id.asc')
print('fetched runs=%d users=%d from Supabase' % (len(RUNS), len(USERS)))


def _bv(s):
    m = re.search(r'\bBV\w{10}\b', s or '')
    return m.group(0) if m else ''


NICK = {u['id']: u['nickname'].strip() for u in USERS}
D = {}
for ver, typ, _ in BOARDS:
    sel = [r for r in RUNS if r['status'] == 'verified' and r['type'] == typ and r['version'] == ver]
    D[ver] = {_bv(r['videolink']): {'igt': r['igt'], 'name': NICK.get(r['userid'], ''),
                                    'date': (r['date'] or '').replace('/', '-')}
              for r in sel if _bv(r['videolink'])}
    D[ver + '__nobv'] = [{'igt': r['igt'], 'name': NICK.get(r['userid'], ''),
                          'url': r['videolink'] or ''} for r in sel if not _bv(r['videolink'])]
TAG = '20260910'          # bump this to keep each run's SQL + backup tables distinct
SKIP_BV = {'BV126GH6BEvU'}
PLACEHOLDER = {'账号已注销', '命名修改', '此用户很懒', ''}
BAN_MIDS = {553446129, 275960149, 3546858100099919, 478105793, 1066455759, 305528814,
            3546707795118260, 1220894710, 1075897910, 511360409, 290528899, 159321258,
            350283125, 417434518, 498816365}

by_uid = {u['id']: u for u in USERS}
nick_to_uid = {}
for u in USERS:
    nick_to_uid.setdefault(u['nickname'].strip(), u['id'])

def bv_of(s):
    m = re.search(r'\bBV\w{10}\b', s or '')
    return m.group(0) if m else ''

mid_of = lambda b: (C.get(b) or {}).get('mid')
bname_of = lambda b: (C.get(b) or {}).get('name')

def norm(t, ms):
    t = (t or '').strip()
    if not t:
        return ''
    p = t.split(':')
    if len(p) not in (2, 3):
        return ''
    try:                                   # 秒位可能是 '59.5' 这类，也可能文档里就是坏的（'38:~'）
        mm = int(p[0]) * 60 + int(p[1]) if len(p) == 3 else int(p[0])
        ss = p[2] if len(p) == 3 else p[1]
        float(ss)
    except ValueError:
        return ''
    return '%02d:%s.%s' % (mm, ss, (ms or '000').zfill(3))

def load_doc(path):
    out = []
    for line in open(path, encoding='utf-8'):
        c = line.rstrip('\n').split('\t')
        c += [''] * (8 - len(c))
        out.append(dict(rank=c[0].strip(), name=c[1].strip(), igt=norm(c[2], c[3]),
                        bv=bv_of(c[4]), raw=c[4].strip(), seed=c[5].strip(),
                        date=c[6].strip(), rem=c[7].strip()))
    return out

docs = {v: load_doc(p) for v, _, p in BOARDS}

user_mids = defaultdict(set)
for r in RUNS:
    if r['status'] == 'verified' and r['type'] == 'RSG' and r['version'] in ('1.16.1', '1.15.2'):
        m = mid_of(bv_of(r['videolink']))
        if m:
            user_mids[r['userid']].add(m)
mid_users = defaultdict(set)
for uid, ms in user_mids.items():
    for m in ms:
        mid_users[m].add(uid)
merges = {m: sorted(us) for m, us in mid_users.items() if len(us) > 1}
merge_uids = {u for us in merges.values() for u in us}

new_runs, manual = [], []
all_bv = {}
for r in RUNS:
    b = bv_of(r['videolink'])
    if b:
        all_bv.setdefault(b, []).append((r['id'], r['status']))
for ver, typ, _ in BOARDS:
    db = D[ver]
    nobv_keys = {(x['name'].strip(), x['igt']) for x in D[ver + '__nobv']}
    for s in docs[ver]:
        if s['bv'] in db or s['bv'] in SKIP_BV:
            continue
        if not s['igt'] or not s['name']:
            manual.append((ver, s, '成绩/姓名非法'))
            continue
        if s['bv'] in all_bv:
            manual.append((ver, s, '站点已有同一 BV (run id=%s, 状态=%s)'
                           % (','.join(str(i) for i, _ in all_bv[s['bv']]),
                              '/'.join(sorted({st for _, st in all_bv[s['bv']]})))))
            continue
        if (s['name'], s['igt']) in nobv_keys:
            manual.append((ver, s, '站点已有同(姓名,成绩)，链接无法解析'))
            continue
        m = mid_of(s['bv']) if s['bv'] else None
        s['mid'] = m
        s['bname'] = bname_of(s['bv']) if m else None
        if m in merge_uids:
            manual.append((ver, s, '属于待人工合并的档案'))
            continue
        if m in BAN_MIDS:
            manual.append((ver, s, 'UP主在封神榜封禁名单中'))
            continue
        new_runs.append((ver, typ, s))

# nickname sync, tiered.
#   A: 文档名 == B站现名 != 站点名  -> 两方对一方落后，自动改
#   B: B站现名 != 文档名           -> 只有 B站单方面不同意，可能是别人代投视频，留人工
auto_uid_seen = {}
nick_manual = []
for ver, typ, _ in BOARDS:
    db = D[ver]
    for s in docs[ver]:
        r = db.get(s['bv'])
        if not r or s['bv'] in SKIP_BV:
            continue
        m, bn = mid_of(s['bv']), bname_of(s['bv'])
        old = r['name'].strip()
        if not m or not bn or bn in PLACEHOLDER or bn == old:
            continue
        entry = dict(uid=None, old=old, bn=bn, doc=s['name'], bv=s['bv'], mid=m)
        uids = sorted(mid_users.get(m, []))
        if len(uids) != 1:
            entry['why'] = 'mid 对应 0 或多条档案'
            nick_manual.append(entry); continue
        uid = uids[0]
        entry['uid'] = uid
        if uid in merge_uids:
            entry['why'] = '属于待人工合并的档案'; nick_manual.append(entry); continue
        if len(user_mids.get(uid, ())) > 1:
            entry['why'] = '该玩家名下解析出多个 mid'; nick_manual.append(entry); continue
        clash = nick_to_uid.get(bn)
        if clash and clash != uid:
            entry['why'] = '目标昵称已被 id=%d 占用' % clash; nick_manual.append(entry); continue
        if s['name'] == bn:
            auto_uid_seen[uid] = entry                      # tier A
        else:
            entry['why'] = '仅 B站单方面不同（可能代投）'
            nick_manual.append(entry)                       # tier B
nick_updates = [auto_uid_seen[k] for k in sorted(auto_uid_seen)]

bili_backfill = [uid for uid, ms in user_mids.items() if len(ms) == 1]
ambiguous_mid = [(uid, sorted(ms)) for uid, ms in user_mids.items() if len(ms) > 1]

# ============================ REPORT ============================
R = open(os.path.join(HERE, 'import_report.txt'), 'w', encoding='utf-8')
def P(*a):
    print(*a, file=R)

n_ok = sum(1 for v in C.values() if v.get('code') == 0)
P('导入前复核报告  2026-09-10')
P('=' * 78)
P('BV 解析: 共 %d 个，成功 %d，稿件不可见(62002) %d，权限受限(62012) %d'
  % (len(C), n_ok, sum(1 for v in C.values() if v.get('code') == 62002),
     sum(1 for v in C.values() if v.get('code') == 62012)))
P('')
P('【1】SQL 会自动执行的部分')
P('-' * 78)
P('  1a. runs 新增 bvid 列并回填；users 回填 bili_id（仅单一 mid 无歧义时）')
P('  1b. 新增成绩 %d 条 (status=verified)' % len(new_runs))
P('  1c. 昵称同步 %d 条自动执行（文档与B站一致），%d 条留人工' % (len(nick_updates), len(nick_manual)))
newp = sorted({s['name'] for _, _, s in new_runs
               if not (s['mid'] and mid_users.get(s['mid'])) and s['name'] not in nick_to_uid})
P('  1d. 新建玩家档案 %d 个: %s' % (len(newp), '、'.join(newp)))
P('')
P('-' * 78)
P('【2】留给你人工决定的（SQL 没有动）')
P('-' * 78)
P('  2a. 同一 B站 mid 对多条 users 档案 -> 需合并 %d 组' % len(merges))
for m, us in sorted(merges.items()):
    P('      mid=%s' % m)
    for uid in us:
        u = by_uid[uid]
        n = sum(1 for r in RUNS if r['userid'] == uid)
        P('        users.id=%-5d %-20s runs=%d  登录账号=%s'
          % (uid, repr(u['nickname']), n, '有' if u['user_id'] else '无'))
    P('      不合并的后果: get_leaderboard 按 userid 去重，这人会在榜上占两个位置')
P('')
P('  2b. 跳过的新增记录 %d 条' % len(manual))
for ver, s, why in manual:
    P('      [%s] #%-3s %-18s %-10s %-22s %-11s <- %s'
      % (ver, s['rank'], s['name'], s['igt'] or '?', (s['bv'] or s['raw'])[:22], s['date'], why))
P('')
P('  2c. 一个玩家名下解析出多个 mid（bili_id 留空，未回填）: %d' % len(ambiguous_mid))
for uid, ms in ambiguous_mid:
    P('      users.id=%d %s mids=%s' % (uid, repr(by_uid[uid]['nickname']), ms))
P('')
P('-' * 78)
P('【3】明细：新增成绩 %d 条' % len(new_runs))
P('-' * 78)
for ver, typ, s in sorted(new_runs, key=lambda x: (x[0], int(x[2]['rank']) if x[2]['rank'].isdigit() else 999)):
    m = s['mid']
    owners = sorted(mid_users.get(m, [])) if m else []
    if owners:
        tgt = '-> id=%d %s' % (owners[0], repr(by_uid[owners[0]]['nickname']))
    elif s['name'] in nick_to_uid:
        tgt = '-> 同名 id=%d' % nick_to_uid[s['name']]
    else:
        tgt = '-> 新建档案'
    P('  [%s] #%-3s %-18s %-10s %-20s %-11s mid=%-17s %s'
      % (ver, s['rank'], s['name'], s['igt'], (s['bv'] or s['raw'])[:20], s['date'], str(m), tgt))
P('')
P('-' * 78)
P('【4】昵称同步：自动执行 %d 条（文档与B站一致、仅站点落后）' % len(nick_updates))
P('-' * 78)
for e in nick_updates:
    P('  users.id=%-5d %-20s -> %-20s (%s)' % (e['uid'], repr(e['old']), repr(e['bn']), e['bv']))
P('')
P('-' * 78)
P('【4b】昵称同步：留人工 %d 条（B站单方面与文档不符，可能是别人代投视频）' % len(nick_manual))
P('-' * 78)
for e in nick_manual:
    P('  users.id=%-5s %-20s ?-> %-20s (%s)  文档名=%-20s %s'
      % (e['uid'], repr(e['old']), repr(e['bn']), e['bv'], repr(e['doc']), e['why']))
R.close()


# ============================ SQL ============================
def q(v):
    return 'NULL' if v in (None, '') else "'" + str(v).replace("'", "''") + "'"

def insert_stmt(table, cols, rows):
    if not rows:
        return ('INSERT INTO %s (%s)\nSELECT %s FROM (SELECT NULL::text a) t WHERE false;'
                % (table, ', '.join(cols), ', '.join(cols)))
    return 'INSERT INTO %s (%s) VALUES\n%s;' % (table, ', '.join(cols), ',\n'.join(rows))

bv_rows = ['  (%s, %d, %s)' % (q(b), v['mid'], q(v['name']))
           for b, v in sorted(C.items()) if v.get('code') == 0 and v.get('mid')]
bv_vals = insert_stmt('stg_bv', ['bvid', 'mid', 'bname'], bv_rows)
nr_sorted = sorted(new_runs, key=lambda x: (x[0], int(x[2]['rank']) if x[2]['rank'].isdigit() else 999))
nr_rows = []
for ver, typ, s in nr_sorted:
    if s['bv']:
        link = 'https://www.bilibili.com/video/' + s['bv']
    elif s['raw'].startswith('http'):
        link = s['raw']
    else:
        link = 'No Video - %s' % (s['rank'] or '0')   # 沿用站点已有的 'No Video - N' 约定
    rdate = s['date'] or ''                           # runs.date 是 NOT NULL，空日期用 '' 与既有 6 行一致
    rk = int(s['rank']) if s['rank'].isdigit() else None
    nr_rows.append('  (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)' % (
        q(ver), q(typ), q(s['bv']), q(s['name']),
        str(s['mid']) if s['mid'] else 'NULL', q(s['igt']), "'" + rdate.replace(chr(39)*2, chr(39)*2) + "'",
        q(link), q(s['seed']), q(s['rem']), str(rk) if rk is not None else 'NULL'))
nr_vals = insert_stmt('stg_new_run', ['version','type','bvid','doc_name','mid','igt','rdate',
                                      'videolink','seed','remarks','rank_no'], nr_rows)
nick_sql = '\n'.join(
    "UPDATE users SET nickname = %s WHERE id = %d AND nickname = %s\n"
    "   AND NOT EXISTS (SELECT 1 FROM users u2 WHERE u2.nickname = %s AND u2.id <> %d);  -- %s"
    % (q(e['bn']), e['uid'], q(e['old']), q(e['bn']), e['uid'], e['bv']) for e in nick_updates)

SQL = open(os.path.join(HERE, 'tpl.sql'), encoding='utf-8').read().replace('20260910', TAG)
out_sql = os.path.join(HERE, 'import_%s.sql' % TAG)
open(out_sql, 'w', encoding='utf-8').write(
    SQL.replace('--@@BV_INSERT@@', bv_vals).replace('--@@NEWRUN_INSERT@@', nr_vals)
       .replace('--@@NICK@@', nick_sql or 'SELECT 1 WHERE false;'))
print('sql ->', out_sql)
print('new_runs=%d manual=%d nick_auto=%d nick_manual=%d merges=%d'
      % (len(new_runs), len(manual), len(nick_updates), len(nick_manual), len(merges)))
