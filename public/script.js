const socket = io("/");

const videoGrid = document.getElementById("video-grid");
const myVideo = document.createElement("video");
myVideo.muted = true;
const peers = {};

const getUserMedia = navigator.mediaDevices.getUserMedia;

getUserMedia({
  video: true,
  audio: true,
}).then(function (stream) {
  // Disable Mic and Cam Initially
  [...stream.getAudioTracks(), ...stream.getVideoTracks()].forEach(
    (track) => (track.enabled = false)
  );

  // Add Event Listeners to disable/enable Mic and Cam
  document.getElementById("mic").addEventListener("change", function () {
    stream.getAudioTracks().forEach((track) => (track.enabled = this.checked));
  });

  document.getElementById("cam").addEventListener("change", function () {
    stream.getVideoTracks().forEach((track) => (track.enabled = this.checked));
  });

  addVideoStream(myVideo, stream);

  const peer = new Peer(undefined, {
    host: "/",
    path: "/mypeerserver",
    port: "443",
    secure: true,
  });

  peer.on("open", function (id) {
    socket.emit("join-room", ROOM_ID, id);
  });

  peer.on("call", function (call) {
    console.log("stream", stream);
    console.log("call", call);
    call.answer(stream);
    const video = document.createElement("video");
    call.on("stream", function (userVideoStream) {
      addVideoStream(video, userVideoStream);
    });
  });

  socket.on("user-connected", function (userId) {
    console.log("user-connected", userId);
    connectToNewUser(userId, stream, peer);
  });
});

socket.on("user-disconnected", function (userId) {
  console.log("user-disconnected", userId);
  peers[userId]?.close();
});

function connectToNewUser(userId, stream, peer) {
  console.log("call with userId", userId);
  console.log("call with stream", stream);
  const call = peer.call(userId, stream);
  const video = document.createElement("video");
  call.on("stream", function (userVideoStream) {
    addVideoStream(video, userVideoStream);
  });
  call.on("close", function () {
    video.remove();
  });

  peers[userId] = call;
}

function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", function () {
    video.play();
  });
  videoGrid.append(video);
}
