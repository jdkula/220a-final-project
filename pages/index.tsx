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
import {
  AppBar,
  Button,
  Card,
  Collapse,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fade,
  IconButton,
  LinearProgress,
  Link,
  Toolbar,
  Typography,
} from "@mui/material";
import { Box } from "@mui/system";
import { ChevronLeft, Info, Pause, PlayArrow } from "@mui/icons-material";
import { createPopper } from "@popperjs/core/lib/createPopper";
import { VirtualElement } from "@popperjs/core";
import { usePopper } from "react-popper";

const Home: NextPage = () => {
  const [back, setBack] = useState<Map[]>([]);
  const [details, setDetails] = useState<Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [isPaused, setPaused] = useState(true);
  const svgEl = useRef<SVGGraphicsElement | null>(null);
  const svgPt = useRef<SVGPoint | null>(null);
  const mapContainer = useRef<MapContainer | null>(null);

  useEffect(() => {
    fetch("/_map.yaml")
      .then((resp) => resp.text())
      .then((txt) => YAML.parse(txt))
      .then((obj) => setDetails(obj));
  }, []);

  const onPause = useCallback(() => {
    mapContainer.current?.pause();
    setPaused(true);
  }, []);
  const onResume = useCallback(() => {
    mapContainer.current?.start();
    setPaused(mapContainer.current?.audioCtx.state !== "running");
    setTimeout(
      () => setPaused(mapContainer.current?.audioCtx.state !== "running"),
      50
    );
  }, []);

  const onStartLoad = useCallback(() => {
    setLoading(true);
    onPause();
  }, [onPause]);
  const onLoad = useCallback(() => {
    setLoading(false);
    onResume();
  }, [onResume]);

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
        // fade through transitions
        setHidden(true);
        setTimeout(() => {
          setBack((back) => [...back, details]);
          setDetails(submap);
        }, 100);
        setTimeout(() => setHidden(false), 500);
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
      setHidden(true);
      setTimeout(() => {
        setDetails(back[back.length - 1]);
        setBack((back) => back.slice(0, back.length - 1));
      }, 100);
      setTimeout(() => setHidden(false), 500);
    }
  }, [back]);

  return (
    <div>
      <Head>
        <title>Final Project</title>
      </Head>
      <AppBar position="sticky">
        <Toolbar>
          <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
            Stanford Sonic Map
          </Typography>
          <Box sx={{ margin: 1 }}>
            {back.length > 0 && (
              <Button
                onClick={onBack}
                color="inherit"
                sx={{ color: "white" }}
                startIcon={<ChevronLeft />}
              >
                Back
              </Button>
            )}
          </Box>
          <Button
            onClick={isPaused ? onResume : onPause}
            variant="contained"
            disabled={loading}
            color="secondary"
            startIcon={loading ? undefined : isPaused ? <PlayArrow /> : <Pause />}
          >
            {loading ? "Loading..." : isPaused ? "Play" : "Pause"}
          </Button>
          <IconButton
            sx={{ marginLeft: 2, color: "white" }}
            color="default"
            onClick={() => setShowInfo(true)}
          >
            <Info />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Dialog open={showInfo} onClose={() => setShowInfo(false)} maxWidth="md">
        <DialogTitle>Information</DialogTitle>
        <DialogContent
          dividers
          sx={{ height: "100%", display: "flex", flexDirection: "column" }}
        >
          <Typography paragraph>
            <strong>Stanford Sonic Map</strong>, created by Jonathan Kula for
            CCRMA’s Music 220A class.
          </Typography>
          <Typography paragraph>
            Sounds were recorded on a Zoom H2n microphone around campus.
          </Typography>
          <Typography paragraph>
            Plug in headphones, and move your mouse around the page– you’ll hear
            the sounds of Stanford’s campus encoded binaurally around you. Mouse
            over the icons to get some more information about each location and
            recording!
          </Typography>
          <Typography paragraph>
            This application is fully modular; you can create your own maps for
            it. The{" "}
            <Link href="/_map.yaml" target="_blank">
              current map
            </Link>{" "}
            is displayed below:
          </Typography>
          <Card
            elevation={2}
            sx={{
              overflow: "scroll",
              flex: 1,
              background: "#222",
              color: "#ddd",
              padding: 3,
            }}
          >
            <ReactMarkdown>{`
\`\`\`
${YAML.stringify(details ?? null, { indent: 2 })}
\`\`\`
`}</ReactMarkdown>
          </Card>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowInfo(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Collapse in={loading} sx={{ marginBottom: 1 }}>
        <LinearProgress sx={{ width: "100%" }} />
      </Collapse>
      <Container
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Fade in={!!details && !loading && !hidden}>
          <Card variant="elevation" elevation={10}>
            {details && (
              <div
                style={{
                  width:
                    (1000 -
                      ((details.crop_left ?? 0) + (details.crop_right ?? 0)) *
                        1000) *
                    (details.scale ?? 1),
                  height:
                    (1000 -
                      ((details.crop_top ?? 0) + (details.crop_bottom ?? 0)) *
                        1000) *
                    (details.scale ?? 1),
                  overflow: "none",
                }}
              >
                <svg
                  style={{
                    position: "relative",
                    userSelect: "none",
                    width: 1000 * (details.scale ?? 1),
                    height: 1000 * (details.scale ?? 1),
                    top: (details.crop_top ?? 0) * -1000 * (details.scale ?? 1),
                    left:
                      (details.crop_left ?? 0) * -1000 * (details.scale ?? 1),
                    right:
                      (details.crop_right ?? 0) * -1000 * (details.scale ?? 1),
                    bottom:
                      (details.crop_bottom ?? 0) * -1000 * (details.scale ?? 1),
                  }}
                  viewBox={`0 0 1 1`}
                  ref={(el) => {
                    svgPt.current = el?.createSVGPoint() ?? null;
                    svgEl.current = el;
                  }}
                  onMouseMove={onMouseMove}
                  onDoubleClick={onDebugClick}
                >
                  <image
                    href={details.image}
                    width={1}
                    height={1}
                    opacity={0.8}
                  />
                  {(details.items ?? []).map((item) => (
                    <ItemEl
                      key={item.name}
                      item={item}
                      map={details}
                      onClick={() => onClick(item)}
                    />
                  ))}
                </svg>
              </div>
            )}
          </Card>
        </Fade>
      </Container>
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
  const width = ((1 / 50) * (item.size ?? 1)) / (map.scale ?? 1);
  const height = ((1 / 50) * (item.size ?? 1)) / (map.scale ?? 1);

  const Base = item.icon ? "image" : "rect";
  const extra = item.icon ? { href: item.icon } : {};

  const x =
    item.x - width / 2 + ((item.offset_x ?? 0) / (item.size ?? 1)) * width;
  const y =
    item.z - height / 2 + ((item.offset_y ?? 0) / (item.size ?? 1)) * height;

  const [tooltipShown, setTooltip] = useState(false);
  const [mouseLoc, setMouseLoc] = useState({ x: 0, y: 0 });
  const [popperEl, setPopperEl] = useState<HTMLElement | null>(null);

  const md = useMemo(
    () => <ReactMarkdown>{item.details ?? ""}</ReactMarkdown>,
    [item]
  );

  const ve: VirtualElement = useMemo(
    () => ({
      getBoundingClientRect: () =>
        ({
          top: mouseLoc.y,
          left: mouseLoc.x,
          bottom: mouseLoc.y,
          right: mouseLoc.x,
          width: 0,
          height: 0,
        } as unknown as DOMRect),
    }),
    [mouseLoc]
  );

  const { styles, attributes } = usePopper(ve, popperEl, {
    strategy: "fixed",
    placement: "bottom-start",
  });

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
        <Fade in={tooltipShown}>
          <Card
            elevation={4}
            sx={{
              position: "fixed",
              margin: 2,
              background: "white",
              padding: "10px",
              opacity: 0.7,
              maxWidth: "30vw",
            }}
            ref={setPopperEl}
            style={styles.popper}
            {...attributes.popper}
          >
            {md}
          </Card>
        </Fade>
      </Portal>
    </Base>
  );
};
export default Home;
