// 统一图片优先级：已有实拍 → 已有合法图片 → 明确标注的类别插画。
export function imageCandidates(place){
  const images=[place.image,place.photo?.url,place.photo?.fallbackUrl,...(place.photos||[]).map(p=>p.url)];
  return [...new Set(images.filter(url=>typeof url==='string'&&/^https?:\/\//.test(url)))];
}
export function imageCategory(place){return ['CULTURE','ART','NATURE','FOOD','CAFE','SHOPPING'].includes(place.category)?place.category:'ATTRACTION';}
