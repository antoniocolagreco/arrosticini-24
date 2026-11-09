<script setup>
import aws from '../assets/logos/aws-wordmark.svg'
import azure from '../assets/logos/azure-color.svg'
import google from '../assets/logos/googlecloud-color.svg'
import vercel from '../assets/logos/vercel.svg'
import supabase from '../assets/logos/supabase-color.svg'
import neon from '../assets/logos/neon-color.svg'
</script>

<template>
  <div class="slidev-layout cloud-slide market-slide">
    <header><slot /></header>
    <div class="market-charts">
      <section aria-label="Quote mondiali dei ricavi da infrastruttura cloud nel terzo trimestre 2026">
        <h2>Mondo <span>Q3 2026 · trend su Q3 2025</span></h2>
        <div class="market-row market-trended"><span><img :src="aws" alt="" />AWS</span><div><i style="width: 26%; background: #b56b20" /></div><strong>26%</strong><em class="market-down">▼ 3</em></div>
        <div class="market-row market-trended"><span><img :src="azure" alt="" />Microsoft Azure</span><div><i style="width: 19%; background: #47788a" /></div><strong>19%</strong><em class="market-down">▼ 1</em></div>
        <div class="market-row market-trended"><span><img :src="google" alt="" />Google Cloud</span><div><i style="width: 16%; background: #668557" /></div><strong>16%</strong><em class="market-up">▲ 3</em></div>
        <div class="market-row market-trended"><span class="market-other">Altri</span><div><i style="width: 39%; background: #aaa591" /></div><strong>39%</strong><em class="market-up">▲ 1</em></div>
      </section>
      <section aria-label="Stime per l'Europa dello studio del Parlamento europeo del 2025, basate su fonti 2024 e 2025">
        <h2>Europa <span>2024–2025 · stime</span></h2>
        <div class="market-row"><span><img :src="aws" alt="" />AWS</span><div><i style="width: 30%; background: #b56b20" /></div><strong>≈30%</strong></div>
        <div class="market-row"><span><img :src="azure" alt="" />Microsoft Azure</span><div><i style="width: 25%; background: #47788a" /></div><strong>≈25%</strong></div>
        <div class="market-row"><span><img :src="google" alt="" />Google Cloud</span><div><i style="width: 15%; background: #668557" /></div><strong>≈15%</strong></div>
        <div class="market-row"><span class="market-other">Altri</span><div><i style="width: 30%; background: #aaa591" /></div><strong>≈30%</strong></div>
        <p class="market-local">Stime dello studio PE 2025, non rilevazioni UE-27</p>
      </section>
    </div>
    <section class="market-platforms" aria-label="Piattaforme costruite su infrastruttura AWS">
      <h2>Anche queste piattaforme poggiano su AWS</h2>
      <div class="market-services">
        <div><h3><img :src="vercel" alt="" />Vercel</h3><p>Deploy e runtime web</p><span aria-hidden="true">↓</span></div>
        <div><h3><img :src="supabase" alt="" />Supabase</h3><p>Postgres, Auth e Storage</p><span aria-hidden="true">↓</span></div>
        <div><h3><img :src="neon" alt="" />Neon</h3><p>Postgres serverless</p><span aria-hidden="true">↓</span></div>
      </div>
      <div class="market-foundation"><img :src="aws" alt="AWS" /><span>Infrastruttura sottostante · Le piattaforme aggiungono software e gestione</span></div>
    </section>
    <footer class="market-sources">
      <p>Quote dei ricavi cloud · Mondo: Synergy Research Group, Q3 2026 e Q3 2025 · Europa: studio Parlamento europeo, dicembre 2025, fig. 8 e tab. 16</p>
      <p>Hosting: documentazione Vercel, Supabase e Neon, novembre 2026 · Supabase Cloud; Neon: nuovi progetti AWS, regioni Azure deprecate</p>
    </footer>
    <SlideCurrentNo class="talk-page-number" />
  </div>
</template>

<style scoped>
.market-charts { position: absolute; top: 132px; left: 60px; right: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 56px; }
.market-charts h2 { margin-bottom: 18px; font-size: 30px; }
.market-charts h2 span { margin-left: 12px; color: #4c5b4c; font-size: 20px; font-weight: 400; }
.market-row { height: 49px; display: grid; grid-template-columns: 188px 1fr 75px; align-items: center; gap: 12px; font-size: 20px; }
.market-row > span { display: flex; align-items: center; gap: 11px; white-space: nowrap; }
.market-row > span img { width: 30px; height: 30px; object-fit: contain; }
.market-row > .market-other { padding-left: 41px; }
.market-row > div { height: 22px; background: #e9e5d8; border-radius: 3px; overflow: hidden; }
.market-row i { display: block; height: 100%; border-radius: 3px; }
.market-row strong { text-align: right; font-size: 24px; font-variant-numeric: tabular-nums; }
.market-row.market-trended { grid-template-columns: 188px 1fr 64px 52px; }
.market-row em { font-style: normal; font-size: 18px; font-weight: 700; white-space: nowrap; font-variant-numeric: tabular-nums; }
.market-row .market-up { color: #3f7a34; }
.market-row .market-down { color: #a52b1c; }
.market-slide .market-local { margin-top: 10px; font-size: 17px; color: #4c5b4c; }
.market-platforms { position: absolute; top: 425px; left: 60px; right: 60px; border-top: 1px solid #c3c9b8; padding-top: 18px; }
.market-platforms h2 { color: #a52b1c; font-size: 29px; }
.market-services { display: grid; grid-template-columns: repeat(3, 1fr); margin-top: 18px; text-align: center; }
.market-services h3 { display: flex; justify-content: center; align-items: center; gap: 12px; margin: 0; font-size: 28px; font-weight: 750; }
.market-services h3 img { width: 32px; height: 32px; object-fit: contain; }
.market-services p { margin-top: 6px; font-size: 20px; color: #4c5b4c; }
.market-services span { display: block; margin-top: 3px; font-size: 30px; line-height: 1; color: #b56b20; }
.market-foundation { display: flex; justify-content: center; align-items: center; gap: 25px; height: 52px; margin-top: 3px; background: #eee6d3; border-top: 2px solid #b56b20; font-size: 20px; }
.market-foundation img { width: 68px; height: 40px; object-fit: contain; }
.market-sources { position: absolute; left: 60px; right: 65px; bottom: 23px; color: #596052; }
.market-sources p { font-size: 13px; line-height: 1.5; }
</style>
