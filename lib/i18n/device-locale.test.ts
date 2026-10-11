import {describe,expect,it} from "vitest";
import {resolveNaviboriLocale} from "./device-locale";

describe("device locale resolution",()=>{
  it("uses Puerto Rico Spanish directly",()=>{
    expect(resolveNaviboriLocale(["es-PR"])).toMatchObject({
      language:"es",
      locale:"es-PR",
      speechLocale:"es-PR",
      valhallaLocale:"es-PR"
    });
  });

  it("uses device English directly",()=>{
    expect(resolveNaviboriLocale(["en-US"])).toMatchObject({
      language:"en",
      locale:"en-US",
      speechLocale:"en-US",
      valhallaLocale:"en-US"
    });
  });

  it("falls back to Spanish copy for unsupported languages while preserving locale formatting",()=>{
    expect(resolveNaviboriLocale(["fr-FR"])).toMatchObject({
      language:"es",
      locale:"fr-FR",
      speechLocale:"es-PR",
      valhallaLocale:"es-ES"
    });
  });
});
