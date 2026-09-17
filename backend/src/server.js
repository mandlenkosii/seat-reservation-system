const express = require("express");
const cors = require("cors");
const eventLog = require("./eventLog");

const reservationService = require("./reservationService");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/seats", (req, res) => {
  const seats = reservationService.getSeats();

  res.json({
    success: true,
    seats
  });
});

app.post("/api/holds", (req, res) => {
  const { seatNumber, email } = req.body;


    const result = reservationService.placeHold(seatNumber, email);

    if (!result.success) {
        return res.status(result.statusCode).json({
            success: false,
            error: result.error
        });
    }

     res.status(201).json(result);
});

app.post("/api/holds/extend", (req, res) => {
  const { email, code } = req.body;

  const result = reservationService.extendHold(email, code);

  if (!result.success) {
    return res.status(result.statusCode).json({
      success: false,
      error: result.error
    });
  }

  res.json(result);
});

app.post("/api/holds/confirm", (req, res) => {
  const { email, code } = req.body;

  const result = reservationService.confirmHold(email, code);

  if (!result.success) {
    return res.status(result.statusCode).json({
      success: false,
      error: result.error
    });
  }

  res.json(result);
});

app.post("/api/holds/release", (req, res) => {
  const { email, code } = req.body;

  const result = reservationService.releaseHold(email, code);

  if (!result.success) {
    return res.status(result.statusCode).json({
      success: false,
      error: result.error
    });
  }

  res.json(result);
});

app.post("/api/waitlist", (req, res) => {
  const { email } = req.body;

  const result = reservationService.joinWaitlist(email);

  if (!result.success) {
    return res.status(result.statusCode).json({
      success: false,
      error: result.error
    });
  }

  res.status(201).json(result);
});

// Give an available seat to the first person on the waitlist
function promoteFromWaitlist() {

  // Find the first person waiting
  const waitingUser = waitlist.shift();

  if (!waitingUser) {
    return;
  }

  // Find an available seat
  const seat = seats.find(
    (seat) => seat.status === "available"
  );

  if (!seat) {
    // Put the user back if no seat is available
    waitlist.unshift(waitingUser);
    return;
  }

  // Generate a unique hold code
  let code = generateHoldCode();

  while (codeExists(code)) {
    code = generateHoldCode();
  }

  // Create a normal 60-second hold
  const expirationTime =
    Date.now() + config.holdDuration;

  const hold = {
    email: waitingUser.email,
    seatNumber: seat.number,
    code,
    expirationTime,
    extensions: 0,
    status: "active",
    createdAt: Date.now(),
    fromWaitlist: true
  };

  holds.push(hold);

  // Mark the seat as held
  seat.status = "held";

  // Notify the user through the server log
  console.log(
    `WAITLIST: ${waitingUser.email} has been given seat ${seat.number}. Hold code: ${code}`
  );
}

app.get("/api/events", (req, res) => {
  const events = eventLog.getEvents();

  const seatNumber = req.query.seatNumber;

  const filteredEvents = seatNumber
    ? events.filter(
        (event) => event.seatNumber === Number(seatNumber)
      )
    : events;

  res.json({
    success: true,
    events: filteredEvents
  });
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});