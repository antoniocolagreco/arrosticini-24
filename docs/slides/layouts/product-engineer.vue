<template>
  <div class="slidev-layout cloud-slide product-engineer-slide">
    <header><slot /></header>

    <div class="product-cycle" role="group" aria-label="Ciclo continuo: Discovery, Design, Build, Deploy, Observe, poi di nuovo Discovery">
      <svg class="product-cycle-arrows" viewBox="0 0 1160 380" aria-hidden="true">
        <defs><marker id="product-cycle-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M1 1 L9 5 L1 9" fill="none" stroke="#a77a39" stroke-width="1.6" /></marker></defs>
        <g fill="none" stroke="#a77a39" stroke-width="2.5" stroke-linecap="round" marker-end="url(#product-cycle-arrow)">
          <path d="M735 40 Q860 45 905 95" />
          <path d="M970 198 Q965 245 910 262" />
          <path d="M705 318 H475" />
          <path d="M250 264 Q195 250 192 218" />
          <path d="M255 95 Q300 45 425 40" />
        </g>
      </svg>
      <section class="product-phase discovery"><h2>Discovery</h2><p>Problema e bisogni,<br />dagli utenti e dai dati</p></section>
      <section class="product-phase design"><h2>Design</h2><p>Soluzione e architettura</p></section>
      <section class="product-phase build"><h2>Build</h2><p>Frontend, backend<br />e integrazioni</p></section>
      <section class="product-phase deploy"><h2>Deploy</h2><p>Infrastruttura, CI/CD<br />e rilascio</p></section>
      <section class="product-phase observe"><h2>Observe</h2><p>Utilizzo, prestazioni<br />ed errori</p></section>
      <p class="product-cycle-center">Prodotto</p>
    </div>

    <footer class="product-message"><p>Non conta quanto codice produce.</p><p><strong>È un ingegnere che possiede il problema e risponde del risultato.</strong></p></footer>
    <SlideCurrentNo class="talk-page-number" />
  </div>
</template>

<style scoped>
.product-engineer-slide :deep(h1) { font-size: 52px; line-height: 1.08; }
.product-cycle { position: absolute; left: 60px; top: 166px; width: 1160px; height: 380px; }
.product-cycle-arrows { position: absolute; inset: 0; width: 100%; height: 100%; }
.product-phase { position: absolute; width: 280px; text-align: center; }
.product-phase h2 { font-size: 30px; font-weight: 750; color: #244a2d; }
.product-phase p { margin-top: 9px; font-size: 21px; line-height: 1.3; color: #52604c; }
.discovery { left: 440px; top: 0; }
.design { left: 820px; top: 105px; }
.build { left: 680px; top: 270px; }
.deploy { left: 200px; top: 270px; }
.observe { left: 60px; top: 105px; }
.product-cycle .product-cycle-center { position: absolute; left: 440px; top: 168px; width: 280px; text-align: center; font-family: 'Roboto Serif', serif; font-size: 32px; font-weight: 700; color: #687858; }
.product-message { position: absolute; left: 62px; right: 62px; top: 623px; border-top: 1px solid #bfc7af; padding-top: 13px; }
.product-message p { font-size: 23px; line-height: 1.35; color: #52604c; }
.product-message strong { color: #244a2d; font-weight: 750; }
</style>
