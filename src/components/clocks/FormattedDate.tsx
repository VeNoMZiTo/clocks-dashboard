"use client";

import React from "react";

interface FormattedDateProps {
  value: string | Date;
  className?: string;
}

/**
 * Componente que formatea fechas solo en el cliente para evitar hydration errors.
 * Usa suppressHydrationWarning para permitir diferencia entre SSR y cliente.
 */
export default function FormattedDate({ value, className }: FormattedDateProps) {
  const date = typeof value === "string" ? new Date(value) : value;
  const formatted = date.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });

  // suppressHydrationWarning permite que el servidor y cliente tengan contenido diferente
  return (
    <span className={className} suppressHydrationWarning>
      {formatted}
    </span>
  );
}
