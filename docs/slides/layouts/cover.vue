<script setup>
import landscape from '../../images/background.webp'
import airplane from '../../images/airplane.webp'
</script>

<template>
  <div class="slidev-layout talk-cover">
    <p class="talk-project">Arrosticini 24ore</p>
    <img class="talk-landscape" :src="landscape" alt="" />
    <img class="talk-airplane" :src="airplane" alt="" />
    <div class="talk-content"><slot /></div>
    <SlideCurrentNo class="talk-page-number" />
  </div>
</template>
