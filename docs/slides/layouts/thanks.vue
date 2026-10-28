<script setup>
import finale from '../assets/thanks-anime-v4.png'
</script>

<template>
  <div class="slidev-layout thanks-slide">
    <img :src="finale" alt="Festa di arrosticini in Abruzzo: Genos combatte i bot di un attacco DDoS nell'angolo sinistro. Saitama cucina alla fornacella e guarda il signore, che ricambia lo sguardo mangiando un arrosticino, senza borse. La signora guarda in basso verso Genos e i bot, spaventata e con una mano sulla bocca." />
    <div class="thanks-title"><slot /></div>
    <SlideCurrentNo class="talk-page-number" />
  </div>
</template>
