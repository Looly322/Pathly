import { cityNames } from '../data/mockPlaces'
export function resolveCity(cityName) {
  const name = cityName.trim()
  const key = Object.keys(cityNames).find(key => [key,cityNames[key].zh,cityNames[key].zh+'市',cityNames[key].en.toLowerCase()].includes(name.toLowerCase()))
  return { name, key, supported:!!key, source:'mock' }
}
export function searchCity(keyword) { return keyword.trim() ? [resolveCity(keyword)] : [] }
