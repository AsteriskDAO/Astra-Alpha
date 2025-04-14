const Joi = require('joi')

const schemas = {

  checkIn: Joi.object({
    mood: Joi.string().required(),
    health_comment: Joi.string().allow(''),
    doctor_visit: Joi.boolean().required(),
    medication_update: Joi.boolean().required(),
    diagnosis_update: Joi.boolean().required(),
    is_pregnant: Joi.boolean().required(),
    stress_level: Joi.string().required(),
    stress_details: Joi.string().required()
  }),

  registerUser: Joi.object({
    telegramId: Joi.number().required(),
    nickname: Joi.string().min(2).max(30),
    healthData: Joi.object({
      profile: Joi.object({
        age_range: Joi.string(),
        ethnicity: Joi.string(),
        location: Joi.string(),
        is_pregnant: Joi.boolean()
      }),
      research_opt_in: Joi.boolean(),
      conditions: Joi.array().items(Joi.string()),
      medications: Joi.array().items(Joi.string()),
      treatments: Joi.array().items(Joi.string()),
      caretaker: Joi.array().items(Joi.string())
    })
  }),

  updateUser: Joi.object({
      telegramId: Joi.number().required(),
      nickname: Joi.string().min(2).max(30),
      healthData: Joi.object({
        profile: Joi.object({
          age_range: Joi.string(),
          ethnicity: Joi.string(),
          location: Joi.string(),
          is_pregnant: Joi.boolean()
        }),
        research_opt_in: Joi.boolean(),
        conditions: Joi.array().items(Joi.string()),
        medications: Joi.array().items(Joi.string()),
        treatments: Joi.array().items(Joi.string()),
        caretaker: Joi.array().items(Joi.string())
      })
  }),

  updatePoints: Joi.object({
    points: Joi.number().required()
  })
}

const validateRequest = (schemaName) => {
  return (req, res, next) => {
    console.log('validateRequest', schemaName)
    const schema = schemas[schemaName]
    if (!schema) {
      return res.status(500).json({ error: 'Invalid schema name' })
    }

    const { error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: true
    })

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
      console.log('errors', errors)
      return res.status(400).json({ errors })
    }

    next()
  }
}

module.exports = { validateRequest } 