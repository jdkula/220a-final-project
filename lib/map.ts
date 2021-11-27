type URL = string;
type Markdown = string;

export interface Map {
    image: URL
    width_base: number
    height_base: number
    items: MapItem[]
}

export interface MapItem {
    name: string
    details: Markdown
    icon: null | URL

    click: null | 'play' | 'submap'
    submap: null | Map

    sound: {
        url: URL
        loop: boolean
        autostart: boolean
    }
    volume: number
    x: number
    z: number
    elevation: null | number
    range: number
}