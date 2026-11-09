<script setup>
import rack from '../assets/on-premises-rack.png'
import datacenter from '../assets/aws-datacenter-drawing.png'
import aws from '../assets/logos/aws-wordmark.svg'
import capacity from '../assets/logos/chart-no-axes-column-increasing.svg'
import clock from '../assets/logos/clock.svg'
import settings from '../assets/logos/settings.svg'
import alert from '../assets/logos/circle-alert.svg'
</script>

<template>
  <div class="slidev-layout cloud-slide">
    <header><slot /></header>
    <h2 class="cloud-premises-heading">Server on premises</h2>
    <h2 class="cloud-region-heading">Regione <img :src="aws" alt="AWS" /></h2>

    <img class="cloud-rack" :src="rack" alt="Un singolo rack di server on premises, illustrato a inchiostro e acquerello" />

    <section class="cloud-region" aria-label="Schema di una regione con tre Availability Zone">
      <div class="cloud-zones">
        <figure><h3>AZ 1</h3><img :src="datacenter" alt="Disegno di un data center industriale AWS" /><figcaption>1+ data center</figcaption></figure>
        <figure><h3>AZ 2</h3><img :src="datacenter" alt="Disegno di un data center industriale AWS" /><figcaption>1+ data center</figcaption></figure>
        <figure><h3>AZ 3</h3><img :src="datacenter" alt="Disegno di un data center industriale AWS" /><figcaption>1+ data center</figcaption></figure>
      </div>
      <p>AZ separate, collegate tra loro</p>
    </section>

    <section class="cloud-comparison cloud-premises-points">
      <p><span><img :src="capacity" alt="" /></span>Compri i server per il picco</p>
      <p><span><img :src="clock" alt="" /></span>Un server nuovo arriva in settimane</p>
      <p><span><img :src="settings" alt="" /></span>Guasti e ridondanza li gestisci tu</p>
    </section>
    <section class="cloud-comparison cloud-region-points">
      <p><span><img :src="capacity" alt="" /></span>Paghi solo quello che usi</p>
      <p><span><img :src="clock" alt="" /></span>Un server nuovo parte in minuti</p>
      <p><span><img :src="settings" alt="" /></span>Guasti e ridondanza li gestisce AWS</p>
    </section>

    <aside class="cloud-tradeoff"><img :src="alert" alt="" /><strong>Contro del cloud</strong><p>Con un carico stabile può costare di più, e lega al fornitore.</p></aside>
    <footer class="cloud-case">37signals: quasi 2 M$/anno risparmiati uscendo dal cloud · Dati dichiarati dall’azienda, 2024</footer>
    <SlideCurrentNo class="talk-page-number" />
  </div>
</template>
