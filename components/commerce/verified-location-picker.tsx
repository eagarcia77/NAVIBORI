"use client";

import {useEffect,useRef,useState} from "react";
import * as maplibregl from "maplibre-gl";

const DEFAULT_CENTER:[number,number]=[-66.506,18.052];

export default function VerifiedLocationPicker({
  latitude,
  longitude,
  onChange
}:{
  latitude:string;
  longitude:string;
  onChange:(next:{latitude:string;longitude:string})=>void;
}){
  const mapNode=useRef<HTMLDivElement|null>(null);
  const mapRef=useRef<maplibregl.Map|null>(null);
  const markerRef=useRef<maplibregl.Marker|null>(null);
  const [status,setStatus]=useState("Toca el mapa o arrastra el pin para marcar la entrada pública.");

  const parsedLat=Number(latitude);
  const parsedLon=Number(longitude);
  const hasCoordinate=
    latitude.trim()!=="" &&
    longitude.trim()!=="" &&
    Number.isFinite(parsedLat) &&
    Number.isFinite(parsedLon) &&
    parsedLat>=-90 &&
    parsedLat<=90 &&
    parsedLon>=-180 &&
    parsedLon<=180;

  function commitCoordinate(lng:number,lat:number){
    onChange({
      latitude:lat.toFixed(6),
      longitude:lng.toFixed(6)
    });
  }

  useEffect(()=>{
    if(!mapNode.current || mapRef.current) return;

    const center:[number,number]=hasCoordinate
      ? [parsedLon,parsedLat]
      : DEFAULT_CENTER;

    const map=new maplibregl.Map({
      container:mapNode.current,
      style:{
        version:8,
        sources:{
          osm:{
            type:"raster",
            tiles:["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize:256,
            attribution:"© OpenStreetMap contributors"
          }
        },
        layers:[{
          id:"osm-raster",
          type:"raster",
          source:"osm",
          minzoom:0,
          maxzoom:20
        }]
      },
      center,
      zoom:hasCoordinate ? 18 : 15
    });

    map.addControl(new maplibregl.NavigationControl({showCompass:false}),"top-right");

    map.on("click",(event)=>{
      commitCoordinate(event.lngLat.lng,event.lngLat.lat);
      setStatus("Ubicación marcada. Confirma visualmente que el pin está en la entrada correcta.");
    });

    mapRef.current=map;
    return ()=>{
      markerRef.current?.remove();
      map.remove();
      mapRef.current=null;
    };
  },[]);

  useEffect(()=>{
    const map=mapRef.current;
    if(!map || !hasCoordinate) return;

    if(!markerRef.current){
      markerRef.current=new maplibregl.Marker({
        color:"#ff7a59",
        draggable:true
      })
        .setLngLat([parsedLon,parsedLat])
        .addTo(map);

      markerRef.current.on("dragend",()=>{
        const point=markerRef.current?.getLngLat();
        if(!point) return;
        commitCoordinate(point.lng,point.lat);
        setStatus("Pin movido. Verifica la entrada y marca Ubicación verificada cuando termines.");
      });
    }else{
      markerRef.current.setLngLat([parsedLon,parsedLat]);
    }
  },[hasCoordinate,parsedLat,parsedLon]);

  function useCurrentLocation(){
    if(!navigator.geolocation){
      setStatus("Este dispositivo no ofrece geolocalización.");
      return;
    }

    setStatus("Buscando tu ubicación actual…");
    navigator.geolocation.getCurrentPosition(
      (position)=>{
        const next={
          latitude:position.coords.latitude,
          longitude:position.coords.longitude
        };

        commitCoordinate(next.longitude,next.latitude);
        mapRef.current?.easeTo({
          center:[next.longitude,next.latitude],
          zoom:18,
          duration:650
        });

        setStatus(
          "GPS aplicado"+
          (Number.isFinite(position.coords.accuracy)
            ? " · precisión aproximada ±"+Math.round(position.coords.accuracy)+" m."
            : ".")
        );
      },
      ()=>{
        setStatus("No se pudo acceder a la ubicación. Verifica el permiso del navegador.");
      },
      {
        enableHighAccuracy:true,
        timeout:12000,
        maximumAge:5000
      }
    );
  }

  return (
    <div className="review-location-picker">
      <div className="review-location-picker-head">
        <div>
          <span>Pin exterior verificado</span>
          <strong>Marca la entrada que usará el GPS del cliente</strong>
        </div>
        <button type="button" onClick={useCurrentLocation}>
          Usar mi ubicación actual
        </button>
      </div>

      <div
        ref={mapNode}
        className="review-location-picker-map"
        aria-label="Mapa para marcar la entrada pública del comercio"
      />

      <small role="status">{status}</small>
    </div>
  );
}
