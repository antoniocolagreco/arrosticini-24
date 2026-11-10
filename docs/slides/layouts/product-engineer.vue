<template>
  <div class="slidev-layout cloud-slide product-engineer-slide">
    <header><slot /></header>

    <div class="product-cycle" role="group" aria-label="Ciclo continuo: Discovery, Design, Build, Deploy, Observe, Iterate, poi di nuovo Discovery">
      <svg class="product-cycle-arrows" viewBox="0 0 1160 380" aria-hidden="true">
        <defs><marker id="product-cycle-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M1 1 L9 5 L1 9" fill="none" stroke="#a77a39" stroke-width="1.6" /></marker></defs>
        <g fill="none" stroke="#a77a39" stroke-width="2.5" stroke-linecap="round" marker-end="url(#product-cycle-arrow)">
          <path d="M510 65 H650" />
          <path d="M920 95 Q1000 95 1000 140" />
          <path d="M1000 260 Q1000 290 920 290" />
          <path d="M650 325 H510" />
          <path d="M240 290 Q160 290 160 260" />
          <path d="M160 140 Q160 95 240 95" />
        </g>
      </svg>
      <section class="product-phase discovery"><h2>Discovery</h2><p>Problema e bisogni<br />degli utenti</p></section>
      <section class="product-phase design"><h2>Design</h2><p>Soluzione e architettura</p></section>
      <section class="product-phase build"><h2>Build</h2><p>Frontend, backend<br />e integrazioni</p></section>
      <section class="product-phase deploy"><h2>Deploy</h2><p>Infrastruttura, CI/CD<br />e rilascio</p></section>
      <section class="product-phase observe"><h2>Observe</h2><p>Prestazioni, affidabilità<br />e utilizzo</p></section>
      <section class="product-phase iterate"><h2>Iterate</h2><p>Misurare il valore<br />e migliorare il prodotto</p></section>
      <p class="product-cycle-center">Prodotto</p>
    </div>

    <footer class="product-message"><p>Non conta quanto codice produce.</p><p><strong>È un ingegnere che possiede il problema e risponde del risultato.</strong></p></footer>
    <SlideCurrentNo class="talk-page-number" />
  </div>
</template>

<style scoped>
.product-engineer-slide :deep(h1) { font-size: 52px; line-height: 1.08; }
.product-cycle { position: absolute; left: 60px; top: 184px; width: 1160px; height: 380px; }
.product-cycle-arrows { position: absolute; inset: 0; width: 100%; height: 100%; }
.product-phase { position: absolute; width: 280px; text-align: center; }
.product-phase h2 { font-size: 30px; font-weight: 750; color: #244a2d; }
.product-phase p { margin-top: 9px; font-size: 21px; line-height: 1.3; color: #52604c; }
.discovery { left: 230px; top: 25px; }
.design { left: 650px; top: 25px; }
.build { left: 870px; top: 155px; }
.deploy { left: 650px; top: 285px; }
.observe { left: 230px; top: 285px; }
.iterate { left: 10px; top: 155px; }
.product-cycle .product-cycle-center { position: absolute; left: 440px; top: 171px; width: 280px; text-align: center; font-family: 'Roboto Serif', serif; font-size: 32px; font-weight: 700; color: #687858; }
.product-message { position: absolute; left: 62px; right: 62px; top: 623px; border-top: 1px solid #bfc7af; padding-top: 13px; }
.product-message p { font-size: 23px; line-height: 1.35; color: #52604c; }
.product-message strong { color: #244a2d; font-weight: 750; }
</style>
