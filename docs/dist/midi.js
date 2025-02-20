import {useEffect, useState} from "../_snowpack/pkg/react.js";
import {isNote} from "../_snowpack/pkg/tone.js";
import _WebMidi from "../_snowpack/pkg/webmidi.js";
import {Pattern as _Pattern} from "../_snowpack/link/strudel.js";
import * as Tone from "../_snowpack/pkg/tone.js";
const WebMidi = _WebMidi;
const Pattern = _Pattern;
export default function enableWebMidi() {
  return new Promise((resolve, reject) => {
    if (WebMidi.enabled) {
      resolve(WebMidi);
      return;
    }
    WebMidi.enable((err) => {
      if (err) {
        reject(err);
      }
      resolve(WebMidi);
    });
  });
}
const outputByName = (name) => WebMidi.getOutputByName(name);
Pattern.prototype.midi = function(output, channel = 1) {
  if (output?.constructor?.name === "Pattern") {
    throw new Error(`.midi does not accept Pattern input. Make sure to pass device name with single quotes. Example: .midi('${WebMidi.outputs?.[0]?.name || "IAC Driver Bus 1"}')`);
  }
  return this._withEvent((event) => {
    const onTrigger = (time, event2) => {
      let note = event2.value;
      const velocity = event2.context?.velocity ?? 0.9;
      if (!isNote(note)) {
        throw new Error("not a note: " + note);
      }
      if (!WebMidi.enabled) {
        throw new Error(`🎹 WebMidi is not enabled. Supported Browsers: https://caniuse.com/?search=webmidi`);
      }
      if (!WebMidi.outputs.length) {
        throw new Error(`🔌 No MIDI devices found. Connect a device or enable IAC Driver.`);
      }
      const device = output ? outputByName(output) : WebMidi.outputs[0];
      if (!device) {
        throw new Error(`🔌 MIDI device '${output ? output : ""}' not found. Use one of ${WebMidi.outputs.map((o) => `'${o.name}'`).join(" | ")}`);
      }
      const timingOffset = WebMidi.time - Tone.context.currentTime * 1e3;
      time = time * 1e3 + timingOffset;
      device.playNote(note, channel, {
        time,
        duration: event2.duration * 1e3 - 5,
        velocity
      });
    };
    return event.setContext({...event.context, onTrigger});
  });
};
export function useWebMidi(props) {
  const {ready, connected, disconnected} = props;
  const [loading, setLoading] = useState(true);
  const [outputs, setOutputs] = useState(WebMidi?.outputs || []);
  useEffect(() => {
    enableWebMidi().then(() => {
      WebMidi.addListener("connected", (e) => {
        setOutputs([...WebMidi.outputs]);
        connected?.(WebMidi, e);
      });
      WebMidi.addListener("disconnected", (e) => {
        setOutputs([...WebMidi.outputs]);
        disconnected?.(WebMidi, e);
      });
      ready?.(WebMidi);
      setLoading(false);
    }).catch((err) => {
      if (err) {
        console.warn("Web Midi could not be enabled..");
        return;
      }
    });
  }, [ready, connected, disconnected, outputs]);
  const outputByName2 = (name) => WebMidi.getOutputByName(name);
  return {loading, outputs, outputByName: outputByName2};
}
