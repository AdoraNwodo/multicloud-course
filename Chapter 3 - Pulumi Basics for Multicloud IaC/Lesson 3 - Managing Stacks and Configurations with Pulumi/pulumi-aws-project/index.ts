import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

const config = new pulumi.Config();
const region = config.require("region");

const org = ""; // put your org here
const stackToReference = ""; // put your stack here
const projectToReference = ""; // put your project here


const azureStack = new pulumi.StackReference(`${org}/${projectToReference}/${stackToReference}`);
const storageAccountName = azureStack.getOutput("storageAccountName");

const bucket = new aws.s3.Bucket("adora-store", {
    acl: "private",
    tags: {
        Environment: pulumi.getStack(),
        Region: region,
        AzureStorageAccount: storageAccountName
    },
});


// Export the name of the bucket
export const bucketName = bucket.id;
