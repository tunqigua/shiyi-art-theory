// Restore documented pending questions, retaining each original item and the grading policy.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx={window:{}};for(const f of ['questions.js','fill-questions.js','explanations.js'])vm.runInNewContext(fs.readFileSync('dist/'+f,'utf8'),ctx);
const choice=ctx.window.SHIYI_QUESTION_BANK,fill=ctx.window.SHIYI_FILL_BANK;
const sources={
 rodin:['艺术形象教学资料','https://ggyishu.sqnu.edu.cn/__local/3/FD/3F/0B7A01237342259BCCEC0A14E8A_D02B628D_1CC405.pdf'],
 louvre:['卢浮宫：浪漫主义绘画','https://www.louvre.fr/en/explore/visitor-trails/the-louvre-s-masterpieces/romanticism-topicality-sensuality'],
 drama:['中国戏剧家协会：戏剧门类','https://chinatheatre.org.cn/jxgg/202604/t20260416_1358881.html'],
 tragedians:['上海外国语大学：古希腊戏剧课程','https://ses.shisu.edu.cn/da/2a/c17078a186922/page.htm'],
 tragedy:['高校悲剧分类教学资料','https://mooc1.chaoxing.com/mooc-ans/ztnodedetailcontroller/visitnodedetail?_from_=&courseId=200499704&knowledgeId=109058051&rtag='],
 ryazanov:['电影频道：《两个人的车站》','https://www.1905.com/mdb/film/48082/'],
 tolstoy:['山东大学：《战争与和平》讲座','https://culture.sdu.edu.cn/info/1223/4562.htm'],
 image:['彭吉象：意境的虚实结构','https://blog.sina.com.cn/s/blog_5d21c5890102x2cl.html'],
 wang:['中国美术学院：物境、情境、意境','https://caam.caa.edu.cn/info/1044/1836.htm'],
 attention:['艺术学概论教学转录：审美注意','https://qlljlyqh.com/nd.jsp?id=922'],
 baumgarten:['斯坦福哲学百科：18世纪德国美学','https://plato.stanford.edu/archives/sum2026/entries/aesthetics-18th-german/'],
 reception:['中国社会科学网：期待视野与空白','https://www.cssn.cn/wx/wx_wyx/202208/t20220802_5442778.shtml'],
 altamira:['西班牙文化部：阿尔塔米拉图像与年代','https://www.cultura.gob.es/mnaltamira/dam/jcr%3A178b1057-f52d-42db-852f-5ccf77855875/folleto-en-neocueva-altamira.pdf'],
 pottery:['国家民委：甘肃彩陶与彩陶王','https://www.neac.gov.cn/seac/c103391/202304/1162653.shtml'],
 vitruvius:['芝加哥大学图书馆：建筑三原则','https://www.lib.uchicago.edu/collex/exhibits/firmness-commodity-and-delight/'],
 listening:['故宫博物院：《听琴图》','https://www.dpm.org.cn/collection/paint/231409.html'],
 nietzsche:['李醒尘：尼采的美学思想','https://media.open.com.cn/media_file/0909/dongshi/meixue/xxzyku/lunwen/5/1.pdf'],
 structure:['小说结构教学摘录（非原版教材）','https://www.jjwxc.net/onebook.php?novelid=429672&chapterid=4'],
 science:['艺术与科学关系教学资料','https://mjineng.hqqt.com/chengrengk-kaoshi/news/14587869074645.html']
};
const reference=key=>key?{title:sources[key][0],url:sources[key][1],scope:'供核对提示中的具体知识点参考；不将考试口径与学术结论混为一谈。'}:null;
// Fill: chapter, number, answers, optional revised stem, notice, reference key, aliases.
const definitions=[
[1,16,['罗丹','感性','理性'],null,'原书只列罗丹，后两空按艺术形象的感性与理性统一补全。此处强调可感形式承载思想内容；个性与共性是艺术典型的另一组概念。','rodin'],
[6,80,['籍里柯'],null,'原书写德拉克罗瓦，属于作者错配；本题已按卢浮宫资料更正为籍里柯。不要与德拉克罗瓦《自由引导人民》混记。','louvre',[['热里科','热里柯','席里柯','籍里科','泰奥多尔籍里柯']]],
[6,81,['德拉克罗瓦'],null,'原书答案ABC不属于人名，已补正为德拉克罗瓦；作品也常译《自由引导人民》。','louvre'],
[7,21,['交响乐'],'____常被教材称作音乐艺术的精髓和音乐创作的重要高级形式。','原文没有挖空，已按后附答案补设填空；“最高形式”属教材评价性概括，不是对所有音乐类型的客观价值排名。',null],
[8,1,['剧本','演员','观众','演员','演员的表演艺术'],'人们常把____、____和____称作戏剧艺术的三要素，其中最本质的要素是____，戏剧的中心应当是____。','原书只给前三空；后两空按该教材关于演员和表演艺术的论述补全。此为本教材的表演中心论口径。','attention',[[],[],[],[],['表演艺术','演员表演','表演']]],
[8,15,['神话传说','英雄史诗','埃斯库罗斯','索福克勒斯','欧里庇得斯'],'古希腊悲剧的题材大多来自____与____，三大悲剧家是____、____和____。','原书只给前两空，已补全三大悲剧家；按姓名与人物配对记忆，不用死记空的顺序。','tragedians',[[],[],[],['索福克里斯'],['欧里庇德斯','欧里皮得斯']]],
[8,16,['话剧','中国戏曲','歌剧','舞剧','音乐剧'],'从广义上讲，戏剧包括____、____、____、____，乃至在欧美影响广泛的____等。','原题五空而答案只列四种，漏了舞剧；已补齐常见的五种门类。','drama',[[],['戏曲'],[],[],[]]],
[8,26,['历史剧','现代剧','儿童剧'],'按本题后附参考答案列举的戏剧类型，依次有____、____、____等。','按原书列举恢复三项并补足三空。历史/现代主要涉及时代与题材，儿童剧涉及受众；它们不是严格平行的同一分类轴，勿据此推断只有这三类。',null],
[8,34,['诗歌','散文','小说','戏剧剧本'],'按原题后附答案所列，常见文学体裁包括____、____、____和____。','原题把电影题干与文学体裁答案混排。此处明确修订为文学体裁题并补足四空；这四项不是电影样式的分类。',null,[[],[],[],['剧本','戏剧']]],
[8,43,['一悲到底','大团圆'],'按教材对中西悲剧结局倾向的概括，西方悲剧常遵循____的原则，中国戏曲悲剧结局往往追求____。','原书漏了后空，按教材补为大团圆。这是概括性比较，中西双方都存在反例，不代表每部作品一律如此。','tragedy',[[],['团圆','团圆结局','大团圆结局']]],
[8,47,['命运','性格','社会'],'按教材常见的历史概括，古希腊、文艺复兴、近代欧洲的悲剧常分别概括为____悲剧、____悲剧、____悲剧。','原题把不同分类轴直接等同，后附古典主义/浪漫主义/现实主义不能与命运/性格/社会简单一一对应。此题已改为明确的历史分期考法。','tragedy',[['命运悲剧'],['性格悲剧'],['社会悲剧']]],
[8,56,['命运的嘲弄','两个人的车站','办公室的故事','喜剧'],'梁赞诺夫的“爱情三部曲”包括____、____和____，从电影大类看属于____。','原书只列三部片名，漏了类型。这里明确问喜剧大类；爱情轻喜剧、抒情喜剧或悲喜剧是对其不同风格层面的描述。','ryazanov',[['命运的捉弄'],[],[],['抒情喜剧','悲喜剧','爱情轻喜剧','轻喜剧']]],
[9,11,['战争与和平','复活','安娜卡列尼娜','战争与和平'],'列夫·托尔斯泰的三部长篇代表作是____、____和____；其中篇幅最长的是____。','原书称其“三部曲”不严谨，已改为三部长篇代表作。托尔斯泰通常所说的自传三部曲是《童年》《少年》《青年》，不要混淆。','tolstoy',[[],[],['安娜卡列尼娜','安娜卡列宁娜'],[]]],
[10,67,['表现主义','超现实主义','意识流','马里内蒂'],null,'原书只列前两空，后两空补为意识流、马里内蒂。按教材作品与流派配对训练；不同译本的人名和书名可能存在差别。',null,[[],[],[],['马利内蒂','菲利波托马索马里内蒂']]],
[11,64,['意象','想象','感悟'],null,'原书“一箱”为明显文字讹误，已更正为意象。实处在可感的意象，虚处在欣赏者的想象与感悟。','image'],
[11,71,['物境','情境','意境'],null,'原书漏掉第三空，已补为意境；三境是本题所采用的传统诗论表述。','wang'],
[12,25,['有意注意','无意注意','有意注意'],null,'原书只给前两空，第三空按该教材补为有意注意。审美注意可以有多种起始方式，“多采用”不等于只允许这一种。','attention'],
[12,63,['鲍姆嘉通','1750'],'被称为“美学之父”的德国哲学家____于____年出版《美学》第一卷，这通常被视为美学作为独立学科的重要标志。','原书1950系年代错误；已改为1750年出版《美学》。注意首次提出aesthetics一词通常追溯到1735年，与出版《美学》不是同一事件。','baumgarten',[['鲍姆加登','鲍姆嘉登','鲍姆加通'],['1750年']]],
[12,75,['艺术意蕴','升华'],'在艺术鉴赏中，到了审美升华阶段，才更加集中于欣赏作品内在的____，使感性直观达到理性____。','原文未挖空，现按后附“艺术意蕴、升华”设置两空，未改变原段落的核心意思。',null],
[12,93,['期待视野','空白'],'接受美学中，姚斯提出了____理论，伊塞尔提出了文本____等理论。','原扫描题在“伊塞尔提”处截断，已按后附答案与接受美学概念补全设问；并非声称恢复了扫描件缺失的逐字原文。','reception',[['期待视界'],['空白理论','空白点']]],
[2,'w26-c02-f01',['2万'],null,'本题按试卷参考答案2万判分。西班牙文化部列举的多彩野牛约为14500 BP，不同图像年代和测年口径不同；不要把教材约数当作整个洞穴唯一年代。','altamira',[['两万','20000','二万','2万年','20000年']]],
[4,'w26-c04-f03',['佛教的寺庙'],null,'本题按原试卷“佛教的寺庙”判分。寺庙与早期演出关系密切，但“最早正式剧场”需要限定地区、时期与定义，不据此宣布统一的考古结论。',null,[['佛教寺庙','佛教寺院','寺庙','寺院']]],
[6,'w26-c06-f02',['2万'],null,'本题按试卷参考答案2万判分。阿尔塔米拉洞穴包含多个时期的图像，官方示例约14500至36000 BP；题目的笼统年代说法只作考试口径。','altamira',[['两万','20000','二万','2万年','20000年']]]
];
const log=[];
for(const [chapter,number,answers,revised,notice,ref,aliases] of definitions){
 const pending=fill.pending.find(q=>q.chapter===chapter&&(typeof number==='string'?q.source?.importId===number:q.number===number));
 if(!pending){assert(fill.questions.some(q=>q.id===(typeof number==='string'?number:`c${String(chapter).padStart(2,'0')}-f${String(number).padStart(3,'0')}`)));continue;}
 const id=typeof number==='string'?number:`c${String(chapter).padStart(2,'0')}-f${String(number).padStart(3,'0')}`;
 const refs=ref?[reference(ref)]:[];
 const q={id,type:'fill',chapter,stem:revised||pending.stem,answers,source:pending.source||{pdfPage:pending.page,number:pending.number,kind:'fill'},explanation:`用户提供题集 · PDF第${pending.page}页 · 第${chapter}章填空第${pending.number}题；2026-11-06补全或修订。`,study:{point:notice,sources:refs},reviewNotice:{policy:typeof number==='string'?'按原试卷参考答案判分':'本题已补全或修订，以下说明供对照',text:notice,sources:refs},restoredFrom:pending};
 if(aliases)q.aliases=aliases;
 assert.equal((q.stem.match(/____/g)||[]).length,answers.length,id);
 fill.questions.push(q);fill.pending=fill.pending.filter(p=>p!==pending);log.push({id,original:pending,restored:q});
}
const choiceDefs=[
[5,'s',19,'A','按原书红山判分。国家民委所指甘肃“彩陶王”为马家窑文化；原题未明确器物、且选项缺马家窑，存在指认混杂。','pottery'],
[7,'m',17,'ABCDE','按原书全选判分。A对主观意志的笼统说法也常用于概括叔本华；尼采的权力意志不宜与其等同。其余涉及日神/酒神、《悲剧的诞生》及审美人生的内容，可结合资料辨析。','nietzsche'],
[4,'s','w26-c04-s20','B','按原试卷文艺复兴判分。此答案更符合“艺术与科学联系”的常见教学表述，原题却写艺术与哲学，题干与答案文字层存在混杂，不把二者视作同一问题。','science'],
[5,'s','w26-c05-s20','B','按原试卷红山文化判分。原题辽宁西部的前提与甘肃马家窑文化“彩陶王”的常见指认并不一致；本题仅保留考试参考口径。','pottery'],
[5,'m','w26-c05-m04','BCE','按试卷实用、坚固、美观判分。适用与实用均可译述utilitas，A和B近义；参考答案不选A，并不证明“适用”在建筑原则中错误。','vitruvius'],
[6,'s','w26-c06-s23','A','按书中旧归属赵佶判分。故宫资料讨论该画由宣和画院画家描绘宋徽宗宫中行乐；考试旧归属和现行归属说明需区分。','listening']
];
function addChoice(p,key,id,notice,ref,part){
 const refs=ref?[reference(ref)]:[],answers=[...key].map(c=>c.charCodeAt(0)-65);
 const q={id,chapter:p.chapter,stem:p.stem,options:p.options.slice(),multiple:p.kind==='m',answers,source:p.source?{...p.source}:{page:p.page,number:p.number,kind:p.kind},explanation:`用户提供${p.source?'《'+p.source.document+'》PDF':'题集'}第${p.page}页 · ${p.kind==='m'?'多选':'单选'}第${p.number}题；原书参考答案：${p.originalKey}。`,reviewNotice:{policy:'按原书/原试卷参考口径练习',text:notice,sources:refs},restoredFrom:p};
 if(part){q.source.part=part;q.explanation+=' 第'+part+'空答案为教学补全。';}
 choice.questions.push(q);
 const originalLetter=i=>String.fromCharCode(65+i);
 ctx.window.SHIYI_EXPLANATIONS[id.replace(/-[1-9]$/,'')]={point:notice,options:Object.fromEntries(q.options.flatMap((text,i)=>answers.includes(i)?[]:[[originalLetter(i),p.source?.importId==='w26-c05-m04'&&i===0?'“适用”与实用近义；只因原试卷参考口径未选，不将它讲成错误概念。':`按本题参考答案不选“${text}”；应选内容为${answers.map(n=>q.options[n]).join('、')}，具体歧义见红字核对提示。`]])),sources:refs};
 log.push({id,original:p,restored:q});
}
for(const [chapter,kind,number,key,notice,ref]of choiceDefs){
 const p=choice.pending.find(q=>q.chapter===chapter&&(typeof number==='string'?q.source?.importId===number:q.kind===kind&&q.number===number));
 if(!p)continue;
 const id=typeof number==='string'?number:`c${String(chapter).padStart(2,'0')}-${kind}${String(number).padStart(2,'0')}`;
 addChoice(p,key,id,notice,ref);choice.pending=choice.pending.filter(q=>q!==p);choice.gradedSourceCount++;
}
const structure=choice.pending.find(q=>q.chapter===9&&q.kind==='s'&&q.number===21);
if(structure){
 const stems=['《安娜·卡列尼娜》的安娜与列文两条主要情节线索，在本题分类中属于（　）结构。','柳青《创业史》多条人物与事件线索交织，在本题分类中属于（　）结构。','《第五号屠场》围绕主人公经历作时空跳接，在本题分类中属于（　）结构。'];
 ['B','C','D'].forEach((key,i)=>addChoice({...structure,stem:stems[i]},key,'c09-s21-'+(i+1),'原书三空只列一个D；现按本题教学分类补为复线、蛛网、辐射。小说结构存在多种分析维度，此为复习用归类，不是三部作品唯一可能的结构描述。','structure',i+1));
 // All split parts share one complete explanation record in the existing format.
 ctx.window.SHIYI_EXPLANATIONS['c09-s21']={point:'本题按教学分类分别采用复线型、蛛网型、辐射型；原书仅列D，不足以覆盖三空。结构归类具有解释性，详见红字说明。',options:{A:'单线型沿主要线索展开，本组三个例子按题设分别用其他三类。',B:'复线型的典型是《安娜·卡列尼娜》的两条主要线索。',C:'蛛网型强调多条人物和事件线索交织，本题对应《创业史》。',D:'辐射型强调围绕核心经验展开的时空跳接，本题对应《第五号屠场》。'},sources:[reference('structure')]};
 choice.pending=choice.pending.filter(q=>q!==structure);choice.gradedSourceCount++;
}
choice.version=fill.version='2026-11-06-restored';
choice.answerPolicy='既有已更正答案继续保留；本轮争议题按用户指定的原书/试卷考试口径恢复，学术分歧及补全说明在答题后以红字展示。明确的文字错误、漏空及作者错配作修订，原题原答案逐项保留。';
choice.questions.sort((a,b)=>a.chapter-b.chapter||a.id.localeCompare(b.id,undefined,{numeric:true}));fill.questions.sort((a,b)=>a.chapter-b.chapter||a.id.localeCompare(b.id,undefined,{numeric:true}));
fs.writeFileSync('dist/questions.js','window.SHIYI_QUESTION_BANK = '+JSON.stringify(choice,null,2)+';\n');
fs.writeFileSync('dist/fill-questions.js','window.SHIYI_FILL_BANK = '+JSON.stringify(fill,null,2)+';\n');
fs.writeFileSync('dist/explanations.js','window.SHIYI_EXPLANATIONS = '+JSON.stringify(ctx.window.SHIYI_EXPLANATIONS,null,2)+';\n');
if(log.length){fs.writeFileSync('data/pending-resolutions-20261106.json',JSON.stringify({policy:choice.answerPolicy,restoredPendingItems:30,remaining:choice.pending,items:log},null,2)+'\n');}
console.log({restoredExerciseItems:log.length,choice:choice.questions.length,fill:fill.questions.length,pending:choice.pending.length+fill.pending.length});
