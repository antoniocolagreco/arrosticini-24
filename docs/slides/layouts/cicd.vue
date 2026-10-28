<script setup>
import pipeline from '../assets/cicd-flow-v2.png'
</script>

<template>
  <div class="slidev-layout cloud-slide cicd-slide">
    <header><slot /></header>
    <p class="cicd-intro">Dal codice alla produzione con GitHub Actions.</p>
    <img class="cicd-flow-art" :src="pipeline" alt="Sette passaggi collegati da frecce: push, controlli, creazione della release, build delle immagini web e api, pubblicazione su ECR, deploy e rolling update dei container." />
    <div class="cicd-stages">
      <h2>Push</h2>
      <h2>Controlli</h2>
      <h2>Creazione<br />release</h2>
      <h2>Build immagini</h2>
      <h2>ECR</h2>
      <h2>Deploy</h2>
      <h2>Rolling<br />update</h2>
    </div>
    <div class="cicd-workflows">
      <section><h3>CI · pull request</h3><p>Lint, typecheck, test e build</p><code>.github/workflows/ci.yml</code></section>
      <section><h3>Release pubblicata → workflow</h3><p>Controlli, immagini su ECR, poi deploy</p><code>.github/workflows/release.yml</code></section>
    </div>
    <p class="cicd-identity"><strong>GitHub → AWS via OIDC</strong><span>Credenziali temporanee, senza chiavi salvate su GitHub.</span></p>
    <SlideCurrentNo class="talk-page-number" />
  </div>
</template>
