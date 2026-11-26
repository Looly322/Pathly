import { ref } from 'vue'
export const themes = { Grape:'#3c096c', Ocean:'#086f88', Forest:'#266448', Sunset:'#b74723', Rose:'#a33469' }
export const theme = ref(localStorage.getItem('pathly-theme') || 'Grape')
export const customColor = ref(localStorage.getItem('pathly-custom') || '#6651a5')
export function setTheme(name, color = customColor.value) {
  if (!themes[name] && name !== 'Custom') name = 'Grape'
  if (!/^#[0-9a-f]{6}$/i.test(color)) color = '#6651a5'
  theme.value = name; customColor.value = color
  const base = themes[name] || color
  const rgb = base.match(/\w\w/g).map(x => parseInt(x,16))
  const mix = (target,ratio) => `rgb(${rgb.map(v=>Math.round(v*(1-ratio)+target*ratio)).join(',')})`
  const root = document.documentElement
  const luminance = rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0)
  Object.entries({'--primary':base,'--primary-dark':mix(0,.22),'--primary-light':mix(255,.55),'--primary-soft':mix(255,.94),'--on-primary':luminance>.38?'#17131e':'#fff'}).forEach(([k,v])=>root.style.setProperty(k,v))
  localStorage.setItem('pathly-theme',name);localStorage.setItem('pathly-custom',color)
}
setTheme(theme.value)
