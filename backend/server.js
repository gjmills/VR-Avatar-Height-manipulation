const https = require("https");
const path = require("path");
const fs = require("fs");
const express = require("express");
const socketio = require("socket.io");
const easyrtc = require("open-easyrtc");
const sqlite3 = require('sqlite3').verbose();
const esbuild = require("esbuild");

const projectRoot = path.resolve(__dirname, "..")
const config = {
  process: {title: "networked-aframe-server"},
  webServer: {
    port: process.env.PORT || 8080,
    staticPath: path.join(projectRoot, "public"),
    tls: {
      key: fs.readFileSync(path.join(projectRoot, "private", "key.pem")),
      cert: fs.readFileSync(path.join(projectRoot, "private", "cert.pem")),
    },
  },
  easyrtc: {
    appIceServers: [
      {"urls":"stun:stun1.l.google.com:19302"},
      {"urls":"stun:stun2.l.google.com:19302"},
    ],
    logLevel: "info",
    demosEnable: false,
  },
  socketio: {
    "log level": 1,
  },
  esbuild: {
    entryPoints: [path.join(projectRoot, "frontend", "index.js")],
    bundle: true,
    sourcemap: true,
    minify: true,
    watch: true,
    logLevel: "error",
    // target: ["chrome58", "firefox57", "safari11", "edge16"],
    outfile: path.join(projectRoot, "public", "app.js"),
  },
};

process.title = config.process.title;

const playerSettings = [
  // Fillers.
  {order: 1, position: {x: -8, z: -8}, rotation: {y: -135}},
  {order: 2, position: {x: -8, z: -4}, rotation: {y: -90}},
  {order: 3, position: {x: -8, z: 0}, rotation: {y: -90}},
  {order: 4, position: {x: -8, z: 4}, rotation: {y: -90}},
  {order: 5, position: {x: -8, z: 8}, rotation: {y: -45}},

  // Actual experiment positions.
  {order: 6, position: {x: 0, z: 1.5}, rotation: {y: 0}},
  {order: 7, position: {x: 0, z: -1.5}, rotation: {y: 180}},
];

let sessions = {};

function deepcopy(v) {
  return JSON.parse(JSON.stringify(v));
}

const app = express();
const db = new sqlite3.Database(path.join(projectRoot, "db.sqlite3"));

db.run(`
  CREATE TABLE IF NOT EXISTS movements (
    timestamp INTEGER,
    userId TEXT,
    session TEXT,
    experiment TEXT,
    height REAL,
    position TEXT,
    rotation TEXT,
    leftHandRotation TEXT,
    leftHandPosition TEXT,
    rightHandRotation TEXT,
    rightHandPosition TEXT)
`);

app.use(express.json());

app.get("/enter/:session/:networkId/", (req, res) => {
  const sid = req.params.session;
  const nid = req.params.networkId;

  console.log(`${nid} entered session ${sid}`);

  if (!sessions[sid]) {
    sessions[sid] = {
      active: {},
      available: deepcopy(playerSettings),
    };

    console.log(`created new session ${sid}`);
  }

  if (!sessions[sid].active[nid]) {
    sessions[sid].active[nid] =
      sessions[sid].available.pop();
    console.log(`copied new settings for ${nid} into session ${sid}`);
    console.log(`settings for ${nid}: ${JSON.stringify(sessions[sid].active[nid])}`);
  }

  const activeUsers = Object.keys(sessions[sid].active).length;
  console.log(`there are now ${activeUsers} active users in session ${sid}`);

  res.json(sessions[sid].active[nid]);
});

app.get("/leave/:session/:networkId", (req, res) => {
  const sid = req.params.session;
  const nid = req.params.networkId;

  console.log(`${nid} leaving session ${sid}`);

  if (!sessions[sid]) {
    console.log(`there is no session ${sid} for ${nid} to leave`);
    res.json(true);
    return;
  }

  if (sessions[sid].active[nid]) {
    let activeUsers = Object.keys(sessions[sid].active).length;
    console.log(`(1) there are now ${activeUsers} active users in session ${sid}`);

    sessions[sid].available.push(sessions[sid].active[nid]);
    delete sessions[sid].active[nid];

    activeUsers = Object.keys(sessions[sid].active).length;
    console.log(`(2) there are now ${activeUsers} active users in session ${sid}`);


    sessions[sid].available.sort((a, b) => a.order - b.order);

    console.log(sessions[sid].available);

    if (Object.keys(sessions[sid].active).length === 0) {
      console.log(`session ${sid} is empty, cleaning up session`);
      delete sessions[sid];
    }
  }

  res.json(true);
});

app.post("/record/:session/:networkId", (req, res) => {
  const sid = req.params.session;
  const nid = req.params.networkId;

  if (!req.body || req.body.length === 0) {
    res.json(true);
    return;
  }

  if (!sessions[sid]) {
    res.json(true);
    return;
  }

  db.serialize(() => {
    let stmt = db.prepare(`INSERT INTO movements VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`);
    for (let datapoint of req.body) {
        stmt.run(
          datapoint.datetime,
          nid,
          sid,
          0, // Unused, kept here to keep table column.
          datapoint.height,
          JSON.stringify(datapoint.position),
          JSON.stringify(datapoint.rotation),
          JSON.stringify(datapoint.leftHandRotation),
          JSON.stringify(datapoint.leftHandPosition),
          JSON.stringify(datapoint.rightHandRotation),
          JSON.stringify(datapoint.rightHandPosition),
        );
    }
    stmt.finalize();
  });

  console.log(`received ${req.body.length} recordings from player ${req.params.networkId}`, );
  res.json(true);
});

app.use(express.static(config.webServer.staticPath));

const webServer = https.createServer(config.webServer.tls, app);
const socketServer = socketio.listen(webServer, config.socketio);

for (const [key, value] of Object.entries(config.easyrtc)) {
  easyrtc.setOption(key, value);
}

esbuild.build(config.esbuild).catch(() => process.exit(1))

easyrtc.listen(app, socketServer);

webServer.listen(config.webServer.port, () => {
  console.log(`listening on https://localhost:${config.webServer.port}`);
});
