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

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});