import express from "express";
import * as aws from "aws-sdk";
import { CosmosClient } from "@azure/cosmos";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const cloudProvider = process.env.CLOUD_PROVIDER || "none";

let dbClient: any;

if (cloudProvider === "aws") {
    aws.config.update({ region: process.env.AWS_REGION || "us-west-2" });
    dbClient = new aws.DynamoDB.DocumentClient();
} else if (cloudProvider === "azure") {
    const endpoint = process.env.COSMOSDB_ENDPOINT!;
    const key = process.env.COSMOSDB_KEY!;
    dbClient = new CosmosClient({ endpoint, key });
}

// Sample weather API function
async function fetchWeatherData(city: string) {
    const apiKey = process.env.WEATHER_API_KEY;
    let key = "45305691e3a6eab26df8ef240e896fd3";
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${key}&units=metric`;
    const response = await axios.get(url);
    return response.data;
}

app.get("/weather/:city", async (req, res) => {
    const city = req.params.city;

    try {
        if (cloudProvider === "aws") {
            const params = {
                TableName: process.env.TABLE_NAME!,
                Key: { city },
            };
            const data = await dbClient.get(params).promise();
            if (data.Item) {
                res.json(data.Item);
            } else {
                // Fetch weather data and save to DynamoDB
                const weatherData = await fetchWeatherData(city);
                const putParams = {
                    TableName: process.env.TABLE_NAME!,
                    Item: { city, ...weatherData }
                };
                await dbClient.put(putParams).promise();
                res.json(weatherData);
            }
        } else if (cloudProvider === "azure") {
            const { database } = dbClient.database(process.env.DATABASE_NAME!);
            const container = database.container(process.env.CONTAINER_NAME!);
            const { resource } = await container.item(city, city).read();
            if (resource) {
                res.json(resource);
            } else {
                // Fetch weather data and save to Cosmos DB
                const weatherData = await fetchWeatherData(city);
                await container.items.create({ id: city, ...weatherData });
                res.json(weatherData);
            }
        } else {
            const weatherData = await fetchWeatherData(city);
            res.json(weatherData);
        }
    } catch (error) {
        if (error instanceof Error) {
            return `There was an error: ${error.message}`;
        } else {
            return "An unknown error occurred.";
        }
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
