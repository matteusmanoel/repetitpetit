import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildStructuredAddressQuery,
  geocodeCep,
} from "@/lib/cep-geocode";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("buildStructuredAddressQuery", () => {
  it("usa rua + bairro + cidade (nunca só município)", () => {
    expect(
      buildStructuredAddressQuery({
        postalCode: "85851100",
        street: "Rua Tarobá",
        complement: "",
        neighborhood: "Centro",
        city: "Foz do Iguaçu",
        state: "PR",
      }),
    ).toBe("Rua Tarobá, Centro, Foz do Iguaçu, PR, Brasil");
  });

  it("aceita bairro sem rua", () => {
    expect(
      buildStructuredAddressQuery({
        postalCode: "85857000",
        street: "",
        complement: "",
        neighborhood: "Vila Portes",
        city: "Foz do Iguaçu",
        state: "PR",
      }),
    ).toBe("Vila Portes, Foz do Iguaçu, PR, Brasil");
  });

  it("recusa só município (anti centro-município)", () => {
    expect(
      buildStructuredAddressQuery({
        postalCode: "85851000",
        street: "  ",
        complement: "",
        neighborhood: "",
        city: "Foz do Iguaçu",
        state: "PR",
      }),
    ).toBeNull();
  });
});

describe("geocodeCep", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("rejeita CEP inválido", async () => {
    const result = await geocodeCep("123");
    expect(result).toEqual({ ok: false, reason: "invalid_cep" });
  });

  it("resolve via Nominatim postalcode", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse([{ lat: "-25.5163", lon: "-54.5855" }]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await geocodeCep("85851-207");
    expect(result).toEqual({
      ok: true,
      source: "nominatim",
      coords: { latitude: -25.5163, longitude: -54.5855 },
    });

    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain("nominatim.openstreetmap.org");
    expect(url).toContain("postalcode=85851-207");
  });

  it("usa Photon com lang=en quando Nominatim vem vazio", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("nominatim.openstreetmap.org")) {
        return jsonResponse([]);
      }
      if (url.includes("photon.komoot.io")) {
        expect(url).toContain("lang=en");
        expect(url).not.toContain("lang=pt");
        return jsonResponse({
          features: [
            {
              geometry: { coordinates: [-54.58, -25.52] },
            },
          ],
        });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await geocodeCep("85851100");
    expect(result).toEqual({
      ok: true,
      source: "photon",
      coords: { latitude: -25.52, longitude: -54.58 },
    });
  });

  it("Photon HTTP 400 (ex. lang inválido) cai no ViaCEP estruturado", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("nominatim.openstreetmap.org") && url.includes("postalcode=")) {
        return jsonResponse([]);
      }
      if (url.includes("photon.komoot.io") && url.includes("85851-100")) {
        return jsonResponse({ message: "lang invalid" }, 400);
      }
      if (url.includes("viacep.com.br")) {
        return jsonResponse({
          cep: "85851-100",
          logradouro: "Rua Tarobá",
          bairro: "Centro",
          localidade: "Foz do Iguaçu",
          uf: "PR",
        });
      }
      if (url.includes("nominatim.openstreetmap.org") && url.includes("q=")) {
        expect(url).toContain("Tarob");
        expect(url).toContain("Foz");
        return jsonResponse([{ lat: "-25.547", lon: "-54.588" }]);
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await geocodeCep("85851100");
    expect(result).toEqual({
      ok: true,
      source: "nominatim",
      coords: { latitude: -25.547, longitude: -54.588 },
    });
  });

  it("estrutura ViaCEP → Photon quando Nominatim estruturado falha", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("nominatim.openstreetmap.org")) {
        return jsonResponse([]);
      }
      if (url.includes("photon.komoot.io") && url.includes("85857-000")) {
        return jsonResponse({ features: [] });
      }
      if (url.includes("viacep.com.br")) {
        return jsonResponse({
          cep: "85857-000",
          logradouro: "",
          bairro: "Vila Portes",
          localidade: "Foz do Iguaçu",
          uf: "PR",
        });
      }
      if (url.includes("photon.komoot.io")) {
        expect(url).toContain("lang=en");
        expect(url).toContain("Vila");
        expect(url).toContain("Portes");
        return jsonResponse({
          features: [{ geometry: { coordinates: [-54.59, -25.53] } }],
        });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await geocodeCep("85857000");
    expect(result).toEqual({
      ok: true,
      source: "photon",
      coords: { latitude: -25.53, longitude: -54.59 },
    });
  });

  it("não geocodifica só município quando ViaCEP não tem rua/bairro", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("nominatim.openstreetmap.org")) {
        return jsonResponse([]);
      }
      if (url.includes("photon.komoot.io")) {
        return jsonResponse({ features: [] });
      }
      if (url.includes("viacep.com.br")) {
        return jsonResponse({
          cep: "85851-000",
          logradouro: "",
          bairro: "",
          localidade: "Foz do Iguaçu",
          uf: "PR",
        });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await geocodeCep("85851000");
    expect(result).toEqual({ ok: false, reason: "not_found" });
    // postalcode Nominatim + Photon CEP + ViaCEP — sem 2ª rodada estruturada
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).includes("nominatim.openstreetmap.org") &&
        String(input).includes("q="),
      ),
    ).toBe(false);
  });

  it("retorna network quando fetch lança", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("offline")),
    );

    const result = await geocodeCep("85851207");
    expect(result).toEqual({ ok: false, reason: "network" });
  });
});
