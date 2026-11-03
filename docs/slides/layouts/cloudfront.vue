<script setup>
import rack from '../assets/on-premises-rack.png'
import datacenter from '../assets/aws-datacenter-drawing.png'
import architecture from '../assets/arrosticini-aws-minimal-v4.png'
</script>

<template>
  <div class="slidev-layout cloud-slide cloudfront-slide">
    <header><slot /></header>
    <p class="cloudfront-intro">Due livelli di cache prima dell’origine.</p>

    <div class="cloudfront-scene">
      <svg class="cloudfront-paths" viewBox="0 0 1164 420" aria-label="Due edge location condividono una cache regionale prima dell’origine">
        <defs>
          <marker id="cf-muted-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1 L9 5 L1 9" fill="none" stroke="#b3b9a6" stroke-width="1.5" /></marker>
          <marker id="cf-hit-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1 L9 5 L1 9" fill="none" stroke="#47784f" stroke-width="1.5" /></marker>
          <marker id="cf-miss-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1 L9 5 L1 9" fill="none" stroke="#b45c31" stroke-width="1.5" /></marker>
        </defs>
        <g class="cloudfront-idle">
          <path d="M115 150 C200 150 210 57 295 57" />
          <path d="M115 180 C200 180 210 272 295 272" />
          <path d="M385 57 C500 57 530 150 645 150" />
          <path d="M385 272 C500 272 530 180 645 180" />
          <path d="M785 165 H935" />
        </g>
        <g v-click.hide="1" class="cloudfront-active hit" data-case="edge-hit">
          <path d="M115 150 C200 150 210 57 295 57" />
        </g>
        <g v-click="[1, 2]" class="cloudfront-active hit" data-case="regional-hit">
          <path d="M115 180 C200 180 210 272 295 272" />
          <path d="M385 272 C500 272 530 180 645 180" />
        </g>
        <g v-click="[2, 3]" class="cloudfront-active miss" data-case="origin">
          <path d="M115 150 C200 150 210 57 295 57" />
          <path d="M385 57 C500 57 530 150 645 150" />
          <path d="M785 165 H935" />
        </g>
        <g v-click="3" class="cloudfront-active miss" data-case="dynamic">
          <path d="M115 150 C200 150 210 57 295 57" />
          <path d="M385 57 H460 Q480 57 480 37 V20 Q480 0 500 0 H1020 Q1040 0 1040 20 V95" />
        </g>
      </svg>

      <figure class="cloudfront-viewer">
        <svg viewBox="29 335 138 116" aria-hidden="true"><image :href="architecture" width="1672" height="941" /></svg>
        <figcaption><h2>Utente</h2></figcaption>
      </figure>
      <figure class="cloudfront-edge edge-a">
        <img :src="rack" alt="" />
        <figcaption><h2>Edge A</h2><p>Vicino all’utente</p></figcaption>
      </figure>
      <figure class="cloudfront-edge edge-b">
        <img :src="rack" alt="" />
        <figcaption><h2>Edge B</h2><p>Un altro punto di presenza</p></figcaption>
      </figure>
      <figure class="cloudfront-regional">
        <img :src="rack" alt="" />
        <figcaption><h2>Regional edge cache</h2><p>Cache più ampia, condivisa tra edge</p></figcaption>
      </figure>
      <figure class="cloudfront-origin">
        <img :src="datacenter" alt="" />
        <figcaption><h2>Origine</h2><p>Nel progetto: ALB → web</p></figcaption>
      </figure>
    </div>

    <div class="cloudfront-explanation" aria-live="polite">
      <section v-click.hide="1" data-caption="edge-hit"><h2>1 · Hit nell’edge</h2><p>La copia è valida: l’edge risponde subito all’utente.</p></section>
      <section v-click="[1, 2]" data-caption="regional-hit"><h2>2 · Miss nell’edge, hit regionale</h2><p>La cache regionale fornisce la risorsa: l’origine non viene contattata.</p></section>
      <section v-click="[2, 3]" data-caption="origin"><h2>3 · Miss in entrambe</h2><p>Si raggiunge l’origine. La risposta può popolare le cache secondo le regole configurate.</p></section>
      <section v-click="3" data-caption="dynamic"><h2>Contenuti dinamici</h2><p>Dall’edge direttamente all’origine, saltando la cache regionale.</p></section>
    </div>
    <SlideCurrentNo class="talk-page-number" />
  </div>
</template>

<style scoped>
.cloudfront-intro { position: absolute; top: 117px; left: 62px; font-size: 25px; color: #52624d; }
.cloudfront-scene { position: absolute; top: 190px; left: 58px; width: 1164px; height: 420px; }
.cloudfront-paths { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.cloudfront-idle, .cloudfront-active { fill: none; stroke-linecap: round; stroke-linejoin: round; }
.cloudfront-idle { stroke: #b3b9a6; stroke-width: 1.5; marker-end: url(#cf-muted-arrow); }
.cloudfront-active { stroke-width: 3; transition: opacity .35s; }
.cloudfront-active.hit { stroke: #47784f; marker-start: url(#cf-hit-arrow); marker-end: url(#cf-hit-arrow); }
.cloudfront-active.miss { stroke: #b45c31; marker-start: url(#cf-miss-arrow); marker-end: url(#cf-miss-arrow); }
.cloudfront-scene figure { position: absolute; margin: 0; text-align: center; }
.cloudfront-scene h2 { font-size: 24px; font-family: 'Roboto Serif', serif; font-weight: 700; }
.cloudfront-scene p { margin-top: 7px; font-size: 17px; color: #52624d; }
.cloudfront-scene img, .cloudfront-viewer svg { mix-blend-mode: multiply; }
.cloudfront-scene img { display: block; margin: 0 auto; }
.cloudfront-viewer { left: 0; top: 123px; width: 110px; }
.cloudfront-viewer svg { width: 100px; height: 84px; overflow: hidden; }
.cloudfront-viewer figcaption { margin-top: 12px; }
.cloudfront-edge { left: 230px; width: 220px; }
.cloudfront-edge img { width: 80px; height: 115px; object-fit: cover; mask-image: radial-gradient(ellipse, #000 55%, transparent 78%); }
.edge-a { top: 0; }
.edge-b { top: 215px; }
.cloudfront-regional { left: 565px; top: 80px; width: 300px; }
.cloudfront-regional img { width: 130px; height: 170px; object-fit: cover; mask-image: radial-gradient(ellipse, #000 55%, transparent 78%); }
.cloudfront-regional figcaption { margin-top: 12px; }
.cloudfront-origin { left: 910px; top: 87px; width: 260px; }
.cloudfront-origin img { width: 230px; height: 155px; object-fit: contain; mask-image: radial-gradient(ellipse, #000 55%, transparent 75%); }
.cloudfront-origin figcaption { margin-top: 20px; }
.cloudfront-explanation { position: absolute; left: 62px; right: 62px; top: 622px; }
.cloudfront-explanation section { position: absolute; inset: 0; }
.cloudfront-explanation h2 { font-size: 26px; }
.cloudfront-explanation p { margin-top: 8px; font-size: 21px; color: #52624d; }
</style>
