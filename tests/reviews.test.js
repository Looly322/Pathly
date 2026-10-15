import {test} from 'node:test';
import assert from 'node:assert/strict';
import {touristReviewLink,tripadvisorDetailUrl} from '../src/utils/reviews.js';
for(const [city,country,names] of [['Beijing','China',['故宫博物院','天坛']],['Tokyo','Japan',['Tokyo Tower','Senso-ji']],['Paris','France',['Eiffel Tower','Louvre Museum']]]) {
 for(const name of names)test(`${city}: ${name} uses disambiguated external search`,()=>{
  const link=touristReviewLink({name,source:'opentripmap',rating:5,rate:3,total_reviews:999},{city,country});
  assert.equal(link.direct,false);assert.equal(new URL(link.url).searchParams.get('q'),`${name} ${city} ${country}`);
  assert.equal('rating' in link,false);
 });
}
const detail='https://www.tripadvisor.com/Attraction_Review-g14129730-d320047-Reviews-Tokyo_Tower-Shibakoen_Minato_Tokyo_Tokyo_Prefecture_Kanto.html';
test('provider-supplied detail URL is retained, tracking stripped',()=>{
 assert.equal(touristReviewLink({name:'Tokyo Tower',source:'opentripmap',website:detail+'?tracking=1'}).url,detail);
 assert.equal(touristReviewLink({name:'Tokyo Tower',source:'mock',website:detail}).direct,false);
});
test('unsafe, search, unrelated and spoofed URLs fall back to search',()=>{
 for(const url of ['javascript:alert(1)',detail.replace('www.tripadvisor.com','www.tripadvisor.com.evil.test'),detail.replace('https:', 'http:'),'https://www.tripadvisor.com/Search?q=Tower','https://www.tripadvisor.com/Hotel_Review-g1-d2-Reviews-X.html',detail.replace('www.tripadvisor.com','user@www.tripadvisor.com')])assert.equal(tripadvisorDetailUrl(url),null);
});
