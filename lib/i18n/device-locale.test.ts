import {describe,expect,it} from "vitest";
import {
  normalizeLocaleCandidate,
  resolveActiveNaviboriLocale,
  resolveNaviboriLocale
} from "./device-locale";

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

  it("prefers the peripheral locale over the browser language",()=>{
    expect(
      resolveActiveNaviboriLocale(["es-PR"],"en-US")
    ).toMatchObject({
      language:"en",
      locale:"en-US",
      speechLocale:"en-US",
      valhallaLocale:"en-US"
    });
  });

  it("ignores an invalid peripheral locale and keeps the browser language",()=>{
    expect(
      resolveActiveNaviboriLocale(["en-US"],"not_a_locale_@@")
    ).toMatchObject({
      language:"en",
      locale:"en-US"
    });
    expect(normalizeLocaleCandidate("not_a_locale_@@")).toBeNull();
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
