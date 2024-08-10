import * as pulumi from "@pulumi/pulumi";

export function createOutputs() {
    // Create a Pulumi config object
    const config = new pulumi.Config("dev-parent");

    // Read the `team` configuration value
    const teamName = config.require("team");

    // Output the value of the configuration
    return teamName;
}