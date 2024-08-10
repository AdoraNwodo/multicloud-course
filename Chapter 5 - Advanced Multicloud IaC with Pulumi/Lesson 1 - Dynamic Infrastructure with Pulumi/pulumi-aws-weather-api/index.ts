import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// Create a DynamoDB table for weather data
const dynamoTable = new aws.dynamodb.Table("weather", {
    billingMode: "PAY_PER_REQUEST",
    hashKey: "city",
    attributes: [
        { name: "city", type: "S" },
        { name: "temperature", type: "S" },
    ],
    globalSecondaryIndexes: [
        {
            name: "TemperatureIndex",
            hashKey: "temperature",  // Using temperature as a secondary index
            projectionType: "ALL",
        }
    ],
    ttl: { attributeName: "TimeToExist", enabled: true },
});

// IAM role for Lambda
const lambdaRole = new aws.iam.Role("lambdaRole", {
    assumeRolePolicy: {
        Version: "2012-10-17",
        Statement: [
            {
                Action: "sts:AssumeRole",
                Effect: "Allow",
                Principal: { Service: "lambda.amazonaws.com" },
            },
        ],
    },
});

new aws.iam.RolePolicyAttachment("lambdaPolicy", {
    role: lambdaRole.name,
    policyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
});

const lambdaFunc = new aws.lambda.Function("weatherLambda", {
    runtime: aws.lambda.Runtime.NodeJS20dX,
    role: lambdaRole.arn,
    handler: "index.handler",
    code: new pulumi.asset.AssetArchive({
        ".": new pulumi.asset.FileArchive("../weather-source-code/[folder-name.zip]"), // Replace with your actual ZIP path
    }),
    environment: {
        variables: {
            TABLE_NAME: dynamoTable.name,
            CLOUD_PROVIDER: "aws",
        },
    },
});

// Create Lambda Function URL
const functionUrl = new aws.lambda.FunctionUrl("weatherLambdaUrl", {
    functionName: lambdaFunc.name,
    authorizationType: "NONE", // Public access without auth
});

// Export the URL of the Lambda function
export const lambdaUrl = functionUrl.functionUrl;