import fetchAndDecode from "./fetchAndDecode";
import { Map, MapItem } from "./map";

export default class MapContainer {
  private _audioCtx: AudioContext;
  private _map: Map;
  private _sources: { [name: string]: AudioBufferSourceNode };
  private _panners: { [name: string]: PannerNode };
  private _gains: { [name: string]: GainNode };
  private _buffers: { [url: string]: AudioBuffer };
  private _items: { [name: string]: MapItem };

  private _myX = 100000;
  private _myZ = 100000;

  public onStartLoad: (() => void) | null = null;
  public onLoad: (() => void) | null = null;

  constructor(
    map: Map,
    onStartLoad?: () => void,
    onLoad?: () => void,
    paused = false
  ) {
    this._audioCtx = new AudioContext();
    this._map = map;
    this._sources = {};
    this._panners = {};
    this._buffers = {};
    this._gains = {};
    this._items = {};

    this.onStartLoad = onStartLoad ?? null;
    this.onLoad = onLoad ?? null;

    if (paused) {
      this.pause();
    }

    this.loadNewMap(map);
  }

  _unloadMap() {
    for (const item of this._map.items ?? []) {
      const source = this._sources[item.name];
      const panner = this._panners[item.name];
      const gain = this._gains[item.name];
      if (source) {
        try {
          source.stop();
        } catch (e) {
          // do nothing
        }
        source.disconnect();
      }
      if (panner) {
        panner.disconnect();
      }
      if (gain) {
        gain.disconnect();
      }
      delete this._sources[item.name];
      delete this._panners[item.name];
      delete this._gains[item.name];
    }
  }

  _setupItem(item: MapItem, buffer: AudioBuffer) {
    const set = new Set<AudioNode>();
    const source = this._audioCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = item.sound.loop;

    if (item.sound.autostart) {
      source.start();
    }

    const gain = this._audioCtx.createGain();
    gain.gain.value = item.volume ?? 1;

    const panner = this._audioCtx.createPanner();
    panner.panningModel = "HRTF";
    panner.positionY.value = item.elevation ?? 0;
    panner.refDistance = 0.05;
    panner.rolloffFactor = 6 * (1 / (item.range ?? 1));
    panner.connect(this._audioCtx.destination);

    set.add(panner);
    source.connect(gain);
    gain.connect(panner);
    this._panners[item.name] = panner;
    this._gains[item.name] = gain;
    this._sources[item.name] = source;
    this._buffers[item.sound.url] = buffer;
  }

  loadNewMap(map: Map) {
    this._unloadMap();
    this.onStartLoad?.();

    this._map = map;

    const promises = [];
    for (const item of map.items ?? []) {
      this._items[item.name] = item;
      let prom;
      if (!this._buffers[item.sound.url]) {
        prom = fetchAndDecode(this._audioCtx, item.sound.url).then((buffer) =>
          this._setupItem(item, buffer)
        );
      } else {
        prom = (async () => {
          this._setupItem(item, this._buffers[item.sound.url]);
        })();
      }

      promises.push(prom);
    }

    Promise.all(promises)
      .then(() => this.updatePosition(100000, 100000))
      .then(() => this.onLoad?.());
  }

  updatePosition(x: number, z: number) {
    this._myX = x;
    this._myZ = z;

    const distance_multiplier = (this._map.scale ?? 1) * (this._map.distance_multiplier ?? 1);

    for (const item of this._map.items ?? []) {
      const panner = this._panners[item.name];
      if (panner && panner.positionX && panner.positionZ) {
        panner.positionX.value = (item.x - this._myX) * distance_multiplier;
        panner.positionZ.value = (item.z - this._myZ) * distance_multiplier;
      }
    }
  }

  clickItem(item: MapItem): Map | null {
    if (item.click === "submap" && item.submap) {
      return item.submap;
    } else if (item.click === "trigger" && item.trigger) {
      const source = this._sources[item.trigger];
      try {
        source?.start();
      } catch (e) {
        source?.stop();
        const newSource = this._audioCtx.createBufferSource();
        newSource.buffer = source.buffer;
        newSource.loop = source.loop;

        if (this._items[item.trigger]?.sound.autostart) {
          newSource.start();
        }
        const gain = this._gains[item.trigger];
        if (gain) {
          newSource.connect(gain);
        }
        this._sources[item.trigger] = newSource;
      }
    }
    return null;
  }

  start() {
    this._audioCtx.resume();
  }

  pause() {
    this._audioCtx.suspend();
  }
}
