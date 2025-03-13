const Joi = require('joi')

const schemas = {
  profile: Joi.object({
    profile: Joi.object({
      nickname: Joi.string().required(),
      age_range: Joi.string().valid(
        '18-20', '20-25', '25-30', '30-35', 
        '35-40', '40-45', '45-50', '50+'
      ).required(),
      ethnicity: Joi.string().required(),
      location: Joi.string().required(),
      is_pregnant: Joi.boolean().required()
    }),
    research_opt_in: Joi.boolean().required()
  }),

  healthCondition: Joi.object({
    condition_name: Joi.string().required(),
    is_self_diagnosed: Joi.boolean().required(),
    diagnosis_method: Joi.string().valid('Doctor', 'Research', 'Other').required(),
    treatments: Joi.string().required(),
    subtype: Joi.string().allow(''),
    first_symptom_date: Joi.string().required(),
    wants_future_studies: Joi.boolean().required()
  }),

  updateNickname: Joi.object({
    nickname: Joi.string()
      .min(2)
      .max(30)
      .pattern(/^[a-zA-Z0-9_\s]*$/)
      .required()
      .messages({
        'string.pattern.base': 'Nickname can only contain letters, numbers, spaces and underscores',
        'string.min': 'Nickname must be at least 2 characters long',
        'string.max': 'Nickname cannot be longer than 30 characters'
      })
  }),

  checkIn: Joi.object({
    mood: Joi.string().required(),
    health_comment: Joi.string().allow(''),
    doctor_visit: Joi.boolean().required(),
    medication_update: Joi.boolean().required(),
    diagnosis_update: Joi.boolean().required(),
    is_pregnant: Joi.boolean().required()
  })
}

const validateRequest = (schemaName) => {
  return (req, res, next) => {
    const { error } = schemas[schemaName].validate(req.body)
    if (error) {
      return res.status(400).json({ error: error.details[0].message })
    }
    next()
  }
}

module.exports = { validateRequest } 