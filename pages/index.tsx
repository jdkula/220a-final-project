import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import {
  MouseEventHandler,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { Map } from "../lib/map";
import styles from "../styles/Home.module.css";
import YAML from "yaml";
import MapContainer from "../lib/mapcontainer";

const Home: NextPage = () => {
  const [details, setDetails] = useState<Map | null>(null);
  const svgEl = useRef<SVGGraphicsElement | null>(null);
  const svgPt = useRef<SVGPoint | null>(null);
  const mapConatiner = useRef<MapContainer | null>(null);

  useEffect(() => {
    fetch("/_map.yaml")
      .then((resp) => resp.text())
      .then((txt) => YAML.parse(txt))
      .then((obj) => setDetails(obj));
  }, []);

  useEffect(() => {
    if (!details) return;

    if (!mapConatiner.current) {
      mapConatiner.current = new MapContainer(details);
    } else {
      mapConatiner.current.load_new_map(details);
    }
  }, [details]);

  const onMouseMove: MouseEventHandler<SVGSVGElement> = useCallback((evt) => {
    const pt = svgPt.current;
    const svg = svgEl.current;
    if (!pt || !svg) return;

    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const cursorpt = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    if (mapConatiner.current) {
      mapConatiner.current.update_my_position(cursorpt.x, cursorpt.y);
    }
  }, []);

  return (
    <div>
      <Head>
        <title>Final Project</title>
      </Head>
      {/* <pre>{JSON.stringify(details, null, 2)}</pre> */}
      {details && (
        <svg
          style={{ position: "relative" }}
          width={1000}
          height={1000}
          viewBox={`0 0 ${details.width_base} ${details.height_base}`}
          ref={(el) => {
            svgPt.current = el?.createSVGPoint() ?? null;
            svgEl.current = el;
          }}
          onMouseMove={onMouseMove}
        >
          <image
            href={details.image}
            width={details.width_base}
            height={details.height_base}
            opacity={0.5}
          />
          {details.items.map((item) => (
            <rect
              key={item.name}
              x={item.x}
              y={item.z}
              width={details.width_base / 50}
              height={details.height_base / 50}
              fill="black"
            ></rect>
          ))}
        </svg>
      )}
    </div>
  );
};
export default Home;
