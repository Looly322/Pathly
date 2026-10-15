<script setup>
import {computed} from 'vue';
import {t} from '../i18n';
import {touristReviewLink} from '../utils/reviews';
const props=defineProps({place:{type:Object,required:true},destination:{type:Object,default:()=>({})}});
const link=computed(()=>touristReviewLink(props.place,props.destination));
// 当前 Provider 没有经核验的游客评分/评论数；禁止将 rate、quality 或旧 mock rating 显示成评价。
</script>
<template>
  <div class="tourist-reviews" @click.stop>
    <p class="review-rating">{{t('planner.noReviewRating')}}</p>
    <a class="review-button" :href="link.url" target="_blank" rel="noopener noreferrer" :aria-label="t('planner.viewReviews')+' · '+place.name">{{t('planner.viewReviews')}} ↗</a>
    <small>Tripadvisor · {{t(link.direct?'planner.reviewDirect':'planner.reviewSearch')}}</small>
  </div>
</template>
<style scoped>
.tourist-reviews{margin:12px 0;display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px}.tourist-reviews .review-rating{width:100%;margin:0;font-size:12px;color:var(--text-secondary)}.review-button{display:inline-flex;padding:8px 12px;border:1px solid var(--border);border-radius:7px;color:var(--primary);text-decoration:none;font-size:13px;background:var(--surface)}.review-button:hover{border-color:var(--primary);background:var(--primary-soft)}.review-button:focus-visible{outline:2px solid var(--primary);outline-offset:3px}.tourist-reviews small{font-size:12px;color:var(--text-secondary)}
</style>
