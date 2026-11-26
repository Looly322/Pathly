<script setup>
import { t } from '../i18n'
defineProps({value:Number})
</script>
<template><span class="crowd-badge" :class="value>=65?'busy':value>=35?'moderate':'quiet'"><i/>{{t('estimatedCrowd')}} · {{t(`crowdLabels.${value>=65?'high':value>=35?'medium':'low'}`)}}</span></template>
