import * as yup from 'yup'

export const profileSchema = yup.object({
  profile: yup.object({
    nickname: yup.string()
      .required('Nickname is required')
      .min(2, 'Nickname must be at least 2 characters')
      .max(30, 'Nickname must be less than 30 characters'),
    age_range: yup.string().required('Age range is required'),
    ethnicity: yup.string().required('Ethnicity is required'),
    location: yup.string().required('Location is required'),
    is_pregnant: yup.boolean().required()
  }),
  research_opt_in: yup.boolean().required()
})

export const healthConditionSchema = yup.object({
  condition_name: yup.string().required('Condition name is required'),
  is_self_diagnosed: yup.boolean().required(),
  diagnosis_method: yup.string()
    .oneOf(['Doctor', 'Research', 'Other'], 'Invalid diagnosis method')
    .required('Diagnosis method is required'),
  treatments: yup.string().required('Treatment information is required'),
  subtype: yup.string(),
  first_symptom_date: yup.string().required('First symptom date is required'),
  wants_future_studies: yup.boolean().required()
}) 