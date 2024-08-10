import * as pulumi from "@pulumi/pulumi";
import * as resources from "@pulumi/azure-native/resources";
import * as storage from "@pulumi/azure-native/storage";

const config = new pulumi.Config();
const location = config.require("location");

// Create an Azure Resource Group
const resourceGroup = new resources.ResourceGroup("adora-rg", {
    resourceGroupName: "adora-rg",
    location: location
});

// Create an Azure resource (Storage Account)
const storageAccount = new storage.StorageAccount("adorastore2", {
    resourceGroupName: resourceGroup.name,
    sku: {
        name: storage.SkuName.Standard_LRS,
    },
    kind: storage.Kind.StorageV2,
});

export const storageAccountName = storageAccount.name;
