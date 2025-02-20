const socketRooms: Record<string, WebSocket[]> = {};

export function joinRoom(roomId: string, ws: WebSocket) {
  console.log("joining room", roomId);
  if (!socketRooms[roomId]) {
    socketRooms[roomId] = [];
  }
  socketRooms[roomId].push(ws);
}

export function removeFromRoom(roomId: string, ws: WebSocket) {
  socketRooms[roomId] = socketRooms[roomId].filter((w) => w !== ws);
}

export function getRoom(roomId: string) {
  return socketRooms[roomId];
}

export function deleteRoom(roomId: string) {
  delete socketRooms[roomId];
}

export function broadcast(roomId: string, message: string) {
  const room = getRoom(roomId);
  if (room) {
    room.forEach((ws) => ws.send(message));
  }
}

export function getRoomIds({
  userKey,
  scrapeId,
  threadId,
}: {
  userKey?: string;
  scrapeId?: string;
  threadId?: string;
}) {
  const roomIds: string[] = [];
  if (userKey) {
    roomIds.push(`user-${userKey}`);
  }
  if (scrapeId) {
    roomIds.push(`scrape-${scrapeId}`);
  }
  if (threadId) {
    roomIds.push(`thread-${threadId}`);
  }
  return roomIds;
}
