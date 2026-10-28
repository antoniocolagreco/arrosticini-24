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
      <p><span><img :src="capacity" alt="" /></span>Capacità acquistata per il picco</p>
      <p><span><img :src="clock" alt="" /></span>Nuovo hardware: settimane</p>
      <p><span><img :src="settings" alt="" /></span>Hardware e ridondanza da gestire</p>
    </section>
    <section class="cloud-comparison cloud-region-points">
      <p><span><img :src="capacity" alt="" /></span>Risorse attive fatturate a consumo</p>
      <p><span><img :src="clock" alt="" /></span>Nuove risorse: minuti</p>
      <p><span><img :src="settings" alt="" /></span>Servizi gestiti e infrastruttura via codice</p>
    </section>

    <aside class="cloud-tradeoff"><img :src="alert" alt="" /><strong>Contro del cloud</strong><p>Con carichi stabili il cloud può costare di più. Dipendenza dal fornitore.</p></aside>
    <footer class="cloud-case">37signals: quasi 2 M$/anno risparmiati uscendo dal cloud · Dati dichiarati dall’azienda, 2024</footer>
    <SlideCurrentNo class="talk-page-number" />
  </div>
</template>
