<script setup>
import finale from '../assets/thanks-anime-v5.png'
</script>

<template>
  <div class="slidev-layout thanks-slide">
    <img :src="finale" alt="Festa di arrosticini in Abruzzo, con la Maiella e le sue colline boscose sullo sfondo. Genos combatte i bot di un attacco DDoS nell'angolo sinistro. Saitama cucina alla fornacella e guarda il signore, che ricambia lo sguardo mangiando un arrosticino, senza borse. La signora guarda in basso verso Genos e i bot, spaventata e con una mano sulla bocca." />
    <div class="thanks-title"><slot /></div>
    <SlideCurrentNo class="talk-page-number" />
  </div>
</template>
