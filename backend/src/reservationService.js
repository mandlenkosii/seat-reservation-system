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
    removeExpiredHolds(); // Remove expired holds before returning the seats    
    
    return seats;
}
//Generate a unique hold code
function generateHoldCode() {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let code = "";
for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters[randomIndex];
}
    return code;
}

// Function to check if the code is already in use
function codeExists(code) {
    return holds.some(hold => hold.code === code);
}

// Remove expired holds
function removeExpiredHolds() {
  const currentTime = Date.now();

  holds.forEach((hold) => {
    if (
      hold.status === "active" &&
      currentTime >= hold.expirationTime
    ) {
      hold.status = "expired";

      const seat = seats.find(
        (seat) => seat.number === hold.seatNumber
      );

      if (seat) {
        seat.status = "available";
      }
    }
  });
}

// Function to hold a seat
function placeHold(seatNumber, email) {

    // Remove expired holds before placing a new hold
    removeExpiredHolds();

    // Check if the email was provided
    if (!email) {
        return { success: false, statusCode: 400, error: "Email is required." };
    }

    // Check if the seat number was provided
    if (!seatNumber) {
        return { success: false, statusCode: 400, error: "Seat number is required." };
    }

    //Finding the requested seat
    const seat = seats.find((seat) => seat.number === Number(seatNumber));
    if (!seat) {
        return { success: false, statusCode: 404, error: "Seat not found." };
    }

    // Check if the seat is available
    if (seat.status !== "available") {
        return { success: false, statusCode: 400, error: "Seat is not available." };
    }

    // Count the user's active holds
    const activeHolds = holds.filter((hold) => hold.email === email && hold.status === "active");

    if (activeHolds.length >= config.maxActiveHolds) {
        return { success: false, statusCode: 400, error: `You have reached the maximum number of active holds.${config.maxActiveHolds}` };
    }

    // Count the user's holds from the last hour
    const oneHourAgo = Date.now() - config.holdLimitWindow;

    const holdsLastHour = holds.filter(
    (hold) =>
        hold.email === email &&
        hold.createdAt >= oneHourAgo
    );

    if (holdsLastHour.length >= config.maxHoldsPerHour) {
        return {
            success: false,
            statusCode: 429,
            error: `You can only make ${config.maxHoldsPerHour} holds per hour.`
        };
    }

    //Generate a unique hold code
    let code = generateHoldCode();

    while (codeExists(code)) {
        code = generateHoldCode();
    }

    //Calculate the expiration time for the hold
    const expirationTime = Date.now() + config.holdDuration;

    // Create a new hold 
    const hold = {
        email,
        seatNumber : Number(seatNumber),
        code,
        expirationTime,
        extensions: 0,
        status: "active",
        createdAt: Date.now()   
    };

    holds.push(hold);

    //Change the seat status to "held"
    seat.status = "held";

    return { success: true,
        hold : {
            seatNumber: hold.seatNumber,
            code: hold.code,
            expirationTime: hold.expirationTime
        }   

    };
}

module.exports = {
  getSeats,
  placeHold,
  removeExpiredHolds
};
