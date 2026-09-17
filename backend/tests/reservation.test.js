const reservationService = require("../src/reservationService");
const clock = require("../src/clock");
const config = require("../src/config");

beforeEach(() => {
  reservationService.reset();
  clock.now = () => 1000000;
});

afterAll(() => {
  clock.now = () => Date.now();
});

describe("Seat Reservation System", () => {

  test("creates a valid hold code", () => {
    const result = reservationService.placeHold(
      1,
      "user@example.com"
    );

    expect(result.success).toBe(true);
    expect(result.hold.code).toHaveLength(6);

    expect(result.hold.code).toMatch(
      /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/
    );
  });


  test("does not allow the same seat twice", () => {
    reservationService.placeHold(
      1,
      "user1@example.com"
    );

    const result = reservationService.placeHold(
      1,
      "user2@example.com"
    );

    expect(result.success).toBe(false);
  });


  test("hold expires", () => {
    reservationService.placeHold(
      1,
      "user@example.com"
    );

    clock.now = () =>
      1000000 + config.holdDuration + 1;

    const seats = reservationService.getSeats();

    expect(seats[0].status).toBe("available");
  });


  test("user cannot exceed active hold limit", () => {
    reservationService.placeHold(
      1,
      "user@example.com"
    );

    reservationService.placeHold(
      2,
      "user@example.com"
    );

    const result = reservationService.placeHold(
      3,
      "user@example.com"
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain(
      "maximum number of active holds"
    );
  });


  test("confirmation is idempotent", () => {
    const result = reservationService.placeHold(
      1,
      "user@example.com"
    );

    const code = result.hold.code;

    const first =
      reservationService.confirmHold(
        "user@example.com",
        code
      );

    const second =
      reservationService.confirmHold(
        "user@example.com",
        code
      );

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);

    expect(second.hold.status).toBe("confirmed");
  });


  test("released seat becomes available", () => {
    const result = reservationService.placeHold(
      1,
      "user@example.com"
    );

    const release =
      reservationService.releaseHold(
        "user@example.com",
        result.hold.code
      );

    expect(release.success).toBe(true);

    const seats = reservationService.getSeats();

    expect(seats[0].status).toBe("available");
  });


  test("user can join the waitlist when all seats are unavailable", () => {

    for (
      let seat = 1;
      seat <= config.totalSeats;
      seat++
    ) {
      reservationService.placeHold(
        seat,
        `user${seat}@example.com`
      );
    }

    const result =
      reservationService.joinWaitlist(
        "waiting@example.com"
      );

    expect(result.success).toBe(true);
  });
  test("user cannot make more than 5 holds in one hour", () => {
  // Create and release 5 holds
  for (let seat = 1; seat <= 5; seat++) {
    const result = reservationService.placeHold(
      seat,
      "user@example.com"
    );

    reservationService.releaseHold(
      "user@example.com",
      result.hold.code
    );
  }

  // Try to create a 6th hold
  const result = reservationService.placeHold(
    6,
    "user@example.com"
  );

  expect(result.success).toBe(false);
  expect(result.statusCode).toBe(429);
  expect(result.error).toContain(
    "holds per hour"
  );
  });

  test("promotes the first person on the waitlist when a seat becomes available", () => {
  // Fill all seats
  for (let seat = 1; seat <= config.totalSeats; seat++) {
    reservationService.placeHold(
      seat,
      `user${seat}@example.com`
    );
  }

  // Add someone to the waitlist
  const waitlistResult =
    reservationService.joinWaitlist(
      "waiting@example.com"
    );

  expect(waitlistResult.success).toBe(true);

  // Release seat 1
  const firstHold =
    reservationService.getHolds().find(
      (hold) => hold.seatNumber === 1
    );

  reservationService.releaseHold(
    firstHold.email,
    firstHold.code
  );

  // Check that the waiting user received the seat
  const promotedHold =
    reservationService.getHolds().find(
      (hold) =>
        hold.email === "waiting@example.com"
    );

  expect(promotedHold).toBeDefined();
  expect(promotedHold.seatNumber).toBe(1);
  expect(promotedHold.status).toBe("active");
  expect(promotedHold.fromWaitlist).toBe(true);
});

});