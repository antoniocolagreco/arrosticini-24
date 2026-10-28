<script setup>
import failure from '../assets/aws-task-crash.png'
import deployment from '../assets/aws-new-version.png'
import attack from '../assets/aws-ddos.png'
import traffic from '../assets/aws-traffic-spike.png'
</script>

<template>
  <div class="slidev-layout shop-problems aws-problems">
    <header><slot /></header>
    <div class="shop-scenes">
      <figure>
        <img :src="failure" alt="Un container applicativo si arresta e smette di ricevere richieste." />
        <figcaption>Crash di un server/task</figcaption>
      </figure>
      <figure>
        <img :src="deployment" alt="Una nuova immagine del container sostituisce la versione precedente." />
        <figcaption>Nuova versione</figcaption>
      </figure>
      <figure>
        <img :src="attack" alt="Un attacco DDoS satura il servizio: le richieste dei clienti reali non riescono a passare e gli acquisti sono bloccati." />
        <figcaption>Attacco DDoS</figcaption>
      </figure>
      <figure>
        <img :src="traffic" alt="Molte richieste legittime raggiungono i task e portano la CPU nella zona rossa." />
        <figcaption>Picco di traffico</figcaption>
      </figure>
    </div>
    <SlideCurrentNo class="talk-page-number" />
  </div>
</template>
