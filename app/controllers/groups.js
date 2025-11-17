

import mongoose from 'mongoose';
const { Group } = mongoose.model('Group');

import fs from 'fs';
import config from '../../config/config';
import rest from '../others/restware';
import path from 'path';
import serverMain from './server-main';
import licenses from './licenses';

let installation;

try {
    const settings = await licenses.getSettingsModel();
    installation = settings.installation || "local";
} catch (err) {
    console.error('Error loading settings:', err);
    installation = "local"; // fallback
};



// Legacy callback-based newGroup function. Kept for reference.
// 
// exports.newGroup = function (group, cb) {
// 
//     var object;
//     Group.findOne({name:group.name}, function(err,data) {
//         if (err || !data) {
//             object = new Group(group);
//         } else {
//             object = _.extend(data, group);
//         }
//         //create a sync folder under sync_folder
//         if (!object.name) {
//             console.log("can not be null: "+object.name);
//             return cb('Unable to create a group folder in server: '+object.name);
//         }
//         fs.mkdir(path.join(config.syncDir,installation, object.name),function(err){
//             if (err && (err.code != 'EEXIST'))
//                 return cb('Unable to create a group folder in server: '+err);
//             else {
//                 object.save(function (err, data) {
//                     cb(err,data);
//                 })
//             }
//         });
//     })
// }

export const newGroup = async (group) => {
    try {
        // Find existing group by name
        let object = await Group.findOne({ name: group.name });
        
        if (!object) {
            // No existing group found, create new one
            object = new Group(group);
        } else {
            // Existing group found, merge new data into it
            Object.assign(object, group);
        }
        
        // Validate group name exists
        if (!object.name) {
            console.log("can not be null: " + object.name);
            throw new Error('Unable to create a group folder in server: ' + object.name);
        }
        
        // Create sync folder for the group
        const folderPath = path.join(config.syncDir, installation, object.name);
        
        try {
            await fs.promises.mkdir(folderPath, { recursive: true });
        } catch (err) {
            if (err.code !== 'EEXIST') {
                throw new Error('Unable to create a group folder in server: ' + err);
            }
            // If folder exists (EEXIST), continue
        }
        
        // Save the group to database
        const data = await object.save();
        return data;
        
    } catch (err) {
        throw err;
    }
};

//Load a object
// exports.loadObject = function (req, res, next, id) {
// 
//     Group.load(id, function (err, object) {
//         if (err || !object)
//             return rest.sendError(res,'Unable to get group details',err);
// 
//         req.object = object;
//         next();
//     })
// }

export const loadObject = async (req, res, next, id) => {
    try {
        const object = await Group.load(id);
        if (!object) {
            return rest.sendError(res, 'Unable to get group details', new Error('Group not found'));
        }
        req.object = object;
        next();
    } catch (err) {
        return rest.sendError(res, 'Unable to get group details', err);
    }
};

// //list of objects
// exports.index = function (req, res) {
// 
//     var criteria = {};
// 
//     if (req.query['string']) {
//         var str = new RegExp(req.query['string'], "i")
//         criteria['name'] = str;
//     }
// 
//     if (req.query['all']) {
//         criteria['all'] = true;
//     }
// 
//     var page = req.query['page'] > 0 ? req.query['page'] : 0
//     var perPage = req.query['per_page'] || 500
// 
//     var options = {
//         perPage: perPage,
//         page: page,
//         criteria: criteria
//     }
// 
//     Group.list(options, function (err, groups) {
//         if (err)
//             return rest.sendError(res, 'Unable to get Group list', err);
//         else
//             return rest.sendSuccess(res, 'sending Group list', groups || []);
//     })
// }

export const index = async (req, res) => {
    try {
        const criteria = {};
        
        if (req.query['string']) {
            criteria['name'] = new RegExp(req.query['string'], "i");
        }
        
        if (req.query['all']) {
            criteria['all'] = true;
        }
        
        const page = req.query['page'] > 0 ? req.query['page'] : 0;
        const perPage = req.query['per_page'] || 500;
        
        const options = {
            perPage: perPage,
            page: page,
            criteria: criteria
        };
        
        const groups = await Group.list(options);
        return rest.sendSuccess(res, 'Sending Group list', groups);
    } catch (err) {
        return rest.sendError(res, 'Unable to get Group list', err);
    }
};


// exports.getObject = function (req, res) {
//
//     var object = req.object;
//     if (object) {
//         return rest.sendSuccess(res, 'Group details', object);
//     } else {
//         return rest.sendError(res, 'Unable to retrieve Group details', err);
//     }
//
// };

export const getObject = (req, res) => {
    const object = req.object;
    if (object) {
        return rest.sendSuccess(res, 'Group details', object);
    } else {
        return rest.sendError(res, 'Unable to retrieve Group details');
    }
};


    

// exports.createObject = function (req, res) {
//
//     var object = req.body;
//
//     exports.newGroup(object, function (err, data) {
//         if (err)
//             return rest.sendError(res, err);
//         else
//             return rest.sendSuccess(res, 'new Group added successfully', data);
//     })
// }

export const createObject = async (req, res) => {
    const object = req.body;
    try {
        const data = await newGroup(object);
        return rest.sendSuccess(res, 'new Group added successfully', data);
    } catch (err) {
        return rest.sendError(res, 'Error creating Group', err);
    }
};

// exports.updateObject = function (req, res) {
//
//     var saveObject = function (err, group) {
//         if (err) {
//             return rest.sendError(res, err);
//         } else {
//             if (req.body.deploy) {
//                 group.lastDeployed = Date.now();
//                 Group.update({ _id: group._id }, { $set: {
//                     lastDeployed: group.lastDeployed,
//                     assets: group.assets,
//                     deployedAssets: group.deployedAssets,
//                     assetsValidity: group.assetsValidity
//                 }}).exec();
//             }
//             return rest.sendSuccess(res, 'updated Group details', group);
//         }
//     }
//
//     var object = req.object;
//     delete req.body.__v;        //do not copy version key
//     if (req.body.name && (object.name != req.body.name)) {
//         fs.mkdir(path.join(config.syncDir, installation, req.body.name), function (err) {
//             if (err && (err.code != 'EEXIST'))
//                 console.log('Unable to create a group folder in server: ' + err);
//         });
//     }
//     object = _.extend(object, req.body);
//
//     if (req.body.deploy) {
//         object.deployedPlaylists = object.playlists;
//         object.deployedAssets = object.assets;
//         object.deployedTicker = object.ticker;
//     }
//
//     //disable animation for the timebeing
//     //object.animationEnable = false;
//     object.save(function (err, data) {
//         if (!err && req.body.deploy) {
//             serverMain.deploy(installation,object, saveObject);
//         } else {
//             saveObject(err, object);
//         }
//     });
//
// };

export const updateObject = async (req, res) => {
    try {
        const object = req.object;
        delete req.body.__v; // do not copy version key
        
        // Create new folder if name is changing
        if (req.body.name && (object.name !== req.body.name)) {
            const newFolderPath = path.join(config.syncDir, installation, req.body.name);
            try {
                await fs.promises.mkdir(newFolderPath, { recursive: true });
            } catch (err) {
                if (err.code !== 'EEXIST') {
                    console.log('Unable to create a group folder in server: ' + err);
                }
            }
        }
        
        // Merge request body into object (replaces _.extend)
        Object.assign(object, req.body);
        
        // If deploying, update deployed fields
        if (req.body.deploy) {
            object.deployedPlaylists = object.playlists;
            object.deployedAssets = object.assets;
            object.deployedTicker = object.ticker;
        }
        
        // Save the object
        await object.save();
        
        // If deploying, update lastDeployed and call deploy
        if (req.body.deploy) {
            object.lastDeployed = Date.now();
            
            // Update specific fields in database
            await Group.updateOne(
                { _id: object._id },
                {
                    $set: {
                        lastDeployed: object.lastDeployed,
                        assets: object.assets,
                        deployedAssets: object.deployedAssets,
                        assetsValidity: object.assetsValidity
                    }
                }
            );
            
            // Deploy to players (assuming this returns a promise or is async)
            await serverMain.deploy(installation, object);
        }
        
        return rest.sendSuccess(res, 'updated Group details', object);
        
    } catch (err) {
        return rest.sendError(res, 'Unable to update Group', err);
    }
};


// exports.deleteObject = function (req, res) {
//     if (!req.object || req.object.name == "default")
//         return rest.sendError(res,'No group specified or can not remove default group');

//     var object = req.object;
//     object.remove(function (err) {
//         if (err)
//             return rest.sendError(res, 'Unable to remove Group record', err);
//         else
//             return rest.sendSuccess(res, 'Group record deleted successfully');
//     })
// }

export const deleteObject = async (req, res) => {
    if (!req.object || req.object.name == "default")
        return rest.sendError(res,'No group specified or can not remove default group');
    const object = req.object;
    try {
        await object.deleteOne();
        return rest.sendSuccess(res, 'Group record deleted successfully');
    } catch (err) {
        return rest.sendError(res, 'Unable to remove Group record', err);
    }
};