<script setup>
import failure from '../assets/aws-task-redundancy.png'
import deployment from '../assets/aws-rolling-update.png'
import attack from '../assets/aws-ddos-protection-v2.png'
import traffic from '../assets/aws-autoscaling.png'
</script>

<template>
  <div class="slidev-layout shop-problems aws-solutions">
    <header><slot /></header>
    <div class="shop-scenes">
      <figure>
        <img :src="failure" alt="Due container: uno fuori servizio con una X rossa, l'altro funzionante continua a ricevere le richieste." />
        <figcaption>Crash di un server/task</figcaption>
      </figure>
      <figure>
        <img :src="deployment" alt="Rolling update in tre passaggi: due container della vecchia versione, uno vecchio e uno nuovo, infine due nuovi. Il traffico continua a raggiungere i container attivi." />
        <figcaption>Nuova versione</figcaption>
      </figure>
      <figure>
        <img :src="attack" alt="Genos protegge il cloud bloccando il traffico DDoS, mentre Saitama, One Punch Man, è seduto accanto e mangia arrosticini." />
        <figcaption>Attacco DDoS</figcaption>
      </figure>
      <figure>
        <img :src="traffic" alt="I container raddoppiano da due a quattro per distribuire il traffico; la lancetta del carico passa dalla zona rossa alla zona verde." />
        <figcaption>Picco di traffico</figcaption>
      </figure>
    </div>
    <SlideCurrentNo class="talk-page-number" />
  </div>
</template>
