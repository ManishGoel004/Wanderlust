const Listing = require("../models/listing");
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN
const geocodingClient = mbxGeocoding({ accessToken: mapToken });
const { cloudinary } = require("../cloudConfig.js");
const validCategories = require("../utils/categories");

module.exports.index = async (req,res) => {

    let { category, search } = req.query;
    let filter = {};

    if(category){
        if(!validCategories.includes(category)){
            req.flash("error", "Invalid Category!");
            return res.redirect("/listings");
        }
        filter.category = category;
    }

    if(search){
        filter.$or = [
            { title: { $regex: search, $options: "i"} },
            { location: { $regex: search, $options: "i"} },
            { country: { $regex: search, $options: "i"} }
        ];
    }

    let allListings = await Listing.find(filter);
    let searchError = null;

    if(search && allListings.length === 0){
        searchError = `No listings found for "${search}"!`;
    }

    res.render("listings/index.ejs", {
        allListings,
        searchError,
        search,
        category
    });
};

module.exports.renderNewForm = (req, res) => {
    res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
    let {id} = req.params;
    const listing = await Listing.findById(id).populate({path: "reviews", populate: {path: "author"}}).populate("owner");
    if(!listing) {
        req.flash("error", "The listing you requested doesn't exist!");
        return res.redirect("/listings");
    }
    res.render("listings/show.ejs", {listing});
};

module.exports.createListing = async (req,res) => {

    let response = await geocodingClient
        .forwardGeocode({
            query: `${req.body.listing.location}, ${req.body.listing.country}`,
            limit: 1
        })
        .send();

    let url = req.file.path;
    let filename = req.file.filename;

    const newListing = new Listing(req.body.listing);

    newListing.owner = req.user._id;
    newListing.image = { url, filename };

    newListing.geometry = response.body.features[0]?.geometry || {type: "Point", coordinates: [77.2315, 28.6562]};

    let savedListing = await newListing.save();

    console.log(savedListing);

    req.flash("success", "New Listing Created!");
    res.redirect("/listings");
};

module.exports.renderEditForm = async (req, res) => {
    let {id} = req.params;
    let listing = await Listing.findById(id);
    if(!listing) {
        req.flash("error", "The listing you requested doesn't exist!");
        return res.redirect("/listings");
    }

    let originalImageUrl = listing.image.url;
    originalImageUrl = originalImageUrl.replace("/upload", "/upload/h_300,w_250");
    res.render("listings/edit.ejs", {listing, originalImageUrl});
};

module.exports.updateListing = async (req,res) => {
    let { id } = req.params;
    
    let response = await geocodingClient
    .forwardGeocode({
        query: `${req.body.listing.location}, ${req.body.listing.country}`,
        limit: 1
    })
    .send();

    req.body.listing.geometry = response.body.features[0]?.geometry || {type: "Point", coordinates: [77.2315, 28.6562]};

    let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });

    if(typeof req.file !== "undefined") {
        if ( listing.image?.url && listing.image.url.includes("res.cloudinary.com")) {
            await cloudinary.uploader.destroy(listing.image.filename);
        }

        let url = req.file.path;
        let filename = req.file.filename;
        listing.image = {url, filename};
        await listing.save();
    }

    req.flash("success", "Listing Updated!");
    res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async (req, res) => {
    let {id} = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
    req.flash("success", "Listing Deleted!")
    res.redirect("/listings");
};