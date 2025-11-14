/**
 * Module dependencies.
 */

import mongoose from 'mongoose';
const { Schema } = mongoose;
/**
 * Setters and Getters
 */

/**
 * Post Schema
 */
const LabelSchema= new Schema({
    name:                   {type: String,unique: true, index: true},
    mode:                   {type: String},

    createdAt:              {type: Date, default: Date.now},
    createdBy:              {_id: {type: Schema.ObjectId, ref: 'User'}, name: String}
}
)


//LabelSchema.path('name').validate(function (name) {
//    return name.length > 0
//}, 'name cannot be blank')

LabelSchema.path('name').validate((name) => {
    return name.length > 0;
}, 'name cannot be blank');


/**
 * Pre & Post method hooks
 */
/**
 * Pre-remove hook
 */


/**
 * Statics
 */

LabelSchema.statics = {
    async load(id) {
        return this.findOne({ _id: id }).exec();
    },

    async list(options) {
        const criteria = options.criteria || {};

        return this.find(criteria)
            .sort({ name: 1 })
            .limit(options.perPage)
            .skip(options.perPage * options.page)
            .exec();
    }
};

export const Label = mongoose.model('Label', LabelSchema);

