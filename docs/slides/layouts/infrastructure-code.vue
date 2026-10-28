<script setup>
import workflow from '../assets/infrastructure-code-flow-v2.png'
</script>

<template>
  <div class="slidev-layout cloud-slide iac-slide">
    <header><slot /></header>
    <p class="iac-intro">Le risorse si descrivono in un file, insieme al resto del codice.</p>
    <img class="iac-flow-art" :src="workflow" alt="Un file di codice passa attraverso CDK, che genera un template CloudFormation; il template permette di creare le risorse su AWS." />
    <div class="iac-stages">
      <section><h2>TypeScript</h2><p>Descrive le risorse</p></section>
      <section><h2>CDK</h2><p>Genera il template</p></section>
      <section><h2>CloudFormation</h2><p>Template dichiarativo</p></section>
      <section><h2>Risorse AWS</h2><p>Create da CloudFormation</p></section>
    </div>
    <footer class="iac-benefits">
      <section><h3>Versionato in Git</h3><p>La storia delle modifiche</p></section>
      <section><h3>Rivedibile</h3><p>Il diff prima del deploy</p></section>
      <section><h3>Riproducibile</h3><p>Stessa definizione dell’ambiente</p></section>
    </footer>
    <SlideCurrentNo class="talk-page-number" />
  </div>
</template>
