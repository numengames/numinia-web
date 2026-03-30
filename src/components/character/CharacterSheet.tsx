'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Save, Download, FileText, Pencil, Eye, Loader2, Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import matter from 'gray-matter';

interface CharacterData {
  name: string;
  player: string;
  species: string;
  position: string;
  guild: string;
  branch: string;
  house: string;
  faction: string;
  district: string;
  archetype: string;
  humor: string;
  prestige_points: number;
  profile_image: string;
  wallet: string;
  // Lingüísticas
  dialect: string;
  sociolect: string;
  lingo: string;
  idiolect: string;
  // Equipo
  weapons: string;
  relics: string;
  // Físicos
  strength: number;
  movement: number;
  size: number;
  constitution: number;
  // Psíquicos
  intelligence: number;
  wisdom: number;
  perception: number;
  charisma: number;
  // Valores
  threshold: number;
  veil_breath: number;
  initiative: number;
  energy: number;
  // Competencias
  technomancy: number;
  advanced_forge: number;
  virtual_architecture: number;
  defensive_networks: number;
  chronomancy: number;
  cryptology: number;
  decoding: number;
  neural_vision: number;
  luminic_projection: number;
  // Prisma
  prisma: number;
  // Notas
  notes: string;
}

const DEFAULT_CHARACTER: CharacterData = {
  name: '', player: '', species: '', position: '', guild: '', branch: '',
  house: '', faction: '', district: '', archetype: '', humor: '',
  prestige_points: 0, profile_image: '', wallet: '',
  dialect: '', sociolect: '', lingo: '', idiolect: '',
  weapons: '', relics: '',
  strength: 0, movement: 0, size: 0, constitution: 0,
  intelligence: 0, wisdom: 0, perception: 0, charisma: 0,
  threshold: 5, veil_breath: 0, initiative: 0, energy: 0,
  technomancy: 0, advanced_forge: 0, virtual_architecture: 0,
  defensive_networks: 0, chronomancy: 0, cryptology: 0,
  decoding: 0, neural_vision: 0, luminic_projection: 0,
  prisma: 0, notes: '',
};

function characterToMarkdown(c: CharacterData): string {
  const frontmatter = {
    name: c.name, player: c.player, species: c.species, position: c.position,
    guild: c.guild, branch: c.branch, house: c.house, faction: c.faction,
    district: c.district, archetype: c.archetype, humor: c.humor,
    prestige_points: c.prestige_points, profile_image: c.profile_image,
    wallet: c.wallet, updated_at: new Date().toISOString(),
  };

  const body = `
## Variaciones Lingüísticas
- **Dialecto:** ${c.dialect}
- **Sociolecto:** ${c.sociolect}
- **Lingo:** ${c.lingo}
- **Idiolecto:** ${c.idiolect}

## Equipo
- **Armas:** ${c.weapons}
- **Reliquias:** ${c.relics}

## Atributos Físicos
| Atributo | Valor |
|---|---|
| Fuerza | ${c.strength} |
| Movimiento | ${c.movement} |
| Tamaño | ${c.size} |
| Constitución | ${c.constitution} |

## Atributos Psíquicos
| Atributo | Valor |
|---|---|
| Inteligencia | ${c.intelligence} |
| Sabiduría | ${c.wisdom} |
| Percepción | ${c.perception} |
| Carisma | ${c.charisma} |

## Valores
| Valor | Cantidad |
|---|---|
| Umbral | ${c.threshold} |
| Aliento del Velo | ${c.veil_breath} |
| Iniciativa | ${c.initiative} |
| Energía | ${c.energy} |

## Competencias
| Competencia | Valor |
|---|---|
| Tecnomancia | ${c.technomancy} |
| Forja Avanzada | ${c.advanced_forge} |
| Arquitectura Virtual | ${c.virtual_architecture} |
| Redes Defensivas | ${c.defensive_networks} |
| Cronomancia | ${c.chronomancy} |
| Criptología | ${c.cryptology} |
| Descodificación | ${c.decoding} |
| Visión Neural | ${c.neural_vision} |
| Proyección Lumínica | ${c.luminic_projection} |

## Prisma
- **Reserva:** ${c.prisma}

## Notas
${c.notes}
`.trim();

  return matter.stringify(body, frontmatter);
}

function markdownToCharacter(md: string): CharacterData {
  const { data, content } = matter(md);
  const c = { ...DEFAULT_CHARACTER, ...data };

  // Parse body for values in markdown tables
  const lines = content.split('\n');
  const parseTable = (section: string): Record<string, string> => {
    const result: Record<string, string> = {};
    let inSection = false;
    for (const line of lines) {
      if (line.includes(`## ${section}`)) { inSection = true; continue; }
      if (inSection && line.startsWith('## ')) break;
      if (inSection && line.includes('|') && !line.includes('---')) {
        const parts = line.split('|').map(s => s.trim()).filter(Boolean);
        if (parts.length === 2 && parts[0] !== 'Atributo' && parts[0] !== 'Valor' && parts[0] !== 'Competencia') {
          result[parts[0]] = parts[1];
        }
      }
    }
    return result;
  };

  const parseBullet = (section: string, key: string): string => {
    let inSection = false;
    for (const line of lines) {
      if (line.includes(`## ${section}`)) { inSection = true; continue; }
      if (inSection && line.startsWith('## ')) break;
      if (inSection && line.includes(`**${key}:**`)) {
        return line.split(`**${key}:**`)[1]?.trim() || '';
      }
    }
    return '';
  };

  // Lingüísticas
  c.dialect = parseBullet('Variaciones Lingüísticas', 'Dialecto') || c.dialect;
  c.sociolect = parseBullet('Variaciones Lingüísticas', 'Sociolecto') || c.sociolect;
  c.lingo = parseBullet('Variaciones Lingüísticas', 'Lingo') || c.lingo;
  c.idiolect = parseBullet('Variaciones Lingüísticas', 'Idiolecto') || c.idiolect;

  // Equipo
  c.weapons = parseBullet('Equipo', 'Armas') || c.weapons;
  c.relics = parseBullet('Equipo', 'Reliquias') || c.relics;

  // Físicos
  const phys = parseTable('Atributos Físicos');
  c.strength = Number(phys['Fuerza']) || c.strength;
  c.movement = Number(phys['Movimiento']) || c.movement;
  c.size = Number(phys['Tamaño']) || c.size;
  c.constitution = Number(phys['Constitución']) || c.constitution;

  // Psíquicos
  const psych = parseTable('Atributos Psíquicos');
  c.intelligence = Number(psych['Inteligencia']) || c.intelligence;
  c.wisdom = Number(psych['Sabiduría']) || c.wisdom;
  c.perception = Number(psych['Percepción']) || c.perception;
  c.charisma = Number(psych['Carisma']) || c.charisma;

  // Valores
  const vals = parseTable('Valores');
  c.threshold = Number(vals['Umbral']) || c.threshold;
  c.veil_breath = Number(vals['Aliento del Velo']) || c.veil_breath;
  c.initiative = Number(vals['Iniciativa']) || c.initiative;
  c.energy = Number(vals['Energía']) || c.energy;

  // Competencias
  const comp = parseTable('Competencias');
  c.technomancy = Number(comp['Tecnomancia']) || c.technomancy;
  c.advanced_forge = Number(comp['Forja Avanzada']) || c.advanced_forge;
  c.virtual_architecture = Number(comp['Arquitectura Virtual']) || c.virtual_architecture;
  c.defensive_networks = Number(comp['Redes Defensivas']) || c.defensive_networks;
  c.chronomancy = Number(comp['Cronomancia']) || c.chronomancy;
  c.cryptology = Number(comp['Criptología']) || c.cryptology;
  c.decoding = Number(comp['Descodificación']) || c.decoding;
  c.neural_vision = Number(comp['Visión Neural']) || c.neural_vision;
  c.luminic_projection = Number(comp['Proyección Lumínica']) || c.luminic_projection;

  // Prisma
  c.prisma = Number(parseBullet('Prisma', 'Reserva')) || c.prisma;

  // Notas
  const notesIdx = content.indexOf('## Notas');
  if (notesIdx !== -1) {
    c.notes = content.slice(notesIdx + '## Notas'.length).trim();
  }

  return c;
}

// --- Field helpers ---
function Field({ label, value, onChange, type = 'text' }: { label: string; value: string | number; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block mb-1">{label}</label>
      <Input value={value} onChange={e => onChange(e.target.value)} type={type} className="h-8 text-sm bg-white dark:bg-gray-900" />
    </div>
  );
}

function StatRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <Input value={value} onChange={e => onChange(Number(e.target.value) || 0)} type="number" className="h-7 w-16 text-sm text-center bg-white dark:bg-gray-900" />
    </div>
  );
}

function ViewStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-bold text-gray-900 dark:text-white">{value}</span>
    </div>
  );
}

// --- Main Component ---
export function CharacterSheet() {
  const [char, setChar] = useState<CharacterData>(DEFAULT_CHARACTER);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [exists, setExists] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Load character
  useEffect(() => {
    fetch('/api/auth/wallet/session')
      .then(r => r.json())
      .then(session => {
        if (session.authenticated && session.address) {
          setWalletAddress(session.address);
          setChar(prev => ({ ...prev, wallet: session.address }));
          return fetch('/api/characters');
        }
        return null;
      })
      .then(res => res?.json())
      .then(data => {
        if (data?.exists && data.content) {
          setChar(markdownToCharacter(data.content));
          setExists(true);
        } else {
          setEditing(true); // New character — start in edit mode
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const update = useCallback((key: keyof CharacterData, value: string | number) => {
    setChar(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      const md = characterToMarkdown(char);
      const res = await fetch('/api/characters', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: md }),
      });
      if (res.ok) {
        setExists(true);
        setEditing(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch { /* silent */ }
    finally { setSaving(false); }
  }, [char]);

  const handleExportMD = useCallback(() => {
    const md = characterToMarkdown(char);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${char.name || 'character'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [char]);

  const handleExportPDF = useCallback(() => {
    window.print();
  }, []);

  const handleAvatarUpload = useCallback(async (file: File) => {
    const reader = new FileReader();
    const base64 = await new Promise<string>((resolve) => {
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
    // For now, store as base64 data URL in the frontmatter
    // Future: upload to GitHub/R2 and store URL
    setChar(prev => ({ ...prev, profile_image: base64 }));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 print:p-0 print:max-w-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Character Sheet</h1>
        <div className="flex items-center gap-2">
          {exists && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(!editing)} className="gap-1.5 text-xs">
              {editing ? <><Eye className="h-3.5 w-3.5" /> View</> : <><Pencil className="h-3.5 w-3.5" /> Edit</>}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleExportMD} className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" /> MD
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExportPDF} className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" /> PDF
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 text-xs">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? '✓ Saved' : <><Save className="h-3.5 w-3.5" /> Save</>}
          </Button>
        </div>
      </div>

      {/* Character Card */}
      <div className="space-y-4 print:space-y-2">
        {/* Identity + Avatar */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 print:border print:rounded-none">
          <div className="flex gap-5">
            {/* Profile pic */}
            <div className="shrink-0">
              <div className="relative h-24 w-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 group">
                {char.profile_image ? (
                  <img src={char.profile_image} alt={char.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-300">
                    {char.name ? char.name[0].toUpperCase() : '?'}
                  </div>
                )}
                {editing && (
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                  >
                    <Camera className="h-5 w-5 text-white" />
                  </button>
                )}
              </div>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); }} />
            </div>

            {/* Identity fields */}
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><Field label="Nombre" value={char.name} onChange={v => update('name', v)} /></div>
                  <Field label="Jugador" value={char.player} onChange={v => update('player', v)} />
                  <Field label="Especie" value={char.species} onChange={v => update('species', v)} />
                  <Field label="Posición" value={char.position} onChange={v => update('position', v)} />
                  <Field label="Gremio" value={char.guild} onChange={v => update('guild', v)} />
                  <Field label="Rama" value={char.branch} onChange={v => update('branch', v)} />
                  <Field label="Casa" value={char.house} onChange={v => update('house', v)} />
                  <Field label="Facción" value={char.faction} onChange={v => update('faction', v)} />
                  <Field label="Distrito" value={char.district} onChange={v => update('district', v)} />
                  <Field label="Arquetipo" value={char.archetype} onChange={v => update('archetype', v)} />
                  <Field label="Humor" value={char.humor} onChange={v => update('humor', v)} />
                  <Field label="Puntos de Prestigio" value={char.prestige_points} onChange={v => update('prestige_points', Number(v) || 0)} type="number" />
                </div>
              ) : (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{char.name || 'Sin nombre'}</h2>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {char.species && <Badge variant="secondary" className="text-[10px]">{char.species}</Badge>}
                    {char.archetype && <Badge variant="secondary" className="text-[10px]">{char.archetype}</Badge>}
                    {char.guild && <Badge variant="secondary" className="text-[10px]">{char.guild}</Badge>}
                    {char.faction && <Badge variant="secondary" className="text-[10px]">{char.faction}</Badge>}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-500">
                    {char.player && <div><span className="text-gray-400">Jugador:</span> {char.player}</div>}
                    {char.position && <div><span className="text-gray-400">Posición:</span> {char.position}</div>}
                    {char.branch && <div><span className="text-gray-400">Rama:</span> {char.branch}</div>}
                    {char.house && <div><span className="text-gray-400">Casa:</span> {char.house}</div>}
                    {char.district && <div><span className="text-gray-400">Distrito:</span> {char.district}</div>}
                    {char.humor && <div><span className="text-gray-400">Humor:</span> {char.humor}</div>}
                    <div><span className="text-gray-400">Prestigio:</span> {char.prestige_points}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lingüísticas */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Variaciones Lingüísticas</h3>
          {editing ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Dialecto" value={char.dialect} onChange={v => update('dialect', v)} />
              <Field label="Sociolecto" value={char.sociolect} onChange={v => update('sociolect', v)} />
              <Field label="Lingo" value={char.lingo} onChange={v => update('lingo', v)} />
              <Field label="Idiolecto" value={char.idiolect} onChange={v => update('idiolect', v)} />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
              {char.dialect && <div><span className="text-gray-400">Dialecto:</span> {char.dialect}</div>}
              {char.sociolect && <div><span className="text-gray-400">Sociolecto:</span> {char.sociolect}</div>}
              {char.lingo && <div><span className="text-gray-400">Lingo:</span> {char.lingo}</div>}
              {char.idiolect && <div><span className="text-gray-400">Idiolecto:</span> {char.idiolect}</div>}
            </div>
          )}
        </div>

        {/* Equipo */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Equipo</h3>
          {editing ? (
            <div className="grid grid-cols-1 gap-3">
              <Field label="Armas" value={char.weapons} onChange={v => update('weapons', v)} />
              <Field label="Reliquias" value={char.relics} onChange={v => update('relics', v)} />
            </div>
          ) : (
            <div className="text-xs text-gray-500 space-y-1">
              {char.weapons && <div><span className="text-gray-400">Armas:</span> {char.weapons}</div>}
              {char.relics && <div><span className="text-gray-400">Reliquias:</span> {char.relics}</div>}
            </div>
          )}
        </div>

        {/* Stats grid — 2 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Físicos */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Atributos Físicos</h3>
            {editing ? (
              <div className="space-y-1">
                <StatRow label="Fuerza" value={char.strength} onChange={v => update('strength', v)} />
                <StatRow label="Movimiento" value={char.movement} onChange={v => update('movement', v)} />
                <StatRow label="Tamaño" value={char.size} onChange={v => update('size', v)} />
                <StatRow label="Constitución" value={char.constitution} onChange={v => update('constitution', v)} />
              </div>
            ) : (
              <div className="space-y-1">
                <ViewStat label="Fuerza" value={char.strength} />
                <ViewStat label="Movimiento" value={char.movement} />
                <ViewStat label="Tamaño" value={char.size} />
                <ViewStat label="Constitución" value={char.constitution} />
              </div>
            )}
          </div>

          {/* Psíquicos */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Atributos Psíquicos</h3>
            {editing ? (
              <div className="space-y-1">
                <StatRow label="Inteligencia" value={char.intelligence} onChange={v => update('intelligence', v)} />
                <StatRow label="Sabiduría" value={char.wisdom} onChange={v => update('wisdom', v)} />
                <StatRow label="Percepción" value={char.perception} onChange={v => update('perception', v)} />
                <StatRow label="Carisma" value={char.charisma} onChange={v => update('charisma', v)} />
              </div>
            ) : (
              <div className="space-y-1">
                <ViewStat label="Inteligencia" value={char.intelligence} />
                <ViewStat label="Sabiduría" value={char.wisdom} />
                <ViewStat label="Percepción" value={char.perception} />
                <ViewStat label="Carisma" value={char.charisma} />
              </div>
            )}
          </div>
        </div>

        {/* Valores */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Valores</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {editing ? (
              <>
                <Field label="Umbral" value={char.threshold} onChange={v => update('threshold', Number(v) || 0)} type="number" />
                <Field label="Aliento del Velo" value={char.veil_breath} onChange={v => update('veil_breath', Number(v) || 0)} type="number" />
                <Field label="Iniciativa" value={char.initiative} onChange={v => update('initiative', Number(v) || 0)} type="number" />
                <Field label="Energía" value={char.energy} onChange={v => update('energy', Number(v) || 0)} type="number" />
              </>
            ) : (
              <>
                <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">{char.threshold}</div>
                  <div className="text-[10px] text-gray-400 uppercase">Umbral</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">{char.veil_breath}</div>
                  <div className="text-[10px] text-gray-400 uppercase">Aliento</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">{char.initiative}</div>
                  <div className="text-[10px] text-gray-400 uppercase">Iniciativa</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">{char.energy}</div>
                  <div className="text-[10px] text-gray-400 uppercase">Energía</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Competencias */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Competencias</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            {editing ? (
              <>
                <StatRow label="Tecnomancia" value={char.technomancy} onChange={v => update('technomancy', v)} />
                <StatRow label="Forja Avanzada" value={char.advanced_forge} onChange={v => update('advanced_forge', v)} />
                <StatRow label="Arq. Virtual" value={char.virtual_architecture} onChange={v => update('virtual_architecture', v)} />
                <StatRow label="Redes Defensivas" value={char.defensive_networks} onChange={v => update('defensive_networks', v)} />
                <StatRow label="Cronomancia" value={char.chronomancy} onChange={v => update('chronomancy', v)} />
                <StatRow label="Criptología" value={char.cryptology} onChange={v => update('cryptology', v)} />
                <StatRow label="Descodificación" value={char.decoding} onChange={v => update('decoding', v)} />
                <StatRow label="Visión Neural" value={char.neural_vision} onChange={v => update('neural_vision', v)} />
                <StatRow label="Proy. Lumínica" value={char.luminic_projection} onChange={v => update('luminic_projection', v)} />
              </>
            ) : (
              <>
                <ViewStat label="Tecnomancia" value={char.technomancy} />
                <ViewStat label="Forja Avanzada" value={char.advanced_forge} />
                <ViewStat label="Arq. Virtual" value={char.virtual_architecture} />
                <ViewStat label="Redes Defensivas" value={char.defensive_networks} />
                <ViewStat label="Cronomancia" value={char.chronomancy} />
                <ViewStat label="Criptología" value={char.cryptology} />
                <ViewStat label="Descodificación" value={char.decoding} />
                <ViewStat label="Visión Neural" value={char.neural_vision} />
                <ViewStat label="Proy. Lumínica" value={char.luminic_projection} />
              </>
            )}
          </div>
        </div>

        {/* Prisma + Notas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Prisma</h3>
            {editing ? (
              <Field label="Reserva" value={char.prisma} onChange={v => update('prisma', Number(v) || 0)} type="number" />
            ) : (
              <div className="text-center p-3 rounded-lg bg-violet-50 dark:bg-violet-900/20">
                <div className="text-2xl font-bold text-violet-700 dark:text-violet-400">{char.prisma}</div>
                <div className="text-[10px] text-violet-500 uppercase">Reserva de Prisma</div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Notas</h3>
            {editing ? (
              <textarea
                value={char.notes}
                onChange={e => update('notes', e.target.value)}
                rows={4}
                className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 resize-y"
                placeholder="Notas libres sobre el personaje..."
              />
            ) : (
              <p className="text-xs text-gray-500 whitespace-pre-wrap">{char.notes || 'Sin notas'}</p>
            )}
          </div>
        </div>

        {/* Wallet ID */}
        <div className="text-center text-[10px] text-gray-400 font-mono print:hidden">
          {walletAddress && `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}
        </div>
      </div>
    </div>
  );
}
