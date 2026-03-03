"use client";

import React, { useState, useMemo } from "react";

interface MarginCalculatorProps {
  currentPrice?: number;
  currency?: string;
}

const formatPrice = (value: number, currency: string) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(value);

export default function MarginCalculator({
  currentPrice,
  currency = "EUR"
}: MarginCalculatorProps) {
  const [purchasePrice, setPurchasePrice] = useState(currentPrice?.toString() || "");
  const [marginPercent, setMarginPercent] = useState("30");
  const [platformFee, setPlatformFee] = useState("4"); // Wallapop ~4%
  const [includeVAT, setIncludeVAT] = useState(false);
  const [vatRate, setVatRate] = useState("21"); // 21% IVA España

  const calculations = useMemo(() => {
    const purchase = parseFloat(purchasePrice) || 0;
    const margin = parseFloat(marginPercent) || 0;
    const fee = parseFloat(platformFee) || 0;
    const vat = parseFloat(vatRate) || 0;

    // Calculate selling price based on margin
    const baseSellingPrice = purchase * (1 + margin / 100);
    
    // Calculate platform fee
    const platformFeeAmount = baseSellingPrice * (fee / 100);
    
    // Calculate VAT (on selling price + fee)
    const vatAmount = includeVAT ? (baseSellingPrice + platformFeeAmount) * (vat / 100) : 0;
    
    // Final selling price
    const finalSellingPrice = baseSellingPrice + platformFeeAmount + vatAmount;
    
    // Calculate actual margin after fees
    const totalCosts = purchase + platformFeeAmount + vatAmount;
    const profit = finalSellingPrice - totalCosts;
    const actualMargin = purchase > 0 ? (profit / purchase) * 100 : 0;

    return {
      baseSellingPrice,
      platformFeeAmount,
      vatAmount,
      finalSellingPrice,
      profit,
      actualMargin,
      totalCosts
    };
  }, [purchasePrice, marginPercent, platformFee, includeVAT, vatRate]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-zinc-500">
          Calculadora de margen
        </p>
        <h3 className="mt-2 text-lg font-semibold text-white">
          Estima tu precio de venta
        </h3>
        <p className="mt-2 text-sm text-zinc-400">
          Calcula el precio de venta óptimo considerando comisiones de plataforma e IVA.
        </p>
      </div>

      <div className="space-y-4">
        <label className="text-xs uppercase tracking-wider text-zinc-500">
          Precio de compra
          <div className="relative mt-2">
            <input
              type="number"
              value={purchasePrice}
              onChange={(event) => setPurchasePrice(event.target.value)}
              placeholder="0"
              className="w-full rounded-xl border border-zinc-800 bg-black/40 px-4 py-3 text-lg font-semibold text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
              {currency}
            </span>
          </div>
        </label>

        <label className="text-xs uppercase tracking-wider text-zinc-500">
          Margen deseado
          <div className="relative mt-2">
            <input
              type="number"
              value={marginPercent}
              onChange={(event) => setMarginPercent(event.target.value)}
              placeholder="30"
              min="0"
              max="100"
              className="w-full rounded-xl border border-zinc-800 bg-black/40 px-4 py-3 text-lg font-semibold text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
              %
            </span>
          </div>
        </label>

        <label className="text-xs uppercase tracking-wider text-zinc-500">
          Comisión plataforma
          <div className="relative mt-2">
            <input
              type="number"
              value={platformFee}
              onChange={(event) => setPlatformFee(event.target.value)}
              placeholder="4"
              min="0"
              max="20"
              className="w-full rounded-xl border border-zinc-800 bg-black/40 px-4 py-3 text-lg font-semibold text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
              %
            </span>
          </div>
        </label>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-800 bg-black/40 px-4 py-3">
          <input
            type="checkbox"
            checked={includeVAT}
            onChange={(event) => setIncludeVAT(event.target.checked)}
            className="h-5 w-5 rounded border-zinc-700 bg-black text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
          />
          <div className="flex-1">
            <p className="text-sm text-white">Incluir IVA</p>
            <p className="text-xs text-zinc-500">Solo si eres profesional</p>
          </div>
        </label>

        {includeVAT && (
          <label className="text-xs uppercase tracking-wider text-zinc-500">
            Tipo IVA
            <div className="relative mt-2">
              <input
                type="number"
                value={vatRate}
                onChange={(event) => setVatRate(event.target.value)}
                placeholder="21"
                min="0"
                max="25"
                className="w-full rounded-xl border border-zinc-800 bg-black/40 px-4 py-3 text-lg font-semibold text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                %
              </span>
            </div>
          </label>
        )}
      </div>

      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-6">
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Precio de venta sugerido
            </p>
            <p className="mt-2 text-3xl font-bold text-emerald-400">
              {formatPrice(calculations.finalSellingPrice, currency)}
            </p>
          </div>

          <div className="h-px bg-zinc-800" />

          <div className="grid gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Base de venta</span>
              <span className="text-white">
                {formatPrice(calculations.baseSellingPrice, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Comisión plataforma</span>
              <span className="text-rose-300">
                -{formatPrice(calculations.platformFeeAmount, currency)}
              </span>
            </div>
            {calculations.vatAmount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">IVA</span>
                <span className="text-rose-300">
                  -{formatPrice(calculations.vatAmount, currency)}
                </span>
              </div>
            )}
            <div className="h-px bg-zinc-800" />
            <div className="flex items-center justify-between">
              <span className="font-medium text-zinc-400">Beneficio neto</span>
              <span className={`text-lg font-semibold ${
                calculations.profit > 0 ? "text-emerald-400" : "text-rose-400"
              }`}>
                {calculations.profit > 0 ? "+" : ""}
                {formatPrice(calculations.profit, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-zinc-400">Margen real</span>
              <span className={`text-lg font-semibold ${
                calculations.actualMargin > 0 ? "text-emerald-400" : "text-rose-400"
              }`}>
                {calculations.actualMargin.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-xs text-zinc-500">
        💡 <strong className="text-zinc-400">Consejo:</strong> Las ventas de segunda mano a particulares están exentas de IVA. 
        Solo marca la casilla si eres un profesional vendiendo con factura.
      </div>
    </div>
  );
}
