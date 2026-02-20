/* ═══════════════════════════════════════════════════════════════
   cloudInstanceTypes.ts
   Maps every component type to its real cloud provider options.

   Data sources (approximate pricing, us-east-1 / us-central1 / East US):
   - AWS   https://aws.amazon.com/pricing/
   - GCP   https://cloud.google.com/pricing
   - Azure https://azure.microsoft.com/pricing/

   terraformResource / terraformInstanceField match the actual
   Terraform provider resource fields so they can be used directly
   when provisioning is added later.
   ═══════════════════════════════════════════════════════════════ */

export interface CloudInstanceType {
  /** Provider-specific ID, e.g. "t3.micro" */
  id: string;
  /** Human-readable label with specs, e.g. "t3.micro  –  2 vCPU · 1 GB" */
  label: string;
  vcpu: number | null;
  memoryGb: number | null;
  /** Estimated cost per hour in USD */
  costPerHour: number;
  notes?: string;
}

export interface CloudServiceOption {
  provider: 'aws' | 'gcp' | 'azure';
  /** Friendly service name, e.g. "Amazon EC2" */
  serviceName: string;
  /** Terraform resource type, e.g. "aws_instance" */
  terraformResource: string;
  /**
   * The Terraform attribute that holds the instance/machine type.
   * null for pay-per-use services with no discrete instance concept.
   */
  terraformInstanceField: string | null;
  /** Available regions for the picker */
  regions: string[];
  instanceTypes: CloudInstanceType[];
}

/* ── Helper ─────────────────────────────────────────────────── */

const AWS_REGIONS = [
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'eu-west-1', 'eu-central-1', 'ap-southeast-1', 'ap-northeast-1',
];
const GCP_REGIONS = [
  'us-central1', 'us-east1', 'us-west1',
  'europe-west1', 'europe-west4', 'asia-east1', 'asia-southeast1',
];
const AZURE_REGIONS = [
  'eastus', 'eastus2', 'westus', 'westus2',
  'northeurope', 'westeurope', 'eastasia', 'southeastasia',
];

/* ══════════════════════════════════════════════════════════════
   Main mapping table
   Key = componentCatalog type key
   ══════════════════════════════════════════════════════════════ */
export const CLOUD_MAPPINGS: Record<string, CloudServiceOption[]> = {

  /* ── COMPUTE: EC2-like VMs ──────────────────────────────── */
  web_server: computeVmOptions(),
  app_server:  computeVmOptions(),
  monolithic_api: computeVmOptions(),
  microservice: computeVmOptions(),
  graphql: computeVmOptions(),

  /* ── COMPUTE: Serverless ────────────────────────────────── */
  serverless: [
    {
      provider: 'aws',
      serviceName: 'AWS Lambda',
      terraformResource: 'aws_lambda_function',
      terraformInstanceField: 'memory_size',
      regions: AWS_REGIONS,
      instanceTypes: [
        { id: '128',   label: '128 MB',   vcpu: null, memoryGb: 0.125, costPerHour: 0.0001,  notes: 'Good for lightweight tasks' },
        { id: '256',   label: '256 MB',   vcpu: null, memoryGb: 0.25,  costPerHour: 0.0002 },
        { id: '512',   label: '512 MB',   vcpu: null, memoryGb: 0.5,   costPerHour: 0.0004 },
        { id: '1024',  label: '1 GB',     vcpu: null, memoryGb: 1,     costPerHour: 0.0008 },
        { id: '2048',  label: '2 GB',     vcpu: null, memoryGb: 2,     costPerHour: 0.0016 },
        { id: '3008',  label: '3 GB',     vcpu: null, memoryGb: 3,     costPerHour: 0.0024, notes: 'Max for most workloads' },
        { id: '10240', label: '10 GB',    vcpu: null, memoryGb: 10,    costPerHour: 0.0082, notes: 'Max memory' },
      ],
    },
    {
      provider: 'gcp',
      serviceName: 'Cloud Functions (Gen 2)',
      terraformResource: 'google_cloudfunctions2_function',
      terraformInstanceField: 'available_memory',
      regions: GCP_REGIONS,
      instanceTypes: [
        { id: '128Mi',  label: '128 MB',  vcpu: null, memoryGb: 0.125, costPerHour: 0.0001 },
        { id: '256Mi',  label: '256 MB',  vcpu: null, memoryGb: 0.25,  costPerHour: 0.0002 },
        { id: '512Mi',  label: '512 MB',  vcpu: null, memoryGb: 0.5,   costPerHour: 0.0004 },
        { id: '1Gi',    label: '1 GB',    vcpu: null, memoryGb: 1,     costPerHour: 0.0008 },
        { id: '2Gi',    label: '2 GB',    vcpu: null, memoryGb: 2,     costPerHour: 0.0016 },
        { id: '4Gi',    label: '4 GB',    vcpu: null, memoryGb: 4,     costPerHour: 0.0032 },
        { id: '8Gi',    label: '8 GB',    vcpu: null, memoryGb: 8,     costPerHour: 0.0064 },
      ],
    },
    {
      provider: 'azure',
      serviceName: 'Azure Functions',
      terraformResource: 'azurerm_service_plan',
      terraformInstanceField: 'sku_name',
      regions: AZURE_REGIONS,
      instanceTypes: [
        { id: 'Y1',    label: 'Consumption',  vcpu: null, memoryGb: null, costPerHour: 0.000016, notes: 'Pay per execution, 1.5 GB limit' },
        { id: 'EP1',   label: 'Premium EP1',  vcpu: 1,    memoryGb: 3.5,  costPerHour: 0.173  },
        { id: 'EP2',   label: 'Premium EP2',  vcpu: 2,    memoryGb: 7,    costPerHour: 0.346  },
        { id: 'EP3',   label: 'Premium EP3',  vcpu: 4,    memoryGb: 14,   costPerHour: 0.692  },
      ],
    },
  ],

  /* ── COMPUTE: Containers / ECS / Cloud Run ──────────────── */
  container: [
    {
      provider: 'aws',
      serviceName: 'AWS Fargate (ECS)',
      terraformResource: 'aws_ecs_task_definition',
      terraformInstanceField: 'cpu',
      regions: AWS_REGIONS,
      instanceTypes: [
        { id: '256',  label: '0.25 vCPU · 0.5 GB',  vcpu: 0.25, memoryGb: 0.5,  costPerHour: 0.01186 },
        { id: '512',  label: '0.5 vCPU · 1 GB',     vcpu: 0.5,  memoryGb: 1,    costPerHour: 0.02372 },
        { id: '1024', label: '1 vCPU · 2 GB',        vcpu: 1,    memoryGb: 2,    costPerHour: 0.04745 },
        { id: '2048', label: '2 vCPU · 4 GB',        vcpu: 2,    memoryGb: 4,    costPerHour: 0.09490 },
        { id: '4096', label: '4 vCPU · 8 GB',        vcpu: 4,    memoryGb: 8,    costPerHour: 0.18980 },
      ],
    },
    {
      provider: 'gcp',
      serviceName: 'Cloud Run',
      terraformResource: 'google_cloud_run_v2_service',
      terraformInstanceField: 'resources.limits.cpu',
      regions: GCP_REGIONS,
      instanceTypes: [
        { id: '1000m',  label: '1 vCPU · 512 MB',   vcpu: 1,  memoryGb: 0.5, costPerHour: 0.024, notes: 'Scales to 0' },
        { id: '2000m',  label: '2 vCPU · 1 GB',     vcpu: 2,  memoryGb: 1,   costPerHour: 0.048 },
        { id: '4000m',  label: '4 vCPU · 2 GB',     vcpu: 4,  memoryGb: 2,   costPerHour: 0.096 },
        { id: '8000m',  label: '8 vCPU · 4 GB',     vcpu: 8,  memoryGb: 4,   costPerHour: 0.192 },
      ],
    },
    {
      provider: 'azure',
      serviceName: 'Azure Container Instances',
      terraformResource: 'azurerm_container_group',
      terraformInstanceField: 'cpu',
      regions: AZURE_REGIONS,
      instanceTypes: [
        { id: '1_1',  label: '1 vCPU · 1 GB',   vcpu: 1,  memoryGb: 1,  costPerHour: 0.0480 },
        { id: '2_2',  label: '2 vCPU · 2 GB',   vcpu: 2,  memoryGb: 2,  costPerHour: 0.0960 },
        { id: '2_4',  label: '2 vCPU · 4 GB',   vcpu: 2,  memoryGb: 4,  costPerHour: 0.1440 },
        { id: '4_8',  label: '4 vCPU · 8 GB',   vcpu: 4,  memoryGb: 8,  costPerHour: 0.2880 },
      ],
    },
  ],

  /* ── COMPUTE: Kubernetes ────────────────────────────────── */
  kubernetes: [
    {
      provider: 'aws',
      serviceName: 'Amazon EKS',
      terraformResource: 'aws_eks_node_group',
      terraformInstanceField: 'instance_types',
      regions: AWS_REGIONS,
      instanceTypes: [
        // cluster fee $0.10/hr is added separately
        { id: 't3.medium',   label: 't3.medium   – 2 vCPU · 4 GB',   vcpu: 2,  memoryGb: 4,  costPerHour: 0.0416 + 0.10, notes: '+$0.10/hr cluster fee' },
        { id: 'm5.large',    label: 'm5.large    – 2 vCPU · 8 GB',   vcpu: 2,  memoryGb: 8,  costPerHour: 0.096  + 0.10 },
        { id: 'm5.xlarge',   label: 'm5.xlarge   – 4 vCPU · 16 GB',  vcpu: 4,  memoryGb: 16, costPerHour: 0.192  + 0.10 },
        { id: 'm5.2xlarge',  label: 'm5.2xlarge  – 8 vCPU · 32 GB',  vcpu: 8,  memoryGb: 32, costPerHour: 0.384  + 0.10 },
        { id: 'c5.xlarge',   label: 'c5.xlarge   – 4 vCPU · 8 GB',   vcpu: 4,  memoryGb: 8,  costPerHour: 0.17   + 0.10, notes: 'Compute-optimised' },
        { id: 'r5.large',    label: 'r5.large    – 2 vCPU · 16 GB',  vcpu: 2,  memoryGb: 16, costPerHour: 0.126  + 0.10, notes: 'Memory-optimised' },
      ],
    },
    {
      provider: 'gcp',
      serviceName: 'Google Kubernetes Engine',
      terraformResource: 'google_container_cluster',
      terraformInstanceField: 'node_config.machine_type',
      regions: GCP_REGIONS,
      instanceTypes: [
        { id: 'e2-medium',       label: 'e2-medium      – 2 vCPU · 4 GB',   vcpu: 2, memoryGb: 4,  costPerHour: 0.0336 + 0.10 },
        { id: 'n2-standard-2',   label: 'n2-standard-2  – 2 vCPU · 8 GB',   vcpu: 2, memoryGb: 8,  costPerHour: 0.0971 + 0.10 },
        { id: 'n2-standard-4',   label: 'n2-standard-4  – 4 vCPU · 16 GB',  vcpu: 4, memoryGb: 16, costPerHour: 0.1942 + 0.10 },
        { id: 'n2-standard-8',   label: 'n2-standard-8  – 8 vCPU · 32 GB',  vcpu: 8, memoryGb: 32, costPerHour: 0.3884 + 0.10 },
        { id: 'c2-standard-4',   label: 'c2-standard-4  – 4 vCPU · 16 GB',  vcpu: 4, memoryGb: 16, costPerHour: 0.2088 + 0.10, notes: 'Compute-optimised' },
      ],
    },
    {
      provider: 'azure',
      serviceName: 'Azure Kubernetes Service',
      terraformResource: 'azurerm_kubernetes_cluster',
      terraformInstanceField: 'default_node_pool.vm_size',
      regions: AZURE_REGIONS,
      instanceTypes: [
        { id: 'Standard_D2s_v5',  label: 'D2s_v5   – 2 vCPU · 8 GB',   vcpu: 2, memoryGb: 8,  costPerHour: 0.096,  notes: 'AKS control plane is free' },
        { id: 'Standard_D4s_v5',  label: 'D4s_v5   – 4 vCPU · 16 GB',  vcpu: 4, memoryGb: 16, costPerHour: 0.192 },
        { id: 'Standard_D8s_v5',  label: 'D8s_v5   – 8 vCPU · 32 GB',  vcpu: 8, memoryGb: 32, costPerHour: 0.384 },
        { id: 'Standard_F4s_v2',  label: 'F4s_v2   – 4 vCPU · 8 GB',   vcpu: 4, memoryGb: 8,  costPerHour: 0.169, notes: 'Compute-optimised' },
        { id: 'Standard_E4s_v5',  label: 'E4s_v5   – 4 vCPU · 32 GB',  vcpu: 4, memoryGb: 32, costPerHour: 0.252, notes: 'Memory-optimised' },
      ],
    },
  ],

  /* ── DATA: PostgreSQL ───────────────────────────────────── */
  postgres: [
    {
      provider: 'aws',
      serviceName: 'Amazon RDS for PostgreSQL',
      terraformResource: 'aws_db_instance',
      terraformInstanceField: 'instance_class',
      regions: AWS_REGIONS,
      instanceTypes: [
        { id: 'db.t3.micro',   label: 'db.t3.micro   – 2 vCPU · 1 GB',    vcpu: 2,  memoryGb: 1,  costPerHour: 0.017 },
        { id: 'db.t3.small',   label: 'db.t3.small   – 2 vCPU · 2 GB',    vcpu: 2,  memoryGb: 2,  costPerHour: 0.034 },
        { id: 'db.t3.medium',  label: 'db.t3.medium  – 2 vCPU · 4 GB',    vcpu: 2,  memoryGb: 4,  costPerHour: 0.068 },
        { id: 'db.m5.large',   label: 'db.m5.large   – 2 vCPU · 8 GB',    vcpu: 2,  memoryGb: 8,  costPerHour: 0.171 },
        { id: 'db.m5.xlarge',  label: 'db.m5.xlarge  – 4 vCPU · 16 GB',   vcpu: 4,  memoryGb: 16, costPerHour: 0.342 },
        { id: 'db.r5.large',   label: 'db.r5.large   – 2 vCPU · 16 GB',   vcpu: 2,  memoryGb: 16, costPerHour: 0.240, notes: 'Memory-optimised' },
        { id: 'db.r5.xlarge',  label: 'db.r5.xlarge  – 4 vCPU · 32 GB',   vcpu: 4,  memoryGb: 32, costPerHour: 0.480 },
      ],
    },
    {
      provider: 'gcp',
      serviceName: 'Cloud SQL for PostgreSQL',
      terraformResource: 'google_sql_database_instance',
      terraformInstanceField: 'settings.tier',
      regions: GCP_REGIONS,
      instanceTypes: [
        { id: 'db-f1-micro',       label: 'db-f1-micro       – 0.6 vCPU · 0.6 GB', vcpu: null, memoryGb: 0.6,  costPerHour: 0.0150, notes: 'Dev/Test only' },
        { id: 'db-g1-small',       label: 'db-g1-small       – 0.5 vCPU · 1.7 GB', vcpu: null, memoryGb: 1.7,  costPerHour: 0.0500 },
        { id: 'db-custom-1-3840',  label: 'db-custom-1-3840  – 1 vCPU · 3.75 GB',  vcpu: 1,    memoryGb: 3.75, costPerHour: 0.0648 },
        { id: 'db-custom-2-7680',  label: 'db-custom-2-7680  – 2 vCPU · 7.5 GB',   vcpu: 2,    memoryGb: 7.5,  costPerHour: 0.1296 },
        { id: 'db-custom-4-15360', label: 'db-custom-4-15360 – 4 vCPU · 15 GB',    vcpu: 4,    memoryGb: 15,   costPerHour: 0.2592 },
        { id: 'db-custom-8-30720', label: 'db-custom-8-30720 – 8 vCPU · 30 GB',    vcpu: 8,    memoryGb: 30,   costPerHour: 0.5184 },
      ],
    },
    {
      provider: 'azure',
      serviceName: 'Azure Database for PostgreSQL',
      terraformResource: 'azurerm_postgresql_flexible_server',
      terraformInstanceField: 'sku_name',
      regions: AZURE_REGIONS,
      instanceTypes: [
        { id: 'B_Standard_B1ms',   label: 'Burstable B1ms  – 1 vCPU · 2 GB',   vcpu: 1, memoryGb: 2,  costPerHour: 0.0317 },
        { id: 'B_Standard_B2ms',   label: 'Burstable B2ms  – 2 vCPU · 4 GB',   vcpu: 2, memoryGb: 4,  costPerHour: 0.0632 },
        { id: 'GP_Standard_D2s_v3', label: 'GP D2s_v3       – 2 vCPU · 8 GB',  vcpu: 2, memoryGb: 8,  costPerHour: 0.1698 },
        { id: 'GP_Standard_D4s_v3', label: 'GP D4s_v3       – 4 vCPU · 16 GB', vcpu: 4, memoryGb: 16, costPerHour: 0.3396 },
        { id: 'MO_Standard_E2s_v3', label: 'Mem-Opt E2s_v3  – 2 vCPU · 16 GB', vcpu: 2, memoryGb: 16, costPerHour: 0.3012, notes: 'Memory-optimised' },
        { id: 'MO_Standard_E4s_v3', label: 'Mem-Opt E4s_v3  – 4 vCPU · 32 GB', vcpu: 4, memoryGb: 32, costPerHour: 0.6024 },
      ],
    },
  ],

  /* ── DATA: MySQL ────────────────────────────────────────── */
  mysql: [
    {
      provider: 'aws',
      serviceName: 'Amazon RDS for MySQL',
      terraformResource: 'aws_db_instance',
      terraformInstanceField: 'instance_class',
      regions: AWS_REGIONS,
      instanceTypes: [
        { id: 'db.t3.micro',   label: 'db.t3.micro   – 2 vCPU · 1 GB',    vcpu: 2,  memoryGb: 1,  costPerHour: 0.017 },
        { id: 'db.t3.small',   label: 'db.t3.small   – 2 vCPU · 2 GB',    vcpu: 2,  memoryGb: 2,  costPerHour: 0.034 },
        { id: 'db.t3.medium',  label: 'db.t3.medium  – 2 vCPU · 4 GB',    vcpu: 2,  memoryGb: 4,  costPerHour: 0.068 },
        { id: 'db.m5.large',   label: 'db.m5.large   – 2 vCPU · 8 GB',    vcpu: 2,  memoryGb: 8,  costPerHour: 0.171 },
        { id: 'db.r5.large',   label: 'db.r5.large   – 2 vCPU · 16 GB',   vcpu: 2,  memoryGb: 16, costPerHour: 0.240 },
      ],
    },
    {
      provider: 'gcp',
      serviceName: 'Cloud SQL for MySQL',
      terraformResource: 'google_sql_database_instance',
      terraformInstanceField: 'settings.tier',
      regions: GCP_REGIONS,
      instanceTypes: [
        { id: 'db-f1-micro',       label: 'db-f1-micro       – shared 0.6 GB',    vcpu: null, memoryGb: 0.6,  costPerHour: 0.0150 },
        { id: 'db-g1-small',       label: 'db-g1-small       – shared 1.7 GB',    vcpu: null, memoryGb: 1.7,  costPerHour: 0.0500 },
        { id: 'db-custom-2-7680',  label: 'db-custom-2-7680  – 2 vCPU · 7.5 GB', vcpu: 2,    memoryGb: 7.5,  costPerHour: 0.1296 },
        { id: 'db-custom-4-15360', label: 'db-custom-4-15360 – 4 vCPU · 15 GB',  vcpu: 4,    memoryGb: 15,   costPerHour: 0.2592 },
      ],
    },
    {
      provider: 'azure',
      serviceName: 'Azure Database for MySQL',
      terraformResource: 'azurerm_mysql_flexible_server',
      terraformInstanceField: 'sku_name',
      regions: AZURE_REGIONS,
      instanceTypes: [
        { id: 'B_Standard_B1ms',    label: 'Burstable B1ms  – 1 vCPU · 2 GB',   vcpu: 1, memoryGb: 2,  costPerHour: 0.0317 },
        { id: 'GP_Standard_D2ds_v4', label: 'GP D2ds_v4     – 2 vCPU · 8 GB',   vcpu: 2, memoryGb: 8,  costPerHour: 0.1698 },
        { id: 'GP_Standard_D4ds_v4', label: 'GP D4ds_v4     – 4 vCPU · 16 GB',  vcpu: 4, memoryGb: 16, costPerHour: 0.3396 },
      ],
    },
  ],

  /* ── DATA: DynamoDB / NoSQL equivalent ──────────────────── */
  dynamodb: [
    {
      provider: 'aws',
      serviceName: 'Amazon DynamoDB',
      terraformResource: 'aws_dynamodb_table',
      terraformInstanceField: 'billing_mode',
      regions: AWS_REGIONS,
      instanceTypes: [
        { id: 'PAY_PER_REQUEST', label: 'On-Demand (pay per request)', vcpu: null, memoryGb: null, costPerHour: 0.0, notes: '$1.25/million reads, $1.25/million writes' },
        { id: 'PROVISIONED_5_5', label: 'Provisioned 5 RCU · 5 WCU',  vcpu: null, memoryGb: null, costPerHour: 0.00046 },
        { id: 'PROVISIONED_50_50', label: 'Provisioned 50 RCU · 50 WCU', vcpu: null, memoryGb: null, costPerHour: 0.0046 },
        { id: 'PROVISIONED_100_100', label: 'Provisioned 100 RCU · 100 WCU', vcpu: null, memoryGb: null, costPerHour: 0.0092 },
      ],
    },
    {
      provider: 'gcp',
      serviceName: 'Cloud Firestore',
      terraformResource: 'google_firestore_database',
      terraformInstanceField: null,
      regions: GCP_REGIONS,
      instanceTypes: [
        { id: 'native', label: 'Native mode (pay per operation)', vcpu: null, memoryGb: null, costPerHour: 0.0, notes: '$0.06/100K reads, $0.18/100K writes' },
        { id: 'datastore', label: 'Datastore mode', vcpu: null, memoryGb: null, costPerHour: 0.0 },
      ],
    },
    {
      provider: 'azure',
      serviceName: 'Azure Cosmos DB',
      terraformResource: 'azurerm_cosmosdb_account',
      terraformInstanceField: 'consistency_policy.consistency_level',
      regions: AZURE_REGIONS,
      instanceTypes: [
        { id: 'serverless', label: 'Serverless (pay per RU)',  vcpu: null, memoryGb: null, costPerHour: 0.0, notes: '$0.282/million RUs' },
        { id: '400_autoscale', label: 'Autoscale 400 RU/s',  vcpu: null, memoryGb: null, costPerHour: 0.008 },
        { id: '1000_autoscale', label: 'Autoscale 1000 RU/s', vcpu: null, memoryGb: null, costPerHour: 0.016 },
        { id: '4000_autoscale', label: 'Autoscale 4000 RU/s', vcpu: null, memoryGb: null, costPerHour: 0.040 },
      ],
    },
  ],

  /* ── DATA: MongoDB ──────────────────────────────────────── */
  mongodb: [
    {
      provider: 'aws',
      serviceName: 'Amazon DocumentDB',
      terraformResource: 'aws_docdb_cluster_instance',
      terraformInstanceField: 'instance_class',
      regions: ['us-east-1', 'us-east-2', 'us-west-2', 'eu-west-1', 'ap-southeast-1'],
      instanceTypes: [
        { id: 'db.t3.medium',  label: 'db.t3.medium  – 2 vCPU · 4 GB',   vcpu: 2, memoryGb: 4,  costPerHour: 0.072 },
        { id: 'db.r5.large',   label: 'db.r5.large   – 2 vCPU · 16 GB',  vcpu: 2, memoryGb: 16, costPerHour: 0.277 },
        { id: 'db.r5.xlarge',  label: 'db.r5.xlarge  – 4 vCPU · 32 GB',  vcpu: 4, memoryGb: 32, costPerHour: 0.554 },
        { id: 'db.r5.2xlarge', label: 'db.r5.2xlarge – 8 vCPU · 64 GB',  vcpu: 8, memoryGb: 64, costPerHour: 1.108 },
      ],
    },
    {
      provider: 'gcp',
      serviceName: 'MongoDB Atlas (GCP)',
      terraformResource: 'mongodbatlas_cluster',
      terraformInstanceField: 'provider_instance_size_name',
      regions: GCP_REGIONS,
      instanceTypes: [
        { id: 'M10',  label: 'M10  – 2 vCPU · 2 GB',   vcpu: 2,  memoryGb: 2,  costPerHour: 0.08,  notes: 'Atlas dedicated cluster' },
        { id: 'M20',  label: 'M20  – 2 vCPU · 4 GB',   vcpu: 2,  memoryGb: 4,  costPerHour: 0.20 },
        { id: 'M30',  label: 'M30  – 2 vCPU · 8 GB',   vcpu: 2,  memoryGb: 8,  costPerHour: 0.54 },
        { id: 'M40',  label: 'M40  – 4 vCPU · 16 GB',  vcpu: 4,  memoryGb: 16, costPerHour: 1.04 },
      ],
    },
    {
      provider: 'azure',
      serviceName: 'Azure Cosmos DB (MongoDB API)',
      terraformResource: 'azurerm_cosmosdb_account',
      terraformInstanceField: null,
      regions: AZURE_REGIONS,
      instanceTypes: [
        { id: 'serverless',    label: 'Serverless',       vcpu: null, memoryGb: null, costPerHour: 0.0 },
        { id: '400_ru',        label: 'Provisioned 400 RU/s',  vcpu: null, memoryGb: null, costPerHour: 0.008 },
        { id: '1000_ru',       label: 'Provisioned 1000 RU/s', vcpu: null, memoryGb: null, costPerHour: 0.016 },
        { id: '4000_ru',       label: 'Provisioned 4000 RU/s', vcpu: null, memoryGb: null, costPerHour: 0.040 },
      ],
    },
  ],

  /* ── DATA: Redis ────────────────────────────────────────── */
  redis: [
    {
      provider: 'aws',
      serviceName: 'Amazon ElastiCache for Redis',
      terraformResource: 'aws_elasticache_cluster',
      terraformInstanceField: 'node_type',
      regions: AWS_REGIONS,
      instanceTypes: [
        { id: 'cache.t3.micro',  label: 'cache.t3.micro  – 2 vCPU · 0.5 GB', vcpu: 2, memoryGb: 0.5, costPerHour: 0.017 },
        { id: 'cache.t3.small',  label: 'cache.t3.small  – 2 vCPU · 1.4 GB', vcpu: 2, memoryGb: 1.4, costPerHour: 0.034 },
        { id: 'cache.t3.medium', label: 'cache.t3.medium – 2 vCPU · 3.1 GB', vcpu: 2, memoryGb: 3.1, costPerHour: 0.068 },
        { id: 'cache.m6g.large', label: 'cache.m6g.large – 2 vCPU · 6.4 GB', vcpu: 2, memoryGb: 6.4, costPerHour: 0.149 },
        { id: 'cache.m6g.xlarge', label: 'cache.m6g.xlarge – 4 vCPU · 12.9 GB', vcpu: 4, memoryGb: 12.9, costPerHour: 0.298 },
        { id: 'cache.r6g.large', label: 'cache.r6g.large – 2 vCPU · 13.1 GB', vcpu: 2, memoryGb: 13.1, costPerHour: 0.173, notes: 'Memory-optimised' },
      ],
    },
    {
      provider: 'gcp',
      serviceName: 'Cloud Memorystore for Redis',
      terraformResource: 'google_redis_instance',
      terraformInstanceField: 'memory_size_gb',
      regions: GCP_REGIONS,
      instanceTypes: [
        { id: '1',   label: 'Basic  1 GB',   vcpu: null, memoryGb: 1,   costPerHour: 0.049 },
        { id: '5',   label: 'Basic  5 GB',   vcpu: null, memoryGb: 5,   costPerHour: 0.245 },
        { id: '10',  label: 'Basic  10 GB',  vcpu: null, memoryGb: 10,  costPerHour: 0.490 },
        { id: 's-1', label: 'Standard 1 GB (HA)', vcpu: null, memoryGb: 1,  costPerHour: 0.068, notes: 'High-availability replication' },
        { id: 's-5', label: 'Standard 5 GB (HA)', vcpu: null, memoryGb: 5,  costPerHour: 0.340 },
      ],
    },
    {
      provider: 'azure',
      serviceName: 'Azure Cache for Redis',
      terraformResource: 'azurerm_redis_cache',
      terraformInstanceField: 'sku_name',
      regions: AZURE_REGIONS,
      instanceTypes: [
        { id: 'Basic_C0',     label: 'Basic C0   – 250 MB',  vcpu: null, memoryGb: 0.25, costPerHour: 0.022 },
        { id: 'Basic_C1',     label: 'Basic C1   – 1 GB',    vcpu: null, memoryGb: 1,    costPerHour: 0.072 },
        { id: 'Standard_C1',  label: 'Standard C1 – 1 GB',   vcpu: null, memoryGb: 1,    costPerHour: 0.101, notes: 'Master/replica pair' },
        { id: 'Standard_C2',  label: 'Standard C2 – 6 GB',   vcpu: null, memoryGb: 6,    costPerHour: 0.202 },
        { id: 'Premium_P1',   label: 'Premium P1  – 6 GB',   vcpu: null, memoryGb: 6,    costPerHour: 0.562, notes: 'Cluster, geo-rep, VNet' },
        { id: 'Premium_P2',   label: 'Premium P2  – 13 GB',  vcpu: null, memoryGb: 13,   costPerHour: 1.123 },
      ],
    },
  ],

  /* ── DATA: Memcached ────────────────────────────────────── */
  memcached: [
    {
      provider: 'aws',
      serviceName: 'Amazon ElastiCache for Memcached',
      terraformResource: 'aws_elasticache_cluster',
      terraformInstanceField: 'node_type',
      regions: AWS_REGIONS,
      instanceTypes: [
        { id: 'cache.t3.micro',  label: 'cache.t3.micro  – 2 vCPU · 0.5 GB', vcpu: 2, memoryGb: 0.5, costPerHour: 0.017 },
        { id: 'cache.t3.medium', label: 'cache.t3.medium – 2 vCPU · 3.1 GB', vcpu: 2, memoryGb: 3.1, costPerHour: 0.068 },
        { id: 'cache.m6g.large', label: 'cache.m6g.large – 2 vCPU · 6.4 GB', vcpu: 2, memoryGb: 6.4, costPerHour: 0.149 },
      ],
    },
    {
      provider: 'gcp',
      serviceName: 'Cloud Memorystore for Memcached',
      terraformResource: 'google_memcache_instance',
      terraformInstanceField: 'node_config.cpu_count',
      regions: ['us-central1', 'us-east1', 'europe-west1'],
      instanceTypes: [
        { id: '1_1',  label: '1 vCPU · 1 GB',    vcpu: 1, memoryGb: 1,  costPerHour: 0.050 },
        { id: '2_2',  label: '2 vCPU · 2 GB',    vcpu: 2, memoryGb: 2,  costPerHour: 0.100 },
        { id: '4_4',  label: '4 vCPU · 4 GB',    vcpu: 4, memoryGb: 4,  costPerHour: 0.200 },
      ],
    },
  ],

  /* ── STORAGE: Object Storage ────────────────────────────── */
  object_storage: [
    {
      provider: 'aws',
      serviceName: 'Amazon S3',
      terraformResource: 'aws_s3_bucket',
      terraformInstanceField: null,
      regions: AWS_REGIONS,
      instanceTypes: [
        { id: 'Standard',           label: 'Standard',             vcpu: null, memoryGb: null, costPerHour: 0.0, notes: '$0.023/GB-month' },
        { id: 'Standard-IA',        label: 'Standard-IA',          vcpu: null, memoryGb: null, costPerHour: 0.0, notes: '$0.0125/GB-month' },
        { id: 'Intelligent-Tiering',label: 'Intelligent-Tiering',  vcpu: null, memoryGb: null, costPerHour: 0.0, notes: 'Auto-tiered' },
        { id: 'Glacier',            label: 'Glacier',              vcpu: null, memoryGb: null, costPerHour: 0.0, notes: '$0.004/GB-month · retrieval hours' },
      ],
    },
    {
      provider: 'gcp',
      serviceName: 'Cloud Storage',
      terraformResource: 'google_storage_bucket',
      terraformInstanceField: 'storage_class',
      regions: GCP_REGIONS,
      instanceTypes: [
        { id: 'STANDARD',  label: 'Standard',  vcpu: null, memoryGb: null, costPerHour: 0.0, notes: '$0.020/GB-month' },
        { id: 'NEARLINE',  label: 'Nearline',  vcpu: null, memoryGb: null, costPerHour: 0.0, notes: '$0.010/GB-month · >=30 day' },
        { id: 'COLDLINE',  label: 'Coldline',  vcpu: null, memoryGb: null, costPerHour: 0.0, notes: '$0.004/GB-month · >=90 day' },
        { id: 'ARCHIVE',   label: 'Archive',   vcpu: null, memoryGb: null, costPerHour: 0.0, notes: '$0.0012/GB-month · >=365 day' },
      ],
    },
    {
      provider: 'azure',
      serviceName: 'Azure Blob Storage',
      terraformResource: 'azurerm_storage_account',
      terraformInstanceField: 'access_tier',
      regions: AZURE_REGIONS,
      instanceTypes: [
        { id: 'Hot',    label: 'Hot',    vcpu: null, memoryGb: null, costPerHour: 0.0, notes: '$0.018/GB-month' },
        { id: 'Cool',   label: 'Cool',   vcpu: null, memoryGb: null, costPerHour: 0.0, notes: '$0.01/GB-month' },
        { id: 'Cold',   label: 'Cold',   vcpu: null, memoryGb: null, costPerHour: 0.0, notes: '$0.0045/GB-month' },
        { id: 'Archive',label: 'Archive',vcpu: null, memoryGb: null, costPerHour: 0.0, notes: '$0.00099/GB-month' },
      ],
    },
  ],

  /* ── NETWORK: API Gateway ───────────────────────────────── */
  api_gateway: [
    {
      provider: 'aws',
      serviceName: 'Amazon API Gateway',
      terraformResource: 'aws_api_gateway_rest_api',
      terraformInstanceField: null,
      regions: AWS_REGIONS,
      instanceTypes: [
        { id: 'REST',      label: 'REST API',      vcpu: null, memoryGb: null, costPerHour: 0.0, notes: '$3.50/million API calls' },
        { id: 'HTTP',      label: 'HTTP API',      vcpu: null, memoryGb: null, costPerHour: 0.0, notes: '$1.00/million API calls (cheaper)' },
        { id: 'WebSocket', label: 'WebSocket API', vcpu: null, memoryGb: null, costPerHour: 0.0, notes: '$1.00/million messages' },
      ],
    },
    {
      provider: 'gcp',
      serviceName: 'Cloud Endpoints / API Gateway',
      terraformResource: 'google_api_gateway_gateway',
      terraformInstanceField: null,
      regions: GCP_REGIONS,
      instanceTypes: [
        { id: 'shared', label: 'Managed (pay per call)', vcpu: null, memoryGb: null, costPerHour: 0.0, notes: '$3.00/million calls' },
      ],
    },
    {
      provider: 'azure',
      serviceName: 'Azure API Management',
      terraformResource: 'azurerm_api_management',
      terraformInstanceField: 'sku_name',
      regions: AZURE_REGIONS,
      instanceTypes: [
        { id: 'Consumption', label: 'Consumption',      vcpu: null, memoryGb: null, costPerHour: 0.0,    notes: 'Pay per call – $3.50/million' },
        { id: 'Developer_1', label: 'Developer',        vcpu: null, memoryGb: 8,    costPerHour: 0.07 },
        { id: 'Basic_1',     label: 'Basic',            vcpu: null, memoryGb: null, costPerHour: 0.15 },
        { id: 'Standard_1',  label: 'Standard',         vcpu: null, memoryGb: null, costPerHour: 0.75 },
        { id: 'Premium_1',   label: 'Premium',          vcpu: null, memoryGb: null, costPerHour: 2.58  },
      ],
    },
  ],

  /* ── NETWORK: Load Balancer ─────────────────────────────── */
  load_balancer: [
    {
      provider: 'aws',
      serviceName: 'AWS Application Load Balancer',
      terraformResource: 'aws_lb',
      terraformInstanceField: 'load_balancer_type',
      regions: AWS_REGIONS,
      instanceTypes: [
        { id: 'application', label: 'Application (ALB) – L7 HTTP/S', vcpu: null, memoryGb: null, costPerHour: 0.008, notes: '+$0.008/LCU-hr' },
        { id: 'network',     label: 'Network (NLB) – L4 TCP/UDP',    vcpu: null, memoryGb: null, costPerHour: 0.006, notes: 'Ultra-low latency' },
        { id: 'gateway',     label: 'Gateway (GWLB) – inline appliance', vcpu: null, memoryGb: null, costPerHour: 0.004 },
      ],
    },
    {
      provider: 'gcp',
      serviceName: 'Cloud Load Balancing',
      terraformResource: 'google_compute_backend_service',
      terraformInstanceField: null,
      regions: ['global'],
      instanceTypes: [
        { id: 'HTTP', label: 'HTTP(S) External – Global',  vcpu: null, memoryGb: null, costPerHour: 0.012 },
        { id: 'TCP',  label: 'TCP/SSL Proxy – Global',     vcpu: null, memoryGb: null, costPerHour: 0.010 },
        { id: 'ILB',  label: 'Internal TCP/UDP – Regional',vcpu: null, memoryGb: null, costPerHour: 0.008 },
      ],
    },
    {
      provider: 'azure',
      serviceName: 'Azure Load Balancer',
      terraformResource: 'azurerm_lb',
      terraformInstanceField: 'sku',
      regions: AZURE_REGIONS,
      instanceTypes: [
        { id: 'Basic',    label: 'Basic',    vcpu: null, memoryGb: null, costPerHour: 0.0,   notes: 'Free, limited features' },
        { id: 'Standard', label: 'Standard', vcpu: null, memoryGb: null, costPerHour: 0.005, notes: 'Zone-redundant, SLA 99.99%' },
        { id: 'Gateway',  label: 'Gateway',  vcpu: null, memoryGb: null, costPerHour: 0.01,  notes: 'Third-party appliances' },
      ],
    },
  ],

  /* ── NETWORK: CDN ───────────────────────────────────────── */
  cdn: [
    {
      provider: 'aws',
      serviceName: 'Amazon CloudFront',
      terraformResource: 'aws_cloudfront_distribution',
      terraformInstanceField: 'price_class',
      regions: ['global'],
      instanceTypes: [
        { id: 'PriceClass_100', label: 'Price Class 100 – NA + Europe only',   vcpu: null, memoryGb: null, costPerHour: 0.005 },
        { id: 'PriceClass_200', label: 'Price Class 200 – + Japan, Australia', vcpu: null, memoryGb: null, costPerHour: 0.007 },
        { id: 'PriceClass_All', label: 'Price Class All  – All edge locations', vcpu: null, memoryGb: null, costPerHour: 0.010 },
      ],
    },
    {
      provider: 'gcp',
      serviceName: 'Cloud CDN',
      terraformResource: 'google_compute_backend_bucket',
      terraformInstanceField: null,
      regions: ['global'],
      instanceTypes: [
        { id: 'global', label: 'Global CDN (cache egress billing)', vcpu: null, memoryGb: null, costPerHour: 0.005 },
      ],
    },
    {
      provider: 'azure',
      serviceName: 'Azure CDN',
      terraformResource: 'azurerm_cdn_profile',
      terraformInstanceField: 'sku',
      regions: ['global'],
      instanceTypes: [
        { id: 'Standard_Microsoft', label: 'Standard Microsoft', vcpu: null, memoryGb: null, costPerHour: 0.005 },
        { id: 'Standard_Verizon',   label: 'Standard Verizon',   vcpu: null, memoryGb: null, costPerHour: 0.006 },
        { id: 'Premium_Verizon',    label: 'Premium Verizon',    vcpu: null, memoryGb: null, costPerHour: 0.012 },
      ],
    },
  ],

  /* ── PLATFORM: Kafka ────────────────────────────────────── */
  kafka: [
    {
      provider: 'aws',
      serviceName: 'Amazon MSK (Managed Kafka)',
      terraformResource: 'aws_msk_cluster',
      terraformInstanceField: 'broker_node_group_info.instance_type',
      regions: AWS_REGIONS,
      instanceTypes: [
        { id: 'kafka.t3.small',   label: 'kafka.t3.small   – 2 vCPU · 2 GB',   vcpu: 2,  memoryGb: 2,  costPerHour: 0.054,  notes: 'Dev/Test only' },
        { id: 'kafka.m5.large',   label: 'kafka.m5.large   – 2 vCPU · 8 GB',   vcpu: 2,  memoryGb: 8,  costPerHour: 0.212 },
        { id: 'kafka.m5.xlarge',  label: 'kafka.m5.xlarge  – 4 vCPU · 16 GB',  vcpu: 4,  memoryGb: 16, costPerHour: 0.424 },
        { id: 'kafka.m5.2xlarge', label: 'kafka.m5.2xlarge – 8 vCPU · 32 GB',  vcpu: 8,  memoryGb: 32, costPerHour: 0.848 },
        { id: 'kafka.m5.4xlarge', label: 'kafka.m5.4xlarge – 16 vCPU · 64 GB', vcpu: 16, memoryGb: 64, costPerHour: 1.696 },
      ],
    },
    {
      provider: 'azure',
      serviceName: 'Azure Event Hubs (Kafka-compatible)',
      terraformResource: 'azurerm_eventhub_namespace',
      terraformInstanceField: 'sku',
      regions: AZURE_REGIONS,
      instanceTypes: [
        { id: 'Basic',     label: 'Basic',     vcpu: null, memoryGb: null, costPerHour: 0.015, notes: '1 consumer group, 1 day retention' },
        { id: 'Standard',  label: 'Standard',  vcpu: null, memoryGb: null, costPerHour: 0.030, notes: '20 consumer groups, 7 day retention' },
        { id: 'Premium',   label: 'Premium',   vcpu: null, memoryGb: null, costPerHour: 1.104, notes: 'Dedicated, 90 day retention' },
        { id: 'Dedicated', label: 'Dedicated (1 CU)', vcpu: null, memoryGb: null, costPerHour: 7.30 },
      ],
    },
  ],

  /* ── PLATFORM: RabbitMQ ─────────────────────────────────── */
  rabbitmq: [
    {
      provider: 'aws',
      serviceName: 'Amazon MQ for RabbitMQ',
      terraformResource: 'aws_mq_broker',
      terraformInstanceField: 'host_instance_type',
      regions: AWS_REGIONS,
      instanceTypes: [
        { id: 'mq.t3.micro',  label: 'mq.t3.micro  – 2 vCPU · 1 GB',  vcpu: 2, memoryGb: 1,  costPerHour: 0.018 },
        { id: 'mq.m5.large',  label: 'mq.m5.large  – 2 vCPU · 8 GB',  vcpu: 2, memoryGb: 8,  costPerHour: 0.300 },
        { id: 'mq.m5.xlarge', label: 'mq.m5.xlarge – 4 vCPU · 16 GB', vcpu: 4, memoryGb: 16, costPerHour: 0.600 },
      ],
    },
    {
      provider: 'azure',
      serviceName: 'Azure Service Bus',
      terraformResource: 'azurerm_servicebus_namespace',
      terraformInstanceField: 'sku',
      regions: AZURE_REGIONS,
      instanceTypes: [
        { id: 'Basic',   label: 'Basic',   vcpu: null, memoryGb: null, costPerHour: 0.0, notes: 'Queues only, $0.05/million operations' },
        { id: 'Standard',label: 'Standard',vcpu: null, memoryGb: null, costPerHour: 0.013, notes: 'Topics + queues, max 80 GB' },
        { id: 'Premium_1', label: 'Premium 1 MU', vcpu: null, memoryGb: null, costPerHour: 0.928, notes: 'Dedicated, VNet isolation' },
      ],
    },
  ],

  /* ── OBSERVABILITY ──────────────────────────────────────── */
  monitoring: [
    {
      provider: 'aws',
      serviceName: 'Amazon CloudWatch',
      terraformResource: 'aws_cloudwatch_metric_alarm',
      terraformInstanceField: null,
      regions: AWS_REGIONS,
      instanceTypes: [
        { id: 'basic',    label: 'Basic Monitoring (free)', vcpu: null, memoryGb: null, costPerHour: 0.0 },
        { id: 'detailed', label: 'Detailed Monitoring',     vcpu: null, memoryGb: null, costPerHour: 0.001, notes: '$0.01/metric/month' },
      ],
    },
    {
      provider: 'gcp',
      serviceName: 'Cloud Monitoring',
      terraformResource: 'google_monitoring_alert_policy',
      terraformInstanceField: null,
      regions: ['global'],
      instanceTypes: [
        { id: 'free',  label: 'Free tier (first 150 MB metrics/month)', vcpu: null, memoryGb: null, costPerHour: 0.0 },
        { id: 'paid',  label: 'Pay-as-you-go',                          vcpu: null, memoryGb: null, costPerHour: 0.001, notes: '$0.18/MB ingested' },
      ],
    },
    {
      provider: 'azure',
      serviceName: 'Azure Monitor',
      terraformResource: 'azurerm_monitor_metric_alert',
      terraformInstanceField: null,
      regions: ['global'],
      instanceTypes: [
        { id: 'platform', label: 'Platform metrics (free)', vcpu: null, memoryGb: null, costPerHour: 0.0 },
        { id: 'custom',   label: 'Custom metrics',          vcpu: null, memoryGb: null, costPerHour: 0.0, notes: '$0.10/1K custom metric time-series' },
      ],
    },
  ],

  logging: [
    {
      provider: 'aws',
      serviceName: 'Amazon CloudWatch Logs',
      terraformResource: 'aws_cloudwatch_log_group',
      terraformInstanceField: 'retention_in_days',
      regions: AWS_REGIONS,
      instanceTypes: [
        { id: '7',   label: '7-day retention',   vcpu: null, memoryGb: null, costPerHour: 0.0, notes: '$0.50/GB ingested' },
        { id: '30',  label: '30-day retention',  vcpu: null, memoryGb: null, costPerHour: 0.0 },
        { id: '90',  label: '90-day retention',  vcpu: null, memoryGb: null, costPerHour: 0.0 },
        { id: '365', label: '365-day retention', vcpu: null, memoryGb: null, costPerHour: 0.0 },
        { id: '0',   label: 'Never expire',      vcpu: null, memoryGb: null, costPerHour: 0.0 },
      ],
    },
    {
      provider: 'gcp',
      serviceName: 'Cloud Logging',
      terraformResource: 'google_logging_project_sink',
      terraformInstanceField: null,
      regions: ['global'],
      instanceTypes: [
        { id: 'free',   label: 'First 50 GB/month free', vcpu: null, memoryGb: null, costPerHour: 0.0 },
        { id: 'paid',   label: 'Pay-per-GB',             vcpu: null, memoryGb: null, costPerHour: 0.0, notes: '$0.01/GB after 50 GB' },
      ],
    },
    {
      provider: 'azure',
      serviceName: 'Azure Log Analytics',
      terraformResource: 'azurerm_log_analytics_workspace',
      terraformInstanceField: 'sku',
      regions: AZURE_REGIONS,
      instanceTypes: [
        { id: 'PerGB2018', label: 'Pay As You Go',     vcpu: null, memoryGb: null, costPerHour: 0.0, notes: '$2.30/GB ingested' },
        { id: '100',       label: 'Commitment 100 GB', vcpu: null, memoryGb: null, costPerHour: 0.190 },
        { id: '200',       label: 'Commitment 200 GB', vcpu: null, memoryGb: null, costPerHour: 0.365 },
      ],
    },
  ],

  tracing: [
    {
      provider: 'aws',
      serviceName: 'AWS X-Ray',
      terraformResource: 'aws_xray_sampling_rule',
      terraformInstanceField: null,
      regions: AWS_REGIONS,
      instanceTypes: [
        { id: 'default', label: 'Managed (first 100K traces/month free)', vcpu: null, memoryGb: null, costPerHour: 0.0, notes: '$5/million traces recorded' },
      ],
    },
    {
      provider: 'gcp',
      serviceName: 'Cloud Trace',
      terraformResource: 'google_project_service',
      terraformInstanceField: null,
      regions: ['global'],
      instanceTypes: [
        { id: 'default', label: 'Pay per trace (first 2.5M/month free)', vcpu: null, memoryGb: null, costPerHour: 0.0, notes: '$0.20/million spans after free tier' },
      ],
    },
    {
      provider: 'azure',
      serviceName: 'Azure Application Insights',
      terraformResource: 'azurerm_application_insights',
      terraformInstanceField: 'application_type',
      regions: AZURE_REGIONS,
      instanceTypes: [
        { id: 'web',         label: 'Web application',  vcpu: null, memoryGb: null, costPerHour: 0.0, notes: '$2.88/GB data ingested' },
        { id: 'other',       label: 'General / other',  vcpu: null, memoryGb: null, costPerHour: 0.0 },
        { id: 'mobile_center', label: 'Mobile',         vcpu: null, memoryGb: null, costPerHour: 0.0 },
      ],
    },
  ],
};

/* ══════════════════════════════════════════════════════════════
   Compute VM helper — generates AWS/GCP/Azure options for any
   generic "runs on a VM" component type.
   ══════════════════════════════════════════════════════════════ */
function computeVmOptions(): CloudServiceOption[] {
  return [
    {
      provider: 'aws',
      serviceName: 'Amazon EC2',
      terraformResource: 'aws_instance',
      terraformInstanceField: 'instance_type',
      regions: AWS_REGIONS,
      instanceTypes: [
        { id: 't3.nano',    label: 't3.nano    – 2 vCPU · 0.5 GB',  vcpu: 2,  memoryGb: 0.5,  costPerHour: 0.0052, notes: 'Dev only' },
        { id: 't3.micro',   label: 't3.micro   – 2 vCPU · 1 GB',    vcpu: 2,  memoryGb: 1,    costPerHour: 0.0104, notes: 'Free tier eligible' },
        { id: 't3.small',   label: 't3.small   – 2 vCPU · 2 GB',    vcpu: 2,  memoryGb: 2,    costPerHour: 0.0208 },
        { id: 't3.medium',  label: 't3.medium  – 2 vCPU · 4 GB',    vcpu: 2,  memoryGb: 4,    costPerHour: 0.0416 },
        { id: 't3.large',   label: 't3.large   – 2 vCPU · 8 GB',    vcpu: 2,  memoryGb: 8,    costPerHour: 0.0832 },
        { id: 'm6i.large',  label: 'm6i.large  – 2 vCPU · 8 GB',    vcpu: 2,  memoryGb: 8,    costPerHour: 0.096  },
        { id: 'm6i.xlarge', label: 'm6i.xlarge – 4 vCPU · 16 GB',   vcpu: 4,  memoryGb: 16,   costPerHour: 0.192  },
        { id: 'm6i.2xlarge',label: 'm6i.2xlarge– 8 vCPU · 32 GB',   vcpu: 8,  memoryGb: 32,   costPerHour: 0.384  },
        { id: 'c6i.large',  label: 'c6i.large  – 2 vCPU · 4 GB',    vcpu: 2,  memoryGb: 4,    costPerHour: 0.085, notes: 'Compute-optimised' },
        { id: 'c6i.xlarge', label: 'c6i.xlarge – 4 vCPU · 8 GB',    vcpu: 4,  memoryGb: 8,    costPerHour: 0.170 },
        { id: 'r6i.large',  label: 'r6i.large  – 2 vCPU · 16 GB',   vcpu: 2,  memoryGb: 16,   costPerHour: 0.126, notes: 'Memory-optimised' },
        { id: 'r6i.xlarge', label: 'r6i.xlarge – 4 vCPU · 32 GB',   vcpu: 4,  memoryGb: 32,   costPerHour: 0.252 },
      ],
    },
    {
      provider: 'gcp',
      serviceName: 'Google Compute Engine',
      terraformResource: 'google_compute_instance',
      terraformInstanceField: 'machine_type',
      regions: GCP_REGIONS,
      instanceTypes: [
        { id: 'e2-micro',      label: 'e2-micro      – 2 vCPU · 1 GB',    vcpu: 2, memoryGb: 1,    costPerHour: 0.0084 },
        { id: 'e2-small',      label: 'e2-small      – 2 vCPU · 2 GB',    vcpu: 2, memoryGb: 2,    costPerHour: 0.0168 },
        { id: 'e2-medium',     label: 'e2-medium     – 2 vCPU · 4 GB',    vcpu: 2, memoryGb: 4,    costPerHour: 0.0336 },
        { id: 'n2-standard-2', label: 'n2-standard-2 – 2 vCPU · 8 GB',    vcpu: 2, memoryGb: 8,    costPerHour: 0.0971 },
        { id: 'n2-standard-4', label: 'n2-standard-4 – 4 vCPU · 16 GB',   vcpu: 4, memoryGb: 16,   costPerHour: 0.1942 },
        { id: 'n2-standard-8', label: 'n2-standard-8 – 8 vCPU · 32 GB',   vcpu: 8, memoryGb: 32,   costPerHour: 0.3884 },
        { id: 'c2-standard-4', label: 'c2-standard-4 – 4 vCPU · 16 GB',   vcpu: 4, memoryGb: 16,   costPerHour: 0.2088, notes: 'Compute-optimised' },
        { id: 'n2-highmem-2',  label: 'n2-highmem-2  – 2 vCPU · 16 GB',   vcpu: 2, memoryGb: 16,   costPerHour: 0.1239, notes: 'Memory-optimised' },
      ],
    },
    {
      provider: 'azure',
      serviceName: 'Azure Virtual Machine',
      terraformResource: 'azurerm_linux_virtual_machine',
      terraformInstanceField: 'size',
      regions: AZURE_REGIONS,
      instanceTypes: [
        { id: 'Standard_B1s',   label: 'B1s    – 1 vCPU · 1 GB',    vcpu: 1, memoryGb: 1,   costPerHour: 0.0104, notes: 'Burstable' },
        { id: 'Standard_B2s',   label: 'B2s    – 2 vCPU · 4 GB',    vcpu: 2, memoryGb: 4,   costPerHour: 0.0416 },
        { id: 'Standard_B2ms',  label: 'B2ms   – 2 vCPU · 8 GB',    vcpu: 2, memoryGb: 8,   costPerHour: 0.0832 },
        { id: 'Standard_D2s_v5',label: 'D2s_v5 – 2 vCPU · 8 GB',    vcpu: 2, memoryGb: 8,   costPerHour: 0.096  },
        { id: 'Standard_D4s_v5',label: 'D4s_v5 – 4 vCPU · 16 GB',   vcpu: 4, memoryGb: 16,  costPerHour: 0.192  },
        { id: 'Standard_D8s_v5',label: 'D8s_v5 – 8 vCPU · 32 GB',   vcpu: 8, memoryGb: 32,  costPerHour: 0.384  },
        { id: 'Standard_F2s_v2',label: 'F2s_v2 – 2 vCPU · 4 GB',    vcpu: 2, memoryGb: 4,   costPerHour: 0.085, notes: 'Compute-optimised' },
        { id: 'Standard_E4s_v5',label: 'E4s_v5 – 4 vCPU · 32 GB',   vcpu: 4, memoryGb: 32,  costPerHour: 0.252, notes: 'Memory-optimised' },
      ],
    },
  ];
}
