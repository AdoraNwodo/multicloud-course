import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as azure from "@pulumi/azure-native";
import * as grafana from "@pulumiverse/grafana";
import * as clickhouse from "@pulumiverse/clickhouse";
import * as pagerduty from "@pulumi/pagerduty";

const dbUsername = "admin";
const dbPassword = "foobarbaz"; // ideally, this should be a secret

const awsProvider = new aws.Provider("aws", {
    region: "us-west-2",
});

const azureProvider = new azure.Provider("azure", {
    location: "WestUS",
});

const rdsInstance = new aws.rds.Instance("default", {
    allocatedStorage: 10,
    dbName: "mydb",
    engine: "mysql",
    engineVersion: "8.0",
    instanceClass: aws.rds.InstanceType.T3_Micro,
    username: dbUsername,
    password: dbPassword,
    parameterGroupName: "default.mysql8.0",
    skipFinalSnapshot: true,
},{ provider: awsProvider });

const resourceGroup = new azure.resources.ResourceGroup("resourceGroup", {
    location: "WestUS",
    resourceGroupName: "my-resource-group",
}, { provider: azureProvider });

const storageAccount = new azure.storage.StorageAccount("adstorageacc", {
    enableHttpsTrafficOnly: false,
    isHnsEnabled: true,
    kind: azure.storage.Kind.BlockBlobStorage,
    location: resourceGroup.location,
    resourceGroupName: resourceGroup.name,
    sku: {
        name: azure.storage.SkuName.Premium_LRS,
    },
}, { provider: azureProvider });

const appServicePlan = new azure.web.AppServicePlan("adAppSP", {
    location: resourceGroup.location,
    name: "adAppSP",
    resourceGroupName: resourceGroup.name,
    kind: "App",
    sku: {
        name: "F1",
        tier: "Free",
    },
}, { provider: azureProvider });

const webApp = new azure.web.WebApp("adwebApp", {
    resourceGroupName: resourceGroup.name,
    serverFarmId: appServicePlan.id,
    siteConfig: {
        appSettings: [
            {
                name: "WEBSITE_NODE_DEFAULT_VERSION",
                value: "14.0.0",
            },
            {
                name: "WEBSITE_RUN_FROM_PACKAGE",
                value: "1"
            },
            {
                name: "DB_USERNAME",
                value: dbUsername
            },
            {
                name: "DB_PASSWORD",
                value: dbPassword
            }
        ]
    },
    httpsOnly: true,
}, { provider: azureProvider });

const grafanaProvider = new grafana.Provider("grafana", {
    url: "https://your-grafana-instance",
    auth: "anonymous",
});

const testFolder = new grafana.Folder("testFolder", {
    title: "My Folder",
    uid: "my-folder-uid",
}, { provider: grafanaProvider });

const testDashboard = new grafana.Dashboard("testDashboard", {
    folder: testFolder.uid,
    configJson: JSON.stringify({
        title: "My Dashboard",
        uid: "my-dashboard-uid",
    }),
}, { provider: grafanaProvider });

const clickhouseSvc = new clickhouse.Service("clickhouse", {
    region: "us-central1",
    cloudProvider: "gcp",
    tier: "development",
    password: "1234",
    ipAccesses: [{
        source: "0.0.0.0",
        description: "Test IP"
      }]
});

const pagerdutyService = new pagerduty.Service("pagerduty", {
    name: "My Web App",
    autoResolveTimeout: "14400",
    acknowledgementTimeout: "600",
    escalationPolicy: foo.id,
    alertCreation: "create_alerts_and_incidents",
    autoPauseNotificationsParameters: {
        enabled: true,
        timeout: 300,
    },
});