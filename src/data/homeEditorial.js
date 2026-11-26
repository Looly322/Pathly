// Curated inspiration only. The existing resolver remains the source of planning coordinates.
export const destinations=[
 {id:'beijing',zh:'北京',en:'Beijing',country:['中国','China'],query:'北京',queryEn:'Beijing, CN',note:['在古城的屋檐下，读懂时间。','Find history beneath the old city rooftops.']},
 {id:'tokyo',zh:'东京',en:'Tokyo',country:['日本','Japan'],query:'东京',queryEn:'Tokyo, JP',note:['在街角，遇见另一种日常。','A different everyday, around every corner.']},
 {id:'paris',zh:'巴黎',en:'Paris',country:['法国','France'],query:'巴黎',queryEn:'Paris, FR',note:['沿着塞纳河，把脚步放慢。','Take the long way along the Seine.']},
 {id:'rome',zh:'罗马',en:'Rome',country:['意大利','Italy'],query:'罗马',queryEn:'Rome, IT',note:['让每一步，都走进历史。','Walk into another chapter of history.']},
 {id:'kyoto',zh:'京都',en:'Kyoto',country:['日本','Japan'],query:'京都',queryEn:'Kyoto, JP',note:['留一点时间，给安静的小巷。','Leave a little time for the quiet lanes.']},
 {id:'london',zh:'伦敦',en:'London',country:['英国','United Kingdom'],query:'伦敦',queryEn:'London, GB',note:['在新与旧之间，找到自己的节奏。','Find your rhythm between old and new.']},
 {id:'shanghai',zh:'上海',en:'Shanghai',country:['中国','China'],query:'上海',queryEn:'Shanghai, CN',note:['沿江漫步，看城市点亮夜色。','Walk the waterfront as the city lights up.']},
 {id:'bali',zh:'巴厘岛',en:'Bali',country:['印度尼西亚','Indonesia'],query:'巴厘岛',queryEn:'Bali, Indonesia',note:['在热带海岸，把日子放慢。','Slow down along a tropical shore.']}
];
export const interests=[{id:'NATURE',image:'dolomites',title:['自然风光','Into nature'],text:['山野之间，自由呼吸。','A little further from the everyday.']},{id:'CULTURE',image:'rome',title:['历史文化','Through time'],text:['走过岁月留下的故事。','Follow the stories that stayed.']},{id:'CITY_WALK',image:'kyoto-night',title:['城市探索','City wanderings'],text:['不赶路，也能发现很多。','Let curiosity choose the next turn.']},{id:'FOOD',image:'food',title:['美食体验','A taste of somewhere'],text:['从一餐开始，认识一座城。','Meet a place through its table.']}];
export const copy={zh:{title:'世界很大，',title2:'下一站去哪？',subtitle:'让每一次出发，都有更好的安排。',eyebrow:'把向往，走成自己的旅程',start:'开始规划',scroll:'向下探索',pause:'暂停背景动态',play:'播放背景动态',scene:'山湖之间 · 旅行影像',film:'一帧远方，一次出发',interestTitle:'跟随热爱，去看世界。',interestSub:'选择一种旅行心情，让它成为行程的起点。',selected:'已加入兴趣',destTitle:'下一站，值得期待。',destSub:'八个目的地，八种相遇。也欢迎输入任何你想去的目的地。',destLabel:'精选目的地',planTitle:'把向往，安排成旅程。',planSub:'告诉我们你的时间、兴趣和节奏。剩下的，一起规划。',step:'你的旅行，从这里开始',credits:'影像来源与许可',fallback:'旅行影像暂不可用',planLink:'规划旅程',exploreLink:'探索目的地',interestLink:'寻找灵感',applied:'已更新旅行偏好',choose:'规划这座城市',foot:'路上的风景，由你决定。'},en:{title:'A world to discover.',title2:'Where to next?',subtitle:'A little more thought. A better journey.',eyebrow:'TURN YOUR CURIOSITY INTO A JOURNEY',start:'Plan my journey',scroll:'Explore below',pause:'Pause background motion',play:'Play background motion',scene:'Between mountains and water',film:'A frame of somewhere. A reason to go.',interestTitle:'Go where curiosity leads.',interestSub:'Choose a feeling. Make it the beginning of your itinerary.',selected:'Interest added',destTitle:'Somewhere to look forward to.',destSub:'Eight destinations. Eight ways to see the world. Or search for anywhere you have in mind.',destLabel:'CURATED DESTINATIONS',planTitle:'Make room for your next story.',planSub:'Share your time, interests and pace. We’ll help with the rest.',step:'YOUR JOURNEY STARTS HERE',credits:'Media sources & licensing',fallback:'Travel photograph unavailable',planLink:'Plan a journey',exploreLink:'Destinations',interestLink:'Find inspiration',applied:'Travel interests updated',choose:'Plan this destination',foot:'The way you see the world is yours.'}};

// English lines are original editorial renderings; Chinese text is preserved.
const poems=[
 {lines:['行到水穷处，','坐看云起时。'],credit:['王维《终南别业》','Wang Wei · My Retreat at Zhongnan'],english:'I walk to where the water ends, then sit and watch the clouds arise.',context:['山水意象与全球自然影像的主题联想，并非原诗地点实拍。','Global nature photography, thematically paired; not photographs of the poem’s setting.']},
 {lines:['人事有代谢，','往来成古今。'],credit:['孟浩然《与诸子登岘山》','Meng Haoran · Climbing Mount Xian with Friends'],english:'Human affairs pass and change; their coming and going forms the ages.',context:['原诗登岘山怀古；影像展现不同地区的建筑与历史。','The poem reflects on Mount Xian; the photographs explore architecture and history across regions.']},
 {lines:['东风夜放花千树，','更吹落、星如雨。'],credit:['辛弃疾《青玉案·元夕》','Xin Qiji · The Lantern Festival'],english:'An east wind blooms a thousand trees of light; stars fall like rain.',context:['元夕灯火引出城市漫游；配图并非原词地点。','Lantern Festival imagery introduces city wandering; the photos do not depict the poem’s setting.']},
 {lines:['日啖荔枝三百颗，','不辞长作岭南人。'],credit:['苏轼《惠州一绝》','Su Shi · A Quatrain at Huizhou'],english:'Three hundred lychees a day—I would gladly make Lingnan my home.',context:['原诗写岭南荔枝；影像呈现荔枝、街头食摊与不同地方的餐食。','The poem celebrates Lingnan lychees; the photos explore lychees, markets and regional food.']}
];
const walls=[
 [
  [
   "bright-moraine",
   "加拿大梦莲湖与雪山",
   "Moraine Lake, Canada"
  ],
  [
   "bright-alpine",
   "阳光下的高山草甸",
   "Sunlit alpine meadow"
  ],
  [
   "bright-forest",
   "夏日森林与湖泊",
   "Summer forest and lake"
  ],
  [
   "bright-austria",
   "奥地利夏日山野",
   "Summer mountains, Austria"
  ],
  [
   "bright-waterfall",
   "林间瀑布",
   "Forest waterfall"
  ],
  [
   "bright-hills",
   "晨光中的山林",
   "Forested hills in morning light"
  ]
 ],
 [
  [
   "bright-palace",
   "北京故宫红墙金瓦",
   "Forbidden City, Beijing"
  ],
  [
   "bright-colosseum",
   "罗马斗兽场内部",
   "Inside the Colosseum, Rome"
  ],
  [
   "bright-torii",
   "京都伏见稻荷大社鸟居",
   "Fushimi Inari torii, Kyoto"
  ],
  [
   "bright-roofs",
   "北京故宫宫殿",
   "Palace architecture, Forbidden City, Beijing"
  ],
  [
   "bright-forum",
   "罗马古罗马广场",
   "Roman Forum, Rome"
  ],
  [
   "bright-mini-torii",
   "京都神社的奉纳小鸟居",
   "Miniature votive torii at a Kyoto shrine"
  ]
 ],
 [
  [
   "bright-tokyo",
   "东京霓虹街道",
   "Neon street, Tokyo"
  ],
  [
   "bright-paris",
   "巴黎林荫街道",
   "Tree-lined avenue, Paris"
  ],
  [
   "bright-shanghai",
   "上海陆家嘴灯光",
   "Lujiazui lights, Shanghai"
  ],
  [
   "tokyo",
   "晴空下的东京塔",
   "Tokyo Tower under a blue sky"
  ],
  [
   "bright-bund",
   "上海黄浦江夜景",
   "Shanghai waterfront at night"
  ],
  [
   "london",
   "伦敦城市天际线",
   "London skyline"
  ]
 ],
 [
  [
   "wall-lychee",
   "荔枝果皮特写",
   "Lychee close-up"
  ],
  [
   "bright-dimsum",
   "中式点心与餐食",
   "Chinese dim sum and dishes"
  ],
  [
   "bright-nightmarket",
   "北京夜市食摊",
   "Beijing night-market stall"
  ],
  [
   "bright-market",
   "中国街头市场食摊",
   "Chinese street-market food stall"
  ],
  [
   "wall-fruit",
   "新鲜荔枝",
   "Fresh lychees"
  ],
  [
   "wall-seoul",
   "首尔市场面食摊",
   "Seoul market noodle stall"
  ]
 ]
];
interests.forEach((item,index)=>{item.poem=poems[index];item.wall=walls[index].map(([image,zh,en])=>({image,alt:[zh,en]}));});
