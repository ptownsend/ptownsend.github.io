/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

var startButton = document.getElementById('startButton');
var stopButton = document.getElementById('stopButton');
var callButton = document.getElementById('callButton');
var hangupButton = document.getElementById('hangupButton');
document.addEventListener('screenShareEvent', onScreenShare);

callButton.disabled = true;
hangupButton.disabled = true;
startButton.onclick = start;
callButton.onclick = call;
hangupButton.onclick = hangup;
stopButton.onclick = function() {
  if (localVideoStream) {
    localVideoStream.getTracks().forEach(function(track) { track.stop() })
  }
  if (localScreenStream) {
    localScreenStream.getTracks().forEach(function(track) { track.stop() })
  }
  startButton.disabled = false;
}

var startTime;
var localVideo = document.getElementById('localVideo');
var localScreen = document.getElementById('localScreen');
var remoteVideo = document.getElementById('remoteVideo');
var remoteScreen = document.getElementById('remoteScreen');

var localStream;
var localScreenStream;
var localVideoStream;
var pc1;
var pc2;
var offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1
};

function getName(pc) {
  return (pc === pc1) ? 'pc1' : 'pc2';
}

function getOtherPc(pc) {
  return (pc === pc1) ? pc2 : pc1;
}

function gotStream(stream) {
  console.log('Received local stream');
  localVideoStream = stream;
  attachMediaStream(localVideo, localVideoStream);
}

function gotScreen(stream) {
  console.log('Received local stream');
  localScreenStream = stream;
  attachMediaStream(localScreen, localScreenStream);
  callButton.disabled = false;
}

function onScreenShare(e) {
  if (e.data) {
    return navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: e.data,
          maxWidth: 1920,
          maxHeight: 1080,
          maxFrameRate: 30
        }
      }
    })
    .then(gotScreen)
    .catch(function(e) {
      console.log("getUserMedia() error:" + e.name)
    })
  }
}

function start() {
  console.log('Requesting local stream');
  localStream = new MediaStream();

  startButton.disabled = true;
  navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true
  })
  .then(gotStream)
  .then(function() {
    if (window.chrome) {
      // create event that our extension listens for to prompt for screen sharing.
      const e = document.createEvent('Event');

      //TODO: move event name somewhere else to not be hardcoded
      e.initEvent('requestScreenShare');
      document.dispatchEvent(e);
      return true;
    }

    return navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        chromeMediaSource: { exact: 'desktop' }
      }
    })
    .then(gotScreen)
    .catch(function(e) {
      console.log("getUserMedia() error:" + e.name)
    })
  })
  .catch(function(e) {
    console.log("getUserMedia() error:" + e.name)
  });
}

function call() {
  callButton.disabled = true;
  hangupButton.disabled = false;
  console.log('Starting call');
  startTime = window.performance.now();

  var servers = null;
  pc1 = new RTCPeerConnection(servers);
  console.log('Created local peer connection object pc1');
  pc1.onicecandidate = function(e) {
    onIceCandidate(pc1, e);
  };
  pc2 = new RTCPeerConnection(servers);
  console.log('Created remote peer connection object pc2');
  pc2.onicecandidate = function(e) {
    onIceCandidate(pc2, e);
  };
  pc1.oniceconnectionstatechange = function(e) {
    onIceStateChange(pc1, e);
  };
  pc2.oniceconnectionstatechange = function(e) {
    onIceStateChange(pc2, e);
  };
  pc2.onaddstream = gotRemoteStream;

  var videoTracks = localVideoStream.getVideoTracks();
  var audioTracks = localVideoStream.getAudioTracks();
  var screenTracks = localScreenStream.getVideoTracks();
  localStream.addTrack(audioTracks[0]);
  localStream.addTrack(videoTracks[0]);
  localStream.addTrack(screenTracks[0]);

  pc1.addStream(localStream);

  console.log('Added local stream to pc1');

  console.log('pc1 createOffer start');
  pc1.createOffer(
    offerOptions
  ).then(
    onCreateOfferSuccess,
    onCreateSessionDescriptionError
  );
}

function onCreateSessionDescriptionError(error) {
  console.log('Failed to create session description: ' + error.toString());
}

function onCreateOfferSuccess(desc) {
  console.log('Offer from pc1\n' + desc.sdp);
  console.log('pc1 setLocalDescription start');
  pc1.setLocalDescription(desc).then(
    function() {
      onSetLocalSuccess(pc1);
    },
    onSetSessionDescriptionError
  );
  console.log('pc2 setRemoteDescription start');
  pc2.setRemoteDescription(desc).then(
    function() {
      onSetRemoteSuccess(pc2);
    },
    onSetSessionDescriptionError
  );
  console.log('pc2 createAnswer start');
  // Since the 'remote' side has no media stream we need
  // to pass in the right constraints in order for it to
  // accept the incoming offer of audio and video.
  pc2.createAnswer().then(
    onCreateAnswerSuccess,
    onCreateSessionDescriptionError
  );
}

function onSetLocalSuccess(pc) {
  console.log(getName(pc) + ' setLocalDescription complete');
}

function onSetRemoteSuccess(pc) {
  console.log(getName(pc) + ' setRemoteDescription complete');
}

function onSetSessionDescriptionError(error) {
  console.log('Failed to set session description: ' + error.toString());
}

function gotRemoteStream(e) {
  var stream = e.stream;
  var remoteScreenStream = new MediaStream();

  var screenTrack = stream.getVideoTracks()[1];
  remoteScreenStream.addTrack(screenTrack);
  stream.removeTrack(screenTrack)

  attachMediaStream(remoteVideo, stream);
  attachMediaStream(remoteScreen, remoteScreenStream);
}

function onCreateAnswerSuccess(desc) {
  console.log('Answer from pc2:\n' + desc.sdp);
  console.log('pc2 setLocalDescription start');
  pc2.setLocalDescription(desc).then(
    function() {
      onSetLocalSuccess(pc2);
    },
    onSetSessionDescriptionError
  );
  console.log('pc1 setRemoteDescription start');
  pc1.setRemoteDescription(desc).then(
    function() {
      onSetRemoteSuccess(pc1);
    },
    onSetSessionDescriptionError
  );
}

function onIceCandidate(pc, event) {
  getOtherPc(pc).addIceCandidate(event.candidate)
  .then(
    function() {
      onAddIceCandidateSuccess(pc);
    },
    function(err) {
      onAddIceCandidateError(pc, err);
    }
  );
  console.log(getName(pc) + ' ICE candidate: \n' + (event.candidate ?
      event.candidate.candidate : '(null)'));
}

function onAddIceCandidateSuccess(pc) {
  console.log(getName(pc) + ' addIceCandidate success');
}

function onAddIceCandidateError(pc, error) {
  console.log(getName(pc) + ' failed to add ICE Candidate: ' + error.toString());
}

function onIceStateChange(pc, event) {
  if (pc) {
    console.log(getName(pc) + ' ICE state: ' + pc.iceConnectionState);
    console.log('ICE state change event: ', event);
  }
}

function hangup() {
  console.log('Ending call');
  pc1.close();
  pc2.close();
  pc1 = null;
  pc2 = null;
  hangupButton.disabled = true;
  callButton.disabled = false;
}
