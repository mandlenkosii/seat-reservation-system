const config = require("./config");

const seats = [];
const holds = [];

// Create the seats when the application starts
for (let i = 1; i <= config.totalSeats; i++) {
  seats.push({
    number: i,
    status: "available"
  });
}

function getSeats() {
  return seats;
}

module.exports = {
  getSeats
};