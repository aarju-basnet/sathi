const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    token: { type: String, unique: true },

    location: {
      lat: Number,
      lng: Number,
    },

    emergency: {
      type: Boolean,
      default: true,
    },

    battery: Number,

    expiresAt: {
      type: Date,
      expires: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Session", sessionSchema);
