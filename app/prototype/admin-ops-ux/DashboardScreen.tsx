"use client";

import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";

import {
  ACCESS_MOCK,
  SALES_7D,
  TOP_CUSTOMERS,
  formatBRL,
} from "./mock-data";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

function salesOption(): EChartsOption {
  return {
    color: ["#7BA82F", "#E85A5A", "#1B6BB5"],
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (v) =>
        typeof v === "number"
          ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
          : String(v),
    },
    legend: {
      data: ["Sacolinha", "Entrega", "Balcão"],
      bottom: 0,
      textStyle: { fontSize: 12 },
    },
    grid: { left: 48, right: 16, top: 24, bottom: 48 },
    xAxis: {
      type: "category",
      data: SALES_7D.map((d) => d.day),
      axisTick: { alignWithLabel: true },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { type: "dashed", opacity: 0.4 } },
    },
    series: [
      {
        name: "Sacolinha",
        type: "bar",
        stack: "total",
        barWidth: "48%",
        emphasis: { focus: "series" },
        data: SALES_7D.map((d) => d.sacolinha),
      },
      {
        name: "Entrega",
        type: "bar",
        stack: "total",
        emphasis: { focus: "series" },
        data: SALES_7D.map((d) => d.entrega),
      },
      {
        name: "Balcão",
        type: "bar",
        stack: "total",
        emphasis: { focus: "series" },
        data: SALES_7D.map((d) => d.balcao),
      },
    ],
  };
}

function accessOption(): EChartsOption {
  return {
    color: ["#1B6BB5"],
    tooltip: { trigger: "axis" },
    grid: { left: 40, right: 16, top: 24, bottom: 32 },
    xAxis: {
      type: "category",
      data: ACCESS_MOCK.map((d) => d.day),
      boundaryGap: false,
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { type: "dashed", opacity: 0.4 } },
    },
    series: [
      {
        name: "Acessos",
        type: "line",
        smooth: true,
        symbolSize: 8,
        areaStyle: { opacity: 0.15 },
        data: ACCESS_MOCK.map((d) => d.value),
      },
    ],
  };
}

function channelPieOption(): EChartsOption {
  const totals = SALES_7D.reduce(
    (acc, d) => ({
      sacolinha: acc.sacolinha + d.sacolinha,
      entrega: acc.entrega + d.entrega,
      balcao: acc.balcao + d.balcao,
    }),
    { sacolinha: 0, entrega: 0, balcao: 0 },
  );
  return {
    color: ["#7BA82F", "#E85A5A", "#1B6BB5"],
    tooltip: { trigger: "item", valueFormatter: (v) => `R$ ${v}` },
    legend: { bottom: 0, textStyle: { fontSize: 12 } },
    series: [
      {
        type: "pie",
        radius: ["42%", "68%"],
        center: ["50%", "46%"],
        label: { formatter: "{b}\n{d}%" },
        data: [
          { name: "Sacolinha", value: totals.sacolinha },
          { name: "Entrega", value: totals.entrega },
          { name: "Balcão", value: totals.balcao },
        ],
      },
    ],
  };
}

export function DashboardScreen() {
  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-28">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Painel
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ECharts · hover nas séries · acessos mock
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Vendas hoje", value: "R$ 1.560" },
          { label: "Pedidos Pagos", value: "4" },
          { label: "Holds ativos", value: "3" },
          { label: "Sacolinha", value: "2" },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-medium text-[var(--brand-green)]">
              {k.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">
              {k.value}
            </p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="mb-1 text-base font-semibold">
          Vendas · 7 dias por canal
        </h2>
        <p className="mb-2 text-sm text-muted-foreground">
          Barras empilhadas — passe o mouse para detalhar
        </p>
        <ReactECharts
          option={salesOption()}
          style={{ height: 320, width: "100%" }}
          opts={{ renderer: "canvas" }}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="mb-1 text-base font-semibold">
            Mix de canais (7d)
          </h2>
          <ReactECharts
            option={channelPieOption()}
            style={{ height: 280, width: "100%" }}
          />
        </section>
        <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="mb-1 text-base font-semibold">
            Acessos · 7 dias{" "}
            <span className="text-xs font-normal text-muted-foreground">
              (mock)
            </span>
          </h2>
          <ReactECharts
            option={accessOption()}
            style={{ height: 280, width: "100%" }}
          />
        </section>
      </div>

      <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-semibold">Top clientes</h2>
        <ul className="divide-y divide-border">
          {TOP_CUSTOMERS.map((c) => (
            <li
              key={c.name}
              className="flex items-center justify-between gap-3 py-3 text-sm"
            >
              <span className="font-medium">{c.name}</span>
              <span className="text-muted-foreground">
                {c.orders} pedidos · {formatBRL(c.totalCents)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
