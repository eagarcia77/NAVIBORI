import { describe, expect, it } from "vitest";
import { getCommerceOpenState } from "./hours";
import type { CommerceHours } from "./types";

const hours: CommerceHours[] = [
  {day:"mon",opens:"09:00",closes:"17:00",closed:false}
];

describe("Commerce hours",()=>{
  it("reports open inside business hours",()=>{
    const date=new Date("2026-10-05T10:00:00");
    expect(getCommerceOpenState(hours,date).open).toBe(true);
  });

  it("reports closed outside business hours",()=>{
    const date=new Date("2026-10-05T18:00:00");
    expect(getCommerceOpenState(hours,date).open).toBe(false);
  });
});
