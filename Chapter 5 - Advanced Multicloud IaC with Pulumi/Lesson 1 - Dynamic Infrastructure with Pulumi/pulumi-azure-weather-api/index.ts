import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";

// Create an Azure Resource Group
const resourceGroup = new azure.resources.ResourceGroup("weather-rg",{
    location: "eastus"
});

// Create an Azure CosmosDB account
const cosmosAccount = new azure.documentdb.DatabaseAccount("weathercosmosaccount", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    databaseAccountOfferType: "Standard",
    locations: [{
        locationName: resourceGroup.location,
    }],
    consistencyPolicy: {
        defaultConsistencyLevel: "Session",
    },
});

// Retrieve the primary master key for CosmosDB
const cosmosAccountKeys = pulumi.all([cosmosAccount.name, resourceGroup.name]).apply(([accountName, rgName]) =>
    azure.documentdb.listDatabaseAccountKeys({
        accountName: accountName,
        resourceGroupName: rgName,
    })
);

// Extract the primary master key
const primaryMasterKey = cosmosAccountKeys.primaryMasterKey;

// Create a CosmosDB SQL database
const database = new azure.documentdb.SqlResourceSqlDatabase("weatherdb", {
    resourceGroupName: resourceGroup.name,
    accountName: cosmosAccount.name,
    resource: {
        id: "weatherdb",
    },
    options: {},
});

// Create a CosmosDB SQL container
const container = new azure.documentdb.SqlResourceSqlContainer("weathercontainer", {
    resourceGroupName: resourceGroup.name,
    accountName: cosmosAccount.name,
    databaseName: database.name,
    resource: {
        id: "weathercontainer",
        partitionKey: {
            paths: ["/city"],
            kind: "Hash",
        },
    },
    options: {},
});

// Create an App Service Plan
const appServicePlan = new azure.web.AppServicePlan("appserviceplan", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    sku: {
        tier: "Basic",
        name: "B1",
    },
});

// Create a Storage Account for the App Service
const storageAccount = new azure.storage.StorageAccount("appstorage", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    sku: {
        name: "Standard_LRS",
    },
    kind: "StorageV2",
});

// Create a Storage Container to hold the app package
const storageContainer = new azure.storage.BlobContainer("apppackagecontainer", {
    accountName: storageAccount.name,
    resourceGroupName: resourceGroup.name,
    publicAccess: azure.storage.PublicAccess.None,
});

// Read the ZIP file of the app to be deployed
const appZipPath = "../weather-source-code/[folder-name.zip]"; // Replace with your actual ZIP path
const appZipBlob = new azure.storage.Blob("appzipblob", {
    resourceGroupName: resourceGroup.name,
    accountName: storageAccount.name,
    containerName: storageContainer.name,
    source: new pulumi.asset.FileAsset(appZipPath),
    contentType: "application/zip",
});

// Generate a SAS token for the ZIP blob
const sasToken = pulumi.all([storageAccount.name, storageContainer.name, appZipBlob.name, resourceGroup.name]).apply(
    async ([accountName, containerName, blobName, rgName]) => {
        const start = new Date().toISOString();
        const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours from now

        const blobSAS = await azure.storage.listStorageAccountServiceSAS({
            accountName: accountName,
            protocols: azure.storage.HttpProtocol.Https,
            sharedAccessStartTime: start,
            sharedAccessExpiryTime: expiry,
            resource: "b",
            resourceGroupName: rgName,
            permissions: "r",
            canonicalizedResource: `/blob/${accountName}/${containerName}/${blobName}`,
            contentType: "application/zip",
            cacheControl: "no-cache",
            contentDisposition: "inline",
            contentEncoding: "identity",
        });
        return blobSAS.serviceSasToken;
    }
);

const zipBlobUrl = pulumi.interpolate`https://${storageAccount.name}.blob.core.windows.net/${storageContainer.name}/${appZipBlob.name}?${sasToken}`;

// Create an App Service
const appService = new azure.web.WebApp("weatherappservice", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    serverFarmId: appServicePlan.id,
    siteConfig: {
        appSettings: [
            { name: "WEBSITE_RUN_FROM_PACKAGE", value: zipBlobUrl },
            { name: "COSMOSDB_ENDPOINT", value: cosmosAccount.documentEndpoint },
            { name: "COSMOSDB_KEY", value: primaryMasterKey },
            { name: "DATABASE_NAME", value: database.name },
            { name: "CONTAINER_NAME", value: container.name },
            { name: "CLOUD_PROVIDER", value: "azure" },
        ],
        alwaysOn: true,
    },
});

// Get the endpoint URL of the App Service
const appServiceUrl = pulumi.interpolate`https://${appService.defaultHostName}`;

const org = ""; // your org
const project = "pulumi-aws-weather-api";
const stack = "dev";

const awsStackReference = new pulumi.StackReference(`${org}/${project}/${stack}`);
const lambdaUrl = awsStackReference.getOutput("lambdaUrl");

const trafficManagerUrl = lambdaUrl.apply(url => {
    const urlWithoutProtocol = url.replace(/^https?:\/\//, '').replace(/\/$/, '');

    const trafficManager = new azure.network.Profile("trafficManager", {
        resourceGroupName: resourceGroup.name,
        profileStatus: "Enabled",
        trafficRoutingMethod: "Priority",
        location: "global",
        dnsConfig: {
            relativeName: "weatherapi",
            ttl: 30,
        },
        monitorConfig: {
            protocol: "HTTPS",
            port: 443,
            path: "/weather",
            intervalInSeconds: 30,
            timeoutInSeconds: 10,
            toleratedNumberOfFailures: 3,
        },
        endpoints: [
            {
                name: "azureEndpoint",
                type: "Microsoft.Network/trafficManagerProfiles/azureEndpoints",
                targetResourceId: appService.id,
                endpointStatus: "Enabled",
                priority: 1,
            },
            {
                name: "awsEndpoint",
                type: "Microsoft.Network/trafficManagerProfiles/externalEndpoints",
                target: urlWithoutProtocol,
                endpointStatus: "Enabled",
                priority: 2,
            }
        ]
    });

    // Return the Traffic Manager URL
    return pulumi.interpolate`https://${trafficManager.name}.trafficmanager.net`;
});

// Export the Traffic Manager URL
export const finalTrafficManagerUrl = trafficManagerUrl;