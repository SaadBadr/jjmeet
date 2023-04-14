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
    .getElementById("noise-filter")
    .addEventListener("change", function () {
      const min = document.getElementById("frequency-min");
      const max = document.getElementById("frequency-max");
      min.value = 1000;
      max.value = 2000;
      min.disabled = !this.checked;
      max.disabled = !this.checked;
      replaceNoiseReducedTracksForPeers(stream, peers, this.checked);
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
    if (document.getElementById("noise-filter").checked)
      replaceNoiseReducedTracksForPeers(
        stream,
        { [`${call.peer}`]: call },
        true
      );
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
  if (document.getElementById("noise-filter").checked)
    replaceNoiseReducedTracksForPeers(stream, { [`${call.peer}`]: call }, true);
}

function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", function () {
    video.play();
  });
  videoGrid.append(video);
}

let biquad = null;
document.getElementById("frequency-min").addEventListener("input", function () {
  const max = parseFloat(document.getElementById("frequency-max").value);
  const min = parseFloat(document.getElementById("frequency-min").value);
  console.log("frequency");
  if (biquad !== null) {
    const { center, q } = getFilterParams();
    biquad.frequency.value = center;
    biquad.Q.value = q;
    console.log("value", biquad.frequency.value, "Q", biquad.Q);
  }
});

document.getElementById("frequency-max").addEventListener("input", function () {
  console.log("frequency");
  if (biquad !== null) {
    const { center, q } = getFilterParams();
    biquad.frequency.value = center;
    biquad.Q.value = q;
    console.log("value", biquad.frequency.value, "Q", biquad.Q);
  }
});

function getFilterParams(max, min) {
  max = max ?? parseFloat(document.getElementById("frequency-max").value);
  min = min ?? parseFloat(document.getElementById("frequency-min").value);
  const center = Math.sqrt(max * min);
  const q = center / (max - min);
  return { center, q };
}

function noiseSuppression(stream) {
  try {
    const ctx = new AudioContext();
    const src = ctx.createMediaStreamSource(stream);
    const dst = ctx.createMediaStreamDestination();
    biquad = ctx.createBiquadFilter();
    [src, biquad, dst].reduce((a, b) => a && a.connect(b));
    biquad.type = "bandpass";
    const { center, q } = getFilterParams();
    biquad.frequency.value = center;
    biquad.Q.value = q;
    return dst.stream;
  } catch (e) {
    console.log(e);
  }
}

function replaceNoiseReducedTracksForPeers(
  stream,
  my_peers = peers,
  filter = true
) {
  if (filter) {
    Object.values(my_peers).forEach((call) => {
      call?.peerConnection
        ?.getSenders()[0]
        ?.replaceTrack(noiseSuppression(stream).getAudioTracks()[0]);
    });
  } else {
    Object.values(my_peers).forEach((call) => {
      call?.peerConnection
        ?.getSenders()[0]
        ?.replaceTrack(stream.getAudioTracks()[0]);
    });
  }
}
