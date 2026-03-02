"use client";

import React, { useEffect, useMemo, useState } from "react";
import PhotoGallery from "@/components/clocks/PhotoGallery";
import PriceHistoryChart from "@/components/clocks/PriceHistoryChart";
import type { Clock } from "@/lib/clocks";

interface ClockDetailClientProps {
  clock: Clock;
}

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
};

type Tag = {
  id: string;
  name: string;
  color: string;
};

const tagPalette = ["#22c55e", "#38bdf8", "#f97316", "#a855f7", "#eab308"];

const formatPrice = (value: number, currency: string) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(value);

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

export default function ClockDetailClient({ clock }: ClockDetailClientProps) {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [noteStatus, setNoteStatus] = useState<string | null>(null);
  const [noteLoading, setNoteLoading] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(tagPalette[0]);

  const priceDelta = useMemo(() => {
    if (clock.priceHistory.length < 2) return 0;
    const first = clock.priceHistory[0].price;
    return clock.price - first;
  }, [clock.price, clock.priceHistory]);

  useEffect(() => {
    let active = true;
    async function loadUser() {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) {
          if (active) {
            setUser(null);
            setAuthChecked(true);
          }
          return;
        }
        const data = await res.json();
        if (active) {
          setUser(data.user ?? null);
          setAuthChecked(true);
        }
      } catch {
        if (active) {
          setUser(null);
          setAuthChecked(true);
        }
      }
    }

    loadUser();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    async function loadUserData() {
      try {
        const [favoriteRes, noteRes, tagsRes] = await Promise.all([
          fetch(`/api/favorites/${clock.id}`),
          fetch(`/api/notes/${clock.id}`),
          fetch("/api/notes/tags")
        ]);

        if (favoriteRes.ok) {
          const favoriteData = await favoriteRes.json();
          setFavorited(Boolean(favoriteData.favorited));
        }

        if (noteRes.ok) {
          const noteData = await noteRes.json();
          setNoteContent(noteData.note?.content ?? "");
          const noteTags = noteData.note?.tags ?? [];
          setSelectedTagIds(noteTags.map((tag: Tag) => tag.id));
        }

        if (tagsRes.ok) {
          const tagsData = await tagsRes.json();
          setTags(tagsData.tags ?? []);
        }
      } catch {
        // ignore
      }
    }

    loadUserData();
  }, [clock.id, user]);

  async function handleFavoriteToggle() {
    if (!user) return;
    setFavoriteLoading(true);

    try {
      if (favorited) {
        const res = await fetch(`/api/favorites/${clock.id}`, { method: "DELETE" });
        if (res.ok) {
          setFavorited(false);
        }
      } else {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clockId: clock.id })
        });

        if (res.ok) {
          setFavorited(true);
        }
      }
    } finally {
      setFavoriteLoading(false);
    }
  }

  async function handleSaveNote() {
    if (!user || !noteContent.trim()) return;
    setNoteLoading(true);
    setNoteStatus(null);

    try {
      const res = await fetch(`/api/notes/${clock.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: noteContent.trim(),
          tagIds: selectedTagIds.length ? selectedTagIds : undefined
        })
      });

      if (res.ok) {
        setNoteStatus("Nota guardada correctamente.");
      } else {
        setNoteStatus("No se pudo guardar la nota.");
      }
    } catch {
      setNoteStatus("No se pudo guardar la nota.");
    } finally {
      setNoteLoading(false);
    }
  }

  async function handleDeleteNote() {
    if (!user) return;
    setNoteLoading(true);
    setNoteStatus(null);

    try {
      const res = await fetch(`/api/notes/${clock.id}`, { method: "DELETE" });
      if (res.ok) {
        setNoteContent("");
        setSelectedTagIds([]);
        setNoteStatus("Nota eliminada.");
      } else {
        setNoteStatus("No se pudo eliminar la nota.");
      }
    } catch {
      setNoteStatus("No se pudo eliminar la nota.");
    } finally {
      setNoteLoading(false);
    }
  }

  async function handleCreateTag() {
    if (!user || !newTagName.trim()) return;
    try {
      const res = await fetch("/api/notes/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName.trim(), color: newTagColor })
      });

      if (!res.ok) {
        setNoteStatus("No se pudo crear la etiqueta.");
        return;
      }

      const data = await res.json();
      const newTag: Tag = data.tag;
      setTags((prev) => [...prev, newTag]);
      setSelectedTagIds((prev) => [...prev, newTag.id]);
      setNewTagName("");
      setNoteStatus("Etiqueta creada.");
    } catch {
      setNoteStatus("No se pudo crear la etiqueta.");
    }
  }

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-800 bg-zinc-950/80">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-400">
            Detalle del reloj
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white">{clock.title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-400">
            {clock.description}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <PhotoGallery photos={clock.photos} title={clock.title} />

          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-zinc-500">
                    Precio actual
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-emerald-400">
                    {formatPrice(clock.price, clock.currency)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wider text-zinc-500">
                    Variación
                  </p>
                  <p
                    className={`mt-2 text-lg font-medium ${
                      priceDelta < 0 ? "text-rose-400" : "text-emerald-400"
                    }`}
                  >
                    {priceDelta === 0
                      ? "Sin cambios"
                      : `${priceDelta > 0 ? "+" : ""}${formatPrice(priceDelta, clock.currency)}`}
                  </p>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4 text-sm text-zinc-400">
                <div>
                  <p className="text-xs uppercase tracking-wider text-zinc-600">Isla</p>
                  <p className="text-white">{clock.island}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-zinc-600">Fuente</p>
                  <p className="text-white">{clock.source}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-zinc-600">Publicado</p>
                  <p className="text-white">{formatDate(clock.publishedAt)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-zinc-600">Actualizado</p>
                  <p className="text-white">{formatDate(clock.updatedAt)}</p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="rounded-full border border-zinc-700 px-5 py-2 text-sm text-zinc-300 transition hover:border-zinc-500"
                >
                  Archivar
                </button>
                <a
                  href={clock.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-emerald-500/50 px-5 py-2 text-sm text-emerald-300 transition hover:border-emerald-400"
                >
                  Ver fuente original
                </a>
                {authChecked && user && (
                  <button
                    type="button"
                    onClick={handleFavoriteToggle}
                    disabled={favoriteLoading}
                    className={`rounded-full px-5 py-2 text-sm transition ${
                      favorited
                        ? "bg-emerald-500 text-black"
                        : "border border-zinc-700 text-zinc-300 hover:border-zinc-500"
                    }`}
                  >
                    {favorited ? "★ Favorito" : "☆ Marcar favorito"}
                  </button>
                )}
              </div>
              {authChecked && !user && (
                <p className="mt-4 text-xs text-zinc-500">
                  Inicia sesión para marcar favoritos y añadir notas.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <p className="text-xs uppercase tracking-wider text-zinc-500">
                Metadatos
              </p>
              <div className="mt-4 space-y-2 text-sm text-zinc-400">
                <div className="flex items-center justify-between">
                  <span>First seen</span>
                  <span className="text-white">{formatDate(clock.firstSeenAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Última actualización</span>
                  <span className="text-white">{formatDate(clock.updatedAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-500">
                Historial de precios
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                Evolución reciente
              </h2>
            </div>
          </div>
          <div className="mt-6">
            <PriceHistoryChart data={clock.priceHistory} currency={clock.currency} />
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-500">
                Notas privadas
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                Observaciones personales
              </h2>
            </div>
          </div>

          {authChecked && user ? (
            <div className="mt-6 space-y-6">
              <div>
                <label className="text-xs uppercase tracking-wider text-zinc-500">
                  Tu nota
                </label>
                <textarea
                  value={noteContent}
                  onChange={(event) => setNoteContent(event.target.value)}
                  placeholder="Añade una nota privada sobre este reloj..."
                  className="mt-3 h-28 w-full rounded-xl border border-zinc-800 bg-black/40 p-4 text-sm text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-wider text-zinc-500">
                  Etiquetas personalizadas
                </label>
                <div className="mt-3 flex flex-wrap gap-2">
                  {tags.length === 0 && (
                    <span className="text-xs text-zinc-500">No hay etiquetas todavía.</span>
                  )}
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`rounded-full px-3 py-1 text-xs transition ${
                        selectedTagIds.includes(tag.id)
                          ? "border border-white text-white"
                          : "border border-zinc-700 text-zinc-400"
                      }`}
                      style={{ backgroundColor: selectedTagIds.includes(tag.id) ? tag.color : "transparent" }}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(event) => setNewTagName(event.target.value)}
                    placeholder="Nueva etiqueta"
                    className="rounded-full border border-zinc-800 bg-black/40 px-4 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
                  />
                  <select
                    value={newTagColor}
                    onChange={(event) => setNewTagColor(event.target.value)}
                    className="rounded-full border border-zinc-800 bg-black/40 px-3 py-2 text-xs text-white"
                  >
                    {tagPalette.map((color) => (
                      <option key={color} value={color}>
                        {color}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleCreateTag}
                    className="rounded-full border border-emerald-500/50 px-4 py-2 text-xs text-emerald-300 transition hover:border-emerald-400"
                  >
                    Crear etiqueta
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSaveNote}
                  disabled={noteLoading || !noteContent.trim()}
                  className="rounded-full bg-emerald-500 px-5 py-2 text-sm text-black transition disabled:opacity-50"
                >
                  {noteLoading ? "Guardando..." : "Guardar nota"}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteNote}
                  disabled={noteLoading}
                  className="rounded-full border border-rose-500/50 px-5 py-2 text-sm text-rose-300 transition hover:border-rose-400 disabled:opacity-50"
                >
                  Eliminar nota
                </button>
                {noteStatus && (
                  <span className="text-xs text-zinc-500">{noteStatus}</span>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-zinc-800 bg-black/30 p-6 text-sm text-zinc-500">
              Inicia sesión para guardar notas privadas y etiquetas.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
