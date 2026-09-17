const express = require("express");
const cors = require("cors");

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

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});