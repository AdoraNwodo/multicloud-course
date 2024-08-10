import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";

const azureProvider = new azure.Provider("azure", {
    location: "WestUS",
});

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

const storageAccount2 = new azure.storage.StorageAccount("pustorageacc", {
    enableHttpsTrafficOnly: false,
    isHnsEnabled: true,
    kind: azure.storage.Kind.BlockBlobStorage,
    location: resourceGroup.location,
    resourceGroupName: resourceGroup.name,
    sku: {
        name: azure.storage.SkuName.Premium_LRS,
    },
}, { provider: azureProvider });