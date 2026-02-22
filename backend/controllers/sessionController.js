const Session = require('../model/session');
const generateToken = require('../utils/generateToken');

exports.createSession = async (req, res) => {
  const { mode } = req.body; // "normal" or "emergency"

  const token = generateToken();

  let expireTime = 24 * 60 * 60 * 1000; 
  if (mode === "emergency") expireTime = 48 * 60 * 60 * 1000;

  const session = await Session.create({
    token,
    // FIXED: You must explicitly set emergency to true if mode is emergency
    emergency: mode === "emergency", 
    expiresAt: new Date(Date.now() + expireTime),
  });

  res.status(201).json(session);
};

exports.updateLocation = async (req, res) => {
  const { lat, lng, battery } = req.body;

  const session = await Session.findOneAndUpdate(
    { token: req.params.token },
    { location: { lat, lng }, battery },
    { returnDocument: 'after' } // <-- FIXED
  );

  res.json(session);
};

exports.toggleEmergency = async (req, res) => {
  const session = await Session.findOne({ token: req.params.token });

  session.emergency = !session.emergency;

  if (session.emergency) {
    session.expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h for emergency
  } else {
    session.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // reset to 24h
  }

  await session.save();
  res.json(session);
};

exports.getSession = async (req, res) => {
  const session = await Session.findOne({ token: req.params.token });
  res.json(session);
};
