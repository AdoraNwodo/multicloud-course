"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const aws = __importStar(require("aws-sdk"));
const cosmos_1 = require("@azure/cosmos");
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
const cloudProvider = process.env.CLOUD_PROVIDER || "none";
let dbClient;
if (cloudProvider === "aws") {
    aws.config.update({ region: process.env.AWS_REGION || "us-west-2" });
    dbClient = new aws.DynamoDB.DocumentClient();
}
else if (cloudProvider === "azure") {
    const endpoint = process.env.COSMOSDB_ENDPOINT;
    const key = process.env.COSMOSDB_KEY;
    dbClient = new cosmos_1.CosmosClient({ endpoint, key });
}
// Sample weather API function
function fetchWeatherData(city) {
    return __awaiter(this, void 0, void 0, function* () {
        const apiKey = process.env.WEATHER_API_KEY;
        let key = "45305691e3a6eab26df8ef240e896fd3";
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${key}&units=metric`;
        const response = yield axios_1.default.get(url);
        return response.data;
    });
}
app.get("/weather/:city", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const city = req.params.city;
    try {
        if (cloudProvider === "aws") {
            const params = {
                TableName: process.env.TABLE_NAME,
                Key: { city },
            };
            const data = yield dbClient.get(params).promise();
            if (data.Item) {
                res.json(data.Item);
            }
            else {
                // Fetch weather data and save to DynamoDB
                const weatherData = yield fetchWeatherData(city);
                const putParams = {
                    TableName: process.env.TABLE_NAME,
                    Item: Object.assign({ city }, weatherData)
                };
                yield dbClient.put(putParams).promise();
                res.json(weatherData);
            }
        }
        else if (cloudProvider === "azure") {
            const { database } = dbClient.database(process.env.DATABASE_NAME);
            const container = database.container(process.env.CONTAINER_NAME);
            const { resource } = yield container.item(city, city).read();
            if (resource) {
                res.json(resource);
            }
            else {
                // Fetch weather data and save to Cosmos DB
                const weatherData = yield fetchWeatherData(city);
                yield container.items.create(Object.assign({ id: city }, weatherData));
                res.json(weatherData);
            }
        }
        else {
            const weatherData = yield fetchWeatherData(city);
            res.json(weatherData);
        }
    }
    catch (error) {
        if (error instanceof Error) {
            return `There was an error: ${error.message}`;
        }
        else {
            return "An unknown error occurred.";
        }
    }
}));
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
