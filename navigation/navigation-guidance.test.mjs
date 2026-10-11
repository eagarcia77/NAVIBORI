import test from "node:test";
import assert from "node:assert/strict";
import { localeFromLanguage, navigationText, formatDistance, formatSpeed } from "./navigation-guidance.js";
test("Spanish device locale",()=>assert.equal(localeFromLanguage("es-PR"),"es"));
test("English device locale",()=>assert.equal(localeFromLanguage("en-US"),"en"));
test("translated turn directions",()=>{assert.equal(navigationText("left","es-PR"),"Gira a la izquierda");assert.equal(navigationText("left","en-US"),"Turn left");});
test("metric and imperial distance",()=>{assert.equal(formatDistance(100,"es","metric"),"100 m");assert.match(formatDistance(1609.344,"en","imperial"),/1 mi/);});
test("speed conversion",()=>{assert.equal(formatSpeed(10,"es","metric"),"36 km/h");assert.equal(formatSpeed(10,"en","imperial"),"22 mph");});
test("unknown speed is not fabricated",()=>assert.equal(formatSpeed(null),"—"));
