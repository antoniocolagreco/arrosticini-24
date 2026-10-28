<script setup>
import failure from '../assets/shop-failure-v2.png'
import deployment from '../assets/shop-deployment-v3.png'
import ddos from '../assets/shop-ddos.png'
import traffic from '../assets/shop-traffic-v2.png'
</script>

<template>
  <div class="slidev-layout shop-problems">
    <header><slot /></header>
    <div class="shop-scenes">
      <figure>
        <img :src="failure" alt="Bottega al buio, vetrina rotta e due clienti irritati fuori. Il commerciante controlla il quadro elettrico." />
        <figcaption>Guasto</figcaption>
      </figure>
      <figure>
        <img :src="deployment" alt="Due operai portano via il banco frigo del negozio chiuso. Una cliente protesta e il compagno si mette le mani nei capelli, esasperati perché non possono comprare arrosticini." />
        <figcaption>Rinnovo</figcaption>
      </figure>
      <figure>
        <img :src="ddos" alt="Una folla con cartelli vuoti blocca l'ingresso. Due clienti con le borse restano fuori." />
        <figcaption>Protesta</figcaption>
      </figure>
      <figure>
        <img :src="traffic" alt="Una lunga fila di clienti aspetta di comprare arrosticini. In primo piano una cliente sbuffa con le mani sui fianchi e il compagno indica esasperato l'orologio." />
        <figcaption>Ferragosto</figcaption>
      </figure>
    </div>
    <SlideCurrentNo class="talk-page-number" />
  </div>
</template>
