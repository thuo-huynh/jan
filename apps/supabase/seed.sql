-- seed.sql
-- Dev/test seed data for TaskNihongo's global (user_id IS NULL) reference
-- catalog: a representative sample of N2 vocab_entries (words + kanji) and a
-- solid subset of real JLPT N2 grammar_points with grammar_confusable_pairs.
--
-- Scope note (per specs/001-tasknihongo/tasks.md T019/T020): full content
-- sourcing (~6,000 vocab words, ~1,000 kanji, the complete ~200-point grammar
-- catalog) is explicitly out of scope here. This file seeds enough real,
-- accurate N2 content to exercise every feature (dual-mode vocab/kanji
-- review, frequency-tag spread, the n3_overlap level-diff filter, and
-- confusable-pair comparisons) in dev/test without fabricating nonsense
-- entries.
--
-- Safe to re-run: deletes previously-seeded global rows first (identified by
-- user_id IS NULL), so this can be run repeatedly against a local/dev DB.

begin;

delete from public.grammar_confusable_pairs;
delete from public.grammar_points where user_id is null;
delete from public.vocab_entries where user_id is null;

-- ===========================================================================
-- Vocab entries (global, user_id IS NULL) — words
-- ===========================================================================
insert into public.vocab_entries (user_id, word, reading, meaning, example, jlpt_level, is_kanji) values
  (null, '影響',     'えいきょう',   'influence; effect',                    '彼の意見は会議に大きな影響を与えた。', 'N2', false),
  (null, '環境',     'かんきょう',   'environment',                           '地球の環境を守ることが大切だ。', 'N2', false),
  (null, '経済',     'けいざい',     'economy',                               '経済が急速に発展している。', 'N2', false),
  (null, '評価',     'ひょうか',     'evaluation; appraisal',                 '彼の作品は高く評価されている。', 'N2', false),
  (null, '解決',     'かいけつ',     'resolution; solution',                  '問題を解決する方法を考えよう。', 'N2', false),
  (null, '傾向',     'けいこう',     'tendency; trend',                       '最近、若者の間でこの傾向が強まっている。', 'N2', false),
  (null, '維持',     'いじ',         'maintenance; upkeep',                   '健康を維持するために運動している。', 'N2', false),
  (null, '普及',     'ふきゅう',     'widespread use; popularization',        'スマートフォンは急速に普及した。', 'N2', false),
  (null, '対応',     'たいおう',     'response; correspondence',              '状況に応じた対応が求められる。', 'N2', false),
  (null, '実現',     'じつげん',     'realization; achievement',              '夢を実現するために努力する。', 'N2', false),
  (null, '負担',     'ふたん',       'burden; load',                          '家族に負担をかけたくない。', 'N2', false),
  (null, '改善',     'かいぜん',     'improvement',                           '労働環境の改善が必要だ。', 'N2', false),
  (null, '促進',     'そくしん',     'promotion; encouragement',              '交流を促進するイベントを開いた。', 'N2', false),
  (null, '検討',     'けんとう',     'consideration; examination',            'その案について検討します。', 'N2', false),
  (null, '確保',     'かくほ',       'securing; ensuring',                    '人材の確保が課題となっている。', 'N2', false),
  (null, '削減',     'さくげん',     'reduction; cutback',                    'コストを削減する必要がある。', 'N2', false),
  (null, '普遍',     'ふへん',       'universality',                          'それは普遍的な真理だと言える。', 'N2', false),
  (null, '矛盾',     'むじゅん',     'contradiction',                         '彼の話には矛盾がある。', 'N2', false),
  (null, '偏見',     'へんけん',     'prejudice; bias',                       '偏見を持たずに人と接する。', 'N2', false),
  (null, '妥協',     'だきょう',     'compromise',                            'お互いに妥協して結論を出した。', 'N2', false),
  (null, '克服',     'こくふく',     'overcoming (a difficulty)',             '苦手なことを克服したい。', 'N2', false),
  (null, '普段',     'ふだん',       'usually; ordinarily',                   '普段はあまり外食しない。', 'N2', false),
  (null, '意識',     'いしき',       'awareness; consciousness',              '環境問題への意識が高まっている。', 'N2', false),
  (null, '把握',     'はあく',       'grasp; understanding',                  '現状を正確に把握することが重要だ。', 'N2', false),
  (null, '見込み',   'みこみ',       'prospect; expectation',                 '来年、景気は回復する見込みだ。', 'N2', false),
  (null, '効率',     'こうりつ',     'efficiency',                            '作業の効率を上げる工夫をする。', 'N2', false),
  (null, '柔軟',     'じゅうなん',   'flexible',                              '柔軟な対応が求められている。', 'N2', false),
  (null, '慎重',     'しんちょう',   'careful; prudent',                      '慎重に判断する必要がある。', 'N2', false),
  (null, '率直',     'そっちょく',   'frank; candid',                         '率直な意見を聞かせてください。', 'N2', false),
  (null, '曖昧',     'あいまい',     'ambiguous; vague',                      '彼の返事は曖昧だった。', 'N2', false),
  (null, '徹底',     'てってい',     'thoroughness',                          '安全管理を徹底する。', 'N2', false),
  (null, '大幅',     'おおはば',     'substantial; drastic',                  '売上が大幅に増加した。', 'N2', false),
  (null, '見落とす', 'みおとす',     'to overlook',                           '重要な点を見落としてしまった。', 'N2', false),
  (null, '取り組む', 'とりくむ',     'to tackle; to work on',                 '新しい課題に取り組む。', 'N2', false),
  (null, '踏まえる', 'ふまえる',     'to base on; to take into account',      '過去のデータを踏まえて計画を立てる。', 'N2', false),
  (null, '見なす',   'みなす',       'to regard as; to deem',                 '返事がない場合は辞退したとみなす。', 'N2', false),
  (null, '相次ぐ',   'あいつぐ',     'to occur one after another',            '事故が相次いでいる。', 'N2', false),
  (null, '携わる',   'たずさわる',   'to be engaged in',                      '教育に長年携わってきた。', 'N2', false),
  (null, '心掛ける', 'こころがける', 'to be mindful of; to keep in mind',     '健康に心掛けている。', 'N2', false),
  (null, '見直す',   'みなおす',     'to reconsider; to review',              '計画を見直す必要がある。', 'N2', false),
  (null, '欠かせない','かかせない',  'indispensable',                         '水は生活に欠かせないものだ。', 'N2', false);

-- ===========================================================================
-- Vocab entries (global, user_id IS NULL) — kanji recognition items
-- ===========================================================================
insert into public.vocab_entries (user_id, word, reading, meaning, example, jlpt_level, is_kanji) values
  (null, '影', 'えい / かげ',       'shadow; influence',                    null, 'N2', true),
  (null, '響', 'きょう / ひび(く)', 'to echo; to resound',                  null, 'N2', true),
  (null, '境', 'きょう / さかい',   'boundary; border',                     null, 'N2', true),
  (null, '済', 'さい / す(む)',     'to finish; to be settled',             null, 'N2', true),
  (null, '評', 'ひょう',            'criticism; comment; evaluation',       null, 'N2', true),
  (null, '価', 'か',                'value; price',                         null, 'N2', true),
  (null, '解', 'かい / と(く)',     'to solve; to untie; to understand',    null, 'N2', true),
  (null, '傾', 'けい / かたむ(く)', 'to incline; to lean',                  null, 'N2', true),
  (null, '維', 'い',                'to hold together; fiber',              null, 'N2', true),
  (null, '普', 'ふ',                'universal; general',                   null, 'N2', true),
  (null, '及', 'きゅう / およ(ぶ)', 'to reach; to amount to',               null, 'N2', true),
  (null, '対', 'たい / つい',       'opposite; versus; pair',               null, 'N2', true),
  (null, '応', 'おう',              'to respond; to apply',                 null, 'N2', true),
  (null, '実', 'じつ / み',         'reality; truth; fruit',                null, 'N2', true),
  (null, '現', 'げん / あらわ(れる)','to appear; present',                  null, 'N2', true),
  (null, '負', 'ふ / ま(ける)',     'to lose; to bear (a burden)',          null, 'N2', true),
  (null, '担', 'たん / かつ(ぐ)',   'to carry; to shoulder',                null, 'N2', true),
  (null, '善', 'ぜん / よ(い)',     'good; virtue',                         null, 'N2', true),
  (null, '促', 'そく / うなが(す)', 'to urge; to promote',                  null, 'N2', true),
  (null, '検', 'けん',              'to examine; to inspect',               null, 'N2', true),
  (null, '討', 'とう',              'to discuss; to examine',               null, 'N2', true),
  (null, '確', 'かく / たし(か)',   'certain; sure',                        null, 'N2', true),
  (null, '保', 'ほ / たも(つ)',     'to protect; to maintain',              null, 'N2', true),
  (null, '削', 'さく / けず(る)',   'to shave; to cut down',                null, 'N2', true),
  (null, '減', 'げん / へ(る)',     'to decrease',                          null, 'N2', true),
  (null, '矛', 'む / ほこ',         'spear; contradiction (compound)',      null, 'N2', true),
  (null, '盾', 'じゅん / たて',     'shield',                                null, 'N2', true),
  (null, '偏', 'へん / かたよ(る)', 'to lean; to be biased',                null, 'N2', true),
  (null, '妥', 'だ',                'appropriate; compromise (compound)',   null, 'N2', true),
  (null, '克', 'こく',              'to overcome; to be able',              null, 'N2', true),
  (null, '握', 'あく / にぎ(る)',   'to grasp; to hold',                    null, 'N2', true),
  (null, '率', 'りつ / ひき(いる)', 'rate; to lead',                        null, 'N2', true),
  (null, '徹', 'てつ',              'to penetrate; thorough',               null, 'N2', true),
  (null, '幅', 'ふく / はば',       'width; margin',                        null, 'N2', true);

-- ===========================================================================
-- Grammar points (global, user_id IS NULL)
-- Real N2 grammar patterns; frequency_tag spread across high/medium/low;
-- n3_overlap = true where the point is commonly also covered/reviewed at N3.
-- ===========================================================================
insert into public.grammar_points
  (user_id, pattern, meaning, connection_form, formality_nuance, example_sentences, jlpt_level, frequency_tag, n3_overlap) values
  (null, '〜わけではない', 'it''s not that... / doesn''t necessarily mean that...', '普通形 + わけではない', 'neutral, softens a negation', ARRAY['嫌いなわけではないが、あまり食べない。'], 'N2', 'high', true),
  (null, '〜わけがない', 'there''s no way that...', '普通形 + わけがない', 'assertive, emphatic', ARRAY['彼がそんなことを言うわけがない。'], 'N2', 'high', false),
  (null, '〜として', 'as (in the capacity/role of)', '名詞 + として', 'neutral to formal', ARRAY['彼は専門家として意見を述べた。'], 'N2', 'high', false),
  (null, '〜にとって', 'for; from the standpoint of', '名詞 + にとって', 'neutral', ARRAY['それは私にとって大切な思い出だ。'], 'N2', 'high', false),
  (null, '〜に対して', 'toward; in contrast to', '名詞 + に対して', 'neutral to formal', ARRAY['質問に対して丁寧に答えた。'], 'N2', 'high', false),
  (null, '〜に関して', 'regarding; concerning', '名詞 + に関して', 'formal', ARRAY['その件に関して詳しく説明します。'], 'N2', 'high', false),
  (null, '〜において', 'in; at (formal locus/time)', '名詞 + において', 'formal, written', ARRAY['現代社会において情報は重要な資源だ。'], 'N2', 'medium', false),
  (null, '〜をめぐって', 'surrounding; over (a dispute/topic)', '名詞 + をめぐって', 'formal', ARRAY['その計画をめぐって議論が続いている。'], 'N2', 'medium', false),
  (null, '〜に基づいて', 'based on', '名詞 + に基づいて', 'formal', ARRAY['調査結果に基づいて報告書を作成した。'], 'N2', 'high', false),
  (null, '〜に伴って', 'accompanying; as a result of', '名詞/動詞辞書形 + に伴って', 'formal, written', ARRAY['人口の増加に伴って住宅needsが高まった。'], 'N2', 'medium', false),
  (null, '〜につれて', 'as... (progresses/changes)', '動詞辞書形/名詞 + につれて', 'neutral', ARRAY['季節が進むにつれて寒くなる。'], 'N2', 'high', true),
  (null, '〜にしたがって', 'in accordance with; as', '動詞辞書形/名詞 + にしたがって', 'neutral to formal', ARRAY['マニュアルにしたがって操作してください。'], 'N2', 'medium', false),
  (null, '〜ものの', 'although; even though', '普通形 + ものの', 'neutral, slightly formal', ARRAY['約束したものの、行けなくなった。'], 'N2', 'high', false),
  (null, '〜にもかかわらず', 'despite; in spite of', '普通形/名詞 + にもかかわらず', 'formal', ARRAY['雨にもかかわらず、試合は行われた。'], 'N2', 'high', false),
  (null, '〜反面', 'on the other hand; while', '普通形/な形+な/名詞+の + 反面', 'neutral', ARRAY['給料はいい反面、仕事はきつい。'], 'N2', 'medium', false),
  (null, '〜一方で', 'while; on the other hand', '普通形 + 一方で', 'neutral to formal', ARRAY['都市は便利な一方で、物価が高い。'], 'N2', 'high', false),
  (null, '〜上で', 'after doing; on the basis of', '動詞た形 + 上で', 'formal', ARRAY['契約書をよく読んだ上で、サインしてください。'], 'N2', 'medium', false),
  (null, '〜上に', 'on top of; in addition to', '普通形 + 上に', 'neutral', ARRAY['この部屋は狭い上に、日当たりも悪い。'], 'N2', 'medium', false),
  (null, '〜たび（に）', 'every time', '動詞辞書形/名詞の + たびに', 'neutral', ARRAY['彼女に会うたびに元気をもらう。'], 'N2', 'medium', true),
  (null, '〜からこそ', 'precisely because', '普通形 + からこそ', 'emphatic', ARRAY['苦労したからこそ、成功の喜びが大きい。'], 'N2', 'high', false),
  (null, '〜ばかりに', 'just because; unfortunately as a result of', '普通形 + ばかりに', 'negative nuance', ARRAY['遅刻したばかりに、電車に乗り遅れた。'], 'N2', 'low', false),
  (null, '〜あげく', 'in the end (after much trouble)', '動詞た形/名詞の + あげく', 'negative nuance', ARRAY['さんざん悩んだあげく、留学を諦めた。'], 'N2', 'low', false),
  (null, '〜末に', 'finally, after (a period of)', '動詞た形/名詞の + 末に', 'neutral to formal', ARRAY['長い議論の末に、結論が出た。'], 'N2', 'medium', false),
  (null, '〜きり', 'only; ever since (and nothing since)', '動詞た形/名詞 + きり', 'neutral', ARRAY['彼とはあれきり会っていない。'], 'N2', 'low', false),
  (null, '〜をきっかけに', 'triggered by; taking the opportunity of', '名詞/動詞た形 + をきっかけに', 'neutral', ARRAY['この病気をきっかけに、生活習慣を見直した。'], 'N2', 'medium', false),
  (null, '〜ことから', 'from the fact that; because', '普通形 + ことから', 'formal, written', ARRAY['地形が似ていることから、その名がついた。'], 'N2', 'medium', false),
  (null, '〜ことに', 'to my (surprise/regret/etc.)', 'な形+な/い形/動詞た形 + ことに', 'neutral', ARRAY['驚いたことに、彼は一等賞を取った。'], 'N2', 'high', false),
  (null, '〜ことなく', 'without doing', '動詞辞書形 + ことなく', 'formal, written', ARRAY['彼は諦めることなく、挑戦し続けた。'], 'N2', 'medium', false),
  (null, '〜ことだから', 'because it''s just like (person) to...', '名詞の + ことだから', 'colloquial-ish, based on shared knowledge', ARRAY['真面目な彼のことだから、きっと時間通り来るだろう。'], 'N2', 'low', false),
  (null, '〜につき', 'due to; per (formal)', '名詞 + につき', 'formal, written notices', ARRAY['台風接近につき、本日は休業いたします。'], 'N2', 'medium', false),
  (null, '〜に際して', 'on the occasion of; when', '名詞/動詞辞書形 + に際して', 'formal', ARRAY['卒業に際して、一言お礼を申し上げます。'], 'N2', 'medium', false),
  (null, '〜に先立ち', 'prior to', '名詞/動詞辞書形 + に先立ち', 'formal', ARRAY['開幕に先立ち、記者会見が行われた。'], 'N2', 'low', false),
  (null, '〜最中に', 'right in the middle of', '動詞ている/名詞の + 最中に', 'neutral', ARRAY['会議の最中に、電話が鳴った。'], 'N2', 'medium', true),
  (null, '〜かのように', 'as if', '普通形 + かのように', 'literary', ARRAY['まるで何もなかったかのように、彼は振る舞った。'], 'N2', 'medium', false),
  (null, '〜に違いない', 'must be; surely', '普通形 + に違いない', 'confident assertion', ARRAY['この味は本物のチーズに違いない。'], 'N2', 'high', true),
  (null, '〜に決まっている', 'surely; bound to be', '普通形 + に決まっている', 'confident, colloquial', ARRAY['そんな話、嘘に決まっている。'], 'N2', 'medium', true),
  (null, '〜に相違ない', 'must be (formal)', '普通形 + に相違ない', 'formal, written', ARRAY['この書類に不備があるに相違ない。'], 'N2', 'low', false),
  (null, '〜まい', 'will not; probably not (negative volitional)', '動詞辞書形 + まい', 'literary, firm negative intent', ARRAY['二度と同じ失敗はするまい。'], 'N2', 'low', false),
  (null, '〜ざるを得ない', 'cannot help but; have no choice but to', '動詞ない形(ざる) + を得ない', 'formal', ARRAY['体調が悪いので、欠席せざるを得ない。'], 'N2', 'high', false),
  (null, '〜ずにはいられない', 'cannot help doing', '動詞ない形(ず) + にはいられない', 'emotional emphasis', ARRAY['その映画を見て、泣かずにはいられなかった。'], 'N2', 'medium', false),
  (null, '〜てはいられない', 'cannot stay in this state', '動詞て形 + はいられない', 'urgency', ARRAY['もうのんびりしてはいられない。'], 'N2', 'low', false),
  (null, '〜ないことには', 'unless; without doing first', '動詞ない形 + ことには', 'conditional emphasis', ARRAY['実際に試さないことには、結果はわからない。'], 'N2', 'medium', false),
  (null, '〜ないことはない', 'it''s not that... cannot / there''s a possibility', '動詞ない形 + ことはない', 'hedged possibility', ARRAY['忙しいけど、手伝えないことはない。'], 'N2', 'medium', false),
  (null, '〜わりに', 'considering; relatively (unexpectedly so)', '普通形/な形+な/名詞の + わりに', 'neutral', ARRAY['狭いわりに、部屋は使いやすい。'], 'N2', 'high', false),
  (null, '〜くせに', 'even though (disdainful)', '普通形 + くせに', 'negative/critical nuance', ARRAY['知らないくせに、知ったふりをする。'], 'N2', 'medium', false),
  (null, '〜ものだから', 'because (excuse-giving)', '普通形 + ものだから', 'explanatory, slightly informal', ARRAY['道が混んでいたものだから、遅れました。'], 'N2', 'medium', false),
  (null, '〜もかまわず', 'not caring about; regardless of', '名詞/動詞辞書形の + もかまわず', 'formal', ARRAY['周りの目もかまわず、大声で泣いた。'], 'N2', 'low', false),
  (null, '〜はもとより', 'needless to say; not to mention', '名詞 + はもとより', 'formal', ARRAY['英語はもとより、中国語も話せる。'], 'N2', 'low', false),
  (null, '〜はさておき', 'aside from; setting aside', '名詞 + はさておき', 'neutral', ARRAY['冗談はさておき、本題に入りましょう。'], 'N2', 'medium', false),
  (null, '〜抜きで', 'without', '名詞 + 抜きで', 'neutral', ARRAY['今日は冗談抜きで話したい。'], 'N2', 'low', false),
  (null, '〜っぽい', '-ish; tends to be', '名詞/動詞ます形 + っぽい', 'casual', ARRAY['彼は子供っぽいところがある。'], 'N2', 'medium', true),
  (null, '〜がち', 'tend to; apt to (negative tendency)', '動詞ます形/名詞 + がち', 'neutral', ARRAY['最近、体調を崩しがちだ。'], 'N2', 'high', true),
  (null, '〜気味', 'a bit; slight tendency of', '名詞/動詞ます形 + 気味', 'neutral', ARRAY['最近、疲れ気味だ。'], 'N2', 'high', true),
  (null, '〜たまま', 'leaving as is; while still in a state', '動詞た形/名詞の + まま', 'neutral', ARRAY['電気をつけたまま寝てしまった。'], 'N2', 'high', true),
  (null, '〜たとたん(に)', 'the moment that; just as', '動詞た形 + とたん(に)', 'neutral', ARRAY['家を出たとたんに、雨が降り出した。'], 'N2', 'medium', false),
  (null, '〜か〜ないかのうちに', 'just as; almost simultaneously with', '動詞辞書形+か+動詞ない形+かのうちに', 'literary', ARRAY['ベルが鳴るか鳴らないかのうちに、教室を飛び出した。'], 'N2', 'low', false),
  (null, '〜次第', 'as soon as; depending on', '動詞ます形/名詞 + 次第', 'formal', ARRAY['到着し次第、ご連絡いたします。'], 'N2', 'high', false),
  (null, '〜てからでないと', 'not until after; unless first', '動詞て形 + からでないと', 'conditional', ARRAY['許可を得てからでないと、始められない。'], 'N2', 'medium', false),
  (null, '〜てはならない', 'must not', '動詞て形 + はならない', 'formal, prohibitive', ARRAY['ここに車を停めてはならない。'], 'N2', 'medium', true),
  (null, '〜てしょうがない', 'unbearably; cannot help feeling', '形容詞て形/動詞て形 + しょうがない', 'casual, emphatic', ARRAY['この問題が気になってしょうがない。'], 'N2', 'high', true),
  (null, '〜てならない', 'cannot help feeling', '形容詞て形/動詞て形 + ならない', 'formal, emphatic', ARRAY['将来が不安でならない。'], 'N2', 'medium', false),
  (null, '〜限り', 'as long as; to the extent that', '普通形 + 限り', 'neutral to formal', ARRAY['体力が続く限り、頑張るつもりだ。'], 'N2', 'medium', false),
  (null, '〜に限って', 'only in the case of; especially (ironic)', '名詞 + に限って', 'ironic nuance', ARRAY['急いでいる時に限って、電車が遅れる。'], 'N2', 'medium', false),
  (null, '〜のみならず', 'not only... but also', '普通形/名詞 + のみならず', 'formal, written', ARRAY['彼は日本語のみならず、韓国語も話せる。'], 'N2', 'medium', false),
  (null, '〜どころか', 'far from; let alone', '普通形/名詞 + どころか', 'emphatic contrast', ARRAY['忙しいどころか、暇で仕方ない。'], 'N2', 'high', false),
  (null, '〜どころではない', 'not the time/situation for', '名詞/動詞辞書形 + どころではない', 'emphatic', ARRAY['今は旅行どころではない。'], 'N2', 'medium', false),
  (null, '〜かねる', 'cannot do; difficult to do (polite refusal)', '動詞ます形 + かねる', 'formal, polite refusal', ARRAY['その質問にはお答えしかねます。'], 'N2', 'medium', false),
  (null, '〜かねない', 'might well (happen); risk of', '動詞ます形 + かねない', 'cautionary', ARRAY['無理をすると、体を壊しかねない。'], 'N2', 'high', false),
  (null, '〜を通じて', 'through; throughout', '名詞 + を通じて', 'formal', ARRAY['友人を通じて、その情報を知った。'], 'N2', 'medium', false),
  (null, '〜を契機に', 'taking as an opportunity/trigger', '名詞/動詞た形の + を契機に', 'formal', ARRAY['引っ越しを契機に、生活を見直した。'], 'N2', 'low', false),
  (null, '〜を問わず', 'regardless of', '名詞 + を問わず', 'formal', ARRAY['経験の有無を問わず、応募できます。'], 'N2', 'medium', false),
  (null, '〜せいで', 'because of (blame, negative result)', '普通形/名詞の + せいで', 'negative nuance', ARRAY['寝坊したせいで、遅刻した。'], 'N2', 'high', true),
  (null, '〜おかげで', 'thanks to (positive result)', '普通形/名詞の + おかげで', 'positive nuance', ARRAY['先生のおかげで、試験に合格できた。'], 'N2', 'high', true),
  (null, '〜上は', 'now that; since (having committed to)', '動詞た形/普通形 + 上は', 'formal, resolute', ARRAY['引き受けた上は、最後までやり遂げる。'], 'N2', 'low', false),
  (null, '〜ながらも', 'although; while (contrastive)', '動詞ます形/い形/な形 + ながらも', 'neutral to formal', ARRAY['小さいながらも、立派な店だ。'], 'N2', 'medium', false),
  (null, '〜つつ', 'while doing (formal simultaneity)', '動詞ます形 + つつ', 'formal, written', ARRAY['景色を眺めつつ、散歩を楽しんだ。'], 'N2', 'medium', false),
  (null, '〜つつある', 'in the process of; -ing (change in progress)', '動詞ます形 + つつある', 'formal, written', ARRAY['状況は改善しつつある。'], 'N2', 'medium', false),
  (null, '〜たところ', 'when; as a result of doing', '動詞た形 + ところ', 'neutral, narrative', ARRAY['問い合わせたところ、在庫があるとのことだった。'], 'N2', 'medium', false),
  (null, '〜ところに', 'just as; right when (interruption)', '動詞ている/た形 + ところに', 'neutral', ARRAY['出かけようとしたところに、電話がかかってきた。'], 'N2', 'medium', true),
  (null, '〜に応じて', 'according to; in response to', '名詞 + に応じて', 'neutral to formal', ARRAY['収入に応じて、税金の額が変わる。'], 'N2', 'high', false),
  (null, '〜いかんで', 'depending on', '名詞（の） + いかんで', 'formal, written', ARRAY['結果いかんで、方針を変える。'], 'N2', 'low', false),
  (null, '〜いかんにかかわらず', 'regardless of', '名詞（の） + いかんにかかわらず', 'formal, written', ARRAY['理由のいかんにかかわらず、遅刻は遅刻だ。'], 'N2', 'low', false),
  (null, '〜てまで', 'even go so far as to', '動詞て形 + まで', 'emphatic', ARRAY['借金をしてまで、旅行に行きたくない。'], 'N2', 'medium', false),
  (null, '〜うちに', 'while; before it changes', '動詞辞書形・ている/い形/な形 + うちに', 'neutral', ARRAY['温かいうちに食べてください。'], 'N2', 'high', true),
  (null, '〜や否や', 'as soon as; the instant that', '動詞辞書形 + や否や', 'literary', ARRAY['ベルが鳴るや否や、生徒たちは教室を飛び出した。'], 'N2', 'low', false),
  (null, '〜なり', 'as soon as; right after', '動詞辞書形 + なり', 'literary', ARRAY['彼は家に帰るなり、倒れ込んだ。'], 'N2', 'low', false),
  (null, '〜てからというもの', 'ever since; from the time that', '動詞て形 + からというもの', 'literary, emphasizes lasting change', ARRAY['子供が生まれてからというもの、生活が一変した。'], 'N2', 'low', false),
  (null, '〜べからず', 'must not (formal prohibition, signage)', '動詞辞書形 + べからず', 'archaic/formal, notices', ARRAY['芝生に入るべからず。'], 'N2', 'low', false),
  (null, '〜まじき', 'should not (moral obligation)', '動詞辞書形 + まじき + 名詞', 'formal, moral judgment', ARRAY['それは教師にあるまじき行為だ。'], 'N2', 'low', false),
  (null, '〜てやまない', 'never stop -ing; deeply (feel)', '動詞て形 + やまない', 'literary, emotional', ARRAY['ご活躍を願ってやみません。'], 'N2', 'low', false),
  (null, '〜あっての', 'that exists only because of', '名詞 + あっての + 名詞', 'formal, written', ARRAY['お客様あっての商売だ。'], 'N2', 'low', false),
  (null, '〜ならでは', 'unique to; characteristic of', '名詞 + ならでは', 'formal, complimentary', ARRAY['これは職人ならではの技術だ。'], 'N2', 'medium', false),
  (null, '〜がたい', 'hard to do; difficult to', '動詞ます形 + がたい', 'formal, written', ARRAY['彼の行動は理解しがたい。'], 'N2', 'medium', false),
  (null, '〜きらいがある', 'have a tendency to (negative)', '動詞辞書形/名詞の + きらいがある', 'formal, critical nuance', ARRAY['彼は物事を悲観的に見るきらいがある。'], 'N2', 'low', false);

-- ===========================================================================
-- Grammar confusable pairs (curated comparisons; reference by exact pattern)
-- ===========================================================================
insert into public.grammar_confusable_pairs (grammar_point_id_a, grammar_point_id_b, comparison_note)
select a.id, b.id,
$$**〜として vs 〜にとって**

- **〜として** (as / in the capacity of) attaches to a *role or category* the subject itself occupies, and the sentence describes an action or state *from within that role*. e.g. 「彼は専門家として意見を述べた」= he spoke *in his capacity as* an expert.
- **〜にとって** (for / from the standpoint of) attaches to a *person or entity whose perspective/judgment* is being expressed, describing how something is evaluated *from their point of view*. e.g. 「それは私にとって大切だ」= *from my perspective*, that is important.

Rule of thumb: if you can rephrase as "acting in the role of X, ..." use として; if you can rephrase as "from X's point of view, ..." use にとって. They are not interchangeable because として never carries a subjective-evaluation nuance, and にとって cannot express "acting as a role."$$
from public.grammar_points a, public.grammar_points b
where a.pattern = '〜として' and b.pattern = '〜にとって';

insert into public.grammar_confusable_pairs (grammar_point_id_a, grammar_point_id_b, comparison_note)
select a.id, b.id,
$$**〜わけではない vs 〜わけがない**

- **〜わけではない** ("it's not that... / doesn't necessarily mean that...") *partially* negates an implication that could otherwise be drawn from context — it softens, rather than flatly denies. e.g. 「嫌いなわけではない」= it's not that I dislike it (but I'm not saying I love it either).
- **〜わけがない** ("there's no way that...") is a *strong, confident denial* that something is possible or true at all — much closer to 絶対にない. e.g. 「彼がそんなことを言うわけがない」= there is absolutely no way he'd say that.

They are frequently confused because both contain わけ + a negative form, but わけではない negates an *inference*, while わけがない negates the *possibility itself* — swapping them changes a hedge into an absolute claim (or vice versa).$$
from public.grammar_points a, public.grammar_points b
where a.pattern = '〜わけではない' and b.pattern = '〜わけがない';

insert into public.grammar_confusable_pairs (grammar_point_id_a, grammar_point_id_b, comparison_note)
select a.id, b.id,
$$**〜せいで vs 〜おかげで**

Both mean "because of / as a result of," attaching the same way (普通形/名詞の + せいで・おかげで), but differ entirely in *evaluative polarity*:

- **〜せいで** is used when the result is *negative/unwanted* — it assigns blame. 「寝坊したせいで、遅刻した」= because I overslept (my fault), I was late.
- **〜おかげで** is used when the result is *positive/beneficial* — it expresses gratitude. 「先生のおかげで、合格できた」= thanks to the teacher, I passed.

Using おかげで for a bad outcome (or せいで for a good one) reads as either sarcastic or simply wrong — this pair is tested precisely because learners default to "because of" in English without tracking the polarity.$$
from public.grammar_points a, public.grammar_points b
where a.pattern = '〜せいで' and b.pattern = '〜おかげで';

insert into public.grammar_confusable_pairs (grammar_point_id_a, grammar_point_id_b, comparison_note)
select a.id, b.id,
$$**〜がち vs 〜気味**

Both describe a mild negative tendency and are often both translatable as "tend to / a bit," but:

- **〜がち** describes a *recurring pattern of behavior/events over time* — frequency-based. 「最近、休みがちだ」= (he) tends to be absent lately (repeatedly, as a pattern).
- **〜気味** describes a *present, ongoing slight state/symptom*, often physical or a current trend — a snapshot, not a frequency pattern. 「最近、疲れ気味だ」= I'm feeling a bit tired lately (a current condition).

がち pairs naturally with countable recurring actions (休みがち, 遅刻しがち); 気味 pairs naturally with states/conditions (風邪気味, 疲れ気味, 太り気味) — swapping them sounds unnatural to native speakers even though a dictionary gloss makes them look equivalent.$$
from public.grammar_points a, public.grammar_points b
where a.pattern = '〜がち' and b.pattern = '〜気味';

insert into public.grammar_confusable_pairs (grammar_point_id_a, grammar_point_id_b, comparison_note)
select a.id, b.id,
$$**〜てしょうがない vs 〜てならない**

Both mean "cannot help feeling / unbearably X" and attach to the て-form of an い-adjective/verb expressing an involuntary feeling, but differ in register:

- **〜てしょうがない** is casual/conversational, extremely common in everyday speech. 「気になってしょうがない」= I can't help being bothered by it.
- **〜てならない** is more formal/written, common in essays, news commentary, and more literary speech. 「不安でならない」= I cannot help but feel anxious.

Functionally near-identical in meaning; the confusable distinction tested on N2 is almost purely *register* (casual vs. formal), plus てならない sounding slightly stiff/dated in casual conversation.$$
from public.grammar_points a, public.grammar_points b
where a.pattern = '〜てしょうがない' and b.pattern = '〜てならない';

commit;
