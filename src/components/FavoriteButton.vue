<script setup>
import {ref,onMounted,onBeforeUnmount} from 'vue';import {readLibrary,toggleFavorite,favoriteMatch} from '../services/travelLibrary';import {language} from '../i18n';
const props=defineProps({type:String,data:Object,snapshot:Function});const saved=ref(false),error=ref('');function refresh(){try{saved.value=readLibrary('favorites').some(e=>favoriteMatch(e,props.type,props.data));}catch(e){error.value=e.message;}}function toggle(){try{saved.value=toggleFavorite(props.type,props.data,props.snapshot?.());error.value='';}catch(e){error.value=e.message;}}
onMounted(()=>{refresh();window.addEventListener('pathly-library',refresh);});onBeforeUnmount(()=>window.removeEventListener('pathly-library',refresh));
</script><template><button type="button" class="text-button favorite-button" :aria-pressed="saved" @click.stop="toggle">{{saved?'♥':'♡'}} {{language==='zh'?(saved?'已收藏':'收藏'):(saved?'Saved':'Save')}}</button><small v-if="error" role="alert">{{error}}</small></template>
