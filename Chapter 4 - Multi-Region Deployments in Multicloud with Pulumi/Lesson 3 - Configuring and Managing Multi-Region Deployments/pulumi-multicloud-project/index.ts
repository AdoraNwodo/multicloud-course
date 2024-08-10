import * as pulumi from "@pulumi/pulumi";
import { createS3Bucket } from "./aws/s3";
import { createAzureStorage } from "./azure/storage";
import { createOutputs } from "./parent/index";

// Get the current stack name
const stack = pulumi.getStack();

// Create a Pulumi config object
const config = new pulumi.Config(stack);

// Define resource prefix
const resourcePrefix = "res";

let output;

// Check if the current stack is "dev-parent"
if (stack === "dev-parent") {
    // If the stack is "dev-parent", call the createOutputs method from "parent/index.ts"
    output = createOutputs();
} else {
    // If the stack is not "dev-parent", pull the "dev-parent" stack reference
    const org = ""; // add your org name
    const stack = "dev-parent";
    const project = "multicloud-with-parent"

    const parentStackReference = new pulumi.StackReference(`${org}/${project}/${stack}`);

    // Get the team name output from the "dev-parent" stack
    const teamName = parentStackReference.getOutput("team");

    // Check the "cloud" value from the current stack's config
    const cloudProvider = config.require("cloud");

    // Based on the "cloud" value, call the appropriate method
    if (cloudProvider === "aws") {
        // Call the createS3Bucket method with the resourcePrefix
        const s3Resources = createS3Bucket(resourcePrefix, teamName);
    } else if (cloudProvider === "azure") {
        // Call the createAzureResources method with the resourcePrefix
        const azureResources = createAzureStorage(resourcePrefix, teamName);
    } else {
        throw new Error(`Unsupported cloud provider: ${cloudProvider}`);
    }
}

export const team = output;
