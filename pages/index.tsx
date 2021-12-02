import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import React, {
  MouseEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { Map, MapItem } from "../lib/map";
import YAML from "yaml";
import MapContainer from "../lib/mapcontainer";
import ReactMarkdown from "react-markdown";
import Portal from "../lib/usePortal";
import { AppBar, Button, Toolbar, Typography } from "@mui/material";

const Home: NextPage = () => {
  const [back, setBack] = useState<Map[]>([]);
  const [details, setDetails] = useState<Map | null>(null);
  const [loading, setLoading] = useState(true);
  const svgEl = useRef<SVGGraphicsElement | null>(null);
  const svgPt = useRef<SVGPoint | null>(null);
  const mapContainer = useRef<MapContainer | null>(null);

  useEffect(() => {
    fetch("/_map.yaml")
      .then((resp) => resp.text())
      .then((txt) => YAML.parse(txt))
      .then((obj) => setDetails(obj));
  }, []);

  const onStartLoad = useCallback(() => {
    setLoading(true);
    mapContainer.current?.pause();
  }, []);
  const onLoad = useCallback(() => {
    setLoading(false);
    mapContainer.current?.start();
  }, []);

  useEffect(() => {
    if (!details) return;

    if (!mapContainer.current) {
      mapContainer.current = new MapContainer(
        details,
        onStartLoad,
        onLoad,
        true
      );
    } else {
      mapContainer.current.loadNewMap(details);
    }
  }, [details, onLoad, onStartLoad]);

  const getCursorPt = useCallback(
    (evt: React.MouseEvent): { x: number; y: number } | null => {
      const pt = svgPt.current;
      const svg = svgEl.current;
      if (!pt || !svg) return null;

      pt.x = evt.clientX;
      pt.y = evt.clientY;
      const cursorpt = pt.matrixTransform(svg.getScreenCTM()?.inverse());
      return { x: cursorpt.x, y: cursorpt.y };
    },
    []
  );

  const onMouseMove: MouseEventHandler<SVGSVGElement> = useCallback(
    (evt) => {
      const cursorpt = getCursorPt(evt);
      if (cursorpt && mapContainer.current) {
        mapContainer.current.updatePosition(cursorpt.x, cursorpt.y);
      }
    },
    [getCursorPt]
  );

  const onClick = useCallback(
    (item: MapItem) => {
      console.log(`Clicked item ${item.name}`);
      const submap = mapContainer.current?.clickItem(item);
      if (submap && details) {
        setBack((back) => [...back, details]);
        setDetails(submap);
      }
    },
    [details]
  );

  const onDebugClick: MouseEventHandler<SVGSVGElement> = useCallback(
    (evt) => {
      const cursorpt = getCursorPt(evt);
      if (cursorpt) {
        console.log("Clicked on canvas:", cursorpt);
      }
    },
    [getCursorPt]
  );

  const onBack = useCallback(() => {
    if (back.length > 0) {
      setDetails(back[back.length - 1]);
      setBack((back) => back.slice(0, back.length - 1));
    }
  }, [back]);

  return (
    <div>
      <Head>
        <title>Final Project</title>
      </Head>
      <AppBar>
        <Toolbar>
          <Typography variant="h4" sx={{flexGrow: 1}}>Stanford Sonic Map</Typography>
        </Toolbar>
      </AppBar>
      <div>
        <Button
          onClick={() => mapContainer.current?.start()}
          variant="contained"
        >
          Start
        </Button>
      </div>
      <div>{loading && "Loading..."}</div>
      {/* <pre>{JSON.stringify(details, null, 2)}</pre> */}
      <div>{back.length > 0 && <button onClick={onBack}>Back</button>}</div>
      <div>
        {details && (
          <svg
            style={{ position: "relative", userSelect: "none" }}
            width={1000}
            height={1000}
            viewBox={`0 0 ${details.width_base} ${details.height_base}`}
            ref={(el) => {
              svgPt.current = el?.createSVGPoint() ?? null;
              svgEl.current = el;
            }}
            onMouseMove={onMouseMove}
            onDoubleClick={onDebugClick}
          >
            <image
              href={details.image}
              width={details.width_base}
              height={details.height_base}
              opacity={0.8}
            />
            {details.items.map((item) => (
              <ItemEl
                key={item.name}
                item={item}
                map={details}
                onClick={() => onClick(item)}
              />
            ))}
          </svg>
        )}
      </div>
    </div>
  );
};

const ItemEl = ({
  item,
  map,
  onClick,
}: {
  item: MapItem;
  map: Map;
  onClick: (item: MapItem) => void;
}) => {
  const width = (map.width_base / 50) * item.size;
  const height = (map.height_base / 50) * item.size;

  const Base = item.icon ? "image" : "rect";
  const extra = item.icon ? { href: item.icon } : {};

  const x = item.x - width / 2 + ((item.offset_x ?? 0) / item.size) * width;
  const y = item.z - height / 2 + ((item.offset_y ?? 0) / item.size) * height;

  const [tooltipShown, setTooltip] = useState(false);

  const [mouseLoc, setMouseLoc] = useState({ x: 0, y: 0 });

  const md = useMemo(
    () => <ReactMarkdown>{item.details}</ReactMarkdown>,
    [item]
  );

  return (
    <Base
      x={x}
      y={y}
      width={width}
      height={height}
      fill="black"
      onClick={() => onClick(item)}
      style={{ cursor: item.click ? "pointer" : "help" }}
      onMouseEnter={() => setTooltip(true)}
      onMouseLeave={() => setTooltip(false)}
      onMouseMove={(evt) => setMouseLoc({ x: evt.clientX, y: evt.clientY })}
      {...extra}
    >
      <Portal>
        {tooltipShown && (
          <div
            style={{
              position: "fixed",
              top: mouseLoc.y + 20,
              left: mouseLoc.x,
              background: "white",
              padding: "10px",
              opacity: 0.7,
            }}
          >
            {md}
          </div>
        )}
      </Portal>
    </Base>
  );
};
export default Home;
