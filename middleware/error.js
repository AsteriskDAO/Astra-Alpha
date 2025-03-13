const errorHandler = (err, req, res, next) => {
  console.error(err.stack)

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message })
  }

  if (err.name === 'MongoError' && err.code === 11000) {
    return res.status(409).json({ error: 'Duplicate record found' })
  }

  res.status(500).json({ error: 'Something went wrong!' })
}

module.exports = errorHandler 