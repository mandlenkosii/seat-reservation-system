const config = require("./config");
const eventLog = require("./eventLog");
const seats = [];
const holds = [];
const waitlist = [];
const clock = require("./clock");

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
    const characters = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
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
  const currentTime = clock.now();

  holds.forEach((hold) => {
    if (
      hold.status === "active" &&
      currentTime >= hold.expirationTime
    ) {
      hold.status = "expired";
      eventLog.addEvent("hold_expired", {
         email: hold.email,
        seatNumber: hold.seatNumber,
        code: hold.code
        });

      const seat = seats.find(
        (seat) => seat.number === hold.seatNumber
      );

      if (seat) {
        seat.status = "available";
        promoteFromWaitlist();
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
    const oneHourAgo = clock.now() - config.holdLimitWindow;

    const holdsLastHour = holds.filter(
    (hold) =>
        hold.email === email &&
        hold.createdAt >= oneHourAgo &&
        !hold.fromWaitlist
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
    const expirationTime = clock.now() + config.holdDuration;

    // Create a new hold 
    const hold = {
        email,
        seatNumber : Number(seatNumber),
        code,
        expirationTime,
        extensions: 0,
        status: "active",
        createdAt: clock.now()   
    };

    holds.push(hold);

    //Change the seat status to "held"
    seat.status = "held";

    eventLog.addEvent("hold_placed", {
        email: hold.email,
        seatNumber: hold.seatNumber,
        code: hold.code
    });

    return { success: true,
        hold : {
            seatNumber: hold.seatNumber,
            code: hold.code,
            expirationTime: hold.expirationTime
        }   

    };
}

// Extend an active hold
function extendHold(email, code) {
  // Find the hold
  const hold = holds.find(
    (hold) =>
      hold.email === email &&
      hold.code === code
  );

  // Check if the hold exists
  if (!hold) {
    return {
      success: false,
      statusCode: 404,
      error: "Hold not found."
    };
  }

  // Check if the hold is still active
  if (hold.status !== "active") {
    return {
      success: false,
      statusCode: 409,
      error: "This hold is no longer active."
    };
  }

  // Check if the hold has expired
  if (clock.now() >= hold.expirationTime) {
    hold.status = "expired";

    const seat = seats.find(
      (seat) => seat.number === hold.seatNumber
    );

    if (seat) {
      seat.status = "available";
    }

    return {
      success: false,
      statusCode: 409,
      error: "This hold has expired."
    };
  }

  // Check the maximum number of extensions
  if (hold.extensions >= config.maxExtensions) {
    return {
      success: false,
      statusCode: 409,
      error: `You can only extend a hold ${config.maxExtensions} times.`
    };
  }

  // Reset the expiry time
  hold.expirationTime = clock.now() + config.holdDuration;

  // Increase the extension count
  hold.extensions++;
  eventLog.addEvent("hold_extended", {
  email: hold.email,
  seatNumber: hold.seatNumber,
  code: hold.code
});

  return {
    success: true,
    hold: {
      seatNumber: hold.seatNumber,
      code: hold.code,
      expirationTime: hold.expirationTime,
      extensions: hold.extensions
    }
  };
}

// Confirm an active hold
function confirmHold(email, code) {
  // Find the hold using the email and code
  const hold = holds.find(
    (hold) =>
      hold.email === email &&
      hold.code === code
  );

  // Check if the hold exists
  if (!hold) {
    return {
      success: false,
      statusCode: 404,
      error: "Hold not found."
    };
  }

  // If the hold is already confirmed,
  // return the same success response.
  if (hold.status === "confirmed") {
    return {
      success: true,
      hold: {
        seatNumber: hold.seatNumber,
        code: hold.code,
        status: hold.status
      }
    };
  }

  // Check if the hold is still active
  if (hold.status !== "active") {
    return {
      success: false,
      statusCode: 409,
      error: "This hold is no longer active."
    };
  }

  // Check if the hold has expired
  if (clock.now() >= hold.expirationTime) {
    hold.status = "expired";

    const seat = seats.find(
      (seat) => seat.number === hold.seatNumber
    );

    if (seat) {
      seat.status = "available";
    }

    return {
      success: false,
      statusCode: 409,
      error: "This hold has expired."
    };
  }

  // Confirm the hold
  hold.status = "confirmed";
  eventLog.addEvent("hold_confirmed", {
  email: hold.email,
  seatNumber: hold.seatNumber,
  code: hold.code
});

  // Change the seat status
  const seat = seats.find(
    (seat) => seat.number === hold.seatNumber
  );

  if (seat) {
    seat.status = "confirmed";
  }

  return {
    success: true,
    hold: {
      seatNumber: hold.seatNumber,
      code: hold.code,
      status: hold.status
    }
  };
}

// Release a held or confirmed seat
function releaseHold(email, code) {
  // Find the hold
  const hold = holds.find(
    (hold) =>
      hold.email === email &&
      hold.code === code
  );

  // Check if the hold exists
  if (!hold) {
    return {
      success: false,
      statusCode: 404,
      error: "Hold not found."
    };
  }

  // Check if the hold can be released
  if (
    hold.status !== "active" &&
    hold.status !== "confirmed"
  ) {
    return {
      success: false,
      statusCode: 409,
      error: "This hold has already been released or expired."
    };
  }

  // Change the hold status
  hold.status = "released";
  eventLog.addEvent("hold_released", {
  email: hold.email,
  seatNumber: hold.seatNumber,
  code: hold.code
});

  // Find the seat
  const seat = seats.find(
    (seat) => seat.number === hold.seatNumber
  );

  // Make the seat available again
  if (seat) {
    seat.status = "available";
    promoteFromWaitlist();
  }

  return {
    success: true,
    message: "Seat released successfully.",
    seatNumber: hold.seatNumber
  };
}

// Add a user to the waitlist
function joinWaitlist(email) {

  // Check if email was provided
  if (!email) {
    return {
      success: false,
      statusCode: 400,
      error: "Email is required."
    };
  }

  // Remove expired holds first
  removeExpiredHolds();

  // Check if a seat is available
  const availableSeat = seats.find(
    (seat) => seat.status === "available"
  );

  if (availableSeat) {
    return {
      success: false,
      statusCode: 409,
      error: "A seat is currently available. You can place a hold instead."
    };
  }

  // Check if the user is already on the waitlist
  const alreadyWaiting = waitlist.some(
    (entry) => entry.email === email
  );

  if (alreadyWaiting) {
    return {
      success: false,
      statusCode: 409,
      error: "You are already on the waitlist."
    };
  }

  // Check if the user already has an active hold
  const activeHold = holds.some(
    (hold) =>
      hold.email === email &&
      hold.status === "active"
  );

  if (activeHold) {
    return {
      success: false,
      statusCode: 409,
      error: "You already have an active hold."
    };
  }

  // Check if the user already has a confirmed seat
  const confirmedHold = holds.some(
    (hold) =>
      hold.email === email &&
      hold.status === "confirmed"
  );

  if (confirmedHold) {
    return {
      success: false,
      statusCode: 409,
      error: "You already have a confirmed seat."
    };
  }

  // Add user to the waitlist
  waitlist.push({
    email,
    joinedAt: clock.now()
  });

  eventLog.addEvent("waitlist_joined", {
  email
});

  return {
    success: true,
    message: "You have been added to the waitlist."
  };
}

// Promote the first person on the waitlist
function promoteFromWaitlist() {
  const waitingUser = waitlist.shift();

  // No one is waiting
  if (!waitingUser) {
    return;
  }

  // Find an available seat
  const seat = seats.find(
    (seat) => seat.status === "available"
  );

  // If no seat is available, put the user back
  if (!seat) {
    waitlist.unshift(waitingUser);
    return;
  }

  // Generate a unique hold code
  let code = generateHoldCode();

  while (codeExists(code)) {
    code = generateHoldCode();
  }

  // Create a normal hold
  const expirationTime = clock.now() + config.holdDuration;

  const hold = {
    email: waitingUser.email,
    seatNumber: seat.number,
    code,
    expirationTime,
    extensions: 0,
    status: "active",
    createdAt: clock.now(),
    fromWaitlist: true
  };

  holds.push(hold);

  // Change the seat status
  seat.status = "held";

  // Record the promotion
  eventLog.addEvent("waitlist_promoted", {
    email: waitingUser.email,
    seatNumber: seat.number,
    code
  });

  // Notify the user through the server console
  console.log(
    `WAITLIST: ${waitingUser.email} has been given seat ${seat.number}. Hold code: ${code}`
  );
}

function reset() {
  seats.length = 0;
  holds.length = 0;
  waitlist.length = 0;

  for (let i = 1; i <= config.totalSeats; i++) {
    seats.push({
      number: i,
      status: "available"
    });
  }
}

function getHolds() {
  return holds;
}

module.exports = {
  getSeats,
  placeHold,
  removeExpiredHolds,
  joinWaitlist,
  extendHold,
  confirmHold,
  releaseHold,
  reset,
  getHolds
};
