// Curated identity/type evidence, reviewed 2026-11-10. Minute ranges are Pathly
// planning assumptions, NOT published official durations or current opening hours.
export const VISIT_PROFILE_VERSION=2;
export const profiles=[
 {key:'shanghai-disney',names:['上海迪士尼乐园','上海迪士尼度假区','Shanghai Disneyland','Shanghai Disney Resort'],country:'CN',lat:31.144,lng:121.657,type:'themePark',source:'https://www.shanghaidisneyresort.com/experience/guest-service/pre-arrival-information/'},
 {key:'hongkong-disney',names:['香港迪士尼乐园','Hong Kong Disneyland'],country:'HK',lat:22.312,lng:114.041,type:'themePark',source:'https://www.hongkongdisneyland.com/attractions/'},
 {key:'tokyo-disney',names:['东京迪士尼乐园','東京ディズニーランド','Tokyo Disneyland'],country:'JP',lat:35.632,lng:139.881,type:'themePark',source:'https://www.tokyodisneyresort.jp/en/tdl/'},
 {key:'paris-disney',names:['巴黎迪士尼乐园','Disneyland Paris','Disneyland Park'],country:'FR',lat:48.873,lng:2.776,type:'themePark',source:'https://news.disneylandparis.com/en/disneyland-park-discovery/'},
 {key:'beijing-universal',names:['北京环球影城','北京环球度假区','Universal Studios Beijing','Universal Beijing Resort'],country:'CN',lat:39.853,lng:116.675,type:'themePark',source:'https://www.universalbeijingresort.com/en/itinerary/young-adult'},
 {key:'palace-museum',names:['故宫博物院','北京故宫博物院','故宫','The Palace Museum','Palace Museum','Forbidden City'],country:'CN',lat:39.917,lng:116.397,type:'historicComplex',source:'https://www.dpm.org.cn/Visit.html',range:[180,240,360]},
 {key:'jingshan',names:['景山公园','Jingshan Park'],country:'CN',lat:39.925,lng:116.397,type:'cityPark',source:'https://gygl.beijing.gov.cn/mlgy/mlgy_lsmy/201911/t20191129_732675.html'},
 {key:'louvre',names:['卢浮宫','卢浮宫博物馆','Louvre','Louvre Museum','Musée du Louvre'],country:'FR',lat:48.861,lng:2.336,type:'majorMuseum',source:'https://www.louvre.fr/en/explore/visitor-trails'},
 {key:'british-museum',names:['大英博物馆','British Museum','The British Museum'],country:'GB',lat:51.519,lng:-.127,type:'majorMuseum',source:'https://www.britishmuseum.org/sites/default/files/2019-09/Visit_Under5_Guideb.pdf'},
];

// Verified named components, gated by parent identity AND proximity; nearby independent
// sites (Tiananmen / Jingshan / Palace Museum) are deliberately not merged.
export const SITE_COMPONENTS={
 'palace-museum':{radius:1.2,names:['午门','太和殿','中和殿','保和殿','乾清宫','交泰殿','坤宁宫','御花园','神武门'],source:'https://www.dpm.org.cn/classify_detail/159329.html'},
 jingshan:{radius:.6,names:['绮望楼','万春亭','观妙亭','周赏亭','辑芳亭','富览亭','寿皇殿'],source:'https://gygl.beijing.gov.cn/mlgy/mlgy_lsmy/201911/t20191129_732675.html'}
};
