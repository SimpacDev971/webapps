"use client";

import { useEffect, useState, useCallback } from "react";

interface DwDocument {
  id: number;
  documentNumber: string | null;
  documentType: string | null;
  expediteur: string | null;
  communeDepart: string | null;
  title: string | null;
}

interface MarchandiseRow {
  destination: string;
  commune: string;
  sec: number;
  froid: number;
  cartons: number;
  poids: number;
  delivered: string;
  key: string;
}

type PaletteMode = "sec" | "froid" | "both";

const API_BASE = "/api/simpac/lettre-de-voiture";
const DW_FORM_BASE =
  "https://simpac.docuware.cloud/docuware/formsweb/etm_lettre-copy";
const PREFS_KEY = "dw_prefs";

function roundToQuarter(): string {
  const now = new Date();
  const minutes = Math.ceil(now.getMinutes() / 15) * 15;
  const h = minutes === 60 ? now.getHours() + 1 : now.getHours();
  const m = minutes === 60 ? 0 : minutes;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function buildFormUrl(data: {
  commandeClient: string;
  expediteur: string;
  lieuDepart: string;
  heureDepart: string;
  destinataire: string;
  lieuArrivee: string;
  heureArrivee: string;
  distanceKm: string;
  nbPalettes: number;
  colis: number;
  poids: number;
  chauffeur: string;
  immat: string;
}): string {
  const params = new URLSearchParams({
    pf: "on",
    CommandeClient: data.commandeClient,
    Expediteur1: data.expediteur,
    LieuDepart: data.lieuDepart,
    Heurededepart: data.heureDepart,
    Destinataire: data.destinataire,
    LieuArrivee: data.lieuArrivee,
    Heuredarrivee: data.heureArrivee,
    Distancekm: data.distanceKm,
    NbPalettes: String(data.nbPalettes),
    Colis1: String(data.colis),
    Poids: String(data.poids),
    Chauffeur: data.chauffeur,
    Immatriculation: data.immat,
  });
  return `${DW_FORM_BASE}#${params.toString()}`;
}

export default function DocumentSelector() {
  const [documents, setDocuments] = useState<DwDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [selectedDoc, setSelectedDoc] = useState<DwDocument | null>(null);
  const [marchandises, setMarchandises] = useState<MarchandiseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [expediteur, setExpediteur] = useState("");
  const [lieuDepart, setLieuDepart] = useState("");
  const [heureDepart, setHeureDepart] = useState(roundToQuarter);
  const [heureArrivee, setHeureArrivee] = useState(roundToQuarter);
  const [chauffeur, setChauffeur] = useState("");
  const [immat, setImmat] = useState("");
  const [communes, setCommunes] = useState<string[]>([]);
  const [formUrl, setFormUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/distances`)
      .then((r) => r.json())
      .then((d) => setCommunes(d.communes || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PREFS_KEY);
      if (saved) {
        const prefs = JSON.parse(saved);
        if (prefs.expediteur) setExpediteur(prefs.expediteur);
        if (prefs.lieuDepart) setLieuDepart(prefs.lieuDepart);
        if (prefs.heureDepart) setHeureDepart(prefs.heureDepart);
        if (prefs.heureArrivee) setHeureArrivee(prefs.heureArrivee);
        if (prefs.chauffeur) setChauffeur(prefs.chauffeur);
        if (prefs.immat) setImmat(prefs.immat);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        PREFS_KEY,
        JSON.stringify({
          expediteur,
          lieuDepart,
          heureDepart,
          heureArrivee,
          chauffeur,
          immat,
        }),
      );
    } catch {}
  }, [expediteur, lieuDepart, heureDepart, heureArrivee, chauffeur, immat]);

  useEffect(() => {
    fetch(`${API_BASE}/documents?docType=Demande de livraison`)
      .then((res) => {
        if (!res.ok) throw new Error(`Erreur ${res.status}`);
        return res.json();
      })
      .then((data: DwDocument[]) => {
        setDocuments(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const fetchDistance = useCallback(
    async (depart: string, arrivee: string): Promise<string> => {
      if (!depart || !arrivee) return "";
      try {
        const res = await fetch(
          `${API_BASE}/distances?depart=${encodeURIComponent(depart)}&arrivee=${encodeURIComponent(arrivee)}`,
        );
        const data = await res.json();
        return data.km != null ? String(data.km) : "";
      } catch {
        return "";
      }
    },
    [],
  );

  async function loadDocument(docId: string) {
    setSelectedDocId(docId);
    setMarchandises([]);
    setSelectedDoc(null);
    setFormUrl(null);
    if (!docId) return;

    const doc = documents.find((d) => String(d.id) === docId) || null;
    setSelectedDoc(doc);
    if (doc?.expediteur) setExpediteur(doc.expediteur);
    if (doc?.communeDepart) setLieuDepart(doc.communeDepart);

    setLoadingDoc(true);
    try {
      const res = await fetch(`${API_BASE}/document?id=${docId}`);
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const docDetail = await res.json();

      const fields = docDetail.Fields || [];
      const marchandisesField = fields.find(
        (f: { FieldName: string }) => f.FieldName === "MARCHANDISES",
      );

      if (marchandisesField?.Item?.Row) {
        const rows: MarchandiseRow[] = marchandisesField.Item.Row.map(
          (
            row: {
              ColumnValue: { FieldName: string; Item?: string }[];
            },
            idx: number,
          ) => {
            const get = (name: string) =>
              row.ColumnValue.find(
                (c: { FieldName: string; Item?: string }) =>
                  c.FieldName === name,
              )?.Item || "";
            const destination = get("MARCH_DESTINATION");
            const commune = get("MARCH_COMMUNES");
            const sec = parseFloat(get("MARCH_SEC1")) || 0;
            const froid = parseFloat(get("MARCH_FROID1")) || 0;
            const cartons = parseFloat(get("MARCH_CARTONS1")) || 0;
            const poids = parseFloat(get("MARCH_POIDS1")) || 0;
            const delivered = get("MARCH_DELIVERED");
            return {
              destination,
              commune,
              sec,
              froid,
              cartons,
              poids,
              delivered,
              key: `${idx}_${destination}_${sec}_${froid}_${poids}`,
            };
          },
        );
        setMarchandises(rows);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chargement document");
    } finally {
      setLoadingDoc(false);
    }
  }

  async function handleRowClick(row: MarchandiseRow, mode: PaletteMode) {
    const nbPalettes =
      mode === "sec" ? row.sec : mode === "froid" ? row.froid : row.sec + row.froid;
    const lieuArrivee = row.commune || row.destination;
    const km = await fetchDistance(lieuDepart, lieuArrivee);
    const url = buildFormUrl({
      commandeClient: selectedDoc?.documentNumber || selectedDocId,
      expediteur,
      lieuDepart,
      heureDepart,
      destinataire: row.destination,
      lieuArrivee,
      heureArrivee,
      distanceKm: km,
      nbPalettes,
      colis: row.cartons,
      poids: row.poids,
      chauffeur,
      immat,
    });
    setFormUrl(url);
  }

  if (error) return <p className="text-red-500 text-lg p-4">Erreur : {error}</p>;

  const inputClass =
    "w-full rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-4 py-3 text-base text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <>
      {/* ── Overlay plein écran formulaire DW ── */}
      {formUrl && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-zinc-900">
          {/* Barre de navigation */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 safe-top">
            <button
              onClick={() => setFormUrl(null)}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-lg font-bold active:bg-zinc-200 dark:active:bg-zinc-700"
              aria-label="Retour"
            >
              ←
            </button>
            <span className="flex-1 text-base font-semibold text-zinc-800 dark:text-zinc-100 truncate">
              Lettre de voiture
            </span>
            <a
              href={formUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 active:bg-zinc-200 dark:active:bg-zinc-700"
              aria-label="Ouvrir dans un nouvel onglet"
            >
              ↗
            </a>
          </div>
          {/* Iframe plein écran */}
          <iframe
            src={formUrl}
            className="flex-1 w-full border-0"
            title="Lettre de voiture"
            allow="fullscreen"
          />
        </div>
      )}

      {/* ── Contenu principal ── */}
      <div className="space-y-5">
        {/* Sélection du document */}
        <div>
          <label
            htmlFor="doc-select"
            className="block text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-1"
          >
            Demande de livraison
          </label>
          <select
            id="doc-select"
            value={selectedDocId}
            onChange={(e) => loadDocument(e.target.value)}
            disabled={loading}
            className={`${inputClass} h-14 text-lg`}
          >
            <option value="">{loading ? "Chargement…" : "-- Sélectionner --"}</option>
            {documents.map((doc) => (
              <option key={doc.id} value={String(doc.id)}>
                N°{doc.documentNumber || doc.id} — {doc.expediteur || ""}
              </option>
            ))}
          </select>
        </div>

        {/* Chauffeur & Immat */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Chauffeur
            </label>
            <input
              type="text"
              value={chauffeur}
              onChange={(e) => setChauffeur(e.target.value)}
              className={inputClass}
              placeholder="Nom"
              autoCapitalize="words"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Immatriculation
            </label>
            <input
              type="text"
              value={immat}
              onChange={(e) => setImmat(e.target.value)}
              className={inputClass}
              placeholder="XX-000-XX"
              autoCapitalize="characters"
            />
          </div>
        </div>

        {/* Expéditeur / Départ / Heures — visibles après sélection */}
        {selectedDocId && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Expéditeur
              </label>
              <input
                type="text"
                value={expediteur}
                onChange={(e) => setExpediteur(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Lieu de départ
              </label>
              <input
                type="text"
                value={lieuDepart}
                onChange={(e) => setLieuDepart(e.target.value)}
                list="communes-list"
                className={inputClass}
              />
              <datalist id="communes-list">
                {communes.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Départ
              </label>
              <input
                type="time"
                value={heureDepart}
                onChange={(e) => setHeureDepart(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Arrivée
              </label>
              <input
                type="time"
                value={heureArrivee}
                onChange={(e) => setHeureArrivee(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        )}

        {/* Tableau Marchandises — cartes sur mobile */}
        {loadingDoc && (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {marchandises.length > 0 && (
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
              Choisir Sec, Froid ou Sec+Froid pour générer la lettre de voiture
            </p>
            <div className="space-y-2">
              {marchandises.map((row) => {
                const isDelivered = row.delivered !== "";
                const total = row.sec + row.froid;
                const paletteButtonClass =
                  "flex-1 rounded-lg border px-2 py-2 text-sm font-semibold transition-colors active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100";
                return (
                  <div
                    key={row.key}
                    className={[
                      "w-full rounded-xl border px-4 py-3 transition-colors",
                      isDelivered
                        ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                        : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
                    ].join(" ")}
                  >
                    {/* Ligne principale : destination */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-base font-semibold leading-tight ${isDelivered ? "line-through text-zinc-400 dark:text-zinc-500" : "text-zinc-900 dark:text-zinc-100"}`}
                      >
                        {row.destination}
                      </span>
                    </div>
                    {/* Commune si différente */}
                    {row.commune && row.commune !== row.destination && (
                      <div
                        className={`text-sm mt-0.5 ${isDelivered ? "text-zinc-400" : "text-zinc-500 dark:text-zinc-400"}`}
                      >
                        {row.commune}
                      </div>
                    )}
                    {/* Chiffres */}
                    <div
                      className={`flex gap-4 mt-2 text-sm ${isDelivered ? "text-zinc-400" : "text-zinc-600 dark:text-zinc-300"}`}
                    >
                      <span>
                        Sec&nbsp;<strong>{row.sec}</strong>
                      </span>
                      <span>
                        Froid&nbsp;<strong>{row.froid}</strong>
                      </span>
                      <span>
                        Poids&nbsp;<strong>{row.poids}&nbsp;kg</strong>
                      </span>
                      <span
                        className={`ml-auto font-bold ${isDelivered ? "text-zinc-400" : "text-blue-600 dark:text-blue-400"}`}
                      >
                        {total}&nbsp;pal.
                      </span>
                    </div>
                    {/* Boutons palette : Sec / Froid / Sec+Froid */}
                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        disabled={row.sec === 0}
                        onClick={() => handleRowClick(row, "sec")}
                        className={`${paletteButtonClass} border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 active:bg-zinc-100 dark:active:bg-zinc-600`}
                      >
                        Sec ({row.sec})
                      </button>
                      <button
                        type="button"
                        disabled={row.froid === 0}
                        onClick={() => handleRowClick(row, "froid")}
                        className={`${paletteButtonClass} border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 active:bg-zinc-100 dark:active:bg-zinc-600`}
                      >
                        Froid ({row.froid})
                      </button>
                      <button
                        type="button"
                        disabled={total === 0}
                        onClick={() => handleRowClick(row, "both")}
                        className={`${paletteButtonClass} border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 active:bg-blue-100 dark:active:bg-blue-900/50`}
                      >
                        Sec+Froid ({total})
                      </button>
                    </div>
                    {/* Badge livré */}
                    {isDelivered && (
                      <div className="mt-2">
                        <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 font-medium">
                          Déjà livré
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
