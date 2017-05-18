'use strict';

var stream;
var exactButton = document.querySelector('#exact');
var heightWidthButton = document.querySelector('#heightWidth');
var stopButton = document.querySelector('#stop');
var video = document.querySelector('#video1');
var info = document.querySelector('#info');

function bridgeTemasys() {
  if (!navigator.mediaDevices) {
    navigator.mediaDevices = {};
    navigator.mediaDevices.getUserMedia = function (constraints) {
      return new Promise(function (resolve, reject) {
        window.getUserMedia(constraints, resolve, reject);
      });
    };
  }
}

function stopStream() {
  if (stream) {
    stream.getTracks().forEach(function (track) {
      track.stop();
    });
  }
}

stopButton.onclick = function () {
  stopStream();
  info.innerHTML = '';
};

heightWidthButton.onclick = function () {
  getMedia({ audio: true, video: { height: 1920, width: 1080 } }).then(function (tracks) {
    console.log(tracks);
    info.innerHTML = 'Please open the console to see the tracks';
  });
};

exactButton.onclick = function () {
  getMedia({ audio: true, video: { exact: { height: 1920, width: 1080 } } }).then(function (tracks) {
    console.log(tracks);
    info.innerHTML = 'Please open the console to see the tracks';
  });
};

function getMedia(constraints) {
  bridgeTemasys();
  stopStream();
  const returnedPromise = navigator.mediaDevices.getUserMedia(constraints).then(gotStream).catch(function (e) {
    var message = 'getUserMedia error: ' + e.name;
    alert(message);
    console.log(message);
  });

  console.log("returnedPromise", returnedPromise)
  return returnedPromise;
}

function gotStream(mediaStream) {
  stream = mediaStream; // stream available to console
  attachMediaStream(video, stream);
  video.onloadedmetadata = function () {
    video.play();
  };

  var videoTrack = stream.getVideoTracks()[0];
  var audioTrack = stream.getAudioTracks()[0];
  return { audioTrack: audioTrack, videoTrack: videoTrack };
}
