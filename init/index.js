const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");

const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
require("dotenv").config();

const geocodingClient = mbxGeocoding({
    accessToken: process.env.MAP_TOKEN,
});

const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";

main()
    .then(async () => {
        console.log("connected to DB");
        await initDB();
    })
    .catch((err) => {
        console.log(err);
    });

async function main() {
    await mongoose.connect(MONGO_URL);
}

const initDB = async () => {
    await Listing.deleteMany({});
    const listingsWithData = await Promise.all(
        initData.data.map(async (obj) => {
            const response = await geocodingClient
                .forwardGeocode({
                    query: `${obj.location}, ${obj.country}`,
                    limit: 1,
                })
                .send();
            return {
                ...obj,
                owner: "6a394543b7f7bda02b34f896",
                geometry:
                    response.body.features.length > 0 ? response.body.features[0].geometry : { type: "Point", coordinates: [0, 0], },
            };
        })
    );
    await Listing.insertMany(listingsWithData);
    console.log("Data was initialized.");
};
