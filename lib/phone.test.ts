import { describe, expect, it } from "vitest";

import {
  digitsOnlyPhone,
  formatPhoneBr,
  formatPhoneBrDisplay,
} from "@/lib/phone";

describe("digitsOnlyPhone", () => {
  it("remove máscara e espaços", () => {
    expect(digitsOnlyPhone("(45) 99131-6435")).toBe("45991316435");
    expect(digitsOnlyPhone("45 99999-9999")).toBe("45999999999");
  });
});

describe("formatPhoneBr", () => {
  it("formata celular 11 dígitos", () => {
    expect(formatPhoneBr("45991316435")).toBe("(45) 99131-6435");
  });

  it("formata fixo 10 dígitos", () => {
    expect(formatPhoneBr("4530334455")).toBe("(45) 3033-4455");
  });

  it("máscara progressiva enquanto digita", () => {
    expect(formatPhoneBr("4")).toBe("(4");
    expect(formatPhoneBr("45")).toBe("(45");
    expect(formatPhoneBr("459")).toBe("(45) 9");
    expect(formatPhoneBr("4599")).toBe("(45) 99");
    expect(formatPhoneBr("459999")).toBe("(45) 9999");
    expect(formatPhoneBr("4599999")).toBe("(45) 9999-9");
    expect(formatPhoneBr("4599999999")).toBe("(45) 9999-9999");
    expect(formatPhoneBr("45999999999")).toBe("(45) 99999-9999");
  });

  it("corta além de 11 dígitos", () => {
    expect(formatPhoneBr("459999999991234")).toBe("(45) 99999-9999");
  });

  it("aceita valor já mascarado", () => {
    expect(formatPhoneBr("(45) 99999-9999")).toBe("(45) 99999-9999");
  });
});

describe("formatPhoneBrDisplay", () => {
  it("espelha formatPhoneBr para display", () => {
    expect(formatPhoneBrDisplay("45991316435")).toBe("(45) 99131-6435");
    expect(formatPhoneBrDisplay("")).toBe("");
  });
});
