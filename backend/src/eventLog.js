const events = [];

function addEvent(type, data = {}) {
  events.push({
    type,
    timestamp: Date.now(),
    ...data
  });
}

function getEvents() {
  return [...events];
}

module.exports = {
  addEvent,
  getEvents
};