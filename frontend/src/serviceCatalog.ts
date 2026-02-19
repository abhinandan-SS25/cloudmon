/* ──────────────────────────────────────────────────────────────
   serviceCatalog.ts
   Master catalog of cloud services grouped by provider.
   Each entry carries metadata used by the sidebar, nodes, and
   analysis engine.
   ────────────────────────────────────────────────────────────── */

export type CloudProvider = 'aws' | 'gcp' | 'azure' | 'platform';

export type ServiceCategory =
  | 'compute'
  | 'database'
  | 'storage'
  | 'network'
  | 'container'
  | 'serverless'
  | 'cache'
  | 'queue'
  | 'streaming'
  | 'analytics'
  | 'cdn'
  | 'loadbalancer';

export interface ServiceDefinition {
  /** unique key, e.g. "aws-ec2" */
  id: string;
  /** human-readable name */
  label: string;
  provider: CloudProvider;
  category: ServiceCategory;
  /** emoji / icon shorthand shown in the node */
  icon: string;
  /** default throughput units (req/s, MB/s, etc.) */
  defaultThroughput: number;
  /** default latency in ms added per hop */
  defaultLatency: number;
  /** available instance / tier variants (compute, DB, etc.) */
  instanceTypes?: InstanceType[];
}

/* ── Instance / Tier types ───────────────────────────────────── */
export interface InstanceType {
  id: string;
  label: string;
  vcpus: number;
  memoryGb: number;
  /** override throughput when this instance is selected */
  throughput: number;
  /** override latency when this instance is selected */
  latency: number;
  /** optional storage info */
  storageGb?: number;
  /** e.g. "General Purpose", "Compute Optimized" */
  family?: string;
}

/* ── Instance definitions ────────────────────────────────────── */
const EC2_INSTANCES: InstanceType[] = [
  { id: 't3.micro',    label: 't3.micro',    vcpus: 2,  memoryGb: 1,   throughput: 2000,   latency: 1, family: 'General Purpose' },
  { id: 't3.small',    label: 't3.small',    vcpus: 2,  memoryGb: 2,   throughput: 3000,   latency: 1, family: 'General Purpose' },
  { id: 't3.medium',   label: 't3.medium',   vcpus: 2,  memoryGb: 4,   throughput: 4000,   latency: 1, family: 'General Purpose' },
  { id: 't3.large',    label: 't3.large',    vcpus: 2,  memoryGb: 8,   throughput: 5000,   latency: 1, family: 'General Purpose' },
  { id: 't3.xlarge',   label: 't3.xlarge',   vcpus: 4,  memoryGb: 16,  throughput: 8000,   latency: 1, family: 'General Purpose' },
  { id: 'm5.large',    label: 'm5.large',    vcpus: 2,  memoryGb: 8,   throughput: 10000,  latency: 1, family: 'General Purpose' },
  { id: 'm5.xlarge',   label: 'm5.xlarge',   vcpus: 4,  memoryGb: 16,  throughput: 15000,  latency: 1, family: 'General Purpose' },
  { id: 'm5.2xlarge',  label: 'm5.2xlarge',  vcpus: 8,  memoryGb: 32,  throughput: 20000,  latency: 1, family: 'General Purpose' },
  { id: 'm5.4xlarge',  label: 'm5.4xlarge',  vcpus: 16, memoryGb: 64,  throughput: 35000,  latency: 1, family: 'General Purpose' },
  { id: 'c5.large',    label: 'c5.large',    vcpus: 2,  memoryGb: 4,   throughput: 12000,  latency: 1, family: 'Compute Optimized' },
  { id: 'c5.xlarge',   label: 'c5.xlarge',   vcpus: 4,  memoryGb: 8,   throughput: 20000,  latency: 1, family: 'Compute Optimized' },
  { id: 'c5.2xlarge',  label: 'c5.2xlarge',  vcpus: 8,  memoryGb: 16,  throughput: 35000,  latency: 1, family: 'Compute Optimized' },
  { id: 'c5.4xlarge',  label: 'c5.4xlarge',  vcpus: 16, memoryGb: 32,  throughput: 60000,  latency: 1, family: 'Compute Optimized' },
  { id: 'r5.large',    label: 'r5.large',    vcpus: 2,  memoryGb: 16,  throughput: 8000,   latency: 1, family: 'Memory Optimized' },
  { id: 'r5.xlarge',   label: 'r5.xlarge',   vcpus: 4,  memoryGb: 32,  throughput: 12000,  latency: 1, family: 'Memory Optimized' },
  { id: 'r5.2xlarge',  label: 'r5.2xlarge',  vcpus: 8,  memoryGb: 64,  throughput: 20000,  latency: 1, family: 'Memory Optimized' },
  { id: 'p3.2xlarge',  label: 'p3.2xlarge',  vcpus: 8,  memoryGb: 61,  throughput: 25000,  latency: 1, family: 'GPU' },
  { id: 'p3.8xlarge',  label: 'p3.8xlarge',  vcpus: 32, memoryGb: 244, throughput: 80000,  latency: 1, family: 'GPU' },
];

const RDS_INSTANCES: InstanceType[] = [
  { id: 'db.t3.micro',   label: 'db.t3.micro',   vcpus: 2,  memoryGb: 1,   throughput: 1000,  latency: 3, family: 'General Purpose' },
  { id: 'db.t3.small',   label: 'db.t3.small',   vcpus: 2,  memoryGb: 2,   throughput: 1500,  latency: 3, family: 'General Purpose' },
  { id: 'db.t3.medium',  label: 'db.t3.medium',  vcpus: 2,  memoryGb: 4,   throughput: 2500,  latency: 3, family: 'General Purpose' },
  { id: 'db.m5.large',   label: 'db.m5.large',   vcpus: 2,  memoryGb: 8,   throughput: 4000,  latency: 2, family: 'General Purpose' },
  { id: 'db.m5.xlarge',  label: 'db.m5.xlarge',  vcpus: 4,  memoryGb: 16,  throughput: 7000,  latency: 2, family: 'General Purpose' },
  { id: 'db.m5.2xlarge', label: 'db.m5.2xlarge', vcpus: 8,  memoryGb: 32,  throughput: 12000, latency: 2, family: 'General Purpose' },
  { id: 'db.r5.large',   label: 'db.r5.large',   vcpus: 2,  memoryGb: 16,  throughput: 5000,  latency: 2, family: 'Memory Optimized' },
  { id: 'db.r5.xlarge',  label: 'db.r5.xlarge',  vcpus: 4,  memoryGb: 32,  throughput: 8000,  latency: 2, family: 'Memory Optimized' },
  { id: 'db.r5.2xlarge', label: 'db.r5.2xlarge', vcpus: 8,  memoryGb: 64,  throughput: 15000, latency: 2, family: 'Memory Optimized' },
];

const AURORA_INSTANCES: InstanceType[] = [
  { id: 'db.r5.large',   label: 'db.r5.large',   vcpus: 2,  memoryGb: 16,  throughput: 10000, latency: 2, family: 'Memory Optimized' },
  { id: 'db.r5.xlarge',  label: 'db.r5.xlarge',  vcpus: 4,  memoryGb: 32,  throughput: 18000, latency: 2, family: 'Memory Optimized' },
  { id: 'db.r5.2xlarge', label: 'db.r5.2xlarge', vcpus: 8,  memoryGb: 64,  throughput: 30000, latency: 2, family: 'Memory Optimized' },
  { id: 'db.r6g.large',  label: 'db.r6g.large',  vcpus: 2,  memoryGb: 16,  throughput: 12000, latency: 1, family: 'Graviton' },
  { id: 'db.r6g.xlarge', label: 'db.r6g.xlarge', vcpus: 4,  memoryGb: 32,  throughput: 22000, latency: 1, family: 'Graviton' },
];

const ELASTICACHE_INSTANCES: InstanceType[] = [
  { id: 'cache.t3.micro',  label: 'cache.t3.micro',  vcpus: 2, memoryGb: 0.5,  throughput: 20000,  latency: 1, family: 'General Purpose' },
  { id: 'cache.t3.small',  label: 'cache.t3.small',  vcpus: 2, memoryGb: 1.37, throughput: 30000,  latency: 1, family: 'General Purpose' },
  { id: 'cache.m5.large',  label: 'cache.m5.large',  vcpus: 2, memoryGb: 6.38, throughput: 80000,  latency: 1, family: 'General Purpose' },
  { id: 'cache.r5.large',  label: 'cache.r5.large',  vcpus: 2, memoryGb: 13.07,throughput: 100000, latency: 1, family: 'Memory Optimized' },
  { id: 'cache.r5.xlarge', label: 'cache.r5.xlarge', vcpus: 4, memoryGb: 26.32,throughput: 150000, latency: 1, family: 'Memory Optimized' },
];

const GCE_INSTANCES: InstanceType[] = [
  { id: 'e2-micro',      label: 'e2-micro',      vcpus: 2,  memoryGb: 1,   throughput: 2000,  latency: 1, family: 'General Purpose' },
  { id: 'e2-small',      label: 'e2-small',      vcpus: 2,  memoryGb: 2,   throughput: 3000,  latency: 1, family: 'General Purpose' },
  { id: 'e2-medium',     label: 'e2-medium',     vcpus: 2,  memoryGb: 4,   throughput: 4000,  latency: 1, family: 'General Purpose' },
  { id: 'n2-standard-2', label: 'n2-standard-2', vcpus: 2,  memoryGb: 8,   throughput: 10000, latency: 1, family: 'General Purpose' },
  { id: 'n2-standard-4', label: 'n2-standard-4', vcpus: 4,  memoryGb: 16,  throughput: 18000, latency: 1, family: 'General Purpose' },
  { id: 'n2-standard-8', label: 'n2-standard-8', vcpus: 8,  memoryGb: 32,  throughput: 30000, latency: 1, family: 'General Purpose' },
  { id: 'c2-standard-4', label: 'c2-standard-4', vcpus: 4,  memoryGb: 16,  throughput: 25000, latency: 1, family: 'Compute Optimized' },
  { id: 'c2-standard-8', label: 'c2-standard-8', vcpus: 8,  memoryGb: 32,  throughput: 45000, latency: 1, family: 'Compute Optimized' },
  { id: 'a2-highgpu-1g', label: 'a2-highgpu-1g', vcpus: 12, memoryGb: 85,  throughput: 30000, latency: 1, family: 'GPU' },
];

const CLOUD_SQL_INSTANCES: InstanceType[] = [
  { id: 'db-f1-micro',     label: 'db-f1-micro',     vcpus: 1, memoryGb: 0.6, throughput: 500,   latency: 3, family: 'Shared' },
  { id: 'db-g1-small',     label: 'db-g1-small',     vcpus: 1, memoryGb: 1.7, throughput: 1000,  latency: 3, family: 'Shared' },
  { id: 'db-n1-standard-1',label: 'db-n1-standard-1',vcpus: 1, memoryGb: 3.75,throughput: 2000,  latency: 2, family: 'Standard' },
  { id: 'db-n1-standard-2',label: 'db-n1-standard-2',vcpus: 2, memoryGb: 7.5, throughput: 4000,  latency: 2, family: 'Standard' },
  { id: 'db-n1-standard-4',label: 'db-n1-standard-4',vcpus: 4, memoryGb: 15,  throughput: 7000,  latency: 2, family: 'Standard' },
  { id: 'db-n1-highmem-2', label: 'db-n1-highmem-2', vcpus: 2, memoryGb: 13,  throughput: 5000,  latency: 2, family: 'High Memory' },
];

const AZURE_VM_INSTANCES: InstanceType[] = [
  { id: 'B1s',          label: 'B1s',          vcpus: 1,  memoryGb: 1,   throughput: 1500,  latency: 1, family: 'Burstable' },
  { id: 'B2s',          label: 'B2s',          vcpus: 2,  memoryGb: 4,   throughput: 3000,  latency: 1, family: 'Burstable' },
  { id: 'D2s_v3',       label: 'D2s v3',       vcpus: 2,  memoryGb: 8,   throughput: 8000,  latency: 1, family: 'General Purpose' },
  { id: 'D4s_v3',       label: 'D4s v3',       vcpus: 4,  memoryGb: 16,  throughput: 14000, latency: 1, family: 'General Purpose' },
  { id: 'D8s_v3',       label: 'D8s v3',       vcpus: 8,  memoryGb: 32,  throughput: 25000, latency: 1, family: 'General Purpose' },
  { id: 'F2s_v2',       label: 'F2s v2',       vcpus: 2,  memoryGb: 4,   throughput: 12000, latency: 1, family: 'Compute Optimized' },
  { id: 'F4s_v2',       label: 'F4s v2',       vcpus: 4,  memoryGb: 8,   throughput: 22000, latency: 1, family: 'Compute Optimized' },
  { id: 'E2s_v3',       label: 'E2s v3',       vcpus: 2,  memoryGb: 16,  throughput: 7000,  latency: 1, family: 'Memory Optimized' },
  { id: 'E4s_v3',       label: 'E4s v3',       vcpus: 4,  memoryGb: 32,  throughput: 12000, latency: 1, family: 'Memory Optimized' },
  { id: 'NC6s_v3',      label: 'NC6s v3',      vcpus: 6,  memoryGb: 112, throughput: 20000, latency: 1, family: 'GPU' },
];

const AZURE_SQL_INSTANCES: InstanceType[] = [
  { id: 'S0',   label: 'S0 (10 DTU)',   vcpus: 0, memoryGb: 0,  throughput: 500,   latency: 5, family: 'Standard' },
  { id: 'S1',   label: 'S1 (20 DTU)',   vcpus: 0, memoryGb: 0,  throughput: 1000,  latency: 4, family: 'Standard' },
  { id: 'S2',   label: 'S2 (50 DTU)',   vcpus: 0, memoryGb: 0,  throughput: 2500,  latency: 3, family: 'Standard' },
  { id: 'GP_2', label: 'GP 2 vCores',   vcpus: 2, memoryGb: 10, throughput: 4000,  latency: 3, family: 'General Purpose' },
  { id: 'GP_4', label: 'GP 4 vCores',   vcpus: 4, memoryGb: 20, throughput: 8000,  latency: 2, family: 'General Purpose' },
  { id: 'BC_2', label: 'BC 2 vCores',   vcpus: 2, memoryGb: 10, throughput: 6000,  latency: 2, family: 'Business Critical' },
  { id: 'BC_4', label: 'BC 4 vCores',   vcpus: 4, memoryGb: 20, throughput: 12000, latency: 1, family: 'Business Critical' },
];

const AZURE_PG_INSTANCES: InstanceType[] = [
  { id: 'B1ms',  label: 'B1ms (1 vCore)',  vcpus: 1, memoryGb: 2,  throughput: 800,   latency: 4, family: 'Burstable' },
  { id: 'B2s',   label: 'B2s (2 vCores)',  vcpus: 2, memoryGb: 4,  throughput: 1500,  latency: 3, family: 'Burstable' },
  { id: 'GP_2',  label: 'GP 2 vCores',     vcpus: 2, memoryGb: 8,  throughput: 3000,  latency: 3, family: 'General Purpose' },
  { id: 'GP_4',  label: 'GP 4 vCores',     vcpus: 4, memoryGb: 16, throughput: 6000,  latency: 2, family: 'General Purpose' },
  { id: 'GP_8',  label: 'GP 8 vCores',     vcpus: 8, memoryGb: 32, throughput: 12000, latency: 2, family: 'General Purpose' },
  { id: 'MO_2',  label: 'MO 2 vCores',     vcpus: 2, memoryGb: 16, throughput: 4000,  latency: 2, family: 'Memory Optimized' },
  { id: 'MO_4',  label: 'MO 4 vCores',     vcpus: 4, memoryGb: 32, throughput: 8000,  latency: 2, family: 'Memory Optimized' },
];

const ECS_CONFIGS: InstanceType[] = [
  { id: 'ecs-256-512',   label: '0.25 vCPU / 0.5 GB', vcpus: 0.25, memoryGb: 0.5,  throughput: 2000,  latency: 2, family: 'Fargate' },
  { id: 'ecs-512-1024',  label: '0.5 vCPU / 1 GB',    vcpus: 0.5,  memoryGb: 1,    throughput: 4000,  latency: 2, family: 'Fargate' },
  { id: 'ecs-1024-2048', label: '1 vCPU / 2 GB',      vcpus: 1,    memoryGb: 2,    throughput: 8000,  latency: 2, family: 'Fargate' },
  { id: 'ecs-2048-4096', label: '2 vCPU / 4 GB',      vcpus: 2,    memoryGb: 4,    throughput: 15000, latency: 2, family: 'Fargate' },
  { id: 'ecs-4096-8192', label: '4 vCPU / 8 GB',      vcpus: 4,    memoryGb: 8,    throughput: 25000, latency: 2, family: 'Fargate' },
];

const EKS_CONFIGS: InstanceType[] = [
  { id: 'eks-t3-medium', label: 't3.medium (worker)', vcpus: 2, memoryGb: 4,  throughput: 5000,  latency: 2, family: 'General Purpose' },
  { id: 'eks-m5-large',  label: 'm5.large (worker)',  vcpus: 2, memoryGb: 8,  throughput: 10000, latency: 2, family: 'General Purpose' },
  { id: 'eks-m5-xlarge', label: 'm5.xlarge (worker)', vcpus: 4, memoryGb: 16, throughput: 18000, latency: 2, family: 'General Purpose' },
  { id: 'eks-c5-xlarge', label: 'c5.xlarge (worker)', vcpus: 4, memoryGb: 8,  throughput: 22000, latency: 2, family: 'Compute Optimized' },
];

const GKE_CONFIGS: InstanceType[] = [
  { id: 'gke-e2-medium',     label: 'e2-medium (node)',     vcpus: 2, memoryGb: 4,  throughput: 5000,  latency: 2, family: 'General Purpose' },
  { id: 'gke-n2-standard-2', label: 'n2-standard-2 (node)', vcpus: 2, memoryGb: 8,  throughput: 10000, latency: 2, family: 'General Purpose' },
  { id: 'gke-n2-standard-4', label: 'n2-standard-4 (node)', vcpus: 4, memoryGb: 16, throughput: 18000, latency: 2, family: 'General Purpose' },
];

const AKS_CONFIGS: InstanceType[] = [
  { id: 'aks-D2s-v3', label: 'D2s v3 (node)', vcpus: 2, memoryGb: 8,  throughput: 8000,  latency: 2, family: 'General Purpose' },
  { id: 'aks-D4s-v3', label: 'D4s v3 (node)', vcpus: 4, memoryGb: 16, throughput: 14000, latency: 2, family: 'General Purpose' },
  { id: 'aks-F4s-v2', label: 'F4s v2 (node)', vcpus: 4, memoryGb: 8,  throughput: 22000, latency: 2, family: 'Compute Optimized' },
];

const LAMBDA_CONFIGS: InstanceType[] = [
  { id: 'lambda-128',  label: '128 MB',  vcpus: 0, memoryGb: 0.125, throughput: 1000,  latency: 80,  family: 'Memory' },
  { id: 'lambda-256',  label: '256 MB',  vcpus: 0, memoryGb: 0.25,  throughput: 2000,  latency: 60,  family: 'Memory' },
  { id: 'lambda-512',  label: '512 MB',  vcpus: 0, memoryGb: 0.5,   throughput: 3000,  latency: 50,  family: 'Memory' },
  { id: 'lambda-1024', label: '1024 MB', vcpus: 0, memoryGb: 1,     throughput: 5000,  latency: 40,  family: 'Memory' },
  { id: 'lambda-2048', label: '2048 MB', vcpus: 0, memoryGb: 2,     throughput: 8000,  latency: 30,  family: 'Memory' },
  { id: 'lambda-3072', label: '3072 MB', vcpus: 0, memoryGb: 3,     throughput: 10000, latency: 25,  family: 'Memory' },
];

/* ── AWS ─────────────────────────────────────────────────────── */
const aws: ServiceDefinition[] = [
  { id: 'aws-ec2',        label: 'EC2',             provider: 'aws', category: 'compute',      icon: '🖥️',  defaultThroughput: 10000, defaultLatency: 1, instanceTypes: EC2_INSTANCES },
  { id: 'aws-lambda',     label: 'Lambda',          provider: 'aws', category: 'serverless',   icon: 'λ',   defaultThroughput: 5000,  defaultLatency: 50, instanceTypes: LAMBDA_CONFIGS },
  { id: 'aws-rds',        label: 'RDS',             provider: 'aws', category: 'database',     icon: '🗄️',  defaultThroughput: 3000,  defaultLatency: 3, instanceTypes: RDS_INSTANCES },
  { id: 'aws-aurora',     label: 'Aurora',          provider: 'aws', category: 'database',     icon: '🗄️',  defaultThroughput: 8000,  defaultLatency: 2, instanceTypes: AURORA_INSTANCES },
  { id: 'aws-dynamodb',   label: 'DynamoDB',        provider: 'aws', category: 'database',     icon: '⚡',  defaultThroughput: 20000, defaultLatency: 5 },
  { id: 'aws-msk',        label: 'MSK (Kafka)',     provider: 'aws', category: 'streaming',    icon: 'KF',  defaultThroughput: 60000, defaultLatency: 6 },
  { id: 'aws-snowflake',  label: 'Snowflake',       provider: 'aws', category: 'analytics',    icon: 'SF',  defaultThroughput: 50000, defaultLatency: 20 },
  { id: 'aws-s3',         label: 'S3',              provider: 'aws', category: 'storage',      icon: '🪣',  defaultThroughput: 50000, defaultLatency: 10 },
  { id: 'aws-ebs',        label: 'EBS',             provider: 'aws', category: 'storage',      icon: '💾',  defaultThroughput: 16000, defaultLatency: 1 },
  { id: 'aws-vpc',        label: 'VPC',             provider: 'aws', category: 'network',      icon: '🔒',  defaultThroughput: 100000,defaultLatency: 0 },
  { id: 'aws-elb',        label: 'ELB / ALB',       provider: 'aws', category: 'loadbalancer', icon: '⚖️',  defaultThroughput: 50000, defaultLatency: 1 },
  { id: 'aws-cloudfront', label: 'CloudFront',      provider: 'aws', category: 'cdn',          icon: '🌐',  defaultThroughput: 100000,defaultLatency: 5 },
  { id: 'aws-sqs',        label: 'SQS',             provider: 'aws', category: 'queue',        icon: '📨',  defaultThroughput: 30000, defaultLatency: 20 },
  { id: 'aws-elasticache',label: 'ElastiCache',     provider: 'aws', category: 'cache',        icon: '⚡',  defaultThroughput: 100000,defaultLatency: 1, instanceTypes: ELASTICACHE_INSTANCES },
  { id: 'aws-ecs',        label: 'ECS',             provider: 'aws', category: 'container',    icon: '🐳',  defaultThroughput: 10000, defaultLatency: 2, instanceTypes: ECS_CONFIGS },
  { id: 'aws-eks',        label: 'EKS',             provider: 'aws', category: 'container',    icon: '☸️',  defaultThroughput: 10000, defaultLatency: 2, instanceTypes: EKS_CONFIGS },
];

/* ── GCP ─────────────────────────────────────────────────────── */
const gcp: ServiceDefinition[] = [
  { id: 'gcp-gce',          label: 'Compute Engine',  provider: 'gcp', category: 'compute',      icon: '🖥️',  defaultThroughput: 10000, defaultLatency: 1, instanceTypes: GCE_INSTANCES },
  { id: 'gcp-cloud-fn',     label: 'Cloud Functions', provider: 'gcp', category: 'serverless',   icon: 'λ',   defaultThroughput: 5000,  defaultLatency: 60 },
  { id: 'gcp-cloud-sql',    label: 'Cloud SQL',       provider: 'gcp', category: 'database',     icon: '🗄️',  defaultThroughput: 3000,  defaultLatency: 3, instanceTypes: CLOUD_SQL_INSTANCES },
  { id: 'gcp-spanner',      label: 'Spanner',         provider: 'gcp', category: 'database',     icon: '🗄️',  defaultThroughput: 10000, defaultLatency: 5 },
  { id: 'gcp-firestore',    label: 'Firestore',       provider: 'gcp', category: 'database',     icon: '🔥',  defaultThroughput: 10000, defaultLatency: 10 },
  { id: 'gcp-gcs',          label: 'Cloud Storage',   provider: 'gcp', category: 'storage',      icon: '🪣',  defaultThroughput: 50000, defaultLatency: 10 },
  { id: 'gcp-vpc',          label: 'VPC',             provider: 'gcp', category: 'network',      icon: '🔒',  defaultThroughput: 100000,defaultLatency: 0 },
  { id: 'gcp-lb',           label: 'Cloud LB',        provider: 'gcp', category: 'loadbalancer', icon: '⚖️',  defaultThroughput: 50000, defaultLatency: 1 },
  { id: 'gcp-cdn',          label: 'Cloud CDN',       provider: 'gcp', category: 'cdn',          icon: '🌐',  defaultThroughput: 100000,defaultLatency: 5 },
  { id: 'gcp-pubsub',       label: 'Pub/Sub',         provider: 'gcp', category: 'queue',        icon: '📨',  defaultThroughput: 30000, defaultLatency: 15 },
  { id: 'gcp-memorystore',  label: 'Memorystore',     provider: 'gcp', category: 'cache',        icon: '⚡',  defaultThroughput: 100000,defaultLatency: 1 },
  { id: 'gcp-gke',          label: 'GKE',             provider: 'gcp', category: 'container',    icon: '☸️',  defaultThroughput: 10000, defaultLatency: 2, instanceTypes: GKE_CONFIGS },
];

/* ── Azure ───────────────────────────────────────────────────── */
const azure: ServiceDefinition[] = [
  { id: 'azure-vm',          label: 'Virtual Machine',  provider: 'azure', category: 'compute',      icon: '🖥️',  defaultThroughput: 10000, defaultLatency: 1, instanceTypes: AZURE_VM_INSTANCES },
  { id: 'azure-functions',   label: 'Functions',        provider: 'azure', category: 'serverless',   icon: 'λ',   defaultThroughput: 5000,  defaultLatency: 55 },
  { id: 'azure-sql',         label: 'Azure SQL',        provider: 'azure', category: 'database',     icon: '🗄️',  defaultThroughput: 4000,  defaultLatency: 3, instanceTypes: AZURE_SQL_INSTANCES },
  { id: 'azure-cosmos',      label: 'Cosmos DB',        provider: 'azure', category: 'database',     icon: '🌍',  defaultThroughput: 20000, defaultLatency: 5 },
  { id: 'azure-postgres',    label: 'PostgreSQL',       provider: 'azure', category: 'database',     icon: '🐘',  defaultThroughput: 3000,  defaultLatency: 3, instanceTypes: AZURE_PG_INSTANCES },
  { id: 'azure-blob',        label: 'Blob Storage',     provider: 'azure', category: 'storage',      icon: '🪣',  defaultThroughput: 50000, defaultLatency: 10 },
  { id: 'azure-disk',        label: 'Managed Disk',     provider: 'azure', category: 'storage',      icon: '💾',  defaultThroughput: 16000, defaultLatency: 1 },
  { id: 'azure-vnet',        label: 'VNet',             provider: 'azure', category: 'network',      icon: '🔒',  defaultThroughput: 100000,defaultLatency: 0 },
  { id: 'azure-lb',          label: 'Load Balancer',    provider: 'azure', category: 'loadbalancer', icon: '⚖️',  defaultThroughput: 50000, defaultLatency: 1 },
  { id: 'azure-cdn',         label: 'Azure CDN',        provider: 'azure', category: 'cdn',          icon: '🌐',  defaultThroughput: 100000,defaultLatency: 5 },
  { id: 'azure-servicebus',  label: 'Service Bus',      provider: 'azure', category: 'queue',        icon: '📨',  defaultThroughput: 30000, defaultLatency: 20 },
  { id: 'azure-redis',       label: 'Azure Cache',      provider: 'azure', category: 'cache',        icon: '⚡',  defaultThroughput: 100000,defaultLatency: 1 },
  { id: 'azure-aks',         label: 'AKS',              provider: 'azure', category: 'container',    icon: '☸️',  defaultThroughput: 10000, defaultLatency: 2, instanceTypes: AKS_CONFIGS },
];

/* ── Platforms ──────────────────────────────────────────────── */
const platform: ServiceDefinition[] = [
  { id: 'platform-kafka',     label: 'Kafka',     provider: 'platform', category: 'streaming', icon: 'KF',  defaultThroughput: 60000, defaultLatency: 6 },
  { id: 'platform-rabbitmq',  label: 'RabbitMQ',  provider: 'platform', category: 'queue',     icon: 'RMQ', defaultThroughput: 40000, defaultLatency: 8 },
  { id: 'platform-snowflake', label: 'Snowflake', provider: 'platform', category: 'analytics', icon: 'SF',  defaultThroughput: 50000, defaultLatency: 20 },
];

/* ── Public API ──────────────────────────────────────────────── */
export const SERVICE_CATALOG: Record<CloudProvider, ServiceDefinition[]> = {
  aws,
  gcp,
  azure,
  platform,
};

export const ALL_SERVICES: ServiceDefinition[] = [...aws, ...gcp, ...azure, ...platform];

/** colours per provider */
export const PROVIDER_COLORS: Record<CloudProvider, string> = {
  aws: '#ff9900',
  gcp: '#4285f4',
  azure: '#0078d4',
  platform: '#14b8a6',
};

/** colours per category */
export const CATEGORY_COLORS: Record<ServiceCategory, string> = {
  compute:      '#00c853',
  database:     '#e53935',
  storage:      '#8e24aa',
  network:      '#01579b',
  container:    '#00838f',
  serverless:   '#ff6f00',
  cache:        '#f9a825',
  queue:        '#6a1b9a',
  streaming:    '#00897b',
  analytics:    '#5e35b1',
  cdn:          '#1565c0',
  loadbalancer: '#2e7d32',
};

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  compute:      'Compute',
  database:     'Database',
  storage:      'Storage',
  network:      'Networking',
  container:    'Containers',
  serverless:   'Serverless',
  cache:        'Cache',
  queue:        'Queue / Messaging',
  streaming:    'Streaming',
  analytics:    'Analytics',
  cdn:          'CDN',
  loadbalancer: 'Load Balancer',
};
