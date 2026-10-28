<script setup>
import architecture from '../assets/arrosticini-aws-minimal-v4.png'
</script>

<template>
  <div class="slidev-layout cloud-slide architecture-slide">
    <header><slot /></header>
    <img :src="architecture" alt="Arrosticini 24ore su AWS: CloudFront con badge Shield e WAF; a Milano una VPC su eu-south-1a e eu-south-1b, con ALB e NAT nelle subnet pubbliche, web e api collegati tramite Service Connect nelle private e Valkey nelle isolate. DynamoDB e S3 fuori dalla VPC; Stripe fuori da AWS, raggiunto tramite NAT." />
    <SlideCurrentNo class="talk-page-number" />
  </div>
</template>
