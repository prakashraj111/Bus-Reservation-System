let ioInstance = null;

const getTripRoom = (tripId) => `trip:${tripId}`;

const setSocketServer = (io) => {
  ioInstance = io;
};

const getSocketServer = () => ioInstance;

const emitTripSeatUpdate = (tripId, payload) => {
  if (!ioInstance || !tripId) return;
  ioInstance.to(getTripRoom(tripId.toString())).emit("trip:seats-updated", payload);
};

module.exports = {
  emitTripSeatUpdate,
  getSocketServer,
  getTripRoom,
  setSocketServer
};
