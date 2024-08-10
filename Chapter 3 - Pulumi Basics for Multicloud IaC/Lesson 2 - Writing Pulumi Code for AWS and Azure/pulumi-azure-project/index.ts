import * as pulumi from "@pulumi/pulumi";
import * as resources from "@pulumi/azure-native/resources";
import * as storage from "@pulumi/azure-native/storage";
import * as azure from "@pulumi/azure-native";

// Create an Azure Resource Group
const resourceGroup = new azure.resources.ResourceGroup("adora-ResourceGroup", {
    resourceGroupName: "adora-ResourceGroup",
    location: "westus",
});


// Create an Azure resource (Storage Account)
const storageAccount = new storage.StorageAccount("adorastorage", {
    accountName: "adorastorage",
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    sku: {
        name: storage.SkuName.Standard_LRS,
    },
    kind: storage.Kind.StorageV2,
});

// Export the name of the Storage Account
export const storageAccountName = storageAccount.name;
