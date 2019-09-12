let Book = require('../models/book')
let async = require('async')
let Genre = require('../models/genre')
let validator = require('express-validator')

// Display list of all Genre.
exports.genre_list = function(req, res, next) {
  Genre.find()
    .sort([['name', 'ascending']])
    .exec(function(err, list_genre) {
      if (err) {
        return next(err)
      }

      res.render('genre_list', {
        title: 'Genre List',
        genre_list: list_genre
      })
    })
}

// Display detail page for a specific Genre.
exports.genre_detail = function(req, res, next) {
  // cross all book linked to a genre
  async.parallel(
    {
      genre: function(callback) {
        Genre.findById(req.params.id).exec(callback)
      },
      genre_books: function(callback) {
        Book.find({ genre: req.params.id }).exec(callback)
      }
    },
    function(err, results) {
      if (err) {
        return next(err)
      }
      if (results.genre === null) {
        let err = new Error('Genre not found.')
        err.status = 404
        return next(err)
      }
      res.render('genre_detail', {
        title: 'Genre Detail',
        genre: results.genre,
        genre_books: results.genre_books
      })
    }
  )
}

// Display Genre create form on GET.
exports.genre_create_get = function(req, res) {
  res.render('genre_form', { title: 'Create Genre' })
}

// Handle Genre create on POST.
exports.genre_create_post = [
  validator
    .body('name', 'Genre name required.')
    .isLength({ min: 1 })
    .trim(),
  validator.sanitizeBody('name').escape(),
  // process req AFTER validation (goes in order)
  (req, res, next) => {
    // extract validation errors form the request
    const errors = validator.validationResult(req)

    // create genre object with trimmed and escaped data
    let genre = new Genre({ name: req.body.name })

    if (!errors.isEmpty()) {
      // There are errors. Render the form again with sanitized values/error messages.
      res.render('genre_form', {
        title: 'Create Genre',
        genre: genre,
        errors: errors.array()
      })
      return
    } else {
      // data on form is valid
      // check if Genre already exists
      Genre.findOne({ name: req.body.name }).exec(function(err, found_genre) {
        if (err) {
          return next(err)
        }
        if (found_genre) {
          // Genre exists, redirect to its detail page
          res.redirect(found_genre.url)
        } else {
          genre.save(function(err) {
            if (err) {
              return next(err)
            }
            // Genre saved, redirect to new detail page
            res.redirect(genre.url)
          })
        }
      })
    }
  }
]

// Display Genre delete form on GET.
exports.genre_delete_get = function(req, res, next) {
  async.parallel(
    {
      genre: function(callback) {
        Genre.findById(req.params.id).exec(callback)
      },
      genres_books: function(callback) {
        Book.find({ genre: req.params.id }).exec(callback)
      }
    },
    function(err, results) {
      if (err) {
        return next(err)
      }
      if (results.genre === null) {
        res.redirect('/catalog/genres')
      }
      // Otherwise successful, so render
      res.render('genre_delete', {
        title: 'Delete Genre',
        genre: results.genre,
        genres_books: results.genres_books
      })
    }
  )
}

// Handle Genre delete on POST.
exports.genre_delete_post = function(req, res, next) {
  async.parallel(
    {
      genre: function(callback) {
        Genre.findById(req.params.id).exec(callback)
      },
      genres_books: function(callback) {
        Book.find({ genre: req.params.id }).exec(callback)
      }
    },
    function(err, results) {
      if (err) {
        return next(err)
      }
      if (results.genres_books.length > 0) {
        // Still have books using this genre, reroute
        res.render('genre_delete', {
          title: 'Delete Genre',
          genre: results.genre,
          genres_books: results.genres_books
        })
        return
      } else {
        // Success path to remove this genre
        Genre.findByIdAndRemove(req.body.genreid, function deleteGenre(err) {
          if (err) {
            return next(err)
          }
          // Success - go to author list
          res.redirect('/catalog/genres')
        })
      }
    }
  )
}

// Display Genre update form on GET.
exports.genre_update_get = function(req, res, next) {
  Genre.findById(req.params.id).exec(function(err, genre) {
    if (err) {
      return next(err)
    }

    res.render('genre_form', { title: 'Update Genre', genre: genre })
  })
}

// Handle Genre update on POST.
exports.genre_update_post = [
  validator
    .body('name', 'Genre name required.')
    .isLength({ min: 1 })
    .trim(),
  validator.sanitizeBody('name').escape(),
  // process req AFTER validation (goes in order)
  (req, res, next) => {
    // extract validation errors form the request
    const errors = validator.validationResult(req)

    // create genre object with trimmed and escaped data
    let genre = new Genre({ name: req.body.name, _id: req.params.id })

    if (!errors.isEmpty()) {
      // There are errors. Render the form again with sanitized values/error messages.
      res.render('genre_form', {
        title: 'Create Genre',
        genre: genre,
        errors: errors.array()
      })
      return
    } else {
      // data on form is valid
      // check if Genre already exists
      Genre.findByIdAndUpdate(req.params.id, genre, {}, function(
        err,
        updatedGenre
      ) {
        if (err) {
          return next(err)
        }

        res.redirect(updatedGenre.url)
      })
    }
  }
]
