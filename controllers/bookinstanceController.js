let BookInstance = require('../models/bookinstance')
let Book = require('../models/book')
let async = require('async')
const { body, validationResult } = require('express-validator')
const { sanitizeBody } = require('express-validator')

// Display list of all BookInstances.
exports.bookinstance_list = function(req, res, next) {
  BookInstance.find()
    .populate('book')
    .exec(function(err, list_bookinstances) {
      if (err) {
        return next(err)
      }

      res.render('bookinstance_list', {
        title: 'Book Instance List',
        bookinstance_list: list_bookinstances
      })
    })
}

// Display detail page for a specific BookInstance.
exports.bookinstance_detail = function(req, res, next) {
  BookInstance.findById(req.params.id)
    .populate('book')
    .exec(function(err, bookinstance) {
      if (err) {
        return next(err)
      }
      if (bookinstance === null) {
        let err = new Error('Book copy not found')
        err.status = 404
        return next(err)
      }

      res.render('bookinstance_detail', {
        title: 'Copy: ' + bookinstance.book.title,
        bookinstance: bookinstance
      })
    })
}

// Display BookInstance create form on GET.
exports.bookinstance_create_get = function(req, res, next) {
  Book.find({}, 'title').exec(function(err, books) {
    if (err) {
      return next(err)
    }

    res.render('bookinstance_form', {
      title: 'Create BookInstance',
      book_list: books
    })
  })
}

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [
  // Validate fields first
  body('book', 'Book must be specified')
    .isLength({ min: 1 })
    .trim(),
  body('imprint', 'Imprint must be specified')
    .isLength({ min: 1 })
    .trim(),
  body('due_back', 'Invalid date')
    .optional({ checkFalsy: true })
    .isISO8601(),

  // Break out the holy water, let us sanitize
  sanitizeBody('book').escape(),
  sanitizeBody('imprint').escape(),
  sanitizeBody('status')
    .trim()
    .escape(),
  sanitizeBody('due_back').escape(),

  // We can now process the request,
  (req, res, next) => {
    // Extract any errors
    const errors = validationResult(req)

    // Create our BookInstance object w/ valid and sanitized data
    let bookinstance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back
    })

    if (!errors.isEmpty()) {
      // We have errors, render again with data given
      Book.find({}, 'title').exec(function(err, books) {
        if (err) {
          return next(err)
        }

        res.render('bookinstance_form', {
          title: 'Create BookInstance',
          book_list: books,
          selected_book: bookinstance.book._id,
          errors: errors.array(),
          bookinstance: bookinstance
        })
      })
      return
    } else {
      // Data on form is valid
      bookinstance.save(function(err) {
        if (err) {
          return next(err)
        }

        res.redirect(bookinstance.url)
      })
    }
  }
]

// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = function(req, res, next) {
  BookInstance.findById(req.params.id)
    .populate('book')
    .exec(function(err, bookinstance) {
      if (err) {
        return next(err)
      }
      if (bookinstance === null) {
        res.redirect('/catalog/bookinstances')
      }

      res.render('bookinstance_delete', {
        title: 'Delete Book Instance',
        bookinstance: bookinstance
      })
    })
}

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = function(req, res, next) {
  BookInstance.findById(req.params.id).exec(function(err, bookinstance) {
    if (err) {
      return next(err)
    }
    if (bookinstance === null) {
      res.redirect('/catalog/bookinstances')
    }

    // On the success path to delete this instance
    BookInstance.findByIdAndRemove(
      req.body.bookinstanceid,
      function deleteBookInstance(err) {
        if (err) {
          return next(err)
        }
        // else, all went well
        res.redirect('/catalog/bookinstances')
      }
    )
  })
}

// Display BookInstance update form on GET.
exports.bookinstance_update_get = function(req, res, next) {
  async.parallel(
    {
      books: function(callback) {
        Book.find(callback)
      },
      book_instance: function(callback) {
        BookInstance.findById(req.params.id)
          .populate('book')
          .exec(callback)
      }
    },
    function(err, results) {
      if (err) {
        return next(err)
      }

      // Populate and render form
      res.render('bookinstance_form', {
        title: 'Update Book Instance',
        book_list: results.books,
        bookinstance: results.book_instance
      })
    }
  )
}

// Handle bookinstance update on POST.
exports.bookinstance_update_post = [
  // Validate fields first
  body('book', 'Book must be specified')
    .isLength({ min: 1 })
    .trim(),
  body('imprint', 'Imprint must be specified')
    .isLength({ min: 1 })
    .trim(),
  body('due_back', 'Invalid date')
    .optional({ checkFalsy: true })
    .isISO8601(),

  // Break out the holy water, let us sanitize
  sanitizeBody('book').escape(),
  sanitizeBody('imprint').escape(),
  sanitizeBody('status')
    .trim()
    .escape(),
  sanitizeBody('due_back').escape(),

  // We can now process the request,
  (req, res, next) => {
    // Extract any errors
    const errors = validationResult(req)

    // Create our BookInstance object w/ valid and sanitized data
    let bookinstance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back,
      _id: req.params.id // Make sure to update with same id!
    })

    if (!errors.isEmpty()) {
      // We have errors, render again with data given
      Book.find({}, 'title').exec(function(err, books) {
        if (err) {
          return next(err)
        }

        res.render('bookinstance_form', {
          title: 'Update BookInstance',
          book_list: books,
          selected_book: bookinstance.book._id,
          errors: errors.array(),
          bookinstance: bookinstance
        })
      })
      return
    } else {
      // Data on form is valid
      BookInstance.findByIdAndUpdate(req.params.id, bookinstance, {}, function(
        err,
        updatedBookInstance
      ) {
        if (err) {
          return next(err)
        }
        // If no error, we are successful, redirect to updated BI details
        res.redirect(updatedBookInstance.url)
      })
    }
  }
]
