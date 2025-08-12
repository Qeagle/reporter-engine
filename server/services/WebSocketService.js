class WebSocketService {
  constructor(io) {
    this.io = io;
  }

  broadcast(event, data) {
    this.io.emit(event, data);
  }

  emitToRoom(room, event, data) {
    this.io.to(room).emit(event, data);
  }

  emitToUser(userId, event, data) {
    this.io.to(`user-${userId}`).emit(event, data);
  }
}

export default WebSocketService;