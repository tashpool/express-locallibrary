let mongoose = require('mongoose')
let Schema = mongoose.Schema
let moment = require('moment')

let AuthorSchema = new Schema({
  first_name: { type: String, required: true, max: 100 },
  family_name: { type: String, required: true, max: 100 },
  date_of_birth: { type: Date },
  date_of_death: { type: Date }
})

AuthorSchema.virtual('name').get(function() {
  return this.family_name + ', ' + this.first_name
})

AuthorSchema.virtual('lifespan').get(function() {
  let calc_birth_date = this.date_of_birth
    ? moment(this.date_of_birth)
        .format('YYYY-MM-DD')
        .toString()
    : ''
  let calc_death_date = this.date_of_death
    ? moment(this.date_of_death)
        .format('YYYY-MM-DD')
        .toString()
    : 'Unknown'

  if (calc_birth_date === '') {
    return 'Unknown'
  } else {
    return calc_birth_date + ' - ' + calc_death_date
  }
})

AuthorSchema.virtual('url').get(function() {
  return '/catalog/author/' + this._id
})

AuthorSchema.virtual('input_field_dateOfBirth').get(function() {
  return moment(this.date_of_birth).format('YYYY-MM-DD')
})

AuthorSchema.virtual('input_field_dateOfDeath').get(function() {
  return moment(this.date_of_death).format('YYYY-MM-DD')
})

module.exports = mongoose.model('Author', AuthorSchema)
