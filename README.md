# Seat Reservation System

A simple full-stack seat reservation system built with Node.js, Express, React, and Jest.

The system allows users to temporarily hold seats, confirm reservations, extend holds, release seats, and join a FIFO waitlist when all seats are unavailable.

## Features

- View all seats and their current status
- Hold an available seat using an email address
- Generate a unique 6-character hold code
- Hold codes use uppercase letters and numbers while excluding `0`, `O`, `1`, `I`, and `L`
- Holds automatically expire after the configured time
- Live countdown shown on the frontend
- Maximum active-hold limit per user
- Maximum holds-per-hour limit per user
- Extend an active hold
- Maximum extension limit
- Confirm a hold
- Idempotent confirmation
- Release an active or confirmed reservation
- FIFO waitlist
- Automatic waitlist promotion when a seat becomes available
- Waitlist promotions create normal temporary holds
- Append-only event log
- Event log filtering by seat
- Automated backend tests

## Technology Stack

### Backend

- Node.js
- Express
- JavaScript
- Jest
- In-memory data storage

### Frontend

- React
- Vite
- JavaScript
- React Router

## Architecture

The application keeps the business rules in one main service instead of putting them directly inside the HTTP routes.

```text
React Frontend
      ↓
Express API
      ↓
reservationService.js
      ↓
In-memory reservation state
      ↓
eventLog.js
```

The API routes are responsible for receiving requests and returning HTTP responses.

`reservationService.js` contains the reservation business rules.

`eventLog.js` records state changes.

`clock.js` provides the current time and allows the tests to control time without waiting in real time.

The in-memory storage can later be replaced with a database without moving the main business rules into the frontend.

## Configuration

Configuration is stored in:

```text
backend/src/config.js
```

Current configuration:

```js
const config = {
  totalSeats: 20,
  holdDuration: 60 * 1000,
  maxActiveHolds: 2,
  maxHoldsPerHour: 5,
  maxExtensions: 2,
  holdLimitWindow: 60 * 60 * 1000,
};
```

### Configuration meaning

| Setting                |    Default |
| ---------------------- | ---------: |
| Total seats            |         20 |
| Hold duration          | 60 seconds |
| Maximum active holds   |          2 |
| Maximum holds per hour |          5 |
| Maximum extensions     |          2 |
| Hold limit window      |     1 hour |

## Running the Backend

Open a terminal:

```powershell
cd backend
npm install
node src/server.js
```

The API runs on:

```text
http://localhost:3000
```

## Running the Frontend

Open another terminal:

```powershell
cd frontend
npm install
npm run dev
```

The frontend runs on:

```text
http://localhost:5173
```

The backend must be running while using the frontend.

## Running Tests

From the backend directory:

```powershell
cd backend
npm test
```

The test suite covers important business rules including:

- Hold code format
- Seat exclusivity
- Hold expiry
- Active-hold limits
- Idempotent confirmation
- Seat release
- Waitlist joining
- Holds-per-hour limit
- Waitlist promotion

The test clock is controlled through `clock.js`, allowing expiry-related rules to be tested without waiting for real time.

## API Reference

### Get Seats

```http
GET /api/seats
```

Returns all seats and their current status.

Possible statuses:

```text
available
held
confirmed
```

### Place Hold

```http
POST /api/holds
```

Request:

```json
{
  "email": "user@example.com",
  "seatNumber": 5
}
```

Successful response:

```json
{
  "success": true,
  "hold": {
    "seatNumber": 5,
    "code": "N2H3FM",
    "expirationTime": 1789705120061
  }
}
```

### Confirm Hold

```http
POST /api/holds/confirm
```

Request:

```json
{
  "email": "user@example.com",
  "code": "N2H3FM"
}
```

### Extend Hold

```http
POST /api/holds/extend
```

Request:

```json
{
  "email": "user@example.com",
  "code": "N2H3FM"
}
```

### Release Hold or Reservation

```http
POST /api/holds/release
```

Request:

```json
{
  "email": "user@example.com",
  "code": "N2H3FM"
}
```

### Join Waitlist

```http
POST /api/waitlist
```

Request:

```json
{
  "email": "user@example.com"
}
```

### Get Event Log

```http
GET /api/events
```

### Filter Event Log by Seat

```http
GET /api/events?seatNumber=5
```

## Reservation Rules

### Seat Exclusivity

A seat can only have one active reservation at a time.

The reservation service checks the seat status before changing it to `held` or `confirmed`.

Because the current backend performs the check and state change synchronously in one Node.js process, another request cannot execute between those operations.

For a multi-server production system, this rule should be enforced by the database using transactions, conditional updates, or appropriate locking.

### Hold Expiry

A hold is temporary.

After the configured hold duration expires, the seat becomes available again.

Expired holds cannot be reused.

### Active Hold Limit

A user can have a maximum of two active unconfirmed holds by default.

Confirmed seats do not count toward this limit.

### Holds Per Hour

A user can make a maximum of five holds within one hour by default.

This includes holds that were later confirmed, released, or expired.

Automatic holds created through waitlist promotion do not count toward this limit.

### Extensions

An active hold can be extended before it expires.

Each extension resets the expiry time to the full configured hold duration.

The default maximum is two extensions.

### Confirmation

The email address must match the email associated with the hold.

Confirmation is idempotent.

If the same confirmed hold is confirmed again using the same email and code, the system returns success without changing the reservation state.

### Waitlist

When every seat is unavailable, a user can join the waitlist.

The waitlist is FIFO:

```text
First user to join
       ↓
First user promoted
```

When a seat becomes available, the first waitlisted user receives a normal temporary hold.

The user is removed from the waitlist after promotion.

If the automatic hold expires, the user is not automatically placed back on the waitlist.

## Event Log

Every important state change is recorded in the append-only event log.

Examples include:

```text
hold_placed
hold_extended
hold_confirmed
hold_released
hold_expired
waitlist_joined
waitlist_promoted
```

The event log records:

- Event type
- Timestamp
- Email when applicable
- Seat number when applicable
- Hold code when applicable

The current seat state and event log serve different purposes.

The seat state provides the current answer:

> What is happening with this seat right now?

The event log provides the history:

> What happened to this seat?

## Testing Design

Time-dependent rules are normally difficult to test because tests would have to wait for real time.

This project uses `clock.js` so the test suite can control the current time.

For example, the tests can move the clock forward and verify that a hold expires immediately without waiting 60 seconds.

This makes the tests faster and more reliable.

## Production Considerations

The current implementation intentionally uses in-memory storage to keep the assessment implementation simple.

In a production environment, the reservation data should be moved to a persistent database.

A production database implementation should also provide:

- Transactional seat reservation
- Database-level seat uniqueness
- Persistent event logs
- Persistent waitlists
- Multi-server concurrency protection
- Proper authentication and authorization
- Rate limiting
- Input validation
- Monitoring and logging
- Database backups

The business rules are kept inside `reservationService.js` so that moving the storage layer to a database can be done without redesigning the entire frontend.

## Testing the Main User Flow

A basic manual test can be performed as follows:

1. Open the frontend.
2. Enter an email address.
3. Select an available seat.
4. Place a hold.
5. Verify that a 6-character code is displayed.
6. Verify the countdown.
7. Open Manage Hold.
8. Extend the hold.
9. Confirm the hold.
10. Confirm the same hold again to test idempotency.
11. Release a reservation.
12. Fill all seats.
13. Join the waitlist.
14. Release a seat.
15. Verify that the first waitlisted user receives the seat.
16. Open Event Log.
17. Filter events by seat.

## Current Status

The project currently has:

- Working backend API
- Working React frontend
- Automated backend tests
- Seat reservation
- Hold expiry
- Hold countdown
- Confirmation
- Hold extension
- Release
- FIFO waitlist
- Automatic waitlist promotion
- Append-only event logging
- Event filtering
- Successful frontend production build
