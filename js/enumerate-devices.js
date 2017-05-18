'use strict';

var getDevicesButton = document.querySelector('#enumerateDevices');
var clearButton = document.querySelector('#clear');
var info = document.querySelector('#info');

function updateMediaDevices() {
  const returnedPromise = navigator.mediaDevices.enumerateDevices()
  .then(function(devices){
    return devices.map(function(d) {
      console.log(d.label, d.kind, d.deviceId, d.groupId)
      return JSON.stringify(d);
    });
  });

  console.log("returnedPromise", returnedPromise);
  return returnedPromise;
}

getDevicesButton.onclick = function() {
  updateMediaDevices().then(function(stringifiedDevices) {
    info.innerHTML = stringifiedDevices.join('\n');
  })
};

clearButton.onclick = function() {
  info.innerHTML = ''
}
