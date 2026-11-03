<script setup>
import serviceIcon0 from '../assets/logos/aws-services/cloudfront.svg'
import serviceIcon1 from '../assets/logos/aws-services/acm.svg'
import serviceIcon2 from '../assets/logos/aws-services/shield.svg'
import serviceIcon3 from '../assets/logos/aws-services/waf.svg'
import serviceIcon4 from '../assets/logos/aws-services/alb.svg'
import serviceIcon5 from '../assets/logos/aws-services/vpc.svg'
import serviceIcon6 from '../assets/logos/aws-services/nat.svg'
import serviceIcon7 from '../assets/logos/aws-services/fargate.svg'
import serviceIcon8 from '../assets/logos/aws-services/service-connect.svg'
import serviceIcon9 from '../assets/logos/aws-services/cloud-map.svg'
import serviceIcon10 from '../assets/logos/aws-services/elasticache.svg'
import serviceIcon11 from '../assets/logos/aws-services/dynamodb.svg'
import serviceIcon12 from '../assets/logos/aws-services/s3.svg'
import serviceIcon13 from '../assets/logos/aws-services/parameter-store.svg'
import serviceIcon14 from '../assets/logos/aws-services/cloudwatch.svg'
import serviceIcon15 from '../assets/logos/aws-services/iam.svg'
import serviceIcon16 from '../assets/logos/aws-services/ecr.svg'
import serviceIcon17 from '../assets/logos/aws-services/cloudformation.svg'
</script>

<template>
  <div class="slidev-layout cloud-slide services-slide">
    <header><slot /></header>
    <div class="services-list">
      <div class="services-item"><img :src="serviceIcon0" alt="" /><h3>CloudFront</h3><p>CDN globale</p></div>
      <div class="services-item"><img :src="serviceIcon1" alt="" /><h3>Certificate Manager</h3><p>Certificati TLS gestiti</p></div>
      <div class="services-item"><img :src="serviceIcon2" alt="" /><h3>Shield Standard</h3><p>Protezione DDoS di base</p></div>
      <div class="services-item"><img :src="serviceIcon3" alt="" /><h3>WAF</h3><p>Firewall per applicazioni web</p></div>
      <div class="services-item"><img :src="serviceIcon4" alt="" /><h3>ALB e target group</h3><p>Load balancer HTTP</p></div>
      <div class="services-item"><img :src="serviceIcon5" alt="" /><h3>VPC</h3><p>Rete privata virtuale</p></div>
      <div class="services-item"><img :src="serviceIcon6" alt="" /><h3>NAT Gateway</h3><p>Uscita su internet</p></div>
      <div class="services-item"><h3>Security group</h3><p>Firewall per ogni risorsa</p></div>
      <div class="services-item"><img :src="serviceIcon7" alt="" /><h3>ECS Fargate</h3><p>Container serverless</p></div>
      <div class="services-item"><img :src="serviceIcon8" alt="" /><h3>Service Connect</h3><p>Comunicazione tra servizi ECS</p></div>
      <div class="services-item"><img :src="serviceIcon9" alt="" /><h3>Cloud Map</h3><p>Registro dei servizi</p></div>
      <div class="services-item"><img :src="serviceIcon10" alt="" /><h3>ElastiCache Valkey</h3><p>Cache in memoria gestita</p></div>
      <div class="services-item"><img :src="serviceIcon11" alt="" /><h3>DynamoDB</h3><p>Database NoSQL serverless</p></div>
      <div class="services-item"><img :src="serviceIcon12" alt="" /><h3>S3</h3><p>Archivio di file</p></div>
      <div class="services-item"><img :src="serviceIcon13" alt="" /><h3>Parameter Store</h3><p>Configurazioni e segreti</p></div>
      <div class="services-item"><img :src="serviceIcon14" alt="" /><h3>CloudWatch</h3><p>Log, metriche e allarmi</p></div>
      <div class="services-item"><img :src="serviceIcon15" alt="" /><h3>IAM con OIDC</h3><p>Permessi e accesso federato</p></div>
      <div class="services-item"><img :src="serviceIcon16" alt="" /><h3>ECR</h3><p>Registro di immagini Docker</p></div>
      <div class="services-item"><img :src="serviceIcon17" alt="" /><h3>CloudFormation e CDK</h3><p>Infrastruttura come codice</p></div>
    </div>
    <SlideCurrentNo class="talk-page-number" />
  </div>
</template>

<style scoped>
.services-list { position: absolute; top: 150px; left: 64px; right: 64px; display: grid; grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(5, 92px); grid-auto-flow: column; column-gap: 32px; }
.services-item { position: relative; padding-left: 48px; display: flex; flex-direction: column; justify-content: center; border-bottom: 1px solid #d5d7c8; }
.services-item img { position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 36px; height: 36px; object-fit: contain; }
.services-item h3 { font-size: 20px; font-weight: 700; line-height: 1.15; color: #142819; }
.services-item p { margin-top: 6px; font-size: 16px; color: #4c5b4c; }
</style>
