"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { EChartsOption } from "echarts";

import { formatPrice } from "@/features/catalog/format-price";
import { OPS_CHANNEL_LABELS } from "@/features/admin/dashboard/ops-channel";
import type { AdminDashboardCharts } from "@/features/admin/dashboard/types";
import { cn } from "@/lib/utils";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-[280px] items-center justify-center text-sm text-muted-foreground"
      role="status"
    >
      Carregando gráfico…
    </div>
  ),
});

const CHART_COLORS = ["#8EB038", "#EB5E5C", "#165DA4"] as const;

type RangeDays = 7 | 30;

function salesOption(
  series: AdminDashboardCharts["series7d"],
): EChartsOption {
  return {
    color: [...CHART_COLORS],
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (v) =>
        typeof v === "number" ? formatPrice(v) : String(v ?? ""),
    },
    legend: {
      data: [
        OPS_CHANNEL_LABELS.sacolinha,
        OPS_CHANNEL_LABELS.entrega,
        OPS_CHANNEL_LABELS.balcao,
      ],
      bottom: 0,
      textStyle: { fontSize: 12 },
    },
    grid: { left: 48, right: 16, top: 24, bottom: 48 },
    xAxis: {
      type: "category",
      data: series.map((d) => d.dayLabel),
      axisTick: { alignWithLabel: true },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { type: "dashed", opacity: 0.4 } },
    },
    series: [
      {
        name: OPS_CHANNEL_LABELS.sacolinha,
        type: "bar",
        stack: "total",
        barWidth: "48%",
        emphasis: { focus: "series" },
        data: series.map((d) => Number(d.sacolinha.toFixed(2))),
      },
      {
        name: OPS_CHANNEL_LABELS.entrega,
        type: "bar",
        stack: "total",
        emphasis: { focus: "series" },
        data: series.map((d) => Number(d.entrega.toFixed(2))),
      },
      {
        name: OPS_CHANNEL_LABELS.balcao,
        type: "bar",
        stack: "total",
        emphasis: { focus: "series" },
        data: series.map((d) => Number(d.balcao.toFixed(2))),
      },
    ],
  };
}

function channelPieOption(
  series: AdminDashboardCharts["series7d"],
): EChartsOption {
  const totals = series.reduce(
    (acc, d) => ({
      sacolinha: acc.sacolinha + d.sacolinha,
      entrega: acc.entrega + d.entrega,
      balcao: acc.balcao + d.balcao,
    }),
    { sacolinha: 0, entrega: 0, balcao: 0 },
  );

  return {
    color: [...CHART_COLORS],
    tooltip: {
      trigger: "item",
      valueFormatter: (v) =>
        typeof v === "number" ? formatPrice(v) : String(v ?? ""),
    },
    legend: { bottom: 0, textStyle: { fontSize: 12 } },
    series: [
      {
        type: "pie",
        radius: ["42%", "68%"],
        center: ["50%", "46%"],
        label: { formatter: "{b}\n{d}%" },
        data: [
          {
            name: OPS_CHANNEL_LABELS.sacolinha,
            value: Number(totals.sacolinha.toFixed(2)),
          },
          {
            name: OPS_CHANNEL_LABELS.entrega,
            value: Number(totals.entrega.toFixed(2)),
          },
          {
            name: OPS_CHANNEL_LABELS.balcao,
            value: Number(totals.balcao.toFixed(2)),
          },
        ],
      },
    ],
  };
}

function accessOption(
  points: AdminDashboardCharts["accessMock7d"],
): EChartsOption {
  return {
    color: ["#165DA4"],
    tooltip: { trigger: "axis" },
    grid: { left: 40, right: 16, top: 24, bottom: 32 },
    xAxis: {
      type: "category",
      data: points.map((d) => d.dayLabel),
      boundaryGap: false,
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { type: "dashed", opacity: 0.4 } },
    },
    series: [
      {
        name: "Acessos (estimativa)",
        type: "line",
        smooth: true,
        symbolSize: 8,
        areaStyle: { opacity: 0.15 },
        data: points.map((d) => d.value),
      },
    ],
  };
}

/**
 * Charts ECharts do Painel — séries 7/30, mix de canais, acessos mock e top clientes.
 */
export function AdminDashboardCharts({
  charts,
}: {
  charts: AdminDashboardCharts;
}) {
  const [range, setRange] = useState<RangeDays>(7);

  const salesSeries = range === 7 ? charts.series7d : charts.series30d;
  const accessSeries =
    range === 7 ? charts.accessMock7d : charts.accessMock30d;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Vendas por canal · hover nas séries
        </p>
        <div
          className="inline-flex rounded-xl border border-black/10 bg-white p-1 shadow-sm"
          role="group"
          aria-label="Período das séries"
        >
          {([7, 30] as const).map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setRange(days)}
              className={cn(
                "h-9 min-w-14 rounded-lg px-3 text-sm font-medium transition-colors",
                range === days
                  ? "bg-[var(--brand-blue)] text-white"
                  : "text-muted-foreground hover:bg-muted/60",
              )}
              aria-pressed={range === days}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="mb-1 text-base font-semibold">
          Vendas · {range} dias por canal
        </h2>
        <p className="mb-2 text-sm text-muted-foreground">
          Barras empilhadas — Sacolinha, Entrega e Balcão
        </p>
        <ReactECharts
          option={salesOption(salesSeries)}
          style={{ height: 320, width: "100%" }}
          opts={{ renderer: "canvas" }}
          notMerge
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="mb-1 text-base font-semibold">
            Mix de canais ({range}d)
          </h2>
          <ReactECharts
            option={channelPieOption(salesSeries)}
            style={{ height: 280, width: "100%" }}
            notMerge
          />
        </section>
        <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="mb-1 text-base font-semibold">
            Acessos · {range} dias{" "}
            <span className="text-xs font-normal text-muted-foreground">
              (estimativa · sem analytics)
            </span>
          </h2>
          <p className="mb-2 text-sm text-muted-foreground">
            Valores ilustrativos — instrumentação real fora do escopo.
          </p>
          <ReactECharts
            option={accessOption(accessSeries)}
            style={{ height: 280, width: "100%" }}
            notMerge
          />
        </section>
      </div>

      <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-semibold">Top clientes</h2>
        {charts.topCustomers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ainda não há pedidos pagos com cliente vinculado nos últimos 30
            dias.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {charts.topCustomers.map((c) => (
              <li
                key={c.customerId}
                className="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <span className="font-medium">{c.name}</span>
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  {c.orders} {c.orders === 1 ? "pedido" : "pedidos"} ·{" "}
                  {formatPrice(c.totalAmount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
