/**
 * Registers and re-exports every Mongoose model so they can be imported from
 * one place: import { User, Track } from "../models/index.js".
 */
export { User } from "./user.model.js";
export { ArtistProfile } from "./artistProfile.model.js";
export { Track } from "./track.model.js";
export { Playlist } from "./playlist.model.js";
export { Like } from "./like.model.js";
export { Follow } from "./follow.model.js";
export { ListenEvent } from "./listenEvent.model.js";
export { TasteProfile } from "./tasteProfile.model.js";
export { Session } from "./session.model.js";
