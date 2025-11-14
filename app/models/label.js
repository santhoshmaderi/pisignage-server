

import mongoose from 'mongoose';
const { Schema } = mongoose;


const LabelSchema= new Schema({
    name:                   {type: String,unique: true, index: true},
    mode:                   {type: String},

    createdAt:              {type: Date, default: Date.now},
    createdBy:              {_id: {type: Schema.ObjectId, ref: 'User'}, name: String}
}
)

LabelSchema.index({ name: 1 });


LabelSchema.path('name').validate((name) => {
    return name.length > 0;
}, 'name cannot be blank');


/**
 * Statics
 */

LabelSchema.statics = {
    async load(id) {
        return await this.findOne({ _id: id }).exec();
    },

    async list(options) {
        const criteria = options.criteria || {};

        return await this.find(criteria)
            .sort({ name: 1 })
            .limit(options.perPage)
            .skip(options.perPage * options.page)
            .exec();
    }
};

export const Label = mongoose.model('Label', LabelSchema);