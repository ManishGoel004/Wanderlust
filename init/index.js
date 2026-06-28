const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");
const User = require("../models/user.js");

const SEED_USERNAME = "seeddatauser";

const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
require("dotenv").config();

const geocodingClient = mbxGeocoding({
    accessToken: process.env.MAP_TOKEN,
});

// const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";
const dbUrl = process.env.ATLASDB_URL;

main()
    .then(async () => {
        console.log("connected to DB");
        await initDB();
    })
    .catch((err) => {
        console.log(err);
    });

async function main() {
    await mongoose.connect(dbUrl);
}

const initDB = async () => {

    const seedUser = await User.findOne({
        username: SEED_USERNAME
    });

    if (!seedUser) {
        throw new Error(
            "Please create a user with username 'seeddatauser' before running init."
        );
    }

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
                owner: seedUser._id,
                geometry:
                    response.body.features.length > 0 ? response.body.features[0].geometry : { type: "Point", coordinates: [77.2315, 28.6562], },
            };
        })
    );
    await Listing.insertMany(listingsWithData);
    console.log("Data was initialized.");
};
