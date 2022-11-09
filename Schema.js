const BaseJoi = require('joi');
const sanitizeHtml = require('sanitize-html');

const extension = (joi) => ({
    type: 'string',
    base: joi.string(),
    messages: {
        'string.escapeHTML': '{{#label}} must not include HTML!'
    },
    rules: {
        escapeHTML: {
            validate(value, helpers) {
                const clean = sanitizeHtml(value, {
                    allowedTags: [],
                    allowedAttributes: {},
                });
                if (clean !== value) return helpers.error('string.escapeHTML', { value })
                return clean;
            }
        }
    }
});

const Joi = BaseJoi.extend(extension)

// joi validation for user schema

module.exports.userSchema = Joi.object({
    user:Joi.object({
        name:Joi.string().required().escapeHTML(),
        id:Joi.string().required().escapeHTML(),
        email:Joi.string().required().escapeHTML(),
        username:Joi.string().required().escapeHTML(),
        password:Joi.string().required().escapeHTML()
    }).required()
})

//joi validation for event schema

module.exports.eventSchema = Joi.object({
    event:Joi.object({
        name:Joi.string().required().escapeHTML(),
        desc:Joi.string().required().escapeHTML(),
        url:Joi.string().required().escapeHTML(),
        date:Joi.date().required(),
        start:Joi.string().required().escapeHTML(),
        end:Joi.string().required().escapeHTML(),
    }).required()
})

