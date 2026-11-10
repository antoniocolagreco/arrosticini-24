<template>
  <div class="slidev-layout cloud-slide ownership-slide">
    <header><slot /></header>

    <ul class="ownership-disciplines" aria-label="Competenze riunite nel Product Engineer">
      <li>Frontend</li>
      <li>Backend</li>
      <li>DevOps</li>
      <li>QA</li>
      <li>Product Manager</li>
      <li>AI</li>
    </ul>

    <svg class="ownership-bracket" viewBox="0 0 160 290" role="img" aria-label="Frontend, Backend, DevOps, QA, Product e AI contribuiscono al Product Engineer">
      <path d="M8 5 H32 V285 H8 M32 145 H150 M132 127 L150 145 L132 163" fill="none" stroke="#a77a39" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
    </svg>

    <section class="ownership-product">
      <h2>Product Engineer</h2>
      <p>dall’idea alla produzione</p>
      <p class="ownership-fde">(anche in versione FDE)</p>
    </section>

    <section class="ownership-specialists" aria-labelledby="specialists-heading">
      <h2 id="specialists-heading">Specialisti</h2>
      <ul>
        <li>Site Reliability Engineer</li>
        <li>Platform Engineer</li>
        <li>ML Engineer</li>
        <li>Security Engineer</li>
        <li>Data Engineer</li>
      </ul>
    </section>
    <footer class="ownership-message"><p>Con l’AI scrivere codice non costa quasi più niente.</p><p>All’ingegnere restano <strong>architettura, decisioni, integrazione e responsabilità del risultato.</strong></p></footer>
    <SlideCurrentNo class="talk-page-number" />
  </div>
</template>

<style scoped>
.ownership-slide :deep(h1) { font-size: 56px; line-height: 1.08; }
.ownership-disciplines { position: absolute; left: 190px; top: 164px; margin: 0; padding: 0; list-style: none; }
.ownership-disciplines li { height: 48px; font-size: 34px; font-weight: 600; line-height: 48px; }
.ownership-disciplines li:nth-child(5) { font-size: 30px; }
.ownership-bracket { position: absolute; left: 430px; top: 164px; width: 160px; height: 290px; }
.ownership-product { position: absolute; left: 624px; right: 58px; top: 268px; }
.ownership-product h2 { display: flex; align-items: baseline; gap: 12px; font-size: 42px; font-weight: 750; white-space: nowrap; }
.ownership-product p { margin-top: 13px; font-size: 30px; color: #52604c; }
.ownership-product .ownership-fde { margin-top: 10px; font-size: 17px; }
.ownership-message { position: absolute; left: 62px; right: 62px; top: 623px; padding-top: 13px; border-top: 1px solid #bfc7af; }
.ownership-message p { font-size: 23px; line-height: 1.35; }
.ownership-message p:first-child { color: #52604c; }
.ownership-message strong { color: #244a2d; font-weight: 750; }
.ownership-specialists { position: absolute; left: 190px; right: 90px; top: 527px; }
.ownership-specialists h2 { font-size: 19px; font-weight: 600; color: #68705b; }
.ownership-specialists ul { display: flex; flex-wrap: wrap; gap: 12px 27px; margin: 14px 0 0; padding: 0; list-style: none; color: #52604c; }
.ownership-specialists li { font-size: 19px; }
</style>
