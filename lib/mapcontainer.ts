import fetchAndDecode from "./fetchAndDecode";
import { Map, MapItem } from "./map";

export default class MapContainer {
  private _audioCtx: AudioContext;
  private _map: Map;
  private _sources: { [name: string]: AudioBufferSourceNode };
  private _panners: { [name: string]: PannerNode };
  private _buffers: { [url: string]: AudioBuffer };

  private _my_x = 100000;
  private _my_z = 100000;

  constructor(map: Map) {
    this._audioCtx = new AudioContext();
    this._map = map;
    this._sources = {};
    this._panners = {};
    this._buffers = {};

    this.load_new_map(map);
  }

  _unload_map() {
    for (const item of this._map.items) {
      const source = this._sources[item.name];
      const panner = this._panners[item.name];
      if (source) {
        source.stop();
        source.disconnect();
      }
      if (panner) {
        panner.disconnect();
      }
      delete this._sources[item.name];
      delete this._panners[item.name];
    }
  }

  _setup_item(item: MapItem, buffer: AudioBuffer) {
    const set = new Set<AudioNode>();
    const source = this._audioCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = item.sound.loop;

    if (item.sound.autostart) {
      source.start();
    }

    const panner = this._audioCtx.createPanner();
    panner.panningModel = "HRTF";
    panner.positionY.value = item.elevation ?? 0;
    panner.refDistance = 0.05;
    panner.rolloffFactor = 8;
    panner.connect(this._audioCtx.destination);

    set.add(panner);
    source.connect(panner);
    this._panners[item.name] = panner;
    this._sources[item.name] = source;
    this._buffers[item.sound.url] = buffer;
  }

  load_new_map(map: Map) {
    this._unload_map();

    this._map = map;

    const promises = [];
    for (const item of map.items) {
      let prom;
      if (!this._buffers[item.sound.url]) {
        prom = fetchAndDecode(this._audioCtx, item.sound.url).then((buffer) =>
          this._setup_item(item, buffer)
        );
      } else {
        prom = (async () => {
          this._setup_item(item, this._buffers[item.sound.url]);
        })();
      }

      promises.push(prom);
    }

    Promise.all(promises).then(() =>
      this.update_my_position(100000, 100000)
    );
  }

  update_my_position(x: number, z: number) {
    this._my_x = x;
    this._my_z = z;

    for (const item of this._map.items) {
      const panner = this._panners[item.name];
      panner.positionX.value = item.x - this._my_x;
      panner.positionZ.value = item.z - this._my_z;
    }
  }
}
