import mongoose from 'mongoose';
const { Schema } = mongoose;

var AssetSchema = new Schema({

    name: {type: String, index: true},
    type: String,
    resolution: {width: String, height: String},
    duration: String,
    size: String,
    thumbnail: String,
    labels: [],
    playlists:              [],
    validity:               {enable:Boolean, startdate:String,enddate:String,starthour:Number,endhour:Number},
    createdAt: {type: Date, default: Date.now},
    createdBy: {_id: {type: Schema.ObjectId, ref: 'User'}, name: String}
}, {
    usePushEach: true
})

AssetSchema.index({ name: 1 });
AssetSchema.index({ createdAt: 1 });
AssetSchema.index({ playlists: 1 });


AssetSchema.statics = {
    async load(id) {
        return await this.findOne({ _id: id }).exec();
    },

    async list(options) {
        const criteria = options.criteria || {};

        return await this.find(criteria)
            .sort({ name: 1 }) // sort by date
            .limit(options.perPage)
            .skip(options.perPage * options.page)
            .exec();
    }
};


export const Asset = mongoose.model('Asset', AssetSchema);