const socket = io("/");

const videoGrid = document.getElementById("video-grid");
const myVideo = document.createElement("video");
myVideo.muted = true;
const peers = {};

socket.on("disconnect", function () {
  location.reload();
});

socket.on("connected", async function (peer_port, peer_path) {
  const getUserMedia = navigator.mediaDevices.getUserMedia;
  const stream = await getUserMedia({
    video: true,
    audio: true,
  });
  // Disable Mic and Cam Initially
  stream.getTracks().forEach((track) => (track.enabled = false));
  // Add Event Listeners to disable/enable Mic and Cam
  document.getElementById("mic").addEventListener("change", function () {
    stream.getAudioTracks().forEach((track) => (track.enabled = this.checked));
  });
  document.getElementById("cam").addEventListener("change", function () {
    stream.getVideoTracks().forEach((track) => (track.enabled = this.checked));
  });

  document
    .getElementById("noise-reduction")
    .addEventListener("change", function () {
      console.log("hello!");
      stream.getAudioTracks().forEach(async (track) => {
        console.log("before", track.getConstraints());
        const x = await track.applyConstraints({
          noiseSuppression: this.checked,
        });
        console.log("after", track.getConstraints());
      });
    });

  addVideoStream(myVideo, stream);
  const peer = new Peer(undefined, {
    host: "/",
    path: peer_path,
    port: peer_port,
    secure: peer_port === "443",
  });
  peer.on("open", function (id) {
    socket.emit("join-room", ROOM_ID, id);
  });
  peer.on("call", function (call) {
    call.answer(stream);
    peers[call.peer] = call;
    const video_1 = document.createElement("video");
    call.on("stream", function (userVideoStream) {
      addVideoStream(video_1, userVideoStream);
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
