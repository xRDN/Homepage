// Room names: letters, digits and dashes. "main", "main-2", "main-3"… are the public rooms every visitor lands in
// (the page moves on to the next one when a room is full). Any other name is a private room made by sharing ?room=name.
export const roomName = v => String(v || 'main').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24) || 'main';
export const isPublic = name => /^main(-\d+)?$/.test(name);
