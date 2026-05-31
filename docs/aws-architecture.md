---
emoji: ☁️
description: Real-world AWS architecture diagrams using Mermaid with embedded icon packs
---

# AWS Architecture Examples

This page demonstrates real-world AWS architecture diagrams using Mermaid's `architecture-beta` syntax with embedded Iconify icon packs — no CDN, no image files.

> All icons are from the `logos:*` pack (tech company logos) bundled at build time.

---

## Web Application — Three-Tier

A classic three-tier web application with load balancer, application servers, and a managed database.

```mermaid
architecture-beta
    group networking(logos:aws-vpc)[VPC — us-east-1]
    group public_subnet[Public Subnet] in networking
    group private_app[Application Subnet] in networking
    group private_data[Data Subnet] in networking

    group az_a[AZ-a] in public_subnet
    group az_b[AZ-b] in public_subnet

    service route53(logos:aws-route53)[Route53]
    service cloudfront(logos:aws-cloudfront)[CloudFront]
    service waf(logos:aws-waf)[WAF]
    service alb(logos:aws-elb)[ALB] in az_a
    service alb2(logos:aws-elb)[ALB] in az_b
    service ec2_a(logos:aws-ec2)[EC2 App] in private_app
    service ec2_b(logos:aws-ec2)[EC2 App] in private_app
    service rds(logos:aws-aurora)[Aurora Primary] in private_data
    service rds_replica(logos:aws-aurora)[Aurora Replica] in private_data
    service s3(logos:aws-s3)[Static Assets]

    route53:B -- T:cloudfront
    cloudfront:B -- T:waf
    waf:B -- T:alb
    waf:B -- T:alb2
    alb:R -- L:ec2_a
    alb2:R -- L:ec2_b
    ec2_a:B -- T:rds
    ec2_b:B -- T:rds_replica
    cloudfront:R -- L:s3
```

---

## Serverless Data Pipeline

A fully serverless event-driven data pipeline using AWS Lambda, SQS, DynamoDB, and S3.

```mermaid
architecture-beta
    group source[Ingestion]
    group processing[Processing]
    group storage[Storage]
    group monitoring[Observability]

    service api(logos:aws-api-gateway)[API Gateway] in source
    service sqs(logos:aws-sqs)[SQS Queue] in source
    service lambda1(logos:aws-lambda)[Transform Lambda] in processing
    service lambda2(logos:aws-lambda)[Enrich Lambda] in processing
    service dynamodb(logos:aws-dynamodb)[DynamoDB] in storage
    service s3_raw(logos:aws-s3)[S3 — Raw] in storage
    service s3_processed(logos:aws-s3)[S3 — Processed] in storage
    service cloudwatch(logos:aws-cloudwatch)[CloudWatch] in monitoring
    service sns(logos:aws-sns)[SNS Alert] in monitoring

    api:B -- T:sqs
    sqs:R -- L:lambda1
    lambda1:R -- L:lambda2
    lambda1:B -- T:s3_raw
    lambda2:B -- T:s3_processed
    lambda2:R -- L:dynamodb
    lambda1:T -- B:cloudwatch
    lambda2:T -- B:cloudwatch
    cloudwatch:R -- L:sns
```

---

## Microservices on ECS Fargate

Containerised microservices running on AWS ECS Fargate with a service mesh.

```mermaid
architecture-beta
    group vpc(logos:aws-vpc)[VPC]
    group public[Public] in vpc
    group ecs_cluster[ECS Cluster] in vpc

    group frontend_svc[Frontend] in ecs_cluster
    group backend_svc[Backend] in ecs_cluster

    service cloudfront(logos:aws-cloudfront)[CloudFront] in public
    service alb(logos:aws-elb)[ALB] in public
    service cognito(logos:aws-cognito)[Cognito]
    service ecr(logos:aws-ecr)[ECR Registry]
    service react_svc(logos:aws-ecs)[React SPA] in frontend_svc
    service node_svc(logos:aws-ecs)[Node.js API] in backend_svc
    service python_svc(logos:aws-ecs)[Python Service] in backend_svc
    service elasti(logos:aws-elasticache)[ElastiCache]
    service rds(logos:aws-aurora)[Aurora]

    cloudfront:B -- T:alb
    alb:R -- L:react_svc
    react_svc:B -- T:node_svc
    react_svc:B -- T:python_svc
    node_svc:R -- L:rds
    python_svc:R -- L:elasti
    cognito:B -- T:cloudfront
    ecr:R -- L:react_svc
    ecr:R -- L:node_svc
    ecr:R -- L:python_svc
```

---

## CI/CD Pipeline

A complete CI/CD pipeline with CodeCommit, CodeBuild, CodeDeploy, and CodePipeline.

```mermaid
architecture-beta
    group source[Source]
    group build[Build]
    group deploy[Deploy]
    group infra[Infrastructure]

    service codecommit(logos:aws-codecommit)[CodeCommit] in source
    service codebuild(logos:aws-codebuild)[CodeBuild] in build
    service artifact(logos:aws-s3)[Artifact S3] in build
    service codedeploy(logos:aws-codedeploy)[CodeDeploy] in deploy
    service ecs(logos:aws-ecs)[ECS Fargate] in deploy
    service code_pipeline(logos:aws-codepipeline)[CodePipeline]
    service cloudformation(logos:aws-cloudformation)[CloudFormation] in infra
    service kms(logos:aws-kms)[KMS] in infra
    service im(logos:aws-iam)[IAM] in infra

    codecommit:B -- T:code_pipeline
    code_pipeline:R -- L:codebuild
    codebuild:B -- T:artifact
    artifact:R -- L:codedeploy
    codedeploy:B -- T:ecs
    code_pipeline:T -- B:cloudformation
    cloudformation:R -- L:kms
    cloudformation:B -- T:im
```

---

## Event-Driven Architecture with EventBridge

```mermaid
architecture-beta
    group producers[Event Producers]
    group bus[Event Bus]
    group consumers[Event Consumers]

    service order_svc(logos:aws-lambda)[Order Service] in producers
    service payment_svc(logos:aws-lambda)[Payment Service] in producers
    service eventbridge(logos:aws-eventbridge)[EventBridge] in bus
    service sqs_orders(logos:aws-sqs)[Orders Queue] in consumers
    service sqs_payments(logos:aws-sqs)[Payments Queue] in consumers
    service email_lambda(logos:aws-lambda)[Email Lambda] in consumers
    service audit_lambda(logos:aws-lambda)[Audit Lambda] in consumers
    service dynamodb(logos:aws-dynamodb)[Audit Table]
    service ses(logos:aws-ses)[SES]

    order_svc:R -- L:eventbridge
    payment_svc:R -- L:eventbridge
    eventbridge:R -- L:sqs_orders
    eventbridge:R -- L:sqs_payments
    sqs_orders:R -- L:email_lambda
    sqs_payments:R -- L:audit_lambda
    email_lambda:R -- L:ses
    audit_lambda:B -- T:dynamodb
```

---

## Icon Reference

| Service | Icon ID | Service | Icon ID |
|---------|---------|---------|---------|
| API Gateway | `logos:aws-api-gateway` | Route53 | `logos:aws-route53` |
| CloudFront | `logos:aws-cloudfront` | S3 | `logos:aws-s3` |
| EC2 | `logos:aws-ec2` | ECS | `logos:aws-ecs` |
| ECR | `logos:aws-ecr` | ELB/ALB | `logos:aws-elb` |
| Lambda | `logos:aws-lambda` | DynamoDB | `logos:aws-dynamodb` |
| RDS/Aurora | `logos:aws-aurora` | ElastiCache | `logos:aws-elasticache` |
| SQS | `logos:aws-sqs` | SNS | `logos:aws-sns` |
| VPC | `logos:aws-vpc` | WAF | `logos:aws-waf` |
| Cognito | `logos:aws-cognito` | KMS | `logos:aws-kms` |
| IAM | `logos:aws-iam` | CloudWatch | `logos:aws-cloudwatch` |
| CloudFormation | `logos:aws-cloudformation` | CodeBuild | `logos:aws-codebuild` |
| CodeCommit | `logos:aws-codecommit` | CodeDeploy | `logos:aws-codedeploy` |
| CodePipeline | `logos:aws-codepipeline` | SES | `logos:aws-ses` |
| EventBridge | `logos:aws-eventbridge` | | |

> Browse all available logos at [icon-sets.iconify.design/logos/](https://icon-sets.iconify.design/logos/).
