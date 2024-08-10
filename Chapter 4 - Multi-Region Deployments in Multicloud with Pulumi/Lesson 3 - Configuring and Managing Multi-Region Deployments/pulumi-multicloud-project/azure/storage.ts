import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";

// Define the function that creates the resources
export function createAzureStorage(resourcePrefix: string, teamName: any) {
    // Get the current stack name
    const stack = pulumi.getStack();

    // Create a Pulumi config object for the current stack
    const config = new pulumi.Config(stack);

    // Dynamically read the region from the stack configuration
    const location = config.require("region");

    // Define a new Azure provider with the dynamic region
    const azureProvider = new azure.Provider("azureProvider", {
        location: location,
    });

    // Create an Azure Resource Group with prefixed name
    const resourceGroup = new azure.resources.ResourceGroup(`${resourcePrefix}-rg`, {
        location: location,
        tags: {
            team: teamName
        }
    }, { provider: azureProvider });

    // Create an Azure Storage Account with prefixed name
    const storageAccount = new azure.storage.StorageAccount(`${resourcePrefix}store`, {
        resourceGroupName: resourceGroup.name,
        sku: {
            name: "Standard_LRS",
        },
        kind: "StorageV2",
        location: resourceGroup.location,
        tags: {
            team: teamName
        }
    }, { provider: azureProvider });

    // Create a Blob Container with prefixed name
    const container = new azure.storage.BlobContainer(`${resourcePrefix}container`, {
        accountName: storageAccount.name,
        resourceGroupName: resourceGroup.name,
        publicAccess: "None"
    }, { provider: azureProvider });

    // Return the names of the created resources
    return {
        storageAccountName: storageAccount.name,
        containerName: container.name,
        resourceGroupName: resourceGroup.name,
    };
}
