import { useEffect, useState } from "react";

const API = "http://localhost:3000/api";

function App() {
  const [page, setPage] = useState("seats");
  const [seats, setSeats] = useState([]);
  const [eventSeatFilter, setEventSeatFilter] = useState("");
  const [email, setEmail] = useState("");
  const [seatNumber, setSeatNumber] = useState("");
  const [message, setMessage] = useState("");
  const [expirationTime, setExpirationTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const [code, setCode] = useState("");
  const [events, setEvents] = useState([]);

  // Get seats from backend
  const loadSeats = async () => {
    const response = await fetch(`${API}/seats`);
    const data = await response.json();

    setSeats(data.seats);
  };

  useEffect(() => {
    loadSeats();

    // Refresh seats every 2 seconds
    const interval = setInterval(loadSeats, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (page === "events") {
      loadEvents();
    }
  }, [eventSeatFilter, page]);

  useEffect(() => {
    if (!expirationTime) {
      return;
    }

    const timer = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((expirationTime - Date.now()) / 1000),
      );

      setTimeLeft(remaining);

      if (remaining === 0) {
        setExpirationTime(null);
        setMessage("Your hold has expired.");
        loadSeats();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expirationTime]);

  // Place a hold
  const placeHold = async () => {
    setMessage("");

    const response = await fetch(`${API}/holds`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        seatNumber: Number(seatNumber),
      }),
    });

    const data = await response.json();

    console.log("Hold response:", data);

    if (data.success) {
      setMessage(`Seat ${data.hold.seatNumber} held successfully!`);

      setCode(data.hold.code);
      setExpirationTime(data.hold.expirationTime);
      setTimeLeft(Math.ceil((data.hold.expirationTime - Date.now()) / 1000));

      await loadSeats();
    } else {
      setMessage(data.error || "Unable to place hold.");
    }
  };

  // Join waitlist
  const joinWaitlist = async () => {
    const response = await fetch(`${API}/waitlist`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
      }),
    });

    const data = await response.json();

    setMessage(data.success ? data.message : data.error);
  };

  // Load event log
  const loadEvents = async () => {
    const url = eventSeatFilter
      ? `${API}/events?seatNumber=${eventSeatFilter}`
      : `${API}/events`;

    const response = await fetch(url);
    const data = await response.json();

    setEvents(data.events);
  };

  return (
    <div className="app">
      <nav>
        <h2>Seat Reservation</h2>

        <button onClick={() => setPage("seats")}>Seats</button>

        <button onClick={() => setPage("manage")}>Manage Hold</button>

        <button
          onClick={() => {
            setPage("events");
          }}
        >
          Event Log
        </button>
      </nav>

      {page === "seats" && (
        <main>
          <h1>Choose a Seat</h1>

          <input
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <select
            value={seatNumber}
            onChange={(e) => setSeatNumber(e.target.value)}
          >
            <option value="">Select an available seat</option>

            {seats
              .filter((seat) => seat.status === "available")
              .map((seat) => (
                <option key={seat.number} value={seat.number}>
                  Seat {seat.number}
                </option>
              ))}
          </select>

          <button onClick={placeHold}>Hold Seat</button>

          <div className="seat-grid">
            {seats.map((seat) => (
              <div key={seat.number} className={`seat ${seat.status}`}>
                {seat.number}
                <small>{seat.status}</small>
              </div>
            ))}
          </div>

          {seats.every((seat) => seat.status !== "available") && (
            <button onClick={joinWaitlist}>Join Waitlist</button>
          )}

          {message && <p className="message">{message}</p>}

          {timeLeft > 0 && (
            <div className="countdown">
              <strong>Hold code: {code}</strong>
              <p>Time remaining: {timeLeft} seconds</p>
            </div>
          )}
        </main>
      )}

      {page === "manage" && (
        <main>
          <h1>Manage Hold</h1>

          <input
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="text"
            placeholder="Hold code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />

          <button
            onClick={async () => {
              const response = await fetch(`${API}/holds/confirm`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  email,
                  code,
                }),
              });

              const data = await response.json();

              setMessage(
                data.success ? "Seat confirmed successfully." : data.error,
              );
            }}
          >
            Confirm
          </button>

          <button
            onClick={async () => {
              const response = await fetch(`${API}/holds/extend`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  email,
                  code,
                }),
              });

              const data = await response.json();

              setMessage(
                data.success ? "Hold extended successfully." : data.error,
              );
            }}
          >
            Extend
          </button>

          <button
            onClick={async () => {
              const response = await fetch(`${API}/holds/release`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  email,
                  code,
                }),
              });

              const data = await response.json();

              setMessage(
                data.success ? "Seat released successfully." : data.error,
              );

              loadSeats();
            }}
          >
            Release
          </button>

          {message && <p className="message">{message}</p>}
        </main>
      )}

      {page === "events" && (
        <main>
          <h1>Event Log</h1>

          <select
            value={eventSeatFilter}
            onChange={(e) => {
              setEventSeatFilter(e.target.value);
            }}
          >
            <option value="">All seats</option>

            {seats.map((seat) => (
              <option key={seat.number} value={seat.number}>
                Seat {seat.number}
              </option>
            ))}
          </select>

          <button onClick={loadEvents}>Refresh</button>

          {events.map((event, index) => (
            <div className="event" key={index}>
              <strong>{event.type}</strong>

              <p>{event.email && `Email: ${event.email}`}</p>

              <p>{event.seatNumber && `Seat: ${event.seatNumber}`}</p>

              <small>{new Date(event.timestamp).toLocaleString()}</small>
            </div>
          ))}
        </main>
      )}
    </div>
  );
}

export default App;
