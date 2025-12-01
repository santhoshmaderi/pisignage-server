//'use strict';

// var path = require('path'),
//     FFmpeg = require('fluent-ffmpeg'),
//     probe = require('node-ffprobe'),
//     imageMagick = require('gm').subClass({imageMagick: true}),
//     config = require('../../config/config'),
//     fs = require('fs'),
//     async = require('async'),
//     mongoose = require('mongoose'),
//     Asset = mongoose.model('Asset'),
//     _ = require('lodash'),
//     rest = require('../others/restware'),
//     processFile = require('../others/process-file');

//import path from 'path';
// import FFmpeg from 'fluent-ffmpeg';
//import probe from 'node-ffprobe';
//import gm from 'gm';
import fs from 'fs/promises';
import mongoose from 'mongoose';
import config from '../../config/config.js';
import rest from '../others/restware.js';
import processFile from '../others/process-file.js';

//const imageMagick = gm.subClass({ imageMagick: true });
const Asset = mongoose.model('Asset');


//var sendResponse = function (res, err) {
//    if (err) {
//        return rest.sendError(res, 'Assets data queued for processing, but with errors: ', err);
//    } else {
//        return rest.sendSuccess(res, 'Queued for Processing');
//    }
//}

const sendResponse = (res, err) => {
    if (err) {
        return rest.sendError(res, 'Assets data queued for processing, but with errors: ', err);
    } else {
        return rest.sendSuccess(res, 'Queued for Processing');
    }
}

//exports.storeDetails = function (req, res) {
 //   var files = req.body.files;
 //   async.eachSeries(files, function (fileObj, array_cb) {
 //       var filename = fileObj.name.replace(config.filenameRegex, '');
 //       processFile.processFile(filename, fileObj.size,  req.body.categories, array_cb)
 //   }, function () {
 //       console.log("processed " + files.length + " files")
 //   });
 //   sendResponse(res);
//}

export const storeDetails = async (req, res) => {
    const files = req.body.files;

    // Send response immediately (background processing pattern)
    sendResponse(res);

    // Process files in background
    try {
        for (const fileObj of files) {
            const filename = fileObj.name.replace(config.filenameRegex, '');
            await processFile.processFile(filename, fileObj.size, req.body.categories);
        }
        console.log(`processed ${files.length} files`);
    } catch (err) {
        console.error('Error processing files:', err);
    }
};


//exports.storeLinkDetails = function(name, type, categories, cb) {

//    processFile.processFile(name,0,categories || [],function(err){
//        cb()
//    })
//}

export const storeLinkDetails = async (name, type, categories) => {
    await processFile.processFile(name,0,categories || []);
}


//exports.updateObject = function(req,res) {
//    Asset.load(req.body.dbdata._id, function (err, asset) {
//        if (err || !asset) {
//            return rest.sendError(res, 'Categories saving error', err);
//        } else {
//            delete req.body.dbdata.__v;        //do not copy version key
//            asset = _.extend(asset, req.body.dbdata);
//            asset.save(function (err, data) {
//                if (err)
//                    return rest.sendError(res, 'Categories saving error', err);
//
//                return rest.sendSuccess(res, 'Categories saved', data);
//            });
//        }
//    })
//}


export const updateObject = async (req, res) => {
    try {
        if (!req.body.dbdata || !req.body.dbdata._id) {
            return rest.sendError(res, 'Asset ID is required');
        }
        
        const asset = await Asset.load(req.body.dbdata._id);
        if (!asset) {
            return rest.sendError(res, 'Asset not found');
        }
        
        delete req.body.dbdata.__v;
        
        Object.assign(asset, req.body.dbdata);
        const data = await asset.save();
        
        return rest.sendSuccess(res, 'Categories saved', data);
        
    } catch (err) {
        console.error('Error updating asset:', err);
        return rest.sendError(res, 'Categories saving error', err);
    }
};


/*  exports.updatePlaylist = function(playlist, assets) {
    Asset.update({playlists:playlist},{$pull:{playlists:playlist}},{multi:true}, function(err,num) {
        if (err) {
            return console.log("error in db update for playlist in assets "+err)
        } else {
            //console.log("Deleted playlist from "+num+" records")

            Asset.update({name:{$in: assets}},{$push:{playlists:playlist}},{multi:true}, function(err,num) {
                if (err) {
                    return console.log("error in db update for playlist in assets "+err)
                } else {
                    //console.log("Updated playlist to "+num+" records")
                }
            })
        }
    })
} */
    

export const updatePlaylist = async (playlist, assets) => {
    try {
        // Step 1: Remove playlist from all assets that currently have it
        await Asset.updateMany(
            { playlists: playlist },
            { $pull: { playlists: playlist } }
        );
        
        // Step 2: Add playlist to specified assets
        await Asset.updateMany(
            { name: { $in: assets } },
            { $push: { playlists: playlist } }
        );
        
    } catch (err) {
        console.error('Error updating playlist in assets:', err);
        throw err; // Re-throw to allow caller to handle
    }
};


