// Vue d'impression A4 du bulletin de simulation (calculator.md § « Impression »)
// Rendue uniquement en @media print (classe .calc-print) — entête /print-logo.svg,
// paramètres, bulletin complet, résultat encadré, mention SYDONIA + date d'édition.

import type { Container } from '@/lib/types'
import type { CustomsResult } from '@/lib/customs'
import { formatFCFA, formatFullDate, formatNumber } from '@/lib/format'
import type { SimulationParams } from './history'

interface PrintSheetProps {
  params: SimulationParams
  result: CustomsResult
  container?: Container
  editionDate: Date
}

function Row({ label, base, taux, montant, strong }: { label: string; base?: string; taux?: string; montant: string; strong?: boolean }) {
  return (
    <tr style={{ borderBottom: '1px solid #E3E6EA', height: 34 }}>
      <td style={{ padding: '6px 8px 6px 0', fontSize: 12, fontWeight: strong ? 700 : 400, color: '#111827' }}>{label}</td>
      <td style={{ padding: '6px 8px', fontSize: 12, textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", color: '#4B5563' }}>{base}</td>
      <td style={{ padding: '6px 8px', fontSize: 12, textAlign: 'right', color: '#4B5563' }}>{taux}</td>
      <td style={{ padding: '6px 0 6px 8px', fontSize: 12, textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontWeight: strong ? 600 : 500, color: '#111827' }}>
        {montant}
      </td>
    </tr>
  )
}

export default function PrintSheet({ params, result, container, editionDate }: PrintSheetProps) {
  const tecPct = Math.round(params.tec * 100)
  return (
    <div className="calc-print" style={{ display: 'none', fontFamily: 'Inter, sans-serif', color: '#111827' }}>
      {/* Entête */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #0A1826', paddingBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/print-logo.svg" alt="SahelTransit" style={{ width: 36, height: 36 }} />
          <div>
            <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700, margin: 0 }}>
              Simulation de droits et taxes — SahelTransit
            </p>
            <p style={{ fontSize: 11, color: '#4B5563', margin: 0 }}>
              Corridor Douala → N'Djamena · Tarif Extérieur Commun CEMAC · TVA 18 % · Tchad
            </p>
          </div>
        </div>
        <p style={{ fontSize: 11, color: '#4B5563', textAlign: 'right', margin: 0 }}>
          Édité le {formatFullDate(editionDate)}
        </p>
      </div>

      {/* Dossier lié */}
      {container && (
        <p style={{ fontSize: 12, margin: '12px 0 0', color: '#111827' }}>
          <strong>
            Dossier <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{container.numero}</span>
          </strong>{' '}
          — {container.contenu} · CAF {formatFCFA(container.valeurCaf)}
        </p>
      )}

      {/* Paramètres */}
      <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9AA3AD', margin: '18px 0 6px' }}>
        Paramètres de la simulation
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <Row label="Valeur des marchandises (FOB)" montant={formatFCFA(params.fob)} />
          <Row label="Fret maritime + transport terrestre" montant={formatFCFA(params.fret)} />
          <Row label="Assurance cargo" montant={formatFCFA(params.assurance)} />
          <Row label="Valeur CAF (FOB + fret + assurance)" montant={formatFCFA(result.caf)} strong />
          <Row
            label="Régime fiscal applicable"
            montant={`TEC ${tecPct} %${params.accise > 0 ? ` · accise ${params.accise} %` : ''}${params.tvaExoneree ? ' · TVA exonérée' : ' · TVA 18 %'}`}
          />
        </tbody>
      </table>

      {/* Bulletin */}
      <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9AA3AD', margin: '18px 0 6px' }}>
        Bulletin de liquidation (estimation)
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1.5px solid #C9CFD6' }}>
            <th style={{ textAlign: 'left', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9AA3AD', padding: '4px 8px 4px 0' }}>Rubrique</th>
            <th style={{ textAlign: 'right', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9AA3AD', padding: 4 }}>Base de calcul</th>
            <th style={{ textAlign: 'right', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9AA3AD', padding: 4 }}>Taux</th>
            <th style={{ textAlign: 'right', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9AA3AD', padding: '4px 0 4px 8px' }}>Montant (FCFA)</th>
          </tr>
        </thead>
        <tbody>
          <Row label="Droits de douane (TEC)" base={formatNumber(result.caf)} taux={`${tecPct} %`} montant={formatNumber(result.droits)} strong />
          <Row label="Taxe d'intégration communautaire" base={formatNumber(result.caf)} taux="1 %" montant={formatNumber(result.tic)} />
          <Row label="Frais de statistiques" base={formatNumber(result.caf)} taux="2 %" montant={formatNumber(result.stats)} />
          {params.accise > 0 && (
            <Row label="Droits d'accise" base={formatNumber(result.caf)} taux={`${params.accise} %`} montant={formatNumber(result.accise)} />
          )}
          <Row
            label="TVA"
            base={formatNumber(result.baseTva)}
            taux={params.tvaExoneree ? '0 % (exonérée)' : '18 %'}
            montant={formatNumber(result.tva)}
          />
          <Row label="Acompte (avance d'impôt)" base={formatNumber(result.caf + result.droits)} taux="4 %" montant={formatNumber(result.acompte)} />
          <tr style={{ borderTop: '2px solid #0A1826', height: 38 }}>
            <td style={{ padding: '8px 8px 8px 0', fontSize: 13, fontWeight: 700 }}>Total droits et taxes</td>
            <td colSpan={2} />
            <td style={{ padding: '8px 0 8px 8px', fontSize: 13, textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>
              {formatNumber(result.total)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Résultat encadré */}
      <div style={{ marginTop: 16, border: '2px solid #0A1826', borderRadius: 8, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4B5563', margin: 0 }}>
            Coût total débarqué N'Djamena
          </p>
          <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 24, fontWeight: 700, margin: '2px 0 0' }}>
            {formatFCFA(result.coutDebarque)}
          </p>
        </div>
        <div style={{ textAlign: 'right', fontSize: 11, color: '#4B5563' }}>
          <p style={{ margin: 0 }}>
            Taxes : <strong style={{ color: '#111827' }}>{formatFCFA(result.total)}</strong>
          </p>
          <p style={{ margin: '2px 0 0' }}>
            soit {result.caf > 0 ? ((result.total / result.caf) * 100).toFixed(1).replace('.', ',') : '0'} % de la valeur CAF
          </p>
        </div>
      </div>

      {/* Mention légale */}
      <p style={{ marginTop: 18, fontSize: 10.5, color: '#4B5563', borderTop: '1px solid #E3E6EA', paddingTop: 10 }}>
        Estimation indicative, taux CEMAC 2025 — ne se substitue pas au bulletin de liquidation officiel SYDONIA.
        Document édité le {formatFullDate(editionDate)} via SahelTransit.
      </p>
    </div>
  )
}
