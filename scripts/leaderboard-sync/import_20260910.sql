-- ============================================================================
-- 1.16.1/RSG + 1.15.2/RSG 榜单同步        生成于 2026-09-10
-- 来源: 腾讯文档 DZnVPZ0JhTGVWdFZi (tab BB08J2 / BB08J3)
--       + B站 api/web-interface/view 解析 BV -> mid(UP主永久数字ID)
-- 用法: Supabase Dashboard -> SQL Editor 整段执行；出错自动整体回滚
-- 说明: 只新增、只改名、只补关联，不删除任何 runs
-- ============================================================================
BEGIN;

-- ===== 0. 备份（确认无误后手动 DROP）=====
DROP TABLE IF EXISTS _bk_20260910_users;
DROP TABLE IF EXISTS _bk_20260910_runs;
CREATE TABLE _bk_20260910_users AS SELECT * FROM users;
CREATE TABLE _bk_20260910_runs  AS SELECT * FROM runs;
ALTER TABLE _bk_20260910_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE _bk_20260910_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON _bk_20260910_users, _bk_20260910_runs
  FROM PUBLIC, anon, authenticated;

-- ===== 1. 结构：runs.bvid 是以后做自动同步和防重复的键 =====
-- users.bili_id 生产上本来就有唯一索引 users_bili_id_key（NULL 之间互不冲突），
-- 早期失败执行留下的 users_bili_id_uidx 是冗余的，这里清掉且不再重建。
DROP INDEX IF EXISTS users_bili_id_uidx;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS bvid text;
CREATE INDEX IF NOT EXISTS runs_bvid_idx ON runs (bvid);

UPDATE runs SET bvid = (regexp_match(videolink, 'BV[A-Za-z0-9]{10}'))[1]
 WHERE bvid IS NULL AND videolink ~ 'BV[A-Za-z0-9]{10}';

-- ===== 2. 暂存：已解析成功的 BV -> mid =====
CREATE TEMP TABLE stg_bv (bvid text PRIMARY KEY, mid bigint, bname text);
INSERT INTO stg_bv (bvid, mid, bname) VALUES
  ('BV11K41147VT', 643214088, 'Hegarry_'),
  ('BV11gJazeEoF', 378586901, '4102545'),
  ('BV125411f7U6', 289541529, 'maniacP256'),
  ('BV126GH6BEvU', 604947292, '程程小小兔'),
  ('BV12E421P7YJ', 280377699, '空白boi'),
  ('BV12P411r7Yo', 513816677, '某不知名速通玩家'),
  ('BV12QwFzvErC', 9676229, '初晨-曦光'),
  ('BV12T4y1h7BR', 668833335, 'Quotidian1337'),
  ('BV12f4y1u7UA', 1214596932, '沧海水视频'),
  ('BV12s816mEr8', 3546835429885983, '之挞'),
  ('BV12vEV6hEk8', 404081464, '1by1_legopiece'),
  ('BV12wcyzXEzm', 3546574741310057, '武昌鱼666'),
  ('BV139M3zsEcg', 340342641, '刘玄兵-'),
  ('BV13g411176U', 514994521, 'rabbit_Ra'),
  ('BV13pc7zsE6w', 1752293035, 'wtcqwq'),
  ('BV13x4y1Z79j', 27162813, '天然之甄Naturean'),
  ('BV149RCBqE5i', 3546811681737350, 'Dizzykanon'),
  ('BV14C736sExj', 544319692, '寒冷的雨Owo'),
  ('BV14DYqzSEpH', 604947292, '程程小小兔'),
  ('BV156eizhEab', 604947292, '程程小小兔'),
  ('BV15U7vzEEcC', 452715552, 'LPK110'),
  ('BV15dwyz6EYL', 3546897832741846, 'Love永远exist'),
  ('BV15m3Cz8Efr', 509260845, 'Larryruns'),
  ('BV162YueTEaA', 1744744960, 'Play_SunRise'),
  ('BV166421g7mr', 413082107, 'Pigeon_P9'),
  ('BV16A4k6sEYT', 1572132003, '永珊不会mc'),
  ('BV16BjMz7EcM', 423693387, '凉城旧巷111'),
  ('BV16Bu76CEtx', 384072516, 'shadow啥都没有'),
  ('BV16Ccte3Eyc', 3546600903281320, 'HS003-'),
  ('BV16c411m7WV', 1507271636, 'Skye_Claire'),
  ('BV17L411a7jT', 3493270986426965, 'CrishelL37'),
  ('BV17P411F7jF', 689880760, 'R__Joss'),
  ('BV17R4y1x7eX', 286109167, 'LiHaoqwq'),
  ('BV17XqWBREoH', 318898193, 'TowardStars'),
  ('BV17bkgBaEtH', 1207868616, '安立AN_LI'),
  ('BV17wMa66Era', 3537121763658067, '夕阳p2'),
  ('BV18F8TzhEdG', 5516404, 'SZANluvSWK'),
  ('BV18G4y1J7XJ', 380725611, '食草动物-_-'),
  ('BV18a8H6dEfw', 354779637, 'miku_mua'),
  ('BV18r4y1G7d1', 453338854, '爱吃键盘的大唐'),
  ('BV18r66YBEbu', 1578160350, '9899的忠實粉絲'),
  ('BV195cUeDENZ', 237340956, 'Baron_2333'),
  ('BV19c6ZYfE2G', 1461531813, '夏日宴会'),
  ('BV19e4y1w73t', 411211993, '数学课代表小何'),
  ('BV19h8Z6wEnQ', 1507271636, 'Skye_Claire'),
  ('BV19hjz6GEXn', 449228450, '玖九ばか'),
  ('BV19oqoYDErQ', 1149127947, 'Yings_lyd'),
  ('BV19v411P7wo', 366600448, 'Cresptiermarzer'),
  ('BV1AP3i6iEB2', 544319692, '寒冷的雨Owo'),
  ('BV1Ac411p7z1', 1322476710, '衰气之神'),
  ('BV1Ae411o7qH', 3494369002785286, '账号已注销'),
  ('BV1AgwhesEEv', 1913643280, '明月孤星辶'),
  ('BV1Ai4Q69EbJ', 581924721, '孤独Haha'),
  ('BV1BCWoeVEed', 663201694, 'Mr_FourTeen_'),
  ('BV1BHVozrE2A', 523408896, '备长中线'),
  ('BV1BNRRY8EL6', 371717947, '九黎科技'),
  ('BV1BY4y167ZM', 166489997, 'ct_dL'),
  ('BV1BbdQBSEQj', 509260845, 'Larryruns'),
  ('BV1Bg4y137vJ', 17981768, '吃雪糕的冰棍儿'),
  ('BV1C2MgzgEpg', 387119401, '小西找不到北o'),
  ('BV1CR4y1a727', 475226537, '玛啡ゐMurphy'),
  ('BV1Cm6ABEE8f', 289367420, 'Maxy5illion'),
  ('BV1D64y197ij', 207259575, '奶龙娇妻ML'),
  ('BV1DayqBwE5a', 470446154, 'aperIs-_-'),
  ('BV1E34y157L1', 445650020, '一多宝睡不醒一'),
  ('BV1EFnfe6ESG', 1846316994, 'May_111'),
  ('BV1EJAezEEEe', 581412296, '韦憨批'),
  ('BV1ERWUzVEFp', 3546694532728983, 'pyzsm'),
  ('BV1ES411c7M5', 627680803, '鱼九_Yj'),
  ('BV1EV411n7Ww', 266584032, '石葉'),
  ('BV1EWNDzqEci', 449366503, 'Komoling'),
  ('BV1EdNczaEvz', 3546838825175669, 'Su1phur_硫方'),
  ('BV1FGMJ6LEEH', 1560131449, 'Crisdf'),
  ('BV1Fm4y1C7V1', 226664967, 'Nagi凪_Feather'),
  ('BV1FzDAYrEPB', 674697790, 'zFe3'),
  ('BV1G2qfB2EEX', 356672525, '矛殷'),
  ('BV1G9M1zpE5Z', 1681747751, '明-_-__-'),
  ('BV1GKgczeEPC', 510237236, '从余飞'),
  ('BV1GV411H7dy', 415512149, '辉梦巽风awa'),
  ('BV1GZ4y187Lj', 47258771, '瑕玟'),
  ('BV1Ge4y1a7xW', 272542996, '-多宝睡不醒-'),
  ('BV1Gg4y1P7qJ', 130668182, '李硬炭'),
  ('BV1H2wvzdEzM', 363940194, '账号已注销'),
  ('BV1H4YHe6EiU', 340524894, '筱田yo'),
  ('BV1HVzhBpEMQ', 371717947, '九黎科技'),
  ('BV1HW421N7d8', 454553313, 'Acactus_'),
  ('BV1He4y1F7Ug', 480918626, 'g0_ose'),
  ('BV1Hg411y7NS', 286109167, 'LiHaoqwq'),
  ('BV1Hs4y1G7RD', 432181429, 'Pannier'),
  ('BV1J4PBeCE6o', 3546819233581094, 'starry_25'),
  ('BV1J4sFeQE5z', 1283178578, 'SheonaZ'),
  ('BV1JM411B7Wo', 291312615, 'PeretDK'),
  ('BV1KBuqzsErg', 527661167, '在缓冲呀'),
  ('BV1KG4y1a7Ru', 588867612, 'Fjleopard'),
  ('BV1KKE96CEwG', 1507271636, 'Skye_Claire'),
  ('BV1Kc411z7dW', 514530978, 'Emsr7x'),
  ('BV1KdEqzLEeE', 1635485566, 'Xiao_Bai2'),
  ('BV1Kg4y1477u', 142522381, '卡卡卡鲨鲨莎莎'),
  ('BV1Km411S7KY', 1045083807, '夏末ys'),
  ('BV1Kt9wBnEyx', 384072516, 'shadow啥都没有'),
  ('BV1Kv4y1J7bj', 480862001, '非常高水瓶'),
  ('BV1L84y187fC', 403102122, 'Stupiggy_'),
  ('BV1LHTw6HEgx', 1087824811, 'Xx_Romin_xX'),
  ('BV1LNrpYPENF', 694722241, '-阿阿阿鱼-'),
  ('BV1LcCuBdE8s', 604947292, '程程小小兔'),
  ('BV1Lg4y1X729', 432181429, 'Pannier'),
  ('BV1MG4y1v7Wi', 401770455, 'andyli_'),
  ('BV1MP411m7co', 672484117, 'FatFish_uwu'),
  ('BV1Mkgp6uErw', 233213993, '九羲NineThe'),
  ('BV1Mv4y1L767', 441908041, 'Blasterr'),
  ('BV1Mx4y1Q7g2', 605025844, 'YuzhuoTx321'),
  ('BV1My4y1571Z', 383268814, '励励lili'),
  ('BV1NMTKzoEMe', 239828673, 'waga5x'),
  ('BV1Nm4y1W7dv', 413082107, 'Pigeon_P9'),
  ('BV1NmMczUEEH', 3546614492825695, '享受rsg吗'),
  ('BV1NyHre6EQm', 259186004, 'pandaof3'),
  ('BV1P2WhejELD', 47258771, '瑕玟'),
  ('BV1PFdhY6E6U', 334510551, 'Cloud7_c'),
  ('BV1PJTH6sESW', 358814800, '柒拾陆是柒拾陆'),
  ('BV1PP4y1z7jZ', 430081734, 'silica_gel'),
  ('BV1PR76zSEoq', 1701712371, 'Bower--'),
  ('BV1PT5i6LE7z', 295836098, '流柳波'),
  ('BV1PTtFzoET6', 527279682, 'pearl_blaze'),
  ('BV1Py3f6qEHj', 3546944234326169, 'Uleeele'),
  ('BV1Q7jdzKEuU', 693419203, 'ck10o'),
  ('BV1QXZsBKEeq', 402755344, '寂寞罡哥冷_'),
  ('BV1Qm4y1x7gt', 1215672884, '账号已注销'),
  ('BV1RR4y117py', 1339352919, '北极beiji_star'),
  ('BV1RT421r7hD', 1587720430, '熊喵日记'),
  ('BV1SG4y1D7PL', 473850995, 'Estelario'),
  ('BV1SH4y1B7Su', 407533754, 'xbd15'),
  ('BV1SM411r7D1', 616402014, 'Mio_cat'),
  ('BV1SRtGz3E9P', 499994022, '冥王星_Plut0'),
  ('BV1ST8r6CEMy', 3493124525525127, 'lyningL'),
  ('BV1Sd8F6fEqL', 1876380863, 'Welight6'),
  ('BV1Tc411F78r', 412702283, 'skip2004'),
  ('BV1TeEbztEa5', 1241559640, 'Tenes9999'),
  ('BV1TgiBY7Ep9', 2104277791, 'sanjijia'),
  ('BV1Tmvre1E9p', 2060014991, '_ElysiaLove'),
  ('BV1ToBeYLECV', 282175108, 'REvivALOfLife'),
  ('BV1U7C1BSEKF', 384072516, 'shadow啥都没有'),
  ('BV1U84y1R7JV', 5516404, 'SZANluvSWK'),
  ('BV1UG1RYpEY9', 1115278164, 'fkhxy'),
  ('BV1Uz4y1J7aF', 74182781, '天海x'),
  ('BV1V6WNesEcH', 1843773, 'Veclanden'),
  ('BV1VX4y1U7FT', 604081058, '忑言'),
  ('BV1ViQeB7EBB', 3546593823295585, 'Tool_not_me'),
  ('BV1ViUfBCERd', 1992685691, '炮宇灰'),
  ('BV1VjfvBvEHA', 1744744960, 'Play_SunRise'),
  ('BV1VmME6aErT', 660830799, '憨憨的帮帮'),
  ('BV1WA411S7rw', 600236230, 'ohhhhhh222'),
  ('BV1WJ4m1n7Ly', 385931718, '時柒__'),
  ('BV1WLjoz4EoP', 277681463, 'Xiaokai_kk'),
  ('BV1WN411Y7ZT', 516081971, '祈玉egoist'),
  ('BV1WY4y1w7L2', 173712620, 'EIR9264'),
  ('BV1X14y1g7DK', 456873402, '所罗门艾翁'),
  ('BV1XF4m1u7zS', 1752293035, 'wtcqwq'),
  ('BV1XK62YdEss', 1992685691, '炮宇灰'),
  ('BV1XL411t7ag', 58404211, '风丸猫猫'),
  ('BV1XU8a69E8F', 1768425456, '是小燕子awa'),
  ('BV1XV4y1x7Ca', 1619299836, 'Yurron'),
  ('BV1Y44y147YY', 286291812, '萧为思'),
  ('BV1YV4y1x75v', 244384103, 'Balloon_356'),
  ('BV1Yiy3BYEKW', 105359128, 'aaa闪'),
  ('BV1Yo4y1w7VB', 518770879, 'Anerchyshark时乐'),
  ('BV1Z54y1K7rS', 13027595, 'VEP33'),
  ('BV1Ze4y127Yg', 1758650136, '小石蚀'),
  ('BV1ZoEK6AE1B', 629242445, '老呆茶狗'),
  ('BV1aHedzLEqM', 239828673, 'waga5x'),
  ('BV1aR4y1f7P6', 375746796, 'Tolerant_Scorpio'),
  ('BV1ah4y1g7WT', 1210153660, 'MC-305'),
  ('BV1ak4X6BE2C', 353250592, 'abab1137x'),
  ('BV1awXaYjEGC', 318898193, 'TowardStars'),
  ('BV1ayvHBvEz3', 237340956, 'Baron_2333'),
  ('BV1bHdABcEYn', 321958220, '1IIC'),
  ('BV1bMVV6HEiS', 3493269122058653, '管紫儿'),
  ('BV1bw411Q73L', 1391948774, '绊樱子'),
  ('BV1cEpqzLE7J', 1992685691, '炮宇灰'),
  ('BV1cF4Q6JEAj', 3546937401805301, '贤小二不闲'),
  ('BV1cKgRzPE8c', 379834934, '我都冇知道'),
  ('BV1d7Tu6TE3v', 1409093961, 'Ryaaan_n'),
  ('BV1dE2BB2Eja', 425475066, '小佳_233'),
  ('BV1dL8S63Ec9', 3546608830515698, '-2O22'),
  ('BV1dPm8YBEmA', 3461562327107741, '落雪不落你'),
  ('BV1dZ421q7CT', 1383250405, 'RyuGin_'),
  ('BV1ds4y1o7ZJ', 130256386, 'Knife_Invisible'),
  ('BV1dyUkBAEKS', 523408896, '备长中线'),
  ('BV1e1k2B4ETv', 3546838825175669, 'Su1phur_硫方'),
  ('BV1eNLwzQEUH', 14513900, '沙宝拉查的鸡'),
  ('BV1eX4y1s7Wd', 471306518, '萌萌de小公举'),
  ('BV1eY4y1w7jk', 519074908, '斑鸠咕咕'),
  ('BV1ebQkYyENt', 342476492, 'Fe180O240'),
  ('BV1eoXkYJE8j', 3546684567062826, '清寒qinghann'),
  ('BV1esWhehEvL', 1544104193, '你个老马马'),
  ('BV1ex4y1J7Fn', 1341545730, '_二博士'),
  ('BV1f6FQeqEy5', 518233019, 'pilipaalaaa'),
  ('BV1fEgszkEPX', 404081464, '1by1_legopiece'),
  ('BV1fF4m1L7BF', 507578192, 'wine_ocean'),
  ('BV1fL411N7mD', 408065749, '02翔哥'),
  ('BV1fX536iEvW', 402395957, '玛格难'),
  ('BV1fdFoz3Epq', 3546838825175669, 'Su1phur_硫方'),
  ('BV1fq4y1U7Us', 244137514, 'ChouGee瞅鴿'),
  ('BV1g8411b7wY', 289951942, '歪泽又在打电动了'),
  ('BV1gq4y1A78p', 513279256, 'wlaoye'),
  ('BV1gr4y1X7Ex', 112887265, 'GomoberAy'),
  ('BV1hY411w7wg', 186844015, '迷之星_'),
  ('BV1hd4y1Z74h', 13027595, 'VEP33'),
  ('BV1hx7azqENR', 479527215, '借鉴xx'),
  ('BV1i24y1a7zj', 1752165916, '幽隙浮萤'),
  ('BV1i44y1S7qk', 389491925, '对不起叶子'),
  ('BV1i86JYxEN8', 647139343, '大卫星星钥匙'),
  ('BV1iEkUYVEEe', 646607923, '香草阿鱼'),
  ('BV1iJ3aezEDV', 499650085, 'sinsopQAQ'),
  ('BV1j681zmE9B', 3546822289132158, 'Leizhen_Tian'),
  ('BV1jK421C7qo', 415530172, 'lfxhq'),
  ('BV1jP411v7Kq', 45489530, '创想之蚁'),
  ('BV1jfuxz3ETR', 486159156, 'NineBlood'),
  ('BV1jvmvYXETK', 19842900, '唯美君lz'),
  ('BV1jw411Q7Yi', 3494377211038657, '账号已注销'),
  ('BV1kR3cz9Eih', 354779637, 'miku_mua'),
  ('BV1kg4y1L7wk', 3493256700627383, 'Wood10'),
  ('BV1kgpGzCEhc', 3546811681737350, 'Dizzykanon'),
  ('BV1kt5266EQV', 3546608830515698, '-2O22'),
  ('BV1mB4y1b7cP', 381751351, 'TraveLMaybe'),
  ('BV1mCE967EfN', 505700531, '奋发向上的鹿白'),
  ('BV1mH4y1R7mF', 438373837, '外星人少刷点视频'),
  ('BV1mM4y177Uf', 405310476, '阿房不想努力了_'),
  ('BV1mZ4y1Y7D5', 352902645, 'RezonX'),
  ('BV1ma411M7xi', 398909647, 'Archerッ'),
  ('BV1mnPuzeES4', 1507271636, 'Skye_Claire'),
  ('BV1n2LbzBEKa', 3546561374062653, '优雅的水晶力少'),
  ('BV1nGNH6GE2X', 3546687222057090, '凌池111'),
  ('BV1nHTb6TERz', 407533754, 'xbd15'),
  ('BV1nQtX64EgR', 1769545623, '不可逆的矩阵A'),
  ('BV1nY4y1M7Vo', 87997577, 'Somnia1337'),
  ('BV1ns421M78a', 391557583, '知壹Oneof'),
  ('BV1o3411o7sj', 483575986, 'brina32'),
  ('BV1oEwAz9EAz', 604947292, '程程小小兔'),
  ('BV1oHrCBHEZj', 1409093961, 'Ryaaan_n'),
  ('BV1oj7r6WEea', 3546388176570791, 'theblueqim_'),
  ('BV1os4y1i7Lz', 481604435, 'HQEmployer'),
  ('BV1pXgmzUEWj', 604947292, '程程小小兔'),
  ('BV1pY41127YP', 649005455, '风住旅馆'),
  ('BV1ph411H7WJ', 2000700659, '账号已注销'),
  ('BV1pq7Nz5EKe', 1876380863, 'Welight6'),
  ('BV1pxyfB1E7V', 3546811681737350, 'Dizzykanon'),
  ('BV1qY3d67E7s', 478105793, 'Murasame_259'),
  ('BV1qftazgE31', 379746091, 'l09610l'),
  ('BV1rmpFenExF', 1721613941, 'いいんか_'),
  ('BV1rsGGetEDr', 495272117, '账号已注销'),
  ('BV1sF7RzXEN6', 425475066, '小佳_233'),
  ('BV1sHKP6KEBC', 3493081695389956, '67同城'),
  ('BV1sK411t7bQ', 358771305, 'XinY_ai'),
  ('BV1sM8qzqEy6', 1446832368, '__Kane__'),
  ('BV1sa4y19722', 660093558, '䃱一'),
  ('BV1snnJzAETE', 167361236, 'Cher_lx'),
  ('BV1tKgrejECq', 3546621969173036, '燕杰_'),
  ('BV1tU4y1M7rZ', 11330125, '封渊洹-Liang'),
  ('BV1tY4y1r7yH', 591917717, '沉默寡言周帆oh'),
  ('BV1tYKZ6tEHq', 7999468, 'Tixiv'),
  ('BV1taTR6sEJK', 408065749, '02翔哥'),
  ('BV1tg2KYWEoK', 263590617, '山尽oo'),
  ('BV1tyRhY1Evh', 402395957, '玛格难'),
  ('BV1uGuizWEJL', 1803722262, 'Prackiee-3-'),
  ('BV1ud4y1j7EC', 226664967, 'Nagi凪_Feather'),
  ('BV1vGfmYjE4Y', 1891157936, 'bei_ke0818'),
  ('BV1vU411d7VD', 322722195, 'Mercury418'),
  ('BV1veVfz3EKa', 512772599, 'mengx1nn_'),
  ('BV1vr7h64EC9', 522370972, 'DingZhenLover'),
  ('BV1wm3s6qEnT', 3546838825175669, 'Su1phur_硫方'),
  ('BV1ww411H7kc', 1045083807, '夏末ys'),
  ('BV1x14y137Zw', 1366012914, 'regretted_____'),
  ('BV1xG4y1y7Kr', 347758030, 'Dymonix'),
  ('BV1xSMc6TEuY', 1366539637, 'alPaca312'),
  ('BV1xa411t71E', 410248108, '知涵oxpase'),
  ('BV1xe411w7sw', 401504425, 'ilIerror'),
  ('BV1xe4y1C7kD', 398909647, 'Archerッ'),
  ('BV1xhfmYPEnK', 1675592533, 'Squirrel_LLL'),
  ('BV1xt9eB6E8K', 544319692, '寒冷的雨Owo'),
  ('BV1xx1jBzE9j', 499994022, '冥王星_Plut0'),
  ('BV1y44y1H7t2', 272542996, '-多宝睡不醒-'),
  ('BV1yNcgzXEa6', 342476492, 'Fe180O240'),
  ('BV1ye4y137J5', 1914211436, '账号已注销'),
  ('BV1ym421s7t9', 365774051, 'Piggy_pog'),
  ('BV1yp4y1A7V2', 37292347, '小狮子'),
  ('BV1z46nBdEaS', 1149127947, 'Yings_lyd'),
  ('BV1zPczeqEYj', 3546772169296412, '海上香克斯'),
  ('BV1zT411L7dW', 167361236, 'Cher_lx'),
  ('BV1zVWMezE3Z', 1817338421, 'HaroldHC'),
  ('BV1za411U78v', 408065749, '02翔哥'),
  ('BV1zogwzEEwx', 629242445, '老呆茶狗');

-- ===== 3. 暂存：文档有、站点没有的成绩 =====
CREATE TEMP TABLE stg_new_run (version text, type text, bvid text, doc_name text,
                               mid bigint, igt text, rdate text, videolink text,
                               seed text, remarks text, rank_no int);
INSERT INTO stg_new_run (version, type, bvid, doc_name, mid, igt, rdate, videolink, seed, remarks, rank_no)
SELECT version, type, bvid, doc_name, mid, igt, rdate, videolink, seed, remarks, rank_no FROM (SELECT NULL::text a) t WHERE false;

-- ===== 4. 所有权表：一个 mid 只能归一个用户，一个用户只能有一个 mid =====
-- 4a. 由站点已有 verified 成绩推出（该玩家名下可解析视频必须只有单一 mid，
--     且这个 mid 不能被别的玩家同时主张）
CREATE TEMP TABLE stg_user_one_mid AS
  SELECT r.userid, min(s.mid) AS mid
    FROM runs r JOIN stg_bv s ON s.bvid = r.bvid
   WHERE r.status = 'verified'
   GROUP BY r.userid
  HAVING count(DISTINCT s.mid) = 1;

CREATE TEMP TABLE stg_owner (mid bigint PRIMARY KEY, userid numeric UNIQUE NOT NULL, via text);

INSERT INTO stg_owner (mid, userid, via)
  SELECT m.mid, m.userid, 'run'
    FROM stg_user_one_mid m
   WHERE (SELECT count(*) FROM stg_user_one_mid o WHERE o.mid = m.mid) = 1;

-- 4b. 文档行的 mid 落到一个"同名且尚未被认领"的现有档案上
INSERT INTO stg_owner (mid, userid, via)
  SELECT x.mid, x.userid, 'nick' FROM (
    SELECT DISTINCT ON (s.mid) s.mid, tgt.id AS userid
      FROM stg_new_run s
      JOIN LATERAL (SELECT u.id FROM users u
                     WHERE btrim(u.nickname) = btrim(s.doc_name)
                       AND NOT EXISTS (SELECT 1 FROM stg_owner o WHERE o.userid = u.id)
                     ORDER BY (u.bili_id IS NOT NULL) DESC, u.id
                     LIMIT 1) tgt ON true
     WHERE s.mid IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM stg_owner o WHERE o.mid = s.mid)
     ORDER BY s.mid, tgt.id) x
 WHERE NOT EXISTS (SELECT 1 FROM stg_owner o WHERE o.userid = x.userid);

-- 4c. 谁都不认识的，建新档案
--     昵称一律用文档名：与第 7 步的策略保持一致（B站单方面与文档不符的名字不自动采用）
CREATE TEMP TABLE stg_need_player AS
  SELECT DISTINCT ON (coalesce(s.mid::text, s.doc_name))
         s.mid, s.doc_name, btrim(s.doc_name) AS nickname
    FROM stg_new_run s
   WHERE NOT EXISTS (SELECT 1 FROM stg_owner o WHERE o.mid = s.mid)
     AND NOT EXISTS (SELECT 1 FROM users u WHERE btrim(u.nickname) = btrim(s.doc_name))
   ORDER BY coalesce(s.mid::text, s.doc_name), s.rank_no;

INSERT INTO users (nickname, bili_id, role)
  SELECT y.nickname, y.mid::text, 'user' FROM (
    SELECT DISTINCT ON (nickname) nickname, mid
      FROM stg_need_player ORDER BY nickname, mid) y;

INSERT INTO stg_owner (mid, userid, via)
  SELECT p.mid, u.id, 'new'
    FROM stg_need_player p JOIN users u ON btrim(u.nickname) = p.nickname
   WHERE p.mid IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM stg_owner o WHERE o.mid = p.mid OR o.userid = u.id);

-- ===== 5. 回填 users.bili_id =====
UPDATE users u SET bili_id = o.mid::text
  FROM stg_owner o WHERE u.id = o.userid AND u.bili_id IS NULL;

-- ===== 6. 插入新成绩（mid 优先、同名兜底；bvid 或同玩家同成绩已存在则跳过）=====
INSERT INTO runs (userid, igt, date, version, type, videolink, seed, remarks, status, bvid)
  SELECT COALESCE(o.userid, n.userid), s.igt, s.rdate, s.version, s.type,
         NULLIF(s.videolink, ''), NULLIF(s.seed, ''), NULLIF(s.remarks, ''),
         'verified', NULLIF(s.bvid, '')
    FROM stg_new_run s
    LEFT JOIN stg_owner o ON o.mid = s.mid
    LEFT JOIN LATERAL (SELECT u.id AS userid FROM users u
                        WHERE btrim(u.nickname) = btrim(s.doc_name)
                        ORDER BY (u.bili_id IS NOT NULL) DESC, u.id
                        LIMIT 1) n ON o.userid IS NULL
   WHERE COALESCE(o.userid, n.userid) IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM runs r
                      WHERE r.bvid IS NOT NULL AND r.bvid = NULLIF(s.bvid, ''))
     AND NOT EXISTS (SELECT 1 FROM runs r2
                      WHERE r2.userid = COALESCE(o.userid, n.userid)
                        AND r2.igt = s.igt AND r2.version = s.version AND r2.type = s.type);

-- ===== 7. 昵称同步（只改 users.nickname，runs 靠 userid 关联不受影响）=====
-- 仅包含"文档名 == B站现名 != 站点名"的项；B站单方面与文档不符的见报告 4b，未写入。
UPDATE users SET nickname = '1by1_legopiece' WHERE id = 42 AND nickname = 'liucc4308'
   AND NOT EXISTS (SELECT 1 FROM users u2 WHERE u2.nickname = '1by1_legopiece' AND u2.id <> 42);  -- BV12vEV6hEk8
UPDATE users SET nickname = 'Welight6' WHERE id = 89 AND nickname = '_aqva'
   AND NOT EXISTS (SELECT 1 FROM users u2 WHERE u2.nickname = 'Welight6' AND u2.id <> 89);  -- BV1Sd8F6fEqL
UPDATE users SET nickname = 'shadow啥都没有' WHERE id = 276 AND nickname = 'sdmy233'
   AND NOT EXISTS (SELECT 1 FROM users u2 WHERE u2.nickname = 'shadow啥都没有' AND u2.id <> 276);  -- BV16Bu76CEtx

-- ===== 7b. 清掉昵称里的首尾空格（如 users.id=171 '怂骨素 '）=====
UPDATE users SET nickname = btrim(nickname) WHERE nickname <> btrim(nickname);

-- ===== 8. 校验：执行后看这一段，数字符合预期再 COMMIT =====
SELECT '1.16.1 RSG 成绩总数' AS metric, count(*) AS n FROM runs
 WHERE version='1.16.1' AND type='RSG' AND status='verified'
UNION ALL SELECT '1.15.2 RSG 成绩总数', count(*) FROM runs
 WHERE version='1.15.2' AND type='RSG' AND status='verified'
UNION ALL SELECT '1.16.1 实际上榜人数(每人一条)', count(DISTINCT userid) FROM runs
 WHERE version='1.16.1' AND type='RSG' AND status='verified'
UNION ALL SELECT '1.15.2 实际上榜人数(每人一条)', count(DISTINCT userid) FROM runs
 WHERE version='1.15.2' AND type='RSG' AND status='verified'
UNION ALL SELECT 'users 总数', count(*) FROM users
UNION ALL SELECT 'bili_id 已回填', count(*) FROM users WHERE bili_id IS NOT NULL
UNION ALL SELECT 'runs.bvid 已填', count(*) FROM runs WHERE bvid IS NOT NULL
UNION ALL SELECT '异常:同 bili_id 多档案', count(*) FROM
  (SELECT bili_id FROM users WHERE bili_id IS NOT NULL GROUP BY bili_id HAVING count(*)>1) d
UNION ALL SELECT '异常:同昵称多档案', count(*) FROM
  (SELECT nickname FROM users GROUP BY nickname HAVING count(*)>1) e
UNION ALL SELECT '异常:孤儿成绩(userid无档案)', count(*) FROM runs r
  WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = r.userid)
UNION ALL SELECT '新插入成绩条数', count(*) FROM runs r
  WHERE r.id NOT IN (SELECT id FROM _bk_20260910_runs)
UNION ALL SELECT '新建档案条数', count(*) FROM users u
  WHERE u.id NOT IN (SELECT id FROM _bk_20260910_users)
UNION ALL SELECT '被改昵称的档案', count(*) FROM users u
  JOIN _bk_20260910_users b ON b.id = u.id WHERE b.nickname IS DISTINCT FROM u.nickname
ORDER BY 1;

-- ============================================================================
-- 第 1 遍：保持 ROLLBACK; 直接执行 —— 上面的校验数字照常返回，但所有改动丢弃，
--          生产数据零变化。这是真正的 dry-run。
-- 第 2 遍：确认数字符合预期后，把下面这一行 ROLLBACK; **替换成** COMMIT; 再执行一次。
--          （只删掉 ROLLBACK 是不行的：BEGIN 后不提交，连接断开时会自动回滚）
-- ============================================================================
ROLLBACK;

/* ----------------------------------------------------------------------------
   万一落库后发现不对，用备份表整体还原：

   BEGIN;
   DELETE FROM runs;
   INSERT INTO runs SELECT * FROM _bk_20260910_runs;
   DELETE FROM users;
   INSERT INTO users SELECT * FROM _bk_20260910_users;
   COMMIT;

   users.id / runs.id 是序列生成的，还原后需重置，否则新注册会撞主键：
     SELECT setval(pg_get_serial_sequence('users','id'), (SELECT max(id)::int FROM users));
     SELECT setval(pg_get_serial_sequence('runs','id'),  (SELECT max(id) FROM runs));

   确认一切无误后清理备份：
     DROP TABLE _bk_20260910_users; DROP TABLE _bk_20260910_runs;
---------------------------------------------------------------------------- */
