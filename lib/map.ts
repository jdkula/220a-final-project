type URL = string;
type Markdown = string;
type Name = string;

export interface Map {
  image: URL;
  width_base: number;
  height_base: number;
  items: MapItem[];
}

export interface MapItem {
  name: Name;
  details: Markdown;
  icon: null | URL;

  click: null | "trigger" | "submap";
  submap: null | Map;
  trigger: null | Name;

  sound: {
    url: URL;
    loop: boolean;
    autostart: boolean;
  };
  volume: number;
  x: number;
  z: number;
  elevation: null | number;
  range: number;
    size: number;
    offset_x?: number;
    offset_y?: number;
}
