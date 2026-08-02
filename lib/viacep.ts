/**
 * Cliente ViaCEP — consulta CEP brasileiro e devolve endereço estruturado.
 * Sem gift_message / campos florais (reuse-map: copiar sem mudança).
 */

export type ViaCepAddress = {
  postalCode: string;
  street: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};

export type ViaCepResult =
  | { ok: true; address: ViaCepAddress }
  | { ok: false; reason: "invalid_cep" | "not_found" | "network" };

/** Normaliza CEP para 8 dígitos. */
export function normalizeCep(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 8 ? digits : null;
}

/**
 * Busca endereço no ViaCEP. Seguro para chamar do client (API pública).
 */
export async function fetchAddressByCep(rawCep: string): Promise<ViaCepResult> {
  const postalCode = normalizeCep(rawCep);

  if (!postalCode) {
    return { ok: false, reason: "invalid_cep" };
  }

  try {
    const response = await fetch(
      `https://viacep.com.br/ws/${postalCode}/json/`,
    );

    if (!response.ok) {
      return { ok: false, reason: "network" };
    }

    const data = (await response.json()) as {
      cep?: string;
      logradouro?: string;
      complemento?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
      erro?: boolean;
    };

    if (data.erro || !data.localidade || !data.uf) {
      return { ok: false, reason: "not_found" };
    }

    return {
      ok: true,
      address: {
        postalCode,
        street: data.logradouro ?? "",
        complement: data.complemento ?? "",
        neighborhood: data.bairro ?? "",
        city: data.localidade,
        state: data.uf.toUpperCase(),
      },
    };
  } catch {
    return { ok: false, reason: "network" };
  }
}
