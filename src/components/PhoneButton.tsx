/**
 * PhoneButton — Click-to-Call mit automatischem Call-Log
 *
 * Klick öffnet tel:// via System-Telefon-App (iPhone Continuity, Zoiper, etc.)
 * Danach öffnet sich ein Modal zum Erfassen des Anrufs (Dauer, Ergebnis, Notizen).
 */
import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

const COLORS = {
  bg: '#f5f0e8', surface: '#ffffff', border: '#e8e2d9',
  text: '#1a1a1a', muted: '#6b7280', primary: '#1a4731',
};

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

interface PhoneButtonProps {
  phone: string;
  leadId?: number;
  leadName?: string;
  userId: string;
  dbPath: string;
  /** Variant: 'icon' (just icon), 'full' (icon + number), 'inline' (text link) */
  variant?: 'icon' | 'full' | 'inline';
  onCallLogged?: () => void;
}

const OUTCOME_OPTIONS = [
  { value: 'answered', label: 'Contestado' },
  { value: 'no_answer', label: 'Sin respuesta' },
  { value: 'missed', label: 'Llamada perdida' },
  { value: 'voicemail', label: 'Buzón de voz' },
  { value: 'busy', label: 'Comunicando' },
];

const PhoneButton: React.FC<PhoneButtonProps> = ({
  phone,
  leadId,
  leadName,
  userId,
  dbPath,
  variant = 'full',
  onCallLogged,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [callStarted, setCallStarted] = useState(false);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [form, setForm] = useState({
    outcome: 'answered',
    duration_sec: '',
    notes: '',
    direction: 'outgoing',
  });
  const [saving, setSaving] = useState(false);
  const [hovered, setHovered] = useState(false);

  const cleanPhone = phone.replace(/\s+/g, '').replace(/[()]/g, '');

  async function handleCall() {
    // 1. Open tel:// via system
    try {
      await invoke('open_url', { url: `tel:${cleanPhone}` });
    } catch (_) {
      // Fallback: try directly via window.open (works in some Tauri configs)
      window.open(`tel:${cleanPhone}`, '_self');
    }

    // 2. Record call start time and show log modal
    setCallStartTime(new Date());
    setCallStarted(true);
    setShowModal(true);
  }

  function handleModalOpen() {
    // If called without the tel:// flow (e.g. to log an incoming call)
    setCallStartTime(new Date());
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      // Calculate duration if not manually set
      let durationSec: number | null = form.duration_sec ? parseInt(form.duration_sec) : null;
      if (!durationSec && callStartTime && callStarted) {
        durationSec = Math.round((new Date().getTime() - callStartTime.getTime()) / 1000);
      }

      await invoke('insert_call_log', {
        dbPath,
        id: generateId(),
        leadId: leadId ?? null,
        direction: form.direction,
        durationSec,
        outcome: form.outcome,
        notes: form.notes,
        calledAt: new Date().toISOString(),
        createdBy: userId,
      });

      setShowModal(false);
      setCallStarted(false);
      setForm({ outcome: 'answered', duration_sec: '', notes: '', direction: 'outgoing' });
      onCallLogged?.();
    } catch (err) {
      console.error('Save call log error:', err);
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: '9px 12px', borderRadius: 8, border: `1px solid ${COLORS.border}`,
    fontSize: 14, backgroundColor: COLORS.bg, color: COLORS.text,
    outline: 'none', width: '100%', boxSizing: 'border-box',
  };

  const renderButton = () => {
    if (variant === 'inline') {
      return (
        <span
          onClick={handleCall}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            color: hovered ? COLORS.primary : '#3b82f6',
            cursor: 'pointer',
            textDecoration: hovered ? 'underline' : 'none',
            fontSize: 'inherit',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <PhoneIcon size={12} />
          {phone}
        </span>
      );
    }

    if (variant === 'icon') {
      return (
        <button
          onClick={handleCall}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          title={`Llamar a ${phone}`}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 34, height: 34, borderRadius: 8,
            backgroundColor: hovered ? '#dcfce7' : 'transparent',
            border: `1px solid ${hovered ? '#4ade80' : COLORS.border}`,
            cursor: 'pointer', color: COLORS.primary,
            transition: 'all 0.15s',
          }}
        >
          <PhoneIcon size={16} />
        </button>
      );
    }

    // 'full' variant
    return (
      <button
        onClick={handleCall}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '8px 14px', borderRadius: 8,
          backgroundColor: hovered ? '#dcfce7' : COLORS.surface,
          border: `1px solid ${hovered ? '#4ade80' : COLORS.border}`,
          cursor: 'pointer', color: COLORS.primary,
          fontSize: 14, fontWeight: 500,
          transition: 'all 0.15s',
        }}
      >
        <PhoneIcon size={15} />
        {phone}
      </button>
    );
  };

  return (
    <>
      {renderButton()}

      {/* Call log modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
          }}
        >
          <div
            style={{
              backgroundColor: COLORS.surface, borderRadius: 16, padding: 28,
              width: 400, boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
              border: `1px solid ${COLORS.border}`,
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <PhoneIcon size={18} color={COLORS.primary} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text }}>
                  {callStarted ? 'Registrar llamada' : 'Nueva llamada'}
                </div>
                <div style={{ fontSize: 13, color: COLORS.muted }}>
                  {leadName ? `Con ${leadName}` : cleanPhone}
                  {callStarted && callStartTime && (
                    <span style={{ marginLeft: 8, color: '#059669', fontWeight: 600 }}>
                      · iniciada {callStartTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Direction */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.muted, display: 'block', marginBottom: 6 }}>Dirección</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[{ v: 'outgoing', l: '→ Saliente' }, { v: 'incoming', l: '← Entrante' }].map(opt => (
                    <button
                      key={opt.v}
                      onClick={() => setForm(f => ({ ...f, direction: opt.v }))}
                      style={{
                        flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${form.direction === opt.v ? COLORS.primary : COLORS.border}`,
                        backgroundColor: form.direction === opt.v ? '#e8f5ee' : COLORS.bg,
                        color: form.direction === opt.v ? COLORS.primary : COLORS.muted,
                        cursor: 'pointer', fontWeight: 600, fontSize: 13,
                      }}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Outcome */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.muted, display: 'block', marginBottom: 6 }}>Resultado</label>
                <select value={form.outcome} onChange={e => setForm(f => ({ ...f, outcome: e.target.value }))} style={inputStyle}>
                  {OUTCOME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              {/* Duration */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.muted, display: 'block', marginBottom: 6 }}>
                  Duración (segundos)
                  {callStarted && callStartTime && (
                    <span style={{ fontWeight: 400, marginLeft: 6, color: '#6b7280' }}>
                      — o déjalo vacío para calcular automáticamente
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  placeholder="ej. 120 (2 min)"
                  value={form.duration_sec}
                  onChange={e => setForm(f => ({ ...f, duration_sec: e.target.value }))}
                  style={inputStyle}
                  min="0"
                />
              </div>

              {/* Notes */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.muted, display: 'block', marginBottom: 6 }}>Notas</label>
                <textarea
                  placeholder="Resumen de la conversación…"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button
                  onClick={() => { setShowModal(false); setCallStarted(false); }}
                  style={{ padding: '9px 18px', backgroundColor: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{ padding: '9px 18px', backgroundColor: COLORS.primary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? 'Guardando…' : 'Guardar llamada'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ── Phone Icon ─────────────────────────────────────────────────────────────────

const PhoneIcon: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.36 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.11 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

export default PhoneButton;
