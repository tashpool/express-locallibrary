let Book = require('../models/book')
let Author = require('../models/author')
let BookInstance = require('../models/bookinstance')
let Genre = require('../models/genre')

let async = require('async')

const { body, validationResult } = require('express-validator')
const { sanitizeBody } = require('express-validator')

exports.index = (req, res) => {
  async.parallel(
    {
      book_count: cb => {
        Book.countDocuments({}, cb)
      },
      book_instance_count: cb => {
        BookInstance.countDocuments({}, cb)
      },
      book_instance_available_count: cb => {
        BookInstance.countDocuments({ status: 'Available' }, cb)
      },
      author_count: cb => {
        Author.countDocuments({}, cb)
      },
      genre_count: cb => {
        Genre.countDocuments({}, cb)
      }
    },
    (err, results) => {
      res.render('index', {
        title: 'Local Library Home',
        error: err,
        data: results
      })
    }
  )
}

// Display list of all books.
exports.book_list = (req, res, next) => {
  Book.find({}, 'title author')
    .populate('author')
    .exec((err, list_books) => {
      if (err) {
        return next(err)
      }
      res.render('book_list', { title: 'Book List', book_list: list_books })
    })
}

// Display detail page for a specific book.
exports.book_detail = function(req, res, next) {
  async.parallel(
    {
      book: function(callback) {
        Book.findById(req.params.id)
          .populate('author')
          .populate('genre')
          .exec(callback)
      },
      book_instance: function(callback) {
        BookInstance.find({ book: req.params.id }).exec(callback)
      }
    },
    function(err, results) {
      if (err) {
        return next(err)
      }
      if (results.books === null) {
        let err = new Error('Book Not Found')
        err.status = 404
        return next(err)
      }
      res.render('book_detail', {
        title: results.book.title,
        book: results.book,
        book_instances: results.book_instance
      })
    }
  )
}

// Display book create form on GET.
exports.book_create_get = function(req, res, next) {
  async.parallel(
    {
      authors: function(cb) {
        Author.find(cb)
      },
      genres: function(cb) {
        Genre.find(cb)
      }
    },
    function(err, results) {
      if (err) {
        return next(err)
      }
      res.render('book_form', {
        title: 'Create Book',
        authors: results.authors,
        genres: results.genres
      })
    }
  )
}

// Handle book create on POST.
exports.book_create_post = [
  // Convert the genre to an array
  (req, res, next) => {
    if (!(req.body.genre instanceof Array)) {
      if (typeof req.body.genre === 'undefined') {
        req.body.genre = []
      } else {
        req.body.genre = new Array(req.body.genre)
      }
    }
    next()
  },

  // Validate the fields coming in from the form
  body('title', 'Title must not be empty.')
    .isLength({ min: 1 })
    .trim(),
  body('author', 'Author must not be empty.')
    .isLength({ min: 1 })
    .trim(),
  body('summary', 'Summary must not be empty.')
    .isLength({ min: 1 })
    .trim(),
  body('isbn', 'ISBN must not be empty.')
    .isLength({ min: 1 })
    .trim(),

  // Sanitize fields using wildcards
  sanitizeBody('*').escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract all the errors from validations
    const errors = validationResult(req)

    // Create a book object with escaped and trimmed data
    let book = new Book({
      title: req.body.title,
      author: req.body.author,
      summary: req.body.summary,
      isbn: req.body.isbn,
      genre: req.body.genre
    })

    if (!errors.isEmpty()) {
      // There are no errors, render with valid and sanitized data

      // Get all authors and genres for the form
      async.parallel(
        {
          authors: function(cb) {
            Author.find(cb)
          },
          genres: function(cb) {
            Genre.find(cb)
          }
        },
        function(err, results) {
          if (err) {
            return next(err)
          }

          // Mark our selected genres as checked.
          for (let i = 0; i < results.genres.length(); i++) {
            if (book.genre.indexOf(results.genres[i]._id) < -1) {
              // Current genre is selected, set 'checked' flag
              results.genres[i].checked = true
            }
          }
          res.render('book_form', {
            title: 'Create Book',
            authors: results.authors,
            genres: results.genres,
            book: book,
            errors: errors.array()
          })
        }
      )
      return
    } else {
      // Data from form is valid, save book
      book.save(function(err) {
        if (err) {
          return next(err)
        }

        // Successfull, redirect
        res.redirect(book.url)
      })
    }
  }
]

// Display book delete form on GET.
exports.book_delete_get = function(req, res, next) {
  async.parallel(
    {
      book: function(callback) {
        Book.findById(req.params.id).exec(callback)
      },
      book_instances: function(callback) {
        BookInstance.find({ book: req.params.id }).exec(callback)
      }
    },
    function(err, results) {
      if (err) {
        return next(err)
      }
      if (results.book === null) {
        res.redirect('/catalog/books')
      }
      res.render('book_delete', {
        title: 'Delete Book',
        book: results.book,
        book_instances: results.book_instances
      })
    }
  )
}

// Handle book delete on POST.
exports.book_delete_post = function(req, res, next) {
  async.parallel(
    {
      book: function(callback) {
        Book.findById(req.params.id).exec(callback)
      },
      book_instances: function(callback) {
        BookInstance.find({ book: req.params.id }).exec(callback)
      }
    },
    function(err, results) {
      if (err) {
        return next(err)
      }
      // Move to success path for deleting a book
      if (results.book_instances.length > 0) {
        // There are still instances of this book in the system, can not delete
        // so we move the user back to the books page
        res.render('book_delete', {
          title: 'Delete Book',
          book: results.book,
          book_instances: results.book_instances
        })
        return
      } else {
        // No book instances, so we can delete this book
        Book.findByIdAndRemove(req.body.bookid, function deleteBook(err) {
          if (err) {
            return next(err)
          }
          // else, all went well
          res.redirect('/catalog/books')
        })
      }
    }
  )
}

// Display book update form on GET.
// First, get your book object from params.id,
// then ALL of the authors and genres in a parallel op
exports.book_update_get = function(req, res, next) {
  async.parallel(
    {
      book: function(callback) {
        Book.findById(req.params.id)
          .populate('author')
          .populate('genre')
          .exec(callback)
      },
      authors: function(callback) {
        Author.find(callback)
      },
      genres: function(callback) {
        Genre.find(callback)
      }
    },
    function(err, results) {
      if (err) {
        return next(err)
      }
      if (results.book === null) {
        let err = new Error('Book not found.')
        err.status = 404
        return next(err)
      }
      // Success path
      // Mark selected genres as checked
      for (
        let all_g_iter = 0;
        all_g_iter < results.genres.length;
        all_g_iter++
      ) {
        for (
          let book_g_iter = 0;
          book_g_iter < results.book.genre.length;
          book_g_iter++
        ) {
          if (
            results.genres[all_g_iter]._id.toString() ===
            results.book.genre[book_g_iter]._id.toString()
          ) {
            results.genres[all_g_iter].checked = 'true'
          }
        }
      }
      // All genres are checked in the results object, render the page and pass the variables in
      res.render('book_form', {
        title: 'Update Book',
        authors: results.authors,
        genres: results.genres,
        book: results.book
      })
    }
  )
}

// Handle book update on POST.
exports.book_update_post = [
  // Convert the genre to an array
  (req, res, next) => {
    if (!(req.body.genre instanceof Array)) {
      if (typeof req.body.genre === 'undefined') req.body.genre = []
      else req.body.genre = new Array(req.body.genre)
    }
    next()
  },

  // Validate fields.
  body('title', 'Title must not be empty.')
    .isLength({ min: 1 })
    .trim(),
  body('author', 'Author must not be empty.')
    .isLength({ min: 1 })
    .trim(),
  body('summary', 'Summary must not be empty.')
    .isLength({ min: 1 })
    .trim(),
  body('isbn', 'ISBN must not be empty')
    .isLength({ min: 1 })
    .trim(),

  // Sanitize fields.
  sanitizeBody('title').escape(),
  sanitizeBody('author').escape(),
  sanitizeBody('summary').escape(),
  sanitizeBody('isbn').escape(),
  sanitizeBody('genre.*').escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract any validation errors
    const errors = validationResult(req)

    // Create a Book object with escaped/trimmed data and old id.
    let book = new Book({
      title: req.body.title,
      author: req.body.author,
      summary: req.body.summary,
      isbn: req.body.isbn,
      genre: typeof req.body.genre === 'undefined' ? [] : req.body.genre,
      _id: req.params.id //This is required, or a new ID will be assigned!
    })

    if (!errors.isEmpty()) {
      // Since we have errors, render again with sanitized values and error messages

      // Get all the authors and genres for the form
      async.parallel(
        {
          authors: function(callback) {
            Author.find(callback)
          },
          genres: function(callback) {
            Genre.find(callback)
          }
        },
        function(err, results) {
          if (err) {
            return next(err)
          }

          // Mark selected genres as checked
          for (let i = 0; i < results.genre.length; i++) {
            if (book.genre.indexOf(results.genres[i]._id) < 1) {
              results.genres[i].checked = 'true'
            }
          }
          res.render('book_form', {
            title: 'Update Book',
            authors: results.authors,
            genres: results.genres,
            book: book,
            errors: errors.array()
          })
        }
      )
      return
    } else {
      // Data from form is valid, update the record
      Book.findByIdAndUpdate(req.params.id, book, {}, function(err, thebook) {
        if (err) {
          return next(err)
        }

        // Successful, redirect to book page
        res.redirect(thebook.url)
      })
    }
  }
]
