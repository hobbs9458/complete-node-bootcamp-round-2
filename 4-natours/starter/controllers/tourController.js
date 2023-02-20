const fs = require('fs');

// READ JSON FILE AS A PSUEDO DB
const tours = JSON.parse(
  fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
);

exports.getAllTours = (req, res) => {
  res.status(200).json({
    // using JSEND formatting to envelop our data
    status: 'success',
    results: tours.length,
    data: {
      tours,
    },
  });
};

exports.getTour = (req, res) => {
  const id = req.params.id * 1;
  const tour = tours.find((tour) => tour.id === id);

  if (!tour) {
    return res.status(404).json({
      status: 'fail',
      message: 'tour not found',
    });
  }

  res.status(200).json({
    // using JSEND formatting to envelop our data
    status: 'success',
    data: {
      tour,
    },
  });
};

exports.createTour = (req, res) => {
  const id = tours[tours.length - 1].id + 1;
  const newTour = { ...id, ...req.body };

  tours.push(newTour);

  fs.writeFile(
    `${__dirname}/dev-data/data/tours-simple.json`,
    JSON.stringify(tours),
    (err) => {
      res.status(201).json({
        status: 'success',
        data: {
          tour: newTour,
        },
      });
    }
  );
};

// EXPRESS DEMO. NOT REALLY PATCHING ANYTHING.
exports.updateTour = (req, res) => {
  if (req.params.id * 1 > tours.length) {
    return res.status(404).json({
      status: 'fail',
      message: 'tour not found',
    });
  }

  res.status(200).json({
    // using JSEND formatting to envelop our data
    status: 'success',
    data: {
      tour: '<UPDATED TOUR HERE>',
    },
  });
};

// EXPRESS DEMO. NOT REALLY DELETING ANYTHING.
exports.deleteTour = (req, res) => {
  if (req.params.id * 1 > tours.length) {
    return res.status(404).json({
      status: 'fail',
      message: 'INVALID ID',
    });
  }

  res.status(204).json({
    // using JSEND formatting to envelop our data
    status: 'success',
    data: null,
  });
};
