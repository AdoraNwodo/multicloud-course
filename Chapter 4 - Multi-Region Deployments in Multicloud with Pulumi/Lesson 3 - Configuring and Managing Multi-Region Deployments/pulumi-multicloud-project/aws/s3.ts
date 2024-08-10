import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// Define the function that creates the resources
export function createS3Bucket(resourcePrefix: string, teamName: any) {
    // Get the current stack name
    const stack = pulumi.getStack();

    // Create a Pulumi config object for the current stack
    const config = new pulumi.Config(stack);

    // Dynamically read the region from the stack configuration. Fallback to us-east-1 if region isn't set
    const region = config.get("region") || "us-east-1";

    // Define a new AWS provider with the dynamic region, casting the string to aws.Region
    const awsProvider = new aws.Provider("awsProvider", {
        region: region as aws.Region,  // Cast the string to aws.Region
    });

    // Create an S3 bucket with prefixed name
    const myBucket = new aws.s3.Bucket(`${resourcePrefix}-bucket`, {
        bucket: `${resourcePrefix}-${stack}-bucket`,
        acl: "private",
        tags: {
            team: teamName
        }
    }, { provider: awsProvider });

    // Return the name of the bucket
    return {
        bucketName: myBucket.bucket,
    };
}
