let tCommand = {};

function sendCommand(command) {
  Bluetooth.println("");
  Bluetooth.println(JSON.stringify({t: "music", n: command}));
  if (command in tCommand) clearTimeout(tCommand[command]);
  tCommand[command] = setTimeout(() => delete tCommand[command], 200);
}

exports = {
  play: () => sendCommand("play"),
  pause: () => sendCommand("pause"),
  togglePlay: () => sendCommand("playpause"),
  next: () => sendCommand("next"),
  prev: () => sendCommand("previous"),
  volumeUp: () => sendCommand("volumeup"),
  volumeDown: () => sendCommand("volumedown")
};