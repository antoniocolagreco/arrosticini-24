<script setup>
import typescript from '../assets/logos/typescript-color.svg'
import pnpm from '../assets/logos/pnpm-color.svg'
import turbo from '../assets/logos/turborepo-color.svg'
import docker from '../assets/logos/docker-color.svg'
import react from '../assets/logos/react-color.svg'
import router from '../assets/logos/reactrouter-color.svg'
import express from '../assets/logos/express.svg'
import tailwind from '../assets/logos/tailwindcss-color.svg'
import orpc from '../assets/logos/orpc.svg'
import zod from '../assets/logos/zod-color.svg'
import aws from '../assets/logos/aws.svg'
import valkey from '../assets/logos/valkey-wordmark.svg'
import stripe from '../assets/logos/stripe-color.svg'
import pino from '../assets/logos/pino-color.svg'
import testcontainers from '../assets/logos/testcontainers.svg'
</script>

<template>
  <div class="slidev-layout monorepo-slide">
    <svg class="monorepo-symbols" aria-hidden="true">
      <defs>
        <symbol id="monorepo-package" viewBox="0 0 40 44">
          <path d="M20 2 37 12 20 22 3 12Z M3 12V32L20 42 37 32V12 M20 22V42" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" />
        </symbol>
        <symbol id="monorepo-kernel" viewBox="0 0 44 44">
          <path d="m22 3 19 10-19 10L3 13Z M4 23l18 10 18-10 M4 32l18 10 18-10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" />
        </symbol>
      </defs>
    </svg>
    <header><slot /></header>
    <div class="monorepo-tooling">
      <span><img :src="typescript" alt="" />TypeScript</span>
      <span><img :src="pnpm" alt="" />pnpm</span>
      <span><img :src="turbo" alt="" />Turborepo</span>
    </div>

    <section class="monorepo-service monorepo-web">
      <div class="monorepo-service-heading">
        <div><h2>web</h2><p>Sito · SSR</p></div>
        <span class="monorepo-docker"><img :src="docker" alt="" />docker</span>
      </div>
      <div class="monorepo-tech">
        <div><img :src="react" alt="" /><span>React</span></div>
        <div class="monorepo-tech-stack"><img :src="router" alt="" /><span>React Router</span></div>
        <div><img :src="express" alt="" /><span>Express</span></div>
        <div><img :src="tailwind" alt="" /><span>Tailwind</span></div>
      </div>
    </section>

    <section class="monorepo-contract">
      <h3>contracts</h3>
      <svg viewBox="0 0 212 24" aria-hidden="true"><path d="M2 12 H208 M198 4 L208 12 L198 20" fill="none" stroke="#253d26" stroke-width="2" /></svg>
      <div><img :src="orpc" alt="oRPC" /><img :src="zod" alt="Zod" /></div>
      <p>oRPC + Zod</p>
    </section>

    <section class="monorepo-store">
      <img :src="valkey" alt="Valkey" />
      <p>sessioni · carrelli</p>
    </section>

    <section class="monorepo-service monorepo-api">
      <div class="monorepo-service-heading">
        <div><h2>api</h2><p>API privata</p></div>
        <span class="monorepo-docker"><img :src="docker" alt="" />docker</span>
      </div>
      <div class="monorepo-tech">
        <div><img :src="express" alt="" /><span>Express</span></div>
        <div class="monorepo-tech-stack"><img :src="aws" alt="" /><span>AWS SDK</span></div>
        <div><img :src="stripe" alt="" /><span>Stripe</span></div>
      </div>
    </section>

    <svg class="monorepo-domain-links" viewBox="0 0 1280 720" aria-hidden="true">
      <defs>
        <marker id="monorepo-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0 6 3.5 0 7Z" fill="#a52b1c" /></marker>
        <marker id="monorepo-store-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0 6 3.5 0 7Z" fill="#244529" /></marker>
      </defs>
      <g fill="none" stroke="#244529" stroke-width="1.5" marker-end="url(#monorepo-store-arrow)">
        <path d="M534 328H548" />
        <path d="M746 328H732" />
      </g>
      <path d="M924 385V420H174 M924 420H1106" fill="none" stroke="#a52b1c" stroke-width="1.5" />
      <g fill="none" stroke="#a52b1c" stroke-width="1.5" marker-end="url(#monorepo-arrow)">
        <path d="M174 420V450" />
        <path d="M407 420V450" />
        <path d="M640 420V450" />
        <path d="M873 420V450" />
        <path d="M1106 420V450" />
      </g>
    </svg>
    <h3 class="monorepo-domains-label">Domini</h3>
    <section class="monorepo-domains">
      <div><svg aria-hidden="true"><use href="#monorepo-package" /></svg><h3>catalog</h3></div>
      <div><svg aria-hidden="true"><use href="#monorepo-package" /></svg><h3>identity</h3></div>
      <div><svg aria-hidden="true"><use href="#monorepo-package" /></svg><h3>shopping</h3></div>
      <div><svg aria-hidden="true"><use href="#monorepo-package" /></svg><h3>ordering</h3></div>
      <div><svg aria-hidden="true"><use href="#monorepo-package" /></svg><h3>payments</h3></div>
    </section>

    <h3 class="monorepo-shared-label">Package condivisi</h3>
    <section class="monorepo-shared">
      <div><svg class="monorepo-kernel" aria-hidden="true"><use href="#monorepo-kernel" /></svg><section><h3>kernel</h3><p>Tipi condivisi</p></section></div>
      <div><img :src="pino" alt="" /><section><h3>ops</h3><p>pino</p></section></div>
      <div><img :src="testcontainers" alt="" /><section><h3>testing</h3><p>Testcontainers</p></section></div>
    </section>
    <footer>Confini verificati in CI <span>·</span> pnpm turbo boundaries</footer>
    <SlideCurrentNo class="talk-page-number" />
  </div>
</template>
