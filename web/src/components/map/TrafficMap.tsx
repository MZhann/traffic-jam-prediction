"use client";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Polyline, Tooltip } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { ALMATY_CENTER } from "@/lib/config";
import { scoreToColor, scoreLabel, type RoadTraffic } from "@/lib/traffic";

type Props = {
  roads: RoadTraffic[];
};

export default function TrafficMap({ roads }: Props) {
  return (
    <MapContainer
      center={ALMATY_CENTER}
      zoom={12}
      minZoom={10}
      maxZoom={17}
      scrollWheelZoom
      className="h-full w-full"
      style={{ background: "#f8fafc" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        subdomains={["a", "b", "c", "d"]}
        maxZoom={19}
      />
      {roads.map((road) => {
        const positions: LatLngExpression[] = road.coordinates.map(
          ([lng, lat]) => [lat, lng] as [number, number]
        );
        const color = scoreToColor(road.trafficScore);
        return (
          <Polyline
            key={road.roadSegmentId}
            positions={positions}
            pathOptions={{ color, weight: 6, opacity: 0.85 }}
          >
            <Tooltip sticky direction="top">
              <div className="text-xs">
                <div className="font-semibold">{road.name}</div>
                <div>
                  score:{" "}
                  <span style={{ color }}>
                    {road.trafficScore?.toFixed(1) ?? "—"}
                  </span>{" "}
                  ({scoreLabel(road.trafficScore)})
                </div>
              </div>
            </Tooltip>
          </Polyline>
        );
      })}
    </MapContainer>
  );
}
